import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createActionMapHandler,
  removeActionMapHandler,
  addInputActionHandler,
  removeInputActionHandler,
  addInputBindingHandler,
  removeInputBindingHandler,
  removeAllBindingsHandler,
  createCompositeBindingHandler,
  manageControlSchemesHandler
} from '../../../src/tools/input/inputActionsEditor.js';

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

describe('input actions editor handlers', () => {
  it('handles connection errors', async () => {
    const unity = new MockUnityConnection();
    unity.connected = false;
    const res = await createActionMapHandler(unity, { assetPath: 'Assets/Input.actions', mapName: 'Gameplay' });
    assert.equal(res.isError, true);
  });

  it('formats success responses for action map handlers', async () => {
    const unity = new MockUnityConnection();
    unity.response = { success: true };
    const created = await createActionMapHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay'
    });
    assert.equal(created.isError, false);

    const removed = await removeActionMapHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay'
    });
    assert.equal(removed.isError, false);
  });

  it('formats success responses for action handlers', async () => {
    const unity = new MockUnityConnection();
    unity.response = { success: true };
    const added = await addInputActionHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Jump'
    });
    assert.equal(added.isError, false);

    const removed = await removeInputActionHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Jump'
    });
    assert.equal(removed.isError, false);
  });

  it('formats success responses for binding handlers', async () => {
    const unity = new MockUnityConnection();
    unity.response = { success: true };
    const added = await addInputBindingHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Jump',
      path: '<Keyboard>/space'
    });
    assert.equal(added.isError, false);

    const removed = await removeInputBindingHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Jump',
      bindingPath: '<Keyboard>/space'
    });
    assert.equal(removed.isError, false);
  });

  it('covers composite/removeAll/manage control schemes handlers', async () => {
    const unity = new MockUnityConnection();
    unity.response = { success: true };
    const cleared = await removeAllBindingsHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Jump'
    });
    assert.equal(cleared.isError, false);

    const composite = await createCompositeBindingHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Move',
      bindings: { up: '<Keyboard>/w' },
      compositeType: '2DVector'
    });
    assert.equal(composite.isError, false);

    const scheme = await manageControlSchemesHandler(unity, {
      assetPath: 'Assets/Input.actions',
      operation: 'add',
      schemeName: 'Keyboard&Mouse',
      devices: ['Keyboard', 'Mouse']
    });
    assert.equal(scheme.isError, false);
  });
});
