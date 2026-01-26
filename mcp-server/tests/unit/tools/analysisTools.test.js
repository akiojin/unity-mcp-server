import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSceneContentsHandler } from '../../../src/tools/analysis/analyzeSceneContents.js';
import { findByComponentHandler } from '../../../src/tools/analysis/findByComponent.js';
import { getObjectReferencesHandler } from '../../../src/tools/analysis/getObjectReferences.js';
import { getInputActionsStateHandler } from '../../../src/tools/analysis/getInputActionsState.js';
import { getGameObjectDetailsHandler } from '../../../src/tools/analysis/getGameObjectDetails.js';
import { getComponentValuesHandler } from '../../../src/tools/analysis/getComponentValues.js';
import {
  getAnimatorStateHandler,
  getAnimatorRuntimeInfoHandler
} from '../../../src/tools/analysis/getAnimatorState.js';

class MockUnityConnection {
  constructor() {
    this.connected = true;
    this.response = {};
  }
  isConnected() {
    return this.connected;
  }
  async sendCommand(_command, _args) {
    return this.response;
  }
}

describe('analysis tool handlers', () => {
  it('analyzeSceneContentsHandler covers error and success paths', async () => {
    const unity = new MockUnityConnection();
    unity.connected = false;
    const notConnected = await analyzeSceneContentsHandler(unity, {});
    assert.equal(notConnected.isError, true);

    unity.connected = true;
    unity.response = 'bad';
    const invalid = await analyzeSceneContentsHandler(unity, {});
    assert.equal(invalid.isError, true);

    unity.response = { summary: 'ok' };
    const success = await analyzeSceneContentsHandler(unity, {});
    assert.equal(success.isError, false);
    assert.match(success.content[0].text, /ok/);
  });

  it('findByComponentHandler returns summary', async () => {
    const unity = new MockUnityConnection();
    unity.connected = false;
    const notConnected = await findByComponentHandler(unity, {});
    assert.equal(notConnected.isError, true);

    unity.connected = true;
    unity.response = { summary: 'found' };
    const success = await findByComponentHandler(unity, { componentType: 'Light' });
    assert.equal(success.isError, false);
    assert.match(success.content[0].text, /found/);
  });

  it('getObjectReferencesHandler handles error and success', async () => {
    const unity = new MockUnityConnection();
    unity.connected = false;
    const notConnected = await getObjectReferencesHandler(unity, {});
    assert.equal(notConnected.isError, true);

    unity.connected = true;
    unity.response = { error: 'nope' };
    const errored = await getObjectReferencesHandler(unity, { gameObjectName: 'Player' });
    assert.equal(errored.isError, true);

    unity.response = { summary: 'refs' };
    const success = await getObjectReferencesHandler(unity, { gameObjectName: 'Player' });
    assert.equal(success.isError, false);
    assert.match(success.content[0].text, /refs/);
  });

  it('getInputActionsStateHandler handles invalid and success responses', async () => {
    const unity = new MockUnityConnection();
    unity.connected = true;
    unity.response = 'bad';
    const invalid = await getInputActionsStateHandler(unity, {});
    assert.equal(invalid.isError, true);

    unity.response = { assetName: 'Input', assetPath: 'Assets/Input.actions', actionMaps: [] };
    const success = await getInputActionsStateHandler(unity, {});
    assert.equal(success.isError, false);
  });

  it('getGameObjectDetailsHandler formats response', async () => {
    const unity = new MockUnityConnection();
    unity.connected = true;
    const missing = await getGameObjectDetailsHandler(unity, {});
    assert.equal(missing.isError, true);

    unity.response = { summary: 'details' };
    const success = await getGameObjectDetailsHandler(unity, { gameObjectName: 'Player' });
    assert.equal(success.isError, false);
  });

  it('getComponentValuesHandler handles invalid response', async () => {
    const unity = new MockUnityConnection();
    unity.connected = true;
    unity.response = 'bad';
    const invalid = await getComponentValuesHandler(unity, { gameObjectName: 'Player' });
    assert.equal(invalid.isError, true);

    unity.response = { summary: 'values' };
    const success = await getComponentValuesHandler(unity, {
      gameObjectName: 'Player',
      componentType: 'Camera'
    });
    assert.equal(success.isError, false);
  });

  it('getAnimatorStateHandler and runtime handler cover required args', async () => {
    const unity = new MockUnityConnection();
    unity.connected = true;
    const missing = await getAnimatorStateHandler(unity, {});
    assert.equal(missing.isError, true);

    unity.response = { summary: 'anim' };
    const success = await getAnimatorStateHandler(unity, { gameObjectName: 'Player' });
    assert.equal(success.isError, false);

    unity.response = { summary: 'runtime' };
    const runtime = await getAnimatorRuntimeInfoHandler(unity, { gameObjectName: 'Player' });
    assert.equal(runtime.isError, false);
  });
});
