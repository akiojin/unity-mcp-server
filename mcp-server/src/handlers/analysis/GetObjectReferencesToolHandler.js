import { BaseToolHandler } from '../base/BaseToolHandler.js';
import {
  getObjectReferencesToolDefinition,
  getObjectReferencesHandler
} from '../../tools/analysis/getObjectReferences.js';

/**
 * Handler for the get_object_references tool
 */
export class GetObjectReferencesToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      getObjectReferencesToolDefinition.name,
      getObjectReferencesToolDefinition.description,
      getObjectReferencesToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return getObjectReferencesHandler(this.unityConnection, args);
  }
}
