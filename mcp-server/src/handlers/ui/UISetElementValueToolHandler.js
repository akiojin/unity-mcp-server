import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class UISetElementValueToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('set_ui_element_value', 'Set values for UI input elements', {
      type: 'object',
      properties: {
        elementPath: {
          type: 'string',
          description: 'Full hierarchy path to the UI element'
        },
        value: {
          anyOf: [
            { type: 'string' },
            { type: 'number' },
            { type: 'boolean' },
            { type: 'object' },
            { type: 'array' },
            { type: 'null' }
          ],
          description:
            'New value to set. Supports string, number, boolean, object, array, or null depending on the UI element type.'
        },
        triggerEvents: {
          type: 'boolean',
          description: 'Whether to trigger associated events (default: true)'
        }
      },
      required: ['elementPath', 'value']
    });
    this.unityConnection = unityConnection;
  }

  async execute(params) {
    const { elementPath, value, triggerEvents = true } = params;

    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    const result = await this.unityConnection.sendCommand('set_ui_element_value', {
      elementPath,
      value,
      triggerEvents
    });

    return result;
  }
}
