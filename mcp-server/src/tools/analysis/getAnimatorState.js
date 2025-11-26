// Tool definition for analysis_animator_state_get
export const getAnimatorStateToolDefinition = {
  name: 'analysis_animator_state_get',
  description: 'Get Animator state: layers, transitions, and parameter values for a GameObject.',
  inputSchema: {
    type: 'object',
    properties: {
      gameObjectName: {
        type: 'string',
        description: 'Name of the GameObject with the Animator component'
      },
      includeParameters: {
        type: 'boolean',
        description: 'Include all animator parameters and their current values. Default: true',
        default: true
      },
      includeStates: {
        type: 'boolean',
        description: 'Include current state information for each layer. Default: true',
        default: true
      },
      includeTransitions: {
        type: 'boolean',
        description: 'Include active transition information. Default: true',
        default: true
      },
      includeClips: {
        type: 'boolean',
        description: 'Include animation clip information. Default: false',
        default: false
      },
      layerIndex: {
        type: 'number',
        description: 'Specific layer index to query (-1 for all layers). Default: -1',
        default: -1
      }
    },
    required: ['gameObjectName']
  }
};

// Tool definition for analysis_animator_runtime_info_get
export const getAnimatorRuntimeInfoToolDefinition = {
  name: 'analysis_animator_runtime_info_get',
  description: 'Get Animator runtime info (IK, root motion, performance) — Play mode only.',
  inputSchema: {
    type: 'object',
    properties: {
      gameObjectName: {
        type: 'string',
        description: 'Name of the GameObject with the Animator component'
      },
      includeIK: {
        type: 'boolean',
        description: 'Include IK (Inverse Kinematics) information. Default: true',
        default: true
      },
      includeRootMotion: {
        type: 'boolean',
        description: 'Include root motion information. Default: true',
        default: true
      },
      includeBehaviours: {
        type: 'boolean',
        description: 'Include state machine behaviours. Default: false',
        default: false
      }
    },
    required: ['gameObjectName']
  }
};

