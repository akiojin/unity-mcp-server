import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AnalyzeInputActionsAssetToolHandler } from '../../../../src/handlers/analysis/GetInputActionsStateToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('AnalyzeInputActionsAssetToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({
      sendCommandResult: {
        assetName: 'PlayerInputActions',
        assetPath: 'Assets/Input/PlayerInputActions.inputactions',
        actionMapCount: 1,
        statistics: {
          totalActions: 2,
          totalBindings: 2,
          totalControlSchemes: 1,
          devicesUsed: ['Keyboard']
        },
        actionMaps: []
      }
    });
    handler = new AnalyzeInputActionsAssetToolHandler(mockConnection);
  });

  it('should initialize with correct name', () => {
    assert.equal(handler.name, 'input_actions_asset_analyze');
  });

  it('should call analyze_input_actions_asset in Unity', async () => {
    const result = await handler.execute({
      assetPath: 'Assets/Input/PlayerInputActions.inputactions'
    });

    assert.equal(mockConnection.sendCommand.mock.calls.length, 1);
    assert.equal(
      mockConnection.sendCommand.mock.calls[0].arguments[0],
      'analyze_input_actions_asset'
    );

    assert.equal(result.isError, false);
    assert.ok(result.content[0].text.includes('Input Actions Analysis'));
  });
});
