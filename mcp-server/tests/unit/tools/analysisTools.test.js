import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSceneContentsHandler } from '../../../src/tools/analysis/analyzeSceneContents.js';
import { findByComponentHandler } from '../../../src/tools/analysis/findByComponent.js';
import { getObjectReferencesHandler } from '../../../src/tools/analysis/getObjectReferences.js';
import {
  getInputActionsStateHandler,
  analyzeInputActionsAssetHandler
} from '../../../src/tools/analysis/getInputActionsState.js';
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

    unity.response = { error: 'boom' };
    const errored = await analyzeSceneContentsHandler(unity, {});
    assert.equal(errored.isError, true);

    unity.sendCommand = async () => {
      throw new Error('explode');
    };
    const thrown = await analyzeSceneContentsHandler(unity, {});
    assert.equal(thrown.isError, true);

    unity.sendCommand = async () => unity.response;
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
    unity.response = { error: 'bad' };
    const errored = await findByComponentHandler(unity, { componentType: 'Light' });
    assert.equal(errored.isError, true);

    unity.response = 'bad';
    const invalid = await findByComponentHandler(unity, { componentType: 'Light' });
    assert.equal(invalid.isError, true);

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

    unity.response = 'bad';
    const invalid = await getObjectReferencesHandler(unity, { gameObjectName: 'Player' });
    assert.equal(invalid.isError, true);

    unity.response = { summary: 'refs' };
    const success = await getObjectReferencesHandler(unity, { gameObjectName: 'Player' });
    assert.equal(success.isError, false);
    assert.match(success.content[0].text, /refs/);
  });

  it('getInputActionsStateHandler handles invalid and success responses', async () => {
    const unity = new MockUnityConnection();
    unity.connected = false;
    const notConnected = await getInputActionsStateHandler(unity, {});
    assert.equal(notConnected.isError, true);

    unity.connected = true;
    unity.sendCommand = async () => {
      throw new Error('boom');
    };
    const thrown = await getInputActionsStateHandler(unity, {});
    assert.equal(thrown.isError, true);

    unity.sendCommand = async () => unity.response;
    unity.response = 'bad';
    const invalid = await getInputActionsStateHandler(unity, {});
    assert.equal(invalid.isError, true);

    unity.response = { error: 'bad' };
    const errored = await getInputActionsStateHandler(unity, {});
    assert.equal(errored.isError, true);

    unity.response = {
      assetName: 'Input',
      assetPath: 'Assets/Input.actions',
      actionMaps: [
        {
          name: 'Gameplay',
          id: 'map-1',
          actions: [
            {
              name: 'Jump',
              type: 'Button',
              expectedControlType: 'Button',
              bindings: [
                { path: '<Keyboard>/space', groups: 'Keyboard&Mouse' },
                { isComposite: true, name: '2DVector' },
                { isPartOfComposite: true, path: '<Keyboard>/w' }
              ]
            }
          ]
        }
      ],
      controlSchemes: [
        {
          name: 'Keyboard',
          bindingGroup: 'Keyboard&Mouse',
          devices: [{ controlPath: '<Keyboard>', isOptional: true }]
        }
      ],
      jsonStructure: { maps: [{ name: 'Gameplay' }] }
    };
    const success = await getInputActionsStateHandler(unity, {});
    assert.equal(success.isError, false);
    assert.match(success.content[0].text, /Action Maps/);
    assert.match(success.content[0].text, /JSON Structure/);
  });

  it('analyzeInputActionsAssetHandler formats details', async () => {
    const unity = new MockUnityConnection();
    unity.connected = false;
    const notConnected = await analyzeInputActionsAssetHandler(unity, {
      assetPath: 'Assets/Input.actions'
    });
    assert.equal(notConnected.isError, true);

    unity.connected = true;
    const missingPath = await analyzeInputActionsAssetHandler(unity, {});
    assert.equal(missingPath.isError, true);

    unity.response = 'bad';
    const invalid = await analyzeInputActionsAssetHandler(unity, {
      assetPath: 'Assets/Input.actions'
    });
    assert.equal(invalid.isError, true);

    unity.response = { error: 'bad' };
    const errored = await analyzeInputActionsAssetHandler(unity, {
      assetPath: 'Assets/Input.actions'
    });
    assert.equal(errored.isError, true);

    unity.response = {
      assetName: 'Input',
      assetPath: 'Assets/Input.actions',
      actionMapCount: 1,
      statistics: {
        totalActions: 2,
        totalBindings: 3,
        totalControlSchemes: 1,
        devicesUsed: ['Keyboard', 'Mouse']
      },
      actionMaps: [
        {
          name: 'Gameplay',
          actionCount: 2,
          bindingCount: 3,
          actions: [
            {
              name: 'Move',
              type: 'Value',
              id: 'action-1',
              expectedControlType: 'Vector2',
              bindingCount: 2,
              bindings: [
                { isComposite: true, name: '2DVector' },
                { isPartOfComposite: true, name: 'up', path: '<Keyboard>/w' }
              ]
            },
            {
              name: 'Jump',
              type: 'Button',
              id: 'action-2',
              bindingCount: 1,
              bindings: [
                {
                  path: '<Keyboard>/space',
                  groups: 'Keyboard&Mouse',
                  interactions: 'press',
                  processors: 'invert'
                }
              ]
            }
          ]
        }
      ],
      jsonStructure: { maps: [{ name: 'Gameplay' }] }
    };
    const success = await analyzeInputActionsAssetHandler(unity, {
      assetPath: 'Assets/Input.actions'
    });
    assert.equal(success.isError, false);
    assert.match(success.content[0].text, /Statistics/);
    assert.match(success.content[0].text, /Raw JSON Structure/);
  });

  it('getGameObjectDetailsHandler formats response', async () => {
    const unity = new MockUnityConnection();
    unity.connected = true;
    const missing = await getGameObjectDetailsHandler(unity, {});
    assert.equal(missing.isError, true);

    const both = await getGameObjectDetailsHandler(unity, {
      gameObjectName: 'Player',
      path: '/Player'
    });
    assert.equal(both.isError, true);

    const badDepth = await getGameObjectDetailsHandler(unity, {
      gameObjectName: 'Player',
      maxDepth: 20
    });
    assert.equal(badDepth.isError, true);

    unity.response = { error: 'not found' };
    const error = await getGameObjectDetailsHandler(unity, { gameObjectName: 'Player' });
    assert.equal(error.isError, true);

    unity.response = 'bad';
    const invalid = await getGameObjectDetailsHandler(unity, { gameObjectName: 'Player' });
    assert.equal(invalid.isError, true);

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

    const missingType = await getComponentValuesHandler(unity, { gameObjectName: 'Player' });
    assert.equal(missingType.isError, true);

    const badIndex = await getComponentValuesHandler(unity, {
      gameObjectName: 'Player',
      componentType: 'Camera',
      componentIndex: -1
    });
    assert.equal(badIndex.isError, true);

    unity.response = { error: 'bad' };
    const errored = await getComponentValuesHandler(unity, {
      gameObjectName: 'Player',
      componentType: 'Camera'
    });
    assert.equal(errored.isError, true);

    unity.response = {
      summary: 'values',
      properties: {
        health: { value: 10, type: 'int', range: { min: 0, max: 100 }, tooltip: 'hp' },
        hidden: { value: 1, type: 'int', hiddenInInspector: true },
        serialized: { value: 1, type: 'int', serialized: true },
        errorProp: { error: 'bad' }
      },
      debug: { propertiesType: 'object', propertiesCount: 4, firstPropertyKey: 'health' }
    };
    const success = await getComponentValuesHandler(unity, {
      gameObjectName: 'Player',
      componentType: 'Camera'
    });
    assert.equal(success.isError, false);
    assert.match(success.content[0].text, /Properties/);
  });

  it('getAnimatorStateHandler and runtime handler cover required args', async () => {
    const unity = new MockUnityConnection();
    unity.connected = true;
    const missing = await getAnimatorStateHandler(unity, {});
    assert.equal(missing.isError, true);

    unity.connected = false;
    const notConnected = await getAnimatorStateHandler(unity, { gameObjectName: 'Player' });
    assert.equal(notConnected.isError, true);

    unity.connected = true;
    unity.response = 'bad';
    const invalid = await getAnimatorStateHandler(unity, { gameObjectName: 'Player' });
    assert.equal(invalid.isError, true);

    unity.response = { error: 'bad' };
    const errored = await getAnimatorStateHandler(unity, { gameObjectName: 'Player' });
    assert.equal(errored.isError, true);

    unity.response = {
      summary: 'anim',
      controllerName: 'Controller',
      layers: [
        {
          layerIndex: 0,
          layerName: 'Base',
          layerWeight: 1,
          currentState: { name: 'Idle', normalizedTime: 0.5, speed: 1, motion: 'Idle' },
          activeTransition: {
            duration: 0.1,
            normalizedTime: 0.5,
            nextState: { name: 'Run' }
          }
        },
        {
          layerIndex: 1,
          layerName: 'Upper',
          layerWeight: 0.5,
          currentState: { fullPathHash: 123, normalizedTime: 0.25, speed: 0.8 },
          activeTransition: {
            duration: 0.2,
            normalizedTime: 0.2
          }
        }
      ],
      parameters: {
        Speed: { type: 'Float', value: 1, defaultValue: 0 },
        Fire: { type: 'Trigger', value: true },
        Alive: { type: 'Bool', value: true }
      }
    };
    const success = await getAnimatorStateHandler(unity, { gameObjectName: 'Player' });
    assert.equal(success.isError, false);

    unity.sendCommand = async () => {
      throw new Error('explode');
    };
    const thrown = await getAnimatorStateHandler(unity, { gameObjectName: 'Player' });
    assert.equal(thrown.isError, true);
    unity.sendCommand = async () => unity.response;

    unity.connected = false;
    const runtimeMissing = await getAnimatorRuntimeInfoHandler(unity, { gameObjectName: 'Player' });
    assert.equal(runtimeMissing.isError, true);

    unity.connected = true;
    unity.response = 'bad';
    const runtimeInvalid = await getAnimatorRuntimeInfoHandler(unity, { gameObjectName: 'Player' });
    assert.equal(runtimeInvalid.isError, true);

    unity.response = {
      summary: 'runtime',
      runtimeAnimatorController: 'Controller',
      updateMode: 'Normal',
      cullingMode: 'AlwaysAnimate',
      speed: 1,
      playbackTime: 0.5,
      avatar: { name: 'Avatar', isValid: true, isHuman: true },
      rootMotion: {
        applyRootMotion: true,
        hasRootMotion: true,
        velocity: { x: 1, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 1, z: 0 }
      },
      ikInfo: {
        humanScale: 1,
        feetPivotActive: true,
        pivotWeight: 0.5,
        goals: {
          LeftFoot: { positionWeight: 1, rotationWeight: 1 }
        }
      },
      behaviours: [{ layer: 0, type: 'Behaviour', enabled: true }],
      hasBoundPlayables: true,
      hasTransformHierarchy: true,
      isOptimizable: false,
      gravityWeight: 1
    };
    const runtime = await getAnimatorRuntimeInfoHandler(unity, { gameObjectName: 'Player' });
    assert.equal(runtime.isError, false);
  });
});
