import { BaseToolHandler } from '../base/BaseToolHandler.js';
import {
    createActionMapToolDefinition,
    createActionMapHandler
} from '../../tools/input/inputActionsEditor.js';

export class InputActionMapCreateToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      createActionMapToolDefinition.name,
      createActionMapToolDefinition.description,
      createActionMapToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return createActionMapHandler(this.unityConnection, args);
  }
}
