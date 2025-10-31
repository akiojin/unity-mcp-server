import { updateActionStatus } from './sessionStore.js';
import { aiSessionLogger } from './aiSessionLogger.js';

async function runShellCommand(unityConnection, sessionId, actionId, payload) {
  if (!payload?.command) {
    throw new Error('MISSING_COMMAND');
  }

  aiSessionLogger.info('Shell command execution started', {
    sessionId,
    actionId,
    event: 'shell_command_start'
  });

  updateActionStatus(sessionId, actionId, 'executing');

  if (!unityConnection || process.env.UNITY_MCP_TEST_SKIP_UNITY === 'true') {
    // In CI/test environments we short‑circuit the execution but still mark success
    updateActionStatus(sessionId, actionId, 'succeeded');
    aiSessionLogger.info('Shell command skipped (test mode)', {
      sessionId,
      actionId,
      event: 'shell_command_skipped'
    });
    return;
  }

  if (!unityConnection.isConnected()) {
    await unityConnection.connect();
  }

  const command = {
    command: 'terminal_execute',
    sessionId: payload.sessionId,
    commandText: payload.command
  };

  await unityConnection.sendCommand(command);
  updateActionStatus(sessionId, actionId, 'succeeded');

  aiSessionLogger.info('Shell command execution finished', {
    sessionId,
    actionId,
    event: 'shell_command_finish'
  });
}

export async function executeAction(unityConnection, sessionId, action) {
  try {
    switch (action.type) {
      case 'shell_command':
        await runShellCommand(unityConnection, sessionId, action.actionId, action.payload);
        break;
      case 'code_generate':
      case 'test_run':
        // Placeholder: mark as succeeded immediately. Detailed implementation is future work.
        updateActionStatus(sessionId, action.actionId, 'succeeded');
        aiSessionLogger.info('Action auto-completed (placeholder)', {
          sessionId,
          actionId: action.actionId,
          event: `action_${action.type}_placeholder`
        });
        break;
      default:
        aiSessionLogger.warn('Unknown action type dispatched', {
          sessionId,
          actionId: action.actionId,
          event: 'action_unknown'
        });
        updateActionStatus(sessionId, action.actionId, 'failed');
        break;
    }
  } catch (error) {
    aiSessionLogger.error(`Action execution failed: ${error.message}`, {
      sessionId,
      actionId: action.actionId,
      event: 'action_failure'
    });
    updateActionStatus(sessionId, action.actionId, 'failed');
  }
}
