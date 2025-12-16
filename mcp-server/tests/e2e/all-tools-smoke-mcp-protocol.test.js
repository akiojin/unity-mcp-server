import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCENES = {
  all: 'Assets/Scenes/MCP_UI_AllSystems_TestScene.unity',
  ugui: 'Assets/Scenes/MCP_UI_UGUI_TestScene.unity',
  uitk: 'Assets/Scenes/MCP_UI_UITK_TestScene.unity',
  imgui: 'Assets/Scenes/MCP_UI_IMGUI_TestScene.unity'
};

const TMP_DIR = 'Assets/McpAllToolsSmokeTest';
const TMP_INPUT_ACTIONS = `${TMP_DIR}/Smoke_InputActions.inputactions`;
const SOURCE_INPUT_ACTIONS = 'Assets/InputSystem_Actions.inputactions';
const TMP_MATERIAL = `${TMP_DIR}/Smoke_Material.mat`;
const TMP_PREFAB = `${TMP_DIR}/Smoke_Prefab.prefab`;

const SMOKE_GO_NAME = 'MCP_AllTools_Smoke';
const INPUT_MAP_NAME = 'MCP_Smoke_Map';

function sleep(ms) {
  return new Promise(r => setTimeout(r, Math.max(0, ms)));
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      t.unref?.();
    })
  ]);
}

function createLineReader(stream) {
  let buffer = '';
  const listeners = new Set();

  stream.on('data', chunk => {
    buffer += chunk.toString('utf8');
    while (true) {
      const nl = buffer.indexOf('\n');
      if (nl === -1) break;
      const line = buffer.slice(0, nl).replace(/\r$/, '');
      buffer = buffer.slice(nl + 1);
      if (!line.trim()) continue;
      for (const fn of listeners) fn(line);
    }
  });

  return {
    onLine(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}

function writeJsonLine(stream, message) {
  stream.write(`${JSON.stringify(message)}\n`);
}

function createJsonRpcClient(proc) {
  let nextId = 1;
  const pending = new Map();
  const reader = createLineReader(proc.stdout);

  const off = reader.onLine(line => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }

    const id = msg?.id;
    if (id === undefined || id === null) return;
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    entry.resolve(msg);
  });

  const cleanup = err => {
    try {
      off();
    } catch {}
    for (const [, entry] of pending) {
      entry.reject(err || new Error('MCP process closed'));
    }
    pending.clear();
  };

  proc.once('exit', code => cleanup(new Error(`MCP process exited: code=${code}`)));
  proc.once('error', err => cleanup(err));

  return {
    async request(method, params, { timeoutMs = 60_000 } = {}) {
      const id = nextId++;
      const promise = new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
      writeJsonLine(proc.stdin, { jsonrpc: '2.0', id, method, params });
      return withTimeout(promise, timeoutMs, `${method} response`);
    },
    notify(method, params) {
      writeJsonLine(proc.stdin, { jsonrpc: '2.0', method, params });
    }
  };
}

function toolText(callResponse) {
  return callResponse?.result?.content?.[0]?.text ?? '';
}

function safeJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function truncate(text, max = 240) {
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function isUnknownCommand(text) {
  return /Unknown command type:/i.test(text || '');
}

async function waitFor(fn, { timeoutMs = 15_000, pollMs = 250 } = {}) {
  const start = Date.now();
  for (;;) {
    const ok = await fn();
    if (ok) return;
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await sleep(pollMs);
  }
}

function encodeFramedJson(obj) {
  const json = JSON.stringify(obj);
  const payload = Buffer.from(json, 'utf8');
  const len = Buffer.allocUnsafe(4);
  len.writeInt32BE(payload.length, 0);
  return Buffer.concat([len, payload]);
}

function createMockUnityServer({ host = '127.0.0.1', port = 6400 } = {}) {
  const receivedTypes = new Set();
  const sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    let buffer = Buffer.alloc(0);

    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length >= 4) {
        const length = buffer.readInt32BE(0);
        if (buffer.length < 4 + length) break;
        const body = buffer.slice(4, 4 + length);
        buffer = buffer.slice(4 + length);

        let cmd;
        try {
          cmd = JSON.parse(body.toString('utf8'));
        } catch {
          continue;
        }

        if (cmd?.type) receivedTypes.add(String(cmd.type));

        const result =
          cmd?.type === 'ping'
            ? {
                message: 'pong',
                echo: cmd?.params?.message || null,
                timestamp: new Date().toISOString()
              }
            : {};

        const response = { id: cmd?.id, success: true, result };
        socket.write(encodeFramedJson(response));
      }
    });
  });

  return {
    receivedTypes,
    async start() {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          server.off('error', reject);
          resolve();
        });
      });
    },
    async stop() {
      for (const socket of sockets) {
        try {
          socket.destroy();
        } catch {}
      }
      sockets.clear();

      await new Promise(resolve => server.close(resolve));
    }
  };
}

