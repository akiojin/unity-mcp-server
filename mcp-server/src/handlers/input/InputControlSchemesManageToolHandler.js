import { BaseToolHandler } from '../base/BaseToolHandler.js';
import {
  manageControlSchemesToolDefinition,
  manageControlSchemesHandler
} from '../../tools/input/inputActionsEditor.js';

export class InputControlSchemesManageToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      manageControlSchemesToolDefinition.name,
      manageControlSchemesToolDefinition.description,
      manageControlSchemesToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return manageControlSchemesHandler(this.unityConnection, args);
  }
}
