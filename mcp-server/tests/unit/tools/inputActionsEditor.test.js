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
    unity.response = { success: true, message: 'ok', extra: 'value' };
    const created = await createActionMapHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay'
    });
    assert.equal(created.isError, false);

    unity.response = { error: 'bad' };
    const errored = await removeActionMapHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay'
    });
    assert.equal(errored.isError, true);

    unity.response = { success: true };
    const removed = await removeActionMapHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay'
    });
    assert.equal(removed.isError, false);
  });

  it('formats success responses for action handlers', async () => {
    const unity = new MockUnityConnection();
    unity.response = 'bad';
    const invalid = await addInputActionHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Jump'
    });
    assert.equal(invalid.isError, true);

    unity.response = { success: true, message: 'added' };
    const added = await addInputActionHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Jump'
    });
    assert.equal(added.isError, false);

    unity.response = { success: false };
    const removed = await removeInputActionHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Jump'
    });
    assert.equal(removed.isError, false);
  });

  it('returns error when sendCommand throws', async () => {
    const unity = new MockUnityConnection();
    unity.sendCommand = async () => {
      throw new Error('boom');
    };
    const res = await addInputBindingHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Jump',
      path: '<Keyboard>/space'
    });
    assert.equal(res.isError, true);
  });

  it('formats success responses for binding handlers', async () => {
    const unity = new MockUnityConnection();
    unity.connected = false;
    const removeDisconnected = await removeInputBindingHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Jump',
      bindingPath: '<Keyboard>/space'
    });
    assert.equal(removeDisconnected.isError, true);

    unity.connected = true;
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

    unity.sendCommand = async () => {
      throw new Error('boom');
    };
    const removeErrored = await removeInputBindingHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Jump',
      bindingPath: '<Keyboard>/space'
    });
    assert.equal(removeErrored.isError, true);
  });

  it('covers composite/removeAll/manage control schemes handlers', async () => {
    const unity = new MockUnityConnection();
    unity.connected = false;
    const removeAllDisconnected = await removeAllBindingsHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Jump'
    });
    assert.equal(removeAllDisconnected.isError, true);

    const compositeDisconnected = await createCompositeBindingHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Move',
      bindings: { up: '<Keyboard>/w' },
      compositeType: '2DVector'
    });
    assert.equal(compositeDisconnected.isError, true);

    const schemeDisconnected = await manageControlSchemesHandler(unity, {
      assetPath: 'Assets/Input.actions',
      operation: 'remove',
      schemeName: 'Keyboard&Mouse',
      devices: ['Keyboard', 'Mouse']
    });
    assert.equal(schemeDisconnected.isError, true);

    unity.connected = true;
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
      operation: 'modify',
      schemeName: 'Gamepad',
      devices: ['Keyboard', 'Mouse']
    });
    assert.equal(scheme.isError, false);

    const schemeAdded = await manageControlSchemesHandler(unity, {
      assetPath: 'Assets/Input.actions',
      operation: 'add',
      schemeName: 'Keyboard&Mouse',
      devices: ['Keyboard', 'Mouse']
    });
    assert.equal(schemeAdded.isError, false);

    const schemeRemoved = await manageControlSchemesHandler(unity, {
      assetPath: 'Assets/Input.actions',
      operation: 'remove',
      schemeName: 'Keyboard&Mouse',
      devices: ['Keyboard', 'Mouse']
    });
    assert.equal(schemeRemoved.isError, false);

    unity.sendCommand = async () => {
      throw new Error('nope');
    };
    const removeAllErrored = await removeAllBindingsHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Jump'
    });
    assert.equal(removeAllErrored.isError, true);

    const manageErrored = await manageControlSchemesHandler(unity, {
      assetPath: 'Assets/Input.actions',
      operation: 'remove',
      schemeName: 'Keyboard&Mouse',
      devices: ['Keyboard', 'Mouse']
    });
    assert.equal(manageErrored.isError, true);

    const compositeErrored = await createCompositeBindingHandler(unity, {
      assetPath: 'Assets/Input.actions',
      mapName: 'Gameplay',
      actionName: 'Move',
      bindings: { up: '<Keyboard>/w' },
      compositeType: '2DVector',
      name: 'MoveComposite'
    });
    assert.equal(compositeErrored.isError, true);
  });
});