describe('All tools smoke via MCP protocol (stdio → Unity)', () => {
  let proc = null;
  let rpc = null;
  let unityAvailable = false;
  let toolNames = [];
  let mockUnity = null;

  before(async () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const mcpServerRoot = path.resolve(__dirname, '..', '..');
    const cliPath = path.join(mcpServerRoot, 'bin', 'unity-mcp-server.js');

    proc = spawn(process.execPath, [cliPath], {
      cwd: mcpServerRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        UNITY_MCP_ALLOW_TEST_CONNECT: '1',
        LOG_LEVEL: process.env.LOG_LEVEL || 'error'
      }
    });

    rpc = createJsonRpcClient(proc);

    await rpc.request('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'all-tools-smoke-mcp-protocol', version: '0.0.0' }
    });
    rpc.notify('notifications/initialized', {});

    const list = await rpc.request('tools/list', {});
    toolNames = Array.isArray(list?.result?.tools)
      ? list.result.tools.map(t => t.name).filter(Boolean)
      : [];

    const ping = await rpc.request('tools/call', {
      name: 'system_ping',
      arguments: { message: 'ping' }
    });
    const pingJson = safeJson(toolText(ping));
    unityAvailable = Boolean(pingJson && pingJson.success === true);
  });

  after(async () => {
    if (mockUnity) {
      try {
        await mockUnity.stop();
      } catch {}
      mockUnity = null;
    }
    if (!proc) return;
    try {
      proc.kill('SIGTERM');
    } catch {}
    await Promise.race([
      new Promise(resolve => proc.once('exit', resolve)),
      new Promise(resolve => setTimeout(resolve, 2000).unref())
    ]);
    try {
      proc.kill('SIGKILL');
    } catch {}
  });

  it(
    'calls every tool once (except editor_quit) and fails on Unknown command type',
    { timeout: 12 * 60_000 },
    async t => {
      if (!unityAvailable) {
        mockUnity = createMockUnityServer({ host: '127.0.0.1', port: 6400 });
        await mockUnity.start();

        await waitFor(async () => {
          const ping = await rpc.request('tools/call', {
            name: 'system_ping',
            arguments: { message: 'ping' }
          });
          const pingJson = safeJson(toolText(ping));
          return Boolean(pingJson && pingJson.success === true);
        });
      }

      const reportPath = path.resolve('tests/.reports/all-tools-smoke-mcp-protocol.json');
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });

      const report = {
        startedAt: new Date().toISOString(),
        unityAvailable: unityAvailable || Boolean(mockUnity),
        toolsListed: toolNames.length,
        called: [],
        failures: [],
        skipped: []
      };

      const called = new Set();
      let createdGoPath = `/${SMOKE_GO_NAME}`;

      async function callTool(name, args = {}, { timeoutMs = 60_000 } = {}) {
        const started = Date.now();
        const res = await rpc.request('tools/call', { name, arguments: args }, { timeoutMs });
        const durationMs = Date.now() - started;

        const text = toolText(res);
        const entry = {
          name,
          ok: true,
          durationMs,
          args: Object.keys(args || {}).length ? Object.keys(args) : [],
          text: truncate(text)
        };

        if (res?.error) {
          entry.ok = false;
          entry.error = truncate(res.error.message || 'rpc error');
        } else if (isUnknownCommand(text)) {
          entry.ok = false;
          entry.error = 'Unknown command type';
        } else if (/Tool not found:/i.test(text || '')) {
          entry.ok = false;
          entry.error = 'Tool not found';
        }

        report.called.push(entry);
        called.add(name);
        return { res, text, json: safeJson(text) };
      }

      async function safeCall(name, args, options) {
        try {
          return await callTool(name, args, options);
        } catch (e) {
          report.called.push({
            name,
            ok: false,
            durationMs: 0,
            args: Object.keys(args || {}).length ? Object.keys(args) : [],
            text: '',
            error: truncate(e.message || 'exception')
          });
          called.add(name);
          return null;
        }
      }

      await safeCall('system_ping', { message: 'smoke' }, { timeoutMs: 60_000 });

      // Addressables (best-effort; may be unavailable in some projects)
      await safeCall(
        'addressables_analyze',
        { action: 'analyze_unused', pageSize: 1, offset: 0 },
        { timeoutMs: 120_000 }
      );
      await safeCall('addressables_build', { action: 'clean_build' }, { timeoutMs: 120_000 });
      await safeCall('addressables_manage', { action: 'list_groups' }, { timeoutMs: 120_000 });

      // Ensure clean-ish starting state
      await safeCall('playmode_stop', {}, { timeoutMs: 120_000 });
      await safeCall(
        'scene_load',
        { scenePath: SCENES.all, loadMode: 'Single' },
        { timeoutMs: 120_000 }
      );

      // Prepare temp assets (folder + input actions copy)
      await safeCall(
        'asset_database_manage',
        { action: 'create_folder', folderPath: TMP_DIR },
        { timeoutMs: 120_000 }
      );
      await safeCall(
        'asset_database_manage',
        { action: 'delete_asset', assetPath: TMP_INPUT_ACTIONS },
        { timeoutMs: 120_000 }
      );
      await safeCall(
        'asset_database_manage',
        { action: 'copy_asset', fromPath: SOURCE_INPUT_ACTIONS, toPath: TMP_INPUT_ACTIONS },
        { timeoutMs: 120_000 }
      );

      // Create a prefab + material for asset tools
      await safeCall(
        'asset_material_create',
        { materialPath: TMP_MATERIAL, overwrite: true, shader: 'Unlit/Color' },
        { timeoutMs: 120_000 }
      );
      await safeCall(
        'asset_material_modify',
        { materialPath: TMP_MATERIAL, properties: { _Color: { r: 0, g: 1, b: 0, a: 1 } } },
        { timeoutMs: 120_000 }
      );

      await safeCall(
        'asset_prefab_create',
        { prefabPath: TMP_PREFAB, createFromTemplate: true, overwrite: true },
        { timeoutMs: 120_000 }
      );
      await safeCall(
        'asset_prefab_modify',
        { prefabPath: TMP_PREFAB, modifications: {} },
        { timeoutMs: 120_000 }
      );
      await safeCall('asset_prefab_open', { prefabPath: TMP_PREFAB }, { timeoutMs: 120_000 });
      await safeCall('asset_prefab_save', {}, { timeoutMs: 120_000 });
      await safeCall('asset_prefab_exit_mode', { saveChanges: true }, { timeoutMs: 120_000 });
      await safeCall(
        'asset_prefab_instantiate',
        { prefabPath: TMP_PREFAB, name: 'MCP_AllTools_PrefabInstance' },
        { timeoutMs: 120_000 }
      );

      // Create a GameObject for component tools and capture its path
      await safeCall('gameobject_create', { name: SMOKE_GO_NAME }, { timeoutMs: 60_000 });
      const found = await safeCall(
        'gameobject_find',
        { name: SMOKE_GO_NAME, exactMatch: true },
        { timeoutMs: 60_000 }
      );
      const foundJson = found ? safeJson(toolText(found.res)) : null;
      const firstPath =
        foundJson?.paths?.[0] || foundJson?.objects?.[0]?.path || foundJson?.results?.[0]?.path;
      if (typeof firstPath === 'string' && firstPath.startsWith('/')) {
        createdGoPath = firstPath;
      }

      await safeCall(
        'gameobject_modify',
        { path: createdGoPath, position: { x: 1, y: 2, z: 3 } },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'gameobject_get_hierarchy',
        { nameOnly: true, maxObjects: 100 },
        { timeoutMs: 60_000 }
      );

      // Core analysis tools: these must not hit "Unknown command type"
      await safeCall(
        'analysis_scene_contents_analyze',
        { includeInactive: true },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'analysis_component_find',
        { componentType: 'Camera', searchScope: 'scene' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'analysis_component_values_get',
        { componentType: 'Camera', gameObjectName: 'Main Camera', componentIndex: 0 },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'analysis_gameobject_details_get',
        { gameObjectName: 'Main Camera', includeChildren: false },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'analysis_object_references_get',
        { gameObjectName: 'Main Camera' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'analysis_animator_state_get',
        { gameObjectName: SMOKE_GO_NAME },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'analysis_animator_runtime_info_get',
        { gameObjectName: SMOKE_GO_NAME },
        { timeoutMs: 60_000 }
      );

      // Component operations against the smoke GameObject
      await safeCall(
        'component_get_types',
        { onlyAddable: true, search: 'Collider' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'component_add',
        { gameObjectPath: createdGoPath, componentType: 'BoxCollider' },
        { timeoutMs: 60_000 }
      );
      await safeCall('component_list', { gameObjectPath: createdGoPath }, { timeoutMs: 60_000 });
      await safeCall(
        'component_modify',
        {
          gameObjectPath: createdGoPath,
          componentType: 'BoxCollider',
          properties: { isTrigger: true }
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'component_field_set',
        {
          gameObjectPath: createdGoPath,
          componentType: 'BoxCollider',
          fieldPath: 'isTrigger',
          value: 'true',
          valueType: 'bool',
          dryRun: true
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'component_remove',
        { gameObjectPath: createdGoPath, componentType: 'BoxCollider' },
        { timeoutMs: 60_000 }
      );

      // Asset/scene utilities
      await safeCall(
        'asset_database_manage',
        { action: 'find_assets', filter: 't:Scene', searchInFolders: ['Assets/Scenes'] },
        { timeoutMs: 120_000 }
      );
      await safeCall(
        'asset_dependency_analyze',
        { action: 'get_dependencies', assetPath: SCENES.all, recursive: false },
        { timeoutMs: 120_000 }
      );
      await safeCall(
        'asset_import_settings_manage',
        { action: 'get', assetPath: SCENES.all },
        { timeoutMs: 120_000 }
      );

      await safeCall('scene_list', { includeBuildScenesOnly: false }, { timeoutMs: 60_000 });
      await safeCall(
        'scene_info_get',
        { scenePath: SCENES.all, includeGameObjects: false },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'scene_create',
        {
          sceneName: 'MCP_AllTools_SmokeScene',
          path: TMP_DIR,
          loadScene: false,
          addToBuildSettings: false
        },
        { timeoutMs: 120_000 }
      );
      await safeCall(
        'scene_save',
        { saveAs: true, scenePath: `${TMP_DIR}/SavedScene.unity` },
        { timeoutMs: 120_000 }
      );

      // Console + editor queries
      await safeCall('console_clear', { preserveErrors: true }, { timeoutMs: 60_000 });
      await safeCall('console_read', { count: 5, format: 'compact' }, { timeoutMs: 60_000 });
      await safeCall('editor_layers_manage', { action: 'get' }, { timeoutMs: 60_000 });
      await safeCall('editor_selection_manage', { action: 'get' }, { timeoutMs: 60_000 });
      await safeCall('editor_tags_manage', { action: 'get' }, { timeoutMs: 60_000 });
      await safeCall('editor_tools_manage', { action: 'get' }, { timeoutMs: 60_000 });
      await safeCall(
        'editor_windows_manage',
        { action: 'get', includeHidden: true },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'menu_item_execute',
        { action: 'get_available_menus', menuPath: 'Assets', safetyCheck: true },
        { timeoutMs: 120_000 }
      );

      // Packages/settings
      await safeCall(
        'package_manage',
        { action: 'list', includeBuiltIn: false },
        { timeoutMs: 120_000 }
      );
      await safeCall('package_registry_config', { action: 'list' }, { timeoutMs: 120_000 });
      await safeCall('settings_get', { includePlayer: true }, { timeoutMs: 60_000 });
      await safeCall('settings_update', { confirmChanges: false }, { timeoutMs: 60_000 });

      // Script/index tools (offline)
      await safeCall('script_packages_list', { includeBuiltIn: false }, { timeoutMs: 60_000 });
      await safeCall('code_index_status', {}, { timeoutMs: 60_000 });
      await safeCall('code_index_build', {}, { timeoutMs: 60_000 });
      await safeCall(
        'script_search',
        {
          pattern: 'McpAllUiSystemsTestBootstrap',
          include: 'Assets/**/*.cs',
          pageSize: 5,
          snippetContext: 1
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'script_symbol_find',
        { name: 'McpAllUiSystemsTestBootstrap', exact: true, kind: 'class', scope: 'assets' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'script_symbols_get',
        { path: 'Assets/Scripts/McpUiTest/McpAllUiSystemsTestBootstrap.cs' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'script_read',
        {
          path: 'Assets/Scripts/McpUiTest/McpAllUiSystemsTestBootstrap.cs',
          startLine: 1,
          endLine: 40
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'script_refs_find',
        { name: 'McpAllUiSystemsTestBootstrap', scope: 'assets', pageSize: 5, snippetContext: 1 },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'code_index_update',
        { paths: ['Assets/Scripts/McpUiTest/McpAllUiSystemsTestBootstrap.cs'] },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'script_create_class',
        {
          path: `${TMP_DIR}/McpSmokeDummy.cs`,
          className: 'McpSmokeDummy',
          baseType: 'MonoBehaviour',
          apply: false
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'script_edit_snippet',
        {
          path: 'Assets/Scripts/McpUiTest/McpAllUiSystemsTestBootstrap.cs',
          preview: true,
          instructions: [
            {
              operation: 'replace',
              anchor: {
                type: 'text',
                target: 'public sealed class McpAllUiSystemsTestBootstrap : MonoBehaviour'
              },
              newText: 'public sealed class McpAllUiSystemsTestBootstrap : MonoBehaviour'
            }
          ]
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'script_edit_structured',
        {
          path: 'Assets/Scripts/McpUiTest/McpAllUiSystemsTestBootstrap.cs',
          symbolName: 'McpAllUiSystemsTestBootstrap',
          operation: 'insert_after',
          newText: '',
          preview: true
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'script_refactor_rename',
        {
          relative: 'Assets/Scripts/McpUiTest/McpAllUiSystemsTestBootstrap.cs',
          namePath: 'McpAllUiSystemsTestBootstrap',
          newName: 'McpAllUiSystemsTestBootstrap_Smoke',
          preview: true
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'script_remove_symbol',
        {
          path: 'Assets/Scripts/McpUiTest/McpAllUiSystemsTestBootstrap.cs',
          namePath: 'McpAllUiSystemsTestBootstrap',
          apply: false
        },
        { timeoutMs: 60_000 }
      );

      await safeCall('search_tools', { query: 'ui', limit: 5 }, { timeoutMs: 60_000 });

      // Input Actions (analysis + editing) on a temporary copy
      await safeCall(
        'input_actions_state_get',
        { assetPath: TMP_INPUT_ACTIONS, includeJsonStructure: false },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'input_actions_asset_analyze',
        { assetPath: TMP_INPUT_ACTIONS, includeJsonStructure: false, includeStatistics: true },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'input_action_map_create',
        { assetPath: TMP_INPUT_ACTIONS, mapName: INPUT_MAP_NAME },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'input_action_add',
        {
          assetPath: TMP_INPUT_ACTIONS,
          mapName: INPUT_MAP_NAME,
          actionName: 'Jump',
          actionType: 'Button'
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'input_action_add',
        {
          assetPath: TMP_INPUT_ACTIONS,
          mapName: INPUT_MAP_NAME,
          actionName: 'Move',
          actionType: 'Value'
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'input_binding_add',
        {
          assetPath: TMP_INPUT_ACTIONS,
          mapName: INPUT_MAP_NAME,
          actionName: 'Jump',
          path: '<Keyboard>/space'
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'input_binding_remove',
        {
          assetPath: TMP_INPUT_ACTIONS,
          mapName: INPUT_MAP_NAME,
          actionName: 'Jump',
          bindingIndex: 0
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'input_binding_composite_create',
        {
          assetPath: TMP_INPUT_ACTIONS,
          mapName: INPUT_MAP_NAME,
          actionName: 'Move',
          compositeType: '2DVector',
          bindings: {
            up: '<Keyboard>/w',
            down: '<Keyboard>/s',
            left: '<Keyboard>/a',
            right: '<Keyboard>/d'
          }
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'input_binding_remove_all',
        { assetPath: TMP_INPUT_ACTIONS, mapName: INPUT_MAP_NAME, actionName: 'Move' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'input_action_remove',
        { assetPath: TMP_INPUT_ACTIONS, mapName: INPUT_MAP_NAME, actionName: 'Jump' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'input_action_remove',
        { assetPath: TMP_INPUT_ACTIONS, mapName: INPUT_MAP_NAME, actionName: 'Move' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'input_action_map_remove',
        { assetPath: TMP_INPUT_ACTIONS, mapName: INPUT_MAP_NAME },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'input_control_schemes_manage',
        {
          assetPath: TMP_INPUT_ACTIONS,
          operation: 'add',
          schemeName: 'MCP_SmokeScheme',
          devices: ['Keyboard', 'Mouse']
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'input_control_schemes_manage',
        { assetPath: TMP_INPUT_ACTIONS, operation: 'remove', schemeName: 'MCP_SmokeScheme' },
        { timeoutMs: 60_000 }
      );

      // Input simulation (best-effort, may fail on headless environments)
      await safeCall('input_system_control', { operation: 'get_state' }, { timeoutMs: 60_000 });
      await safeCall(
        'input_keyboard',
        { action: 'type', text: 'smoke', typingSpeed: 5 },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'input_mouse',
        { action: 'move', x: 10, y: 10, absolute: true },
        { timeoutMs: 60_000 }
      );
      await safeCall('input_touch', { action: 'tap', x: 0.5, y: 0.5 }, { timeoutMs: 60_000 });
      await safeCall(
        'input_gamepad',
        { action: 'button', button: 'a', buttonAction: 'press', holdSeconds: 0.1 },
        { timeoutMs: 60_000 }
      );

      // Play mode + UI tools
      await safeCall('playmode_get_state', {}, { timeoutMs: 60_000 });
      await safeCall('playmode_play', {}, { timeoutMs: 180_000 });
      await sleep(500);
      await safeCall(
        'ui_find_elements',
        { elementType: 'Button', includeInactive: true },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'ui_get_element_state',
        { elementPath: '/Canvas/UGUI_Panel/UGUI_StatusText' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'ui_click_element',
        { elementPath: '/Canvas/UGUI_Panel/UGUI_Button', clickType: 'left' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'ui_set_element_value',
        { elementPath: '/Canvas/UGUI_Panel/UGUI_InputField', value: 'hello', triggerEvents: true },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'ui_simulate_input',
        { elementPath: '/Canvas/UGUI_Panel/UGUI_InputField', inputType: 'text', inputData: 'abc' },
        { timeoutMs: 60_000 }
      );

      // Screenshots
      const cap = await safeCall(
        'screenshot_capture',
        {
          captureMode: 'explorer',
          encodeAsBase64: true,
          explorerSettings: { camera: { width: 320, height: 180 } }
        },
        { timeoutMs: 120_000 }
      );
      const capJson = cap ? safeJson(toolText(cap.res)) : null;
      const base64 = capJson?.base64Data || capJson?.base64 || capJson?.data?.base64Data;
      if (typeof base64 === 'string' && base64.length > 0) {
        await safeCall(
          'screenshot_analyze',
          { analysisType: 'basic', base64Data: base64 },
          { timeoutMs: 120_000 }
        );
      } else {
        await safeCall(
          'screenshot_analyze',
          { analysisType: 'basic', base64Data: '' },
          { timeoutMs: 60_000 }
        );
      }

      // Profiler/video (best-effort)
      await safeCall('profiler_get_metrics', { listAvailable: true }, { timeoutMs: 60_000 });
      await safeCall(
        'profiler_start',
        { maxDurationSec: 1, recordToFile: false, mode: 'normal' },
        { timeoutMs: 60_000 }
      );
      await safeCall('profiler_status', {}, { timeoutMs: 60_000 });
      await safeCall('profiler_stop', {}, { timeoutMs: 60_000 });

      await safeCall('video_capture_status', {}, { timeoutMs: 60_000 });
      await safeCall(
        'video_capture_start',
        { fps: 5, width: 320, height: 180, maxDurationSec: 1 },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'video_capture_for',
        { durationSec: 1, fps: 5, width: 320, height: 180, play: false },
        { timeoutMs: 180_000 }
      );
      await safeCall('video_capture_stop', {}, { timeoutMs: 60_000 });

      await safeCall('playmode_pause', {}, { timeoutMs: 60_000 });
      await safeCall(
        'playmode_wait_for_state',
        { isPlaying: false, timeoutMs: 1000, pollMs: 100 },
        { timeoutMs: 30_000 }
      );
      await safeCall('playmode_stop', {}, { timeoutMs: 180_000 });

      // Unity Test Runner tools (best-effort)
      await safeCall('test_get_status', { includeTestResults: false }, { timeoutMs: 60_000 });
      await safeCall(
        'test_run',
        { testMode: 'EditMode', filter: 'NonExistentSmokeTest', includeDetails: false },
        { timeoutMs: 180_000 }
      );

      // Misc/system
      await safeCall(
        'compilation_get_state',
        { includeMessages: false, maxMessages: 10 },
        { timeoutMs: 60_000 }
      );
      await safeCall('system_get_command_stats', {}, { timeoutMs: 60_000 });
      await safeCall('system_refresh_assets', {}, { timeoutMs: 180_000 });

      // Cleanup: delete the created GameObject + temporary assets
      await safeCall(
        'gameobject_delete',
        { path: createdGoPath, includeChildren: true },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'asset_database_manage',
        { action: 'delete_asset', assetPath: TMP_DIR },
        { timeoutMs: 180_000 }
      );

      // editor_quit is intentionally skipped
      called.add('editor_quit');
      report.skipped.push({ name: 'editor_quit', reason: 'dangerous (would quit Unity Editor)' });

      // Coverage assertion: ensure we called every tool at least once (except editor_quit).
      const expected = new Set(toolNames.filter(n => n && n !== 'editor_quit'));
      const missing = Array.from(expected).filter(n => !called.has(n));
      if (missing.length) {
        report.failures.push({
          name: '__missing__',
          reason: `Missing tools: ${missing.join(', ')}`
        });
      }

      // Fail on Unknown command type (regression guard for command-name mismatches).
      for (const entry of report.called) {
        if (!entry.ok) {
          report.failures.push({
            name: entry.name,
            reason: entry.error || 'failed',
            text: entry.text
          });
        }
      }

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      const unknowns = report.failures.filter(f => f.reason === 'Unknown command type');
      assert.equal(unknowns.length, 0, `Unknown command type detected (see ${reportPath})`);

      const missingToolsFailure = report.failures.find(f => f.name === '__missing__');
      assert.equal(
        Boolean(missingToolsFailure),
        false,
        missingToolsFailure?.reason || 'missing tools'
      );

      if (mockUnity) {
        const types = mockUnity.receivedTypes;
        const expectations = [
          ['analysis_scene_contents_analyze', 'analyze_scene_contents'],
          ['analysis_component_find', 'find_by_component'],
          ['analysis_component_values_get', 'get_component_values'],
          ['analysis_gameobject_details_get', 'get_gameobject_details'],
          ['analysis_object_references_get', 'get_object_references'],
          ['analysis_animator_state_get', 'get_animator_state'],
          ['analysis_animator_runtime_info_get', 'get_animator_runtime_info'],
          ['input_actions_state_get', 'get_input_actions_state'],
          ['input_actions_asset_analyze', 'analyze_input_actions_asset'],
          ['input_action_map_create', 'create_action_map'],
          ['input_action_map_remove', 'remove_action_map'],
          ['input_action_add', 'add_input_action'],
          ['input_action_remove', 'remove_input_action'],
          ['input_binding_add', 'add_input_binding'],
          ['input_binding_remove', 'remove_input_binding'],
          ['input_binding_remove_all', 'remove_all_bindings'],
          ['input_binding_composite_create', 'create_composite_binding'],
          ['input_control_schemes_manage', 'manage_control_schemes']
        ];

        for (const [toolName, unityCommand] of expectations) {
          assert.equal(
            types.has(toolName),
            false,
            `Mock Unity received tool name as command type: ${toolName}`
          );
          assert.equal(
            types.has(unityCommand),
            true,
            `Mock Unity did not receive expected command type: ${unityCommand}`
          );
        }
      }
    }
  );
});
