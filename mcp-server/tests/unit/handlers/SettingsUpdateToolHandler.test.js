import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SettingsUpdateToolHandler } from '../../../src/handlers/settings/SettingsUpdateToolHandler.js';

describe('SettingsUpdateToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    // Create a mock Unity connection
    mockConnection = {
      isConnected: () => true,
      connect: async () => {},
      sendCommand: async (command, params) => {
        // Mock successful response
        if (command === 'update_project_settings') {
          if (!params.confirmChanges) {
            return {
              error: 'confirmChanges must be true to update settings',
              code: 'CONFIRMATION_REQUIRED'
            };
          }

          return {
            success: true,
            results: {
              player: params.player ? { updated: true } : undefined,
              graphics: params.graphics ? { updated: true } : undefined,
              physics: params.physics ? { updated: true } : undefined
            },
            previousValues: {},
            requiresRestart: params.graphics?.colorSpace !== undefined,
            message: 'Settings updated successfully.'
          };
        }
        throw new Error(`Unknown command: ${command}`);
      }
    };

    handler = new SettingsUpdateToolHandler(mockConnection);
  });

  describe('validate', () => {
    it('should fail validation without confirmChanges', () => {
      assert.throws(
        () => handler.validate({ player: { version: '1.0.0' } }),
        /confirmChanges must be set to true/
      );
    });

    it('should fail validation without any settings', () => {
      assert.throws(
        () => handler.validate({ confirmChanges: true }),
        /At least one settings category must be provided/
      );
    });

    it('should pass validation with confirmChanges and settings', () => {
      assert.doesNotThrow(() =>
        handler.validate({
          confirmChanges: true,
          player: { version: '1.0.0' }
        })
      );
    });

    it('should validate globalVolume range', () => {
      assert.throws(
        () =>
          handler.validate({
            confirmChanges: true,
            audio: { globalVolume: 1.5 }
          }),
        /globalVolume must be a number between 0 and 1/
      );

      assert.doesNotThrow(() =>
        handler.validate({
          confirmChanges: true,
          audio: { globalVolume: 0.5 }
        })
      );
    });

    it('should validate vSyncCount range', () => {
      assert.throws(
        () =>
          handler.validate({
            confirmChanges: true,
            quality: { vSyncCount: 5 }
          }),
        /vSyncCount must be an integer between 0 and 4/
      );

      assert.doesNotThrow(() =>
        handler.validate({
          confirmChanges: true,
          quality: { vSyncCount: 1 }
        })
      );
    });

    it('should validate antiAliasing values', () => {
      assert.throws(
        () =>
          handler.validate({
            confirmChanges: true,
            quality: { antiAliasing: 3 }
          }),
        /antiAliasing must be 0, 2, 4, or 8/
      );

      assert.doesNotThrow(() =>
        handler.validate({
          confirmChanges: true,
          quality: { antiAliasing: 4 }
        })
      );
    });

    it('should validate colorSpace values', () => {
      assert.throws(
        () =>
          handler.validate({
            confirmChanges: true,
            graphics: { colorSpace: 'sRGB' }
          }),
        /colorSpace must be either "Gamma" or "Linear"/
      );

      assert.doesNotThrow(() =>
        handler.validate({
          confirmChanges: true,
          graphics: { colorSpace: 'Linear' }
        })
      );
    });

    it('should validate timeScale range', () => {
      assert.throws(
        () =>
          handler.validate({
            confirmChanges: true,
            time: { timeScale: -1 }
          }),
        /timeScale must be a non-negative number/
      );

      assert.doesNotThrow(() =>
        handler.validate({
          confirmChanges: true,
          time: { timeScale: 1.5 }
        })
      );
    });
  });

  describe('execute', () => {
    it('should update settings with confirmation', async () => {
      const result = await handler.execute({
        confirmChanges: true,
        player: {
          companyName: 'New Company',
          version: '2.0.0'
        }
      });

      assert.ok(result.success);
      assert.ok(result.results.player);
      assert.equal(result.message, 'Settings updated successfully.');
    });

    it('should handle confirmation required error', async () => {
      await assert.rejects(
        async () =>
          await handler.execute({
            confirmChanges: false,
            player: { version: '1.0.0' }
          }),
        /Settings update requires confirmation/
      );
    });

    it('should handle Unity errors', async () => {
      mockConnection.sendCommand = async () => {
        return { error: 'Unity error occurred' };
      };

      await assert.rejects(
        async () =>
          await handler.execute({
            confirmChanges: true,
            player: { version: '1.0.0' }
          }),
        /Unity error occurred/
      );
    });

    it('should connect if not connected', async () => {
      let connectCalled = false;
      mockConnection.isConnected = () => false;
      mockConnection.connect = async () => {
        connectCalled = true;
      };

      await handler.execute({
        confirmChanges: true,
        player: { version: '1.0.0' }
      });
      assert.ok(connectCalled);
    });
  });

  describe('getExamples', () => {
    it('should return example usage scenarios', () => {
      const examples = handler.getExamples();

      assert.ok(examples.updatePlayerSettings);
      assert.ok(examples.updatePhysicsSettings);
      assert.ok(examples.updateQualitySettings);
      assert.ok(examples.updateMultipleCategories);
      assert.ok(examples.safetyCheckExample);

      // Verify safety check example has confirmChanges: false
      assert.equal(examples.safetyCheckExample.params.confirmChanges, false);
    });
  });

  describe('schema', () => {
    it('should have correct schema definition', () => {
      assert.equal(handler.name, 'settings_update');
      assert.ok(handler.description);
      assert.equal(handler.inputSchema.type, 'object');
      assert.ok(handler.inputSchema.properties.confirmChanges);
      assert.ok(handler.inputSchema.properties.player);
      assert.ok(handler.inputSchema.properties.graphics);
      assert.ok(handler.inputSchema.properties.physics);
      assert.deepEqual(handler.inputSchema.required, ['confirmChanges']);
    });

    it('should have detailed property schemas', () => {
      const schema = handler.inputSchema;

      // Check player properties
      assert.ok(schema.properties.player.properties.companyName);
      assert.ok(schema.properties.player.properties.productName);
      assert.ok(schema.properties.player.properties.version);

      // Check graphics properties
      assert.deepEqual(schema.properties.graphics.properties.colorSpace.enum, ['Gamma', 'Linear']);

      // Check audio properties
      assert.equal(schema.properties.audio.properties.globalVolume.minimum, 0);
      assert.equal(schema.properties.audio.properties.globalVolume.maximum, 1);

      // Check quality properties
      assert.deepEqual(schema.properties.quality.properties.antiAliasing.enum, [0, 2, 4, 8]);
    });
  });
});
