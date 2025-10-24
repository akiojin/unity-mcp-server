import { BaseToolHandler } from '../base/BaseToolHandler.js';
import {
    removeActionMapToolDefinition,
    removeActionMapHandler
} from '../../tools/input/inputActionsEditor.js';

export class InputActionMapRemoveToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      removeActionMapToolDefinition.name,
      removeActionMapToolDefinition.description,
      removeActionMapToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return removeActionMapHandler(this.unityConnection, args);
  }
}
