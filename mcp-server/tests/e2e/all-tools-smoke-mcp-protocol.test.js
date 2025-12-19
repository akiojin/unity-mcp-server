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
  let isPlaying = false;
  let isPaused = false;
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

        let result = {};
        switch (cmd?.type) {
          case 'ping':
            result = {
              message: 'pong',
              echo: cmd?.params?.message || null,
              timestamp: new Date().toISOString()
            };
            break;
          case 'play_game':
            isPlaying = true;
            isPaused = false;
            result = { message: 'Entered play mode', isPlaying, isPaused };
            break;
          case 'stop_game':
            isPlaying = false;
            isPaused = false;
            result = { message: 'Exited play mode', isPlaying, isPaused };
            break;
          case 'pause_game':
            isPaused = !isPaused;
            result = { message: isPaused ? 'Paused' : 'Resumed', isPlaying, isPaused };
            break;
          case 'get_editor_state':
            result = { isPlaying, isPaused };
            break;
          default:
            result = {};
        }

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
      name: 'ping',
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
    'calls every tool once (except quit_editor) and fails on Unknown command type',
    { timeout: 12 * 60_000 },
    async t => {
      if (!unityAvailable) {
        mockUnity = createMockUnityServer({ host: '127.0.0.1', port: 6400 });
        await mockUnity.start();

        await waitFor(async () => {
          const ping = await rpc.request('tools/call', {
            name: 'ping',
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

      await safeCall('ping', { message: 'smoke' }, { timeoutMs: 60_000 });

      // Addressables (best-effort; may be unavailable in some projects)
      await safeCall(
        'analyze_addressables',
        { action: 'analyze_unused', pageSize: 1, offset: 0 },
        { timeoutMs: 120_000 }
      );
      await safeCall('build_addressables', { action: 'clean_build' }, { timeoutMs: 120_000 });
      await safeCall('manage_addressables', { action: 'list_groups' }, { timeoutMs: 120_000 });

      // Ensure clean-ish starting state
      await safeCall('stop_game', {}, { timeoutMs: 120_000 });
      await safeCall(
        'load_scene',
        { scenePath: SCENES.all, loadMode: 'Single' },
        { timeoutMs: 120_000 }
      );

      // Prepare temp assets (folder + input actions copy)
      await safeCall(
        'manage_asset_database',
        { action: 'create_folder', folderPath: TMP_DIR },
        { timeoutMs: 120_000 }
      );
      await safeCall(
        'manage_asset_database',
        { action: 'delete_asset', assetPath: TMP_INPUT_ACTIONS },
        { timeoutMs: 120_000 }
      );
      await safeCall(
        'manage_asset_database',
        { action: 'copy_asset', fromPath: SOURCE_INPUT_ACTIONS, toPath: TMP_INPUT_ACTIONS },
        { timeoutMs: 120_000 }
      );

      // Create a prefab + material for asset tools
      await safeCall(
        'create_material',
        { materialPath: TMP_MATERIAL, overwrite: true, shader: 'Unlit/Color' },
        { timeoutMs: 120_000 }
      );
      await safeCall(
        'modify_material',
        { materialPath: TMP_MATERIAL, properties: { _Color: { r: 0, g: 1, b: 0, a: 1 } } },
        { timeoutMs: 120_000 }
      );

      await safeCall(
        'create_prefab',
        { prefabPath: TMP_PREFAB, createFromTemplate: true, overwrite: true },
        { timeoutMs: 120_000 }
      );
      await safeCall(
        'modify_prefab',
        { prefabPath: TMP_PREFAB, modifications: {} },
        { timeoutMs: 120_000 }
      );
      await safeCall('open_prefab', { prefabPath: TMP_PREFAB }, { timeoutMs: 120_000 });
      await safeCall('save_prefab', {}, { timeoutMs: 120_000 });
      await safeCall('exit_prefab_mode', { saveChanges: true }, { timeoutMs: 120_000 });
      await safeCall(
        'instantiate_prefab',
        { prefabPath: TMP_PREFAB, name: 'MCP_AllTools_PrefabInstance' },
        { timeoutMs: 120_000 }
      );

      // Create a GameObject for component tools and capture its path
      await safeCall('create_gameobject', { name: SMOKE_GO_NAME }, { timeoutMs: 60_000 });
      const found = await safeCall(
        'find_gameobject',
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
        'modify_gameobject',
        { path: createdGoPath, position: { x: 1, y: 2, z: 3 } },
        { timeoutMs: 60_000 }
      );
      await safeCall('get_hierarchy', { nameOnly: true, maxObjects: 100 }, { timeoutMs: 60_000 });

      // Core analysis tools: these must not hit "Unknown command type"
      await safeCall('analyze_scene_contents', { includeInactive: true }, { timeoutMs: 60_000 });
      await safeCall(
        'find_by_component',
        { componentType: 'Camera', searchScope: 'scene' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'get_component_values',
        { componentType: 'Camera', gameObjectName: 'Main Camera', componentIndex: 0 },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'get_gameobject_details',
        { gameObjectName: 'Main Camera', includeChildren: false },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'get_object_references',
        { gameObjectName: 'Main Camera' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'get_animator_state',
        { gameObjectName: SMOKE_GO_NAME },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'get_animator_runtime_info',
        { gameObjectName: SMOKE_GO_NAME },
        { timeoutMs: 60_000 }
      );

      // Component operations against the smoke GameObject
      await safeCall(
        'get_component_types',
        { onlyAddable: true, search: 'Collider' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'add_component',
        { gameObjectPath: createdGoPath, componentType: 'BoxCollider' },
        { timeoutMs: 60_000 }
      );
      await safeCall('list_components', { gameObjectPath: createdGoPath }, { timeoutMs: 60_000 });
      await safeCall(
        'modify_component',
        {
          gameObjectPath: createdGoPath,
          componentType: 'BoxCollider',
          properties: { isTrigger: true }
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'set_component_field',
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
        'remove_component',
        { gameObjectPath: createdGoPath, componentType: 'BoxCollider' },
        { timeoutMs: 60_000 }
      );

      // Asset/scene utilities
      await safeCall(
        'manage_asset_database',
        { action: 'find_assets', filter: 't:Scene', searchInFolders: ['Assets/Scenes'] },
        { timeoutMs: 120_000 }
      );
      await safeCall(
        'analyze_asset_dependencies',
        { action: 'get_dependencies', assetPath: SCENES.all, recursive: false },
        { timeoutMs: 120_000 }
      );
      await safeCall(
        'manage_asset_import_settings',
        { action: 'get', assetPath: SCENES.all },
        { timeoutMs: 120_000 }
      );

      await safeCall('list_scenes', { includeBuildScenesOnly: false }, { timeoutMs: 60_000 });
      await safeCall(
        'get_scene_info',
        { scenePath: SCENES.all, includeGameObjects: false },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'create_scene',
        {
          sceneName: 'MCP_AllTools_SmokeScene',
          path: TMP_DIR,
          loadScene: false,
          addToBuildSettings: false
        },
        { timeoutMs: 120_000 }
      );
      await safeCall(
        'save_scene',
        { saveAs: true, scenePath: `${TMP_DIR}/SavedScene.unity` },
        { timeoutMs: 120_000 }
      );

      // Console + editor queries
      await safeCall('clear_console', { preserveErrors: true }, { timeoutMs: 60_000 });
      await safeCall('read_console', { count: 5, format: 'compact' }, { timeoutMs: 60_000 });
      await safeCall('manage_layers', { action: 'get' }, { timeoutMs: 60_000 });
      await safeCall('manage_selection', { action: 'get' }, { timeoutMs: 60_000 });
      await safeCall('manage_tags', { action: 'get' }, { timeoutMs: 60_000 });
      await safeCall('manage_tools', { action: 'get' }, { timeoutMs: 60_000 });
      await safeCall(
        'manage_windows',
        { action: 'get', includeHidden: true },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'execute_menu_item',
        { action: 'get_available_menus', menuPath: 'Assets', safetyCheck: true },
        { timeoutMs: 120_000 }
      );

      // Packages/settings
      await safeCall(
        'manage_packages',
        { action: 'list', includeBuiltIn: false },
        { timeoutMs: 120_000 }
      );
      await safeCall('registry_config', { action: 'list' }, { timeoutMs: 120_000 });
      await safeCall('get_project_settings', { includePlayer: true }, { timeoutMs: 60_000 });
      await safeCall('update_project_settings', { confirmChanges: false }, { timeoutMs: 60_000 });

      // Script/index tools (offline)
      await safeCall('list_packages', { includeBuiltIn: false }, { timeoutMs: 60_000 });
      await safeCall('get_index_status', {}, { timeoutMs: 60_000 });
      await safeCall('build_index', {}, { timeoutMs: 60_000 });
      await safeCall(
        'search',
        {
          pattern: 'McpAllUiSystemsTestBootstrap',
          include: 'Assets/**/*.cs',
          pageSize: 5,
          snippetContext: 1
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'find_symbol',
        { name: 'McpAllUiSystemsTestBootstrap', exact: true, kind: 'class', scope: 'assets' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'get_symbols',
        { path: 'Assets/Scripts/McpUiTest/McpAllUiSystemsTestBootstrap.cs' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'read',
        {
          path: 'Assets/Scripts/McpUiTest/McpAllUiSystemsTestBootstrap.cs',
          startLine: 1,
          endLine: 40
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'find_refs',
        { name: 'McpAllUiSystemsTestBootstrap', scope: 'assets', pageSize: 5, snippetContext: 1 },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'update_index',
        { paths: ['Assets/Scripts/McpUiTest/McpAllUiSystemsTestBootstrap.cs'] },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'create_class',
        {
          path: `${TMP_DIR}/McpSmokeDummy.cs`,
          className: 'McpSmokeDummy',
          baseType: 'MonoBehaviour',
          apply: false
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'edit_snippet',
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
        'edit_structured',
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
        'rename_symbol',
        {
          relative: 'Assets/Scripts/McpUiTest/McpAllUiSystemsTestBootstrap.cs',
          namePath: 'McpAllUiSystemsTestBootstrap',
          newName: 'McpAllUiSystemsTestBootstrap_Smoke',
          preview: true
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'remove_symbol',
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
        'get_input_actions_state',
        { assetPath: TMP_INPUT_ACTIONS, includeJsonStructure: false },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'analyze_input_actions_asset',
        { assetPath: TMP_INPUT_ACTIONS, includeJsonStructure: false, includeStatistics: true },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'create_action_map',
        { assetPath: TMP_INPUT_ACTIONS, mapName: INPUT_MAP_NAME },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'add_input_action',
        {
          assetPath: TMP_INPUT_ACTIONS,
          mapName: INPUT_MAP_NAME,
          actionName: 'Jump',
          actionType: 'Button'
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'add_input_action',
        {
          assetPath: TMP_INPUT_ACTIONS,
          mapName: INPUT_MAP_NAME,
          actionName: 'Move',
          actionType: 'Value'
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'add_input_binding',
        {
          assetPath: TMP_INPUT_ACTIONS,
          mapName: INPUT_MAP_NAME,
          actionName: 'Jump',
          path: '<Keyboard>/space'
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'remove_input_binding',
        {
          assetPath: TMP_INPUT_ACTIONS,
          mapName: INPUT_MAP_NAME,
          actionName: 'Jump',
          bindingIndex: 0
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'create_composite_binding',
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
        'remove_all_bindings',
        { assetPath: TMP_INPUT_ACTIONS, mapName: INPUT_MAP_NAME, actionName: 'Move' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'remove_input_action',
        { assetPath: TMP_INPUT_ACTIONS, mapName: INPUT_MAP_NAME, actionName: 'Jump' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'remove_input_action',
        { assetPath: TMP_INPUT_ACTIONS, mapName: INPUT_MAP_NAME, actionName: 'Move' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'remove_action_map',
        { assetPath: TMP_INPUT_ACTIONS, mapName: INPUT_MAP_NAME },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'manage_control_schemes',
        {
          assetPath: TMP_INPUT_ACTIONS,
          operation: 'add',
          schemeName: 'MCP_SmokeScheme',
          devices: ['Keyboard', 'Mouse']
        },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'manage_control_schemes',
        { assetPath: TMP_INPUT_ACTIONS, operation: 'remove', schemeName: 'MCP_SmokeScheme' },
        { timeoutMs: 60_000 }
      );

      // Input simulation (best-effort, may fail on headless environments)
      await safeCall('control_input_system', { operation: 'get_state' }, { timeoutMs: 60_000 });
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
      await safeCall('simulate_touch', { action: 'tap', x: 0.5, y: 0.5 }, { timeoutMs: 60_000 });
      await safeCall(
        'input_gamepad',
        { action: 'button', button: 'a', buttonAction: 'press', holdSeconds: 0.1 },
        { timeoutMs: 60_000 }
      );

      // Play mode + UI tools
      await safeCall('get_editor_state', {}, { timeoutMs: 60_000 });
      await safeCall('play_game', {}, { timeoutMs: 180_000 });
      await sleep(500);
      await safeCall(
        'find_ui_elements',
        { elementType: 'Button', includeInactive: true },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'get_ui_element_state',
        { elementPath: '/Canvas/UGUI_Panel/UGUI_StatusText' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'click_ui_element',
        { elementPath: '/Canvas/UGUI_Panel/UGUI_Button', clickType: 'left' },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'set_ui_element_value',
        { elementPath: '/Canvas/UGUI_Panel/UGUI_InputField', value: 'hello', triggerEvents: true },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'simulate_ui_input',
        { elementPath: '/Canvas/UGUI_Panel/UGUI_InputField', inputType: 'text', inputData: 'abc' },
        { timeoutMs: 60_000 }
      );

      // Screenshots
      const cap = await safeCall(
        'capture_screenshot',
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
          'analyze_screenshot',
          { analysisType: 'basic', base64Data: base64 },
          { timeoutMs: 120_000 }
        );
      } else {
        await safeCall(
          'analyze_screenshot',
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

      await safeCall('capture_video_status', {}, { timeoutMs: 60_000 });
      await safeCall(
        'capture_video_start',
        { fps: 5, width: 320, height: 180, maxDurationSec: 1 },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'video_capture_for',
        { durationSec: 1, fps: 5, width: 320, height: 180, play: false },
        { timeoutMs: 180_000 }
      );
      await safeCall('capture_video_stop', {}, { timeoutMs: 60_000 });

      await safeCall('pause_game', {}, { timeoutMs: 60_000 });
      await safeCall(
        'playmode_wait_for_state',
        { isPlaying: false, timeoutMs: 1000, pollMs: 100 },
        { timeoutMs: 30_000 }
      );
      await safeCall('stop_game', {}, { timeoutMs: 180_000 });

      // Unity Test Runner tools (best-effort)
      await safeCall('get_test_status', { includeTestResults: false }, { timeoutMs: 60_000 });
      await safeCall(
        'run_tests',
        { testMode: 'EditMode', filter: 'NonExistentSmokeTest', includeDetails: false },
        { timeoutMs: 180_000 }
      );

      // Misc/system
      await safeCall(
        'get_compilation_state',
        { includeMessages: false, maxMessages: 10 },
        { timeoutMs: 60_000 }
      );
      await safeCall('get_command_stats', {}, { timeoutMs: 60_000 });
      await safeCall('refresh_assets', {}, { timeoutMs: 180_000 });

      // Cleanup: delete the created GameObject + temporary assets
      await safeCall(
        'delete_gameobject',
        { path: createdGoPath, includeChildren: true },
        { timeoutMs: 60_000 }
      );
      await safeCall(
        'manage_asset_database',
        { action: 'delete_asset', assetPath: TMP_DIR },
        { timeoutMs: 180_000 }
      );

      // quit_editor is intentionally skipped
      called.add('quit_editor');
      report.skipped.push({ name: 'quit_editor', reason: 'dangerous (would quit Unity Editor)' });

      // Coverage assertion: ensure we called every tool at least once (except quit_editor).
      const expected = new Set(toolNames.filter(n => n && n !== 'quit_editor'));
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
          ['analyze_scene_contents', 'analyze_scene_contents'],
          ['find_by_component', 'find_by_component'],
          ['get_component_values', 'get_component_values'],
          ['get_gameobject_details', 'get_gameobject_details'],
          ['get_object_references', 'get_object_references'],
          ['get_animator_state', 'get_animator_state'],
          ['get_animator_runtime_info', 'get_animator_runtime_info'],
          ['get_input_actions_state', 'get_input_actions_state'],
          ['analyze_input_actions_asset', 'analyze_input_actions_asset'],
          ['create_action_map', 'create_action_map'],
          ['remove_action_map', 'remove_action_map'],
          ['add_input_action', 'add_input_action'],
          ['remove_input_action', 'remove_input_action'],
          ['add_input_binding', 'add_input_binding'],
          ['remove_input_binding', 'remove_input_binding'],
          ['remove_all_bindings', 'remove_all_bindings'],
          ['create_composite_binding', 'create_composite_binding'],
          ['manage_control_schemes', 'manage_control_schemes']
        ];

        for (const [toolName, unityCommand] of expectations) {
          if (toolName !== unityCommand) {
            assert.equal(
              types.has(toolName),
              false,
              `Mock Unity received tool name as command type: ${toolName}`
            );
          }
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
