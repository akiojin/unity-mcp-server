import { BaseToolHandler } from '../base/BaseToolHandler.js';
import {
    createActionMapToolDefinition,
    removeActionMapToolDefinition,
    addInputActionToolDefinition,
    removeInputActionToolDefinition,
    addInputBindingToolDefinition,
    removeInputBindingToolDefinition,
    removeAllBindingsToolDefinition,
    createCompositeBindingToolDefinition,
    manageControlSchemesToolDefinition,
    createActionMapHandler,
    removeActionMapHandler,
    addInputActionHandler,
    removeInputActionHandler,
    addInputBindingHandler,
    removeInputBindingHandler,
    removeAllBindingsHandler,
    createCompositeBindingHandler,
    manageControlSchemesHandler
} from '../../tools/input/inputActionsEditor.js';

// Action Map Management
export class CreateActionMapToolHandler extends BaseToolHandler {
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

export class RemoveActionMapToolHandler extends BaseToolHandler {
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

// Action Management
export class AddInputActionToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      addInputActionToolDefinition.name,
      addInputActionToolDefinition.description,
      addInputActionToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return addInputActionHandler(this.unityConnection, args);
  }
}

export class RemoveInputActionToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      removeInputActionToolDefinition.name,
      removeInputActionToolDefinition.description,
      removeInputActionToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return removeInputActionHandler(this.unityConnection, args);
  }
}

// Binding Management
export class AddInputBindingToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      addInputBindingToolDefinition.name,
      addInputBindingToolDefinition.description,
      addInputBindingToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return addInputBindingHandler(this.unityConnection, args);
  }
}

export class RemoveInputBindingToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      removeInputBindingToolDefinition.name,
      removeInputBindingToolDefinition.description,
      removeInputBindingToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return removeInputBindingHandler(this.unityConnection, args);
  }
}

export class RemoveAllBindingsToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      removeAllBindingsToolDefinition.name,
      removeAllBindingsToolDefinition.description,
      removeAllBindingsToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return removeAllBindingsHandler(this.unityConnection, args);
  }
}

export class CreateCompositeBindingToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      createCompositeBindingToolDefinition.name,
      createCompositeBindingToolDefinition.description,
      createCompositeBindingToolDefinition.inputSchema
    );
    this.unityConnection = unityConnection;
  }

  async execute(args) {
    return createCompositeBindingHandler(this.unityConnection, args);
  }
}

// Control Scheme Management
export class ManageControlSchemesToolHandler extends BaseToolHandler {
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