// Handler for get_animator_state
export async function getAnimatorStateHandler(unityConnection, args) {
  try {
    // Check connection
    if (!unityConnection.isConnected()) {
      return {
        content: [
          {
            type: 'text',
            text: 'Failed to get animator state: Unity connection not available'
          }
        ],
        isError: true
      };
    }

    // Validate required parameters
    if (!args.gameObjectName) {
      return {
        content: [
          {
            type: 'text',
            text: 'Failed to get animator state: gameObjectName is required'
          }
        ],
        isError: true
      };
    }

    // Send command to Unity
    const result = await unityConnection.sendCommand('analysis_animator_state_get', args);

    // Check for errors
    if (!result || typeof result === 'string') {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get animator state: Invalid response format`
          }
        ],
        isError: true
      };
    }

    if (result.error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get animator state: ${result.error}`
          }
        ],
        isError: true
      };
    }

    // Format the response
    let text = result.summary || `Animator state retrieved for '${args.gameObjectName}'`;

    if (result.controllerName) {
      text += `\nController: ${result.controllerName}`;
    }

    if (result.layers && Array.isArray(result.layers)) {
      text += `\n\n## Layer States:`;
      result.layers.forEach(layer => {
        text += `\n\n### Layer ${layer.layerIndex}: ${layer.layerName || 'Base Layer'}`;
        text += `\n- Weight: ${layer.layerWeight}`;

        if (layer.currentState) {
          text += `\n- Current State: ${layer.currentState.name || `Hash: ${layer.currentState.fullPathHash}`}`;
          text += `\n  - Normalized Time: ${layer.currentState.normalizedTime?.toFixed(3)}`;
          text += `\n  - Speed: ${layer.currentState.speed}`;
          if (layer.currentState.motion) {
            text += `\n  - Motion: ${layer.currentState.motion}`;
          }
        }

        if (layer.activeTransition) {
          text += `\n- Active Transition:`;
          text += `\n  - Duration: ${layer.activeTransition.duration}`;
          text += `\n  - Progress: ${(layer.activeTransition.normalizedTime * 100).toFixed(1)}%`;
          if (layer.activeTransition.nextState) {
            text += `\n  - To: ${layer.activeTransition.nextState.name || 'Unknown'}`;
          }
        }
      });
    }

    if (result.parameters && Object.keys(result.parameters).length > 0) {
      text += `\n\n## Parameters:`;
      for (const [name, param] of Object.entries(result.parameters)) {
        text += `\n- ${name} (${param.type}): ${param.value}`;
        if (param.defaultValue !== undefined && param.type !== 'Trigger') {
          text += ` [default: ${param.defaultValue}]`;
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: text
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to get animator state: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

// Handler for get_animator_runtime_info
export async function getAnimatorRuntimeInfoHandler(unityConnection, args) {
  try {
    // Check connection
    if (!unityConnection.isConnected()) {
      return {
        content: [
          {
            type: 'text',
            text: 'Failed to get animator runtime info: Unity connection not available'
          }
        ],
        isError: true
      };
    }

    // Validate required parameters
    if (!args.gameObjectName) {
      return {
        content: [
          {
            type: 'text',
            text: 'Failed to get animator runtime info: gameObjectName is required'
          }
        ],
        isError: true
      };
    }

    // Send command to Unity
    const result = await unityConnection.sendCommand('analysis_animator_runtime_info_get', args);

    // Check for errors
    if (!result || typeof result === 'string') {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get animator runtime info: Invalid response format`
          }
        ],
        isError: true
      };
    }

    if (result.error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get animator runtime info: ${result.error}`
          }
        ],
        isError: true
      };
    }

    // Format the response
    let text = result.summary || `Animator runtime info retrieved for '${args.gameObjectName}'`;

    text += `\n\n## General Info:`;
    text += `\n- Controller: ${result.runtimeAnimatorController || 'None'}`;
    text += `\n- Update Mode: ${result.updateMode}`;
    text += `\n- Culling Mode: ${result.cullingMode}`;
    text += `\n- Speed: ${result.speed}`;
    text += `\n- Playback Time: ${result.playbackTime?.toFixed(3)}`;

    if (result.avatar) {
      text += `\n\n## Avatar:`;
      text += `\n- Name: ${result.avatar.name}`;
      text += `\n- Valid: ${result.avatar.isValid}`;
      text += `\n- Human: ${result.avatar.isHuman}`;
    }

    if (result.rootMotion) {
      text += `\n\n## Root Motion:`;
      text += `\n- Apply Root Motion: ${result.rootMotion.applyRootMotion}`;
      text += `\n- Has Root Motion: ${result.rootMotion.hasRootMotion}`;
      text += `\n- Velocity: (${result.rootMotion.velocity.x?.toFixed(2)}, ${result.rootMotion.velocity.y?.toFixed(2)}, ${result.rootMotion.velocity.z?.toFixed(2)})`;
      text += `\n- Angular Velocity: (${result.rootMotion.angularVelocity.x?.toFixed(2)}, ${result.rootMotion.angularVelocity.y?.toFixed(2)}, ${result.rootMotion.angularVelocity.z?.toFixed(2)})`;
    }

    if (result.ikInfo) {
      text += `\n\n## IK Info:`;
      text += `\n- Human Scale: ${result.ikInfo.humanScale}`;
      text += `\n- Feet Pivot Active: ${result.ikInfo.feetPivotActive}`;
      text += `\n- Pivot Weight: ${result.ikInfo.pivotWeight}`;

      if (result.ikInfo.goals) {
        text += `\n\n### IK Goals:`;
        for (const [goal, data] of Object.entries(result.ikInfo.goals)) {
          text += `\n- ${goal}:`;
          text += `\n  - Position Weight: ${data.positionWeight}`;
          text += `\n  - Rotation Weight: ${data.rotationWeight}`;
        }
      }
    }

    if (result.behaviours && result.behaviours.length > 0) {
      text += `\n\n## State Machine Behaviours:`;
      result.behaviours.forEach(behaviour => {
        text += `\n- Layer ${behaviour.layer}: ${behaviour.type} (${behaviour.enabled ? 'Enabled' : 'Disabled'})`;
      });
    }

    text += `\n\n## Performance:`;
    text += `\n- Has Bound Playables: ${result.hasBoundPlayables}`;
    text += `\n- Has Transform Hierarchy: ${result.hasTransformHierarchy}`;
    text += `\n- Is Optimizable: ${result.isOptimizable}`;
    text += `\n- Gravity Weight: ${result.gravityWeight}`;

    return {
      content: [
        {
          type: 'text',
          text: text
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to get animator runtime info: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
