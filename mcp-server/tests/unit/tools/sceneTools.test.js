import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSceneHandler } from '../../../src/tools/scene/createScene.js';
import { listScenesHandler } from '../../../src/tools/scene/listScenes.js';
import { loadSceneHandler } from '../../../src/tools/scene/loadScene.js';
import { saveSceneHandler } from '../../../src/tools/scene/saveScene.js';
import { getSceneInfoHandler } from '../../../src/tools/scene/getSceneInfo.js';

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

describe('scene tool handlers', () => {
  it('createSceneHandler validates scene name', async () => {
    const unity = new MockUnityConnection();
    unity.connected = false;
    const notConnected = await createSceneHandler(unity, { sceneName: 'X' });
    assert.equal(notConnected.isError, true);

    unity.connected = true;
    const empty = await createSceneHandler(unity, { sceneName: '' });
    assert.equal(empty.isError, true);

    const invalid = await createSceneHandler(unity, { sceneName: 'Bad/Name' });
    assert.equal(invalid.isError, true);

    unity.response = { status: 'error', error: 'bad' };
    const errored = await createSceneHandler(unity, { sceneName: 'Main' });
    assert.equal(errored.isError, true);

    unity.response = { result: { summary: 'created' } };
    const ok = await createSceneHandler(unity, { sceneName: 'Main' });
    assert.equal(ok.isError, false);

    unity.sendCommand = async () => {
      throw new Error('boom');
    };
    const thrown = await createSceneHandler(unity, { sceneName: 'Main' });
    assert.equal(thrown.isError, true);
  });

  it('listScenesHandler returns scene list', async () => {
    const unity = new MockUnityConnection();
    unity.connected = false;
    const notConnected = await listScenesHandler(unity, {});
    assert.equal(notConnected.isError, true);

    unity.connected = true;
    unity.response = { status: 'error', error: 'bad' };
    const errored = await listScenesHandler(unity, {});
    assert.equal(errored.isError, true);

    unity.response = { result: { summary: 'scenes', totalCount: 1 } };
    const ok = await listScenesHandler(unity, {});
    assert.equal(ok.isError, false);

    unity.sendCommand = async () => {
      throw new Error('boom');
    };
    const thrown = await listScenesHandler(unity, {});
    assert.equal(thrown.isError, true);
  });

  it('loadSceneHandler validates params', async () => {
    const unity = new MockUnityConnection();
    unity.connected = false;
    const notConnected = await loadSceneHandler(unity, { sceneName: 'Main' });
    assert.equal(notConnected.isError, true);

    unity.connected = true;
    const missing = await loadSceneHandler(unity, {});
    assert.equal(missing.isError, true);

    const both = await loadSceneHandler(unity, {
      sceneName: 'Main',
      scenePath: 'Assets/Scenes/Main.unity'
    });
    assert.equal(both.isError, true);

    const invalidMode = await loadSceneHandler(unity, {
      sceneName: 'Main',
      loadMode: 'Bad'
    });
    assert.equal(invalidMode.isError, true);

    unity.response = { status: 'error', error: 'bad' };
    const errored = await loadSceneHandler(unity, { sceneName: 'Main' });
    assert.equal(errored.isError, true);

    unity.response = { result: { summary: 'loaded' } };
    const ok = await loadSceneHandler(unity, { sceneName: 'Main' });
    assert.equal(ok.isError, false);

    unity.sendCommand = async () => {
      throw new Error('boom');
    };
    const thrown = await loadSceneHandler(unity, { sceneName: 'Main' });
    assert.equal(thrown.isError, true);
  });

  it('saveSceneHandler validates params', async () => {
    const unity = new MockUnityConnection();
    unity.connected = false;
    const notConnected = await saveSceneHandler(unity, {});
    assert.equal(notConnected.isError, true);

    unity.connected = true;
    const missing = await saveSceneHandler(unity, {});
    assert.equal(missing.isError, true);

    const saveAsMissing = await saveSceneHandler(unity, { saveAs: true });
    assert.equal(saveAsMissing.isError, true);

    unity.response = { status: 'error', error: 'bad' };
    const errored = await saveSceneHandler(unity, { saveAs: true, scenePath: 'Assets/Scenes/X.unity' });
    assert.equal(errored.isError, true);

    unity.response = { result: { summary: 'saved' } };
    const ok = await saveSceneHandler(unity, { saveAs: true, scenePath: 'Assets/Scenes/Main.unity' });
    assert.equal(ok.isError, false);

    unity.sendCommand = async () => {
      throw new Error('boom');
    };
    const thrown = await saveSceneHandler(unity, { saveAs: true, scenePath: 'Assets/Scenes/Main.unity' });
    assert.equal(thrown.isError, true);
  });

  it('getSceneInfoHandler handles errors', async () => {
    const unity = new MockUnityConnection();
    unity.connected = false;
    const notConnected = await getSceneInfoHandler(unity, {});
    assert.equal(notConnected.isError, true);

    unity.connected = true;
    const invalid = await getSceneInfoHandler(unity, {
      sceneName: 'Main',
      scenePath: 'Assets/Scenes/Main.unity'
    });
    assert.equal(invalid.isError, true);

    unity.response = { error: 'bad' };
    const errored = await getSceneInfoHandler(unity, {});
    assert.equal(errored.isError, true);

    unity.response = { summary: 'info' };
    const ok = await getSceneInfoHandler(unity, {});
    assert.equal(ok.isError, false);

    unity.sendCommand = async () => {
      throw new Error('boom');
    };
    const thrown = await getSceneInfoHandler(unity, {});
    assert.equal(thrown.isError, true);
  });
});
