import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { UnityConnection } from '../../src/core/unityConnection.js';

import { SceneLoadToolHandler } from '../../src/handlers/scene/SceneLoadToolHandler.js';
import { PlaymodePlayToolHandler } from '../../src/handlers/playmode/PlaymodePlayToolHandler.js';
import { PlaymodeStopToolHandler } from '../../src/handlers/playmode/PlaymodeStopToolHandler.js';

import { UIFindElementsToolHandler } from '../../src/handlers/ui/UIFindElementsToolHandler.js';
import { UIClickElementToolHandler } from '../../src/handlers/ui/UIClickElementToolHandler.js';
import { UISetElementValueToolHandler } from '../../src/handlers/ui/UISetElementValueToolHandler.js';
import { UIGetElementStateToolHandler } from '../../src/handlers/ui/UIGetElementStateToolHandler.js';

const SCENES = {
  ugui: 'Assets/Scenes/MCP_UI_UGUI_TestScene.unity',
  uitk: 'Assets/Scenes/MCP_UI_UITK_TestScene.unity',
  imgui: 'Assets/Scenes/MCP_UI_IMGUI_TestScene.unity'
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, Math.max(0, ms)));
}

function isUnityError(result) {
  return result && typeof result === 'object' && typeof result.error === 'string';
}

