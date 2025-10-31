import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for opening terminal window in Unity Editor
 * Implements SPEC-3a7f2e8d: Terminal Open Feature
 */
export class TerminalOpenToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'terminal_open',
      'Open terminal window in Unity Editor',
      {
        type: 'object',
        properties: {
          workingDirectory: {
            type: 'string',
            enum: ['workspace', 'project'],
            description: 'Initial directory: \'workspace\' for workspace root, \'project\' for Unity project root'
          },
          shell: {
            type: 'string',
            enum: ['auto', 'wsl', 'bash', 'zsh', 'pwsh', 'powershell', 'cmd'],
            default: 'auto',
            description: 'Shell type to use. \'auto\' will detect based on OS (Windows: WSL2→pwsh→powershell, macOS: zsh→bash, Linux: bash)'
          },
          title: {
            type: 'string',
            description: 'Custom window title (optional). If not provided, defaults to \'Terminal (workspace)\' or \'Terminal (project)\''
          }
        },
        required: ['workingDirectory']
      }
    );

    this.unityConnection = unityConnection;
  }

  /**
   * Opens a terminal window in Unity Editor
   * @param {Object} params - The validated input parameters
   * @param {string} params.workingDirectory - 'workspace' or 'project'
   * @param {string} [params.shell='auto'] - Shell type
   * @param {string} [params.title] - Custom window title
   * @returns {Promise<Object>} Session info (sessionId, shellType, shellPath, workingDirectory)
   */
  async execute(params) {
    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Validate workingDirectory
    if (!['workspace', 'project'].includes(params.workingDirectory)) {
      throw new Error(`Invalid workingDirectory: ${params.workingDirectory}. Must be 'workspace' or 'project'.`);
    }

    // Send command to Unity
    const command = {
      command: 'terminal_open',
      workingDirectory: params.workingDirectory,
      shell: params.shell || 'auto',
      title: params.title
    };

    const response = await this.unityConnection.sendCommand(command);

    // Validate response
    if (!response || !response.sessionId) {
      throw new Error('UNITY_NOT_CONNECTED: Unity Editor MCP server is not connected or returned invalid response');
    }

    if (response.error) {
      // Handle Unity-side errors
      if (response.error.includes('No compatible shell found')) {
        throw new Error('SHELL_NOT_FOUND: No compatible shell found on this system');
      }
      if (response.error.includes('does not exist')) {
        throw new Error(`DIRECTORY_NOT_FOUND: Working directory '${response.error}' does not exist`);
      }
      throw new Error(response.error);
    }

    return {
      sessionId: response.sessionId,
      shellType: response.shellType,
      shellPath: response.shellPath,
      workingDirectory: response.workingDirectory
    };
  }
}
