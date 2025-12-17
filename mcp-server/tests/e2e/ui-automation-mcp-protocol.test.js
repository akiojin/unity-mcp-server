import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCENES = {
  ugui: 'Assets/Scenes/MCP_UI_UGUI_TestScene.unity',
  uitk: 'Assets/Scenes/MCP_UI_UITK_TestScene.unity',
  imgui: 'Assets/Scenes/MCP_UI_IMGUI_TestScene.unity'
};

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

function parseToolJson(callResponse) {
  const text = toolText(callResponse);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { __rawText: text };
  }
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

describe('UI automation via MCP protocol (stdio tools/call → real Unity)', () => {
  let proc = null;
  let rpc = null;
  let unityAvailable = false;

  before(async () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const mcpServerRoot = path.resolve(__dirname, '..', '..');
    const cliPath = path.join(mcpServerRoot, 'bin', 'unity-mcp-server.js');

    proc = spawn(process.execPath, [cliPath], {
      cwd: mcpServerRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Allow real Unity connection for this E2E suite even when invoked with NODE_ENV=test.
        UNITY_MCP_ALLOW_TEST_CONNECT: '1',
        // Reduce MCP logging noise on stdout; stderr remains available for diagnostics.
        LOG_LEVEL: process.env.LOG_LEVEL || 'error'
      }
    });

    rpc = createJsonRpcClient(proc);

    await rpc.request('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'ui-e2e-mcp-protocol', version: '0.0.0' }
    });
    rpc.notify('notifications/initialized', {});
    await rpc.request('tools/list', {});

    const ping = await rpc.request('tools/call', {
      name: 'ping',
      arguments: { message: 'ping' }
    });
    const pingJson = parseToolJson(ping);
    unityAvailable = Boolean(pingJson && pingJson.success === true);
  });

  after(async () => {
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

  afterEach(async () => {
    if (!rpc || !unityAvailable) return;
    try {
      await rpc.request(
        'tools/call',
        { name: 'stop_game', arguments: { maxWaitMs: 60_000 } },
        { timeoutMs: 120_000 }
      );
    } catch {}
  });

  it('UGUI: load_scene → play → ui_* tools work', async t => {
    if (!unityAvailable) {
      t.skip('Unity not available');
      return;
    }

    await rpc.request(
      'tools/call',
      { name: 'load_scene', arguments: { scenePath: SCENES.ugui, loadMode: 'Single' } },
      { timeoutMs: 60_000 }
    );
    await rpc.request(
      'tools/call',
      { name: 'play_game', arguments: { maxWaitMs: 60_000 } },
      { timeoutMs: 120_000 }
    );

    await waitFor(async () => {
      const st = await rpc.request('tools/call', {
        name: 'get_ui_element_state',
        arguments: { elementPath: '/Canvas/UGUI_Panel/UGUI_StatusText' }
      });
      const json = parseToolJson(st);
      return json && typeof json.text === 'string' && json.text.includes('UGUI clicks=');
    });

    const findButtons = parseToolJson(
      await rpc.request('tools/call', {
        name: 'find_ui_elements',
        arguments: { elementType: 'Button', uiSystem: 'ugui' }
      })
    );
    assert.ok(findButtons?.elements?.some(e => e.path === '/Canvas/UGUI_Panel/UGUI_Button'));

    const before = parseToolJson(
      await rpc.request('tools/call', {
        name: 'get_ui_element_state',
        arguments: { elementPath: '/Canvas/UGUI_Panel/UGUI_StatusText' }
      })
    );
    assert.match(before.text, /UGUI clicks=0/);

    const clickResult = parseToolJson(
      await rpc.request('tools/call', {
        name: 'click_ui_element',
        arguments: { elementPath: '/Canvas/UGUI_Panel/UGUI_Button', clickType: 'left' }
      })
    );
    assert.equal(clickResult.success, true);

    await waitFor(async () => {
      const after = parseToolJson(
        await rpc.request('tools/call', {
          name: 'get_ui_element_state',
          arguments: { elementPath: '/Canvas/UGUI_Panel/UGUI_StatusText' }
        })
      );
      return after && typeof after.text === 'string' && /UGUI clicks=1/.test(after.text);
    });

    const setValueResult = parseToolJson(
      await rpc.request('tools/call', {
        name: 'set_ui_element_value',
        arguments: {
          elementPath: '/Canvas/UGUI_Panel/UGUI_InputField',
          value: 'hello',
          triggerEvents: true
        }
      })
    );
    assert.equal(setValueResult.success, true);

    await waitFor(async () => {
      const after = parseToolJson(
        await rpc.request('tools/call', {
          name: 'get_ui_element_state',
          arguments: { elementPath: '/Canvas/UGUI_Panel/UGUI_StatusText' }
        })
      );
      return after && typeof after.text === 'string' && after.text.includes("Input='hello'");
    });
  });

  it('UI Toolkit: load_scene → play → ui_* tools work', async t => {
    if (!unityAvailable) {
      t.skip('Unity not available');
      return;
    }

    await rpc.request(
      'tools/call',
      { name: 'load_scene', arguments: { scenePath: SCENES.uitk, loadMode: 'Single' } },
      { timeoutMs: 60_000 }
    );
    await rpc.request(
      'tools/call',
      { name: 'play_game', arguments: { maxWaitMs: 60_000 } },
      { timeoutMs: 120_000 }
    );

    await waitFor(async () => {
      const st = await rpc.request('tools/call', {
        name: 'get_ui_element_state',
        arguments: { elementPath: 'uitk:/UITK/UIDocument#UITK_Status' }
      });
      const json = parseToolJson(st);
      return json && typeof json.text === 'string' && json.text.includes('UITK clicks=');
    });

    const findButtons = parseToolJson(
      await rpc.request('tools/call', {
        name: 'find_ui_elements',
        arguments: { elementType: 'Button', uiSystem: 'uitk' }
      })
    );
    assert.ok(findButtons?.elements?.some(e => e.path === 'uitk:/UITK/UIDocument#UITK_Button'));

    const before = parseToolJson(
      await rpc.request('tools/call', {
        name: 'get_ui_element_state',
        arguments: { elementPath: 'uitk:/UITK/UIDocument#UITK_Status' }
      })
    );
    assert.match(before.text, /UITK clicks=0/);

    const clickResult = parseToolJson(
      await rpc.request('tools/call', {
        name: 'click_ui_element',
        arguments: { elementPath: 'uitk:/UITK/UIDocument#UITK_Button', clickType: 'left' }
      })
    );
    assert.equal(clickResult.success, true);

    await waitFor(async () => {
      const after = parseToolJson(
        await rpc.request('tools/call', {
          name: 'get_ui_element_state',
          arguments: { elementPath: 'uitk:/UITK/UIDocument#UITK_Status' }
        })
      );
      return after && typeof after.text === 'string' && /UITK clicks=1/.test(after.text);
    });

    const setToggle = parseToolJson(
      await rpc.request('tools/call', {
        name: 'set_ui_element_value',
        arguments: {
          elementPath: 'uitk:/UITK/UIDocument#UITK_Toggle',
          value: true,
          triggerEvents: true
        }
      })
    );
    assert.equal(setToggle.success, true);

    const toggleState = parseToolJson(
      await rpc.request('tools/call', {
        name: 'get_ui_element_state',
        arguments: {
          elementPath: 'uitk:/UITK/UIDocument#UITK_Toggle',
          includeInteractableInfo: true
        }
      })
    );
    assert.equal(toggleState.value, true);
  });

  it('IMGUI: load_scene → play → ui_* tools work', async t => {
    if (!unityAvailable) {
      t.skip('Unity not available');
      return;
    }

    await rpc.request(
      'tools/call',
      { name: 'load_scene', arguments: { scenePath: SCENES.imgui, loadMode: 'Single' } },
      { timeoutMs: 60_000 }
    );
    await rpc.request(
      'tools/call',
      { name: 'play_game', arguments: { maxWaitMs: 60_000 } },
      { timeoutMs: 120_000 }
    );

    await waitFor(async () => {
      const st = parseToolJson(
        await rpc.request('tools/call', {
          name: 'get_ui_element_state',
          arguments: { elementPath: 'imgui:IMGUI/Button' }
        })
      );
      return st && typeof st.value === 'number';
    });

    const findButtons = parseToolJson(
      await rpc.request('tools/call', {
        name: 'find_ui_elements',
        arguments: { elementType: 'Button', uiSystem: 'imgui' }
      })
    );
    assert.ok(findButtons?.elements?.some(e => e.path === 'imgui:IMGUI/Button'));

    const before = parseToolJson(
      await rpc.request('tools/call', {
        name: 'get_ui_element_state',
        arguments: { elementPath: 'imgui:IMGUI/Button' }
      })
    );
    assert.equal(before.value, 0);

    const clickResult = parseToolJson(
      await rpc.request('tools/call', {
        name: 'click_ui_element',
        arguments: { elementPath: 'imgui:IMGUI/Button', clickType: 'left' }
      })
    );
    assert.equal(clickResult.success, true);

    await waitFor(async () => {
      const after = parseToolJson(
        await rpc.request('tools/call', {
          name: 'get_ui_element_state',
          arguments: { elementPath: 'imgui:IMGUI/Button' }
        })
      );
      return after && after.value === 1;
    });

    const setText = parseToolJson(
      await rpc.request('tools/call', {
        name: 'set_ui_element_value',
        arguments: { elementPath: 'imgui:IMGUI/TextField', value: 'abc', triggerEvents: true }
      })
    );
    assert.equal(setText.success, true);

    const textState = parseToolJson(
      await rpc.request('tools/call', {
        name: 'get_ui_element_state',
        arguments: { elementPath: 'imgui:IMGUI/TextField' }
      })
    );
    assert.equal(textState.value, 'abc');
  });
});