async function waitFor(fn, { timeoutMs = 15000, pollMs = 200 } = {}) {
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

describe('UI automation scenes (real Unity)', () => {
  /** @type {UnityConnection|null} */
  let connection = null;
  let sceneLoad;
  let play;
  let stop;
  let uiFind;
  let uiClick;
  let uiSet;
  let uiState;

  before(async () => {
    connection = new UnityConnection();
    try {
      await connection.connect();
    } catch (e) {
      connection = null;
      return;
    }

    sceneLoad = new SceneLoadToolHandler(connection);
    play = new PlaymodePlayToolHandler(connection);
    stop = new PlaymodeStopToolHandler(connection);
    uiFind = new UIFindElementsToolHandler(connection);
    uiClick = new UIClickElementToolHandler(connection);
    uiSet = new UISetElementValueToolHandler(connection);
    uiState = new UIGetElementStateToolHandler(connection);
  });

  after(async () => {
    if (!connection) return;
    try {
      const editor = await connection.sendCommand('get_editor_state', {});
      if (editor?.state?.isPlaying) {
        await stop.execute({ maxWaitMs: 60000 });
      }
    } catch {}
    connection.disconnect();
  });

  afterEach(async () => {
    if (!connection) return;
    try {
      const editor = await connection.sendCommand('get_editor_state', {});
      if (editor?.state?.isPlaying) {
        await stop.execute({ maxWaitMs: 60000 });
      }
    } catch {}
  });

  it('UGUI: scene_load → play → MCP UI tools work', async t => {
    if (!connection) {
      t.skip('Unity not available');
      return;
    }

    await sceneLoad.execute({ scenePath: SCENES.ugui, loadMode: 'Single' });
    await play.execute({ maxWaitMs: 60000 });

    await waitFor(async () => {
      const st = await uiState.execute({ elementPath: '/Canvas/UGUI_Panel/UGUI_StatusText' });
      return !isUnityError(st) && typeof st.text === 'string' && st.text.includes('UGUI clicks=');
    });

    const findButtons = await uiFind.execute({ elementType: 'Button', uiSystem: 'ugui' });
    assert.ok(findButtons?.elements?.some(e => e.path === '/Canvas/UGUI_Panel/UGUI_Button'));

    const beforeText = (
      await uiState.execute({ elementPath: '/Canvas/UGUI_Panel/UGUI_StatusText' })
    ).text;
    assert.match(beforeText, /UGUI clicks=0/);

    const clickResult = await uiClick.execute({
      elementPath: '/Canvas/UGUI_Panel/UGUI_Button',
      clickType: 'left'
    });
    assert.equal(clickResult.success, true);

    await waitFor(async () => {
      const after = await uiState.execute({ elementPath: '/Canvas/UGUI_Panel/UGUI_StatusText' });
      return (
        !isUnityError(after) && typeof after.text === 'string' && /UGUI clicks=1/.test(after.text)
      );
    });

    const setValueResult = await uiSet.execute({
      elementPath: '/Canvas/UGUI_Panel/UGUI_InputField',
      value: 'hello',
      triggerEvents: true
    });
    assert.equal(setValueResult.success, true);

    await waitFor(async () => {
      const after = await uiState.execute({ elementPath: '/Canvas/UGUI_Panel/UGUI_StatusText' });
      return (
        !isUnityError(after) &&
        typeof after.text === 'string' &&
        after.text.includes("Input='hello'")
      );
    });
  });

  it('UI Toolkit: scene_load → play → MCP UI tools work', async t => {
    if (!connection) {
      t.skip('Unity not available');
      return;
    }

    await sceneLoad.execute({ scenePath: SCENES.uitk, loadMode: 'Single' });
    await play.execute({ maxWaitMs: 60000 });

    await waitFor(async () => {
      const st = await uiState.execute({ elementPath: 'uitk:/UITK/UIDocument#UITK_Status' });
      return !isUnityError(st) && typeof st.text === 'string' && st.text.includes('UITK clicks=');
    });

    const findButtons = await uiFind.execute({ elementType: 'Button', uiSystem: 'uitk' });
    assert.ok(findButtons?.elements?.some(e => e.path === 'uitk:/UITK/UIDocument#UITK_Button'));

    const before = await uiState.execute({ elementPath: 'uitk:/UITK/UIDocument#UITK_Status' });
    assert.match(before.text, /UITK clicks=0/);

    const clickResult = await uiClick.execute({
      elementPath: 'uitk:/UITK/UIDocument#UITK_Button',
      clickType: 'left'
    });
    assert.equal(clickResult.success, true);

    await waitFor(async () => {
      const after = await uiState.execute({ elementPath: 'uitk:/UITK/UIDocument#UITK_Status' });
      return (
        !isUnityError(after) && typeof after.text === 'string' && /UITK clicks=1/.test(after.text)
      );
    });

    const setToggle = await uiSet.execute({
      elementPath: 'uitk:/UITK/UIDocument#UITK_Toggle',
      value: true,
      triggerEvents: true
    });
    assert.equal(setToggle.success, true);

    const toggleState = await uiState.execute({
      elementPath: 'uitk:/UITK/UIDocument#UITK_Toggle',
      includeInteractableInfo: true
    });
    assert.equal(toggleState.value, true);
  });

  it('IMGUI: scene_load → play → MCP UI tools work', async t => {
    if (!connection) {
      t.skip('Unity not available');
      return;
    }

    await sceneLoad.execute({ scenePath: SCENES.imgui, loadMode: 'Single' });
    await play.execute({ maxWaitMs: 60000 });

    await waitFor(async () => {
      const st = await uiState.execute({ elementPath: 'imgui:IMGUI/Button' });
      return !isUnityError(st) && typeof st.value === 'number';
    });

    const findButtons = await uiFind.execute({ elementType: 'Button', uiSystem: 'imgui' });
    assert.ok(findButtons?.elements?.some(e => e.path === 'imgui:IMGUI/Button'));

    const before = await uiState.execute({ elementPath: 'imgui:IMGUI/Button' });
    assert.equal(before.value, 0);

    const clickResult = await uiClick.execute({
      elementPath: 'imgui:IMGUI/Button',
      clickType: 'left'
    });
    assert.equal(clickResult.success, true);

    await waitFor(async () => {
      const after = await uiState.execute({ elementPath: 'imgui:IMGUI/Button' });
      return !isUnityError(after) && after.value === 1;
    });

    const setText = await uiSet.execute({
      elementPath: 'imgui:IMGUI/TextField',
      value: 'abc',
      triggerEvents: true
    });
    assert.equal(setText.success, true);

    const textState = await uiState.execute({ elementPath: 'imgui:IMGUI/TextField' });
    assert.equal(textState.value, 'abc');
  });
});
