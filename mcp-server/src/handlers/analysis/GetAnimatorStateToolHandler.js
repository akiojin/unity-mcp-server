import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { 
    getAnimatorStateToolDefinition,
    getAnimatorRuntimeInfoToolDefinition,
    getAnimatorStateHandler,
    getAnimatorRuntimeInfoHandler
} from '../../tools/analysis/getAnimatorState.js';

export class GetAnimatorStateToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      getAnimatorStateToolDefinition.name,
      getAnimatorStateToolDefinition.description,
      getAnimatorStateToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return getAnimatorStateHandler(this.unityConnection, args);
  }
}

export class GetAnimatorRuntimeInfoToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      getAnimatorRuntimeInfoToolDefinition.name,
      getAnimatorRuntimeInfoToolDefinition.description,
      getAnimatorRuntimeInfoToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return getAnimatorRuntimeInfoHandler(this.unityConnection, args);
  }
}
