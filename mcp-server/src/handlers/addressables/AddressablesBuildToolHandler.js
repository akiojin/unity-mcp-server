import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Addressables Build Tool Handler for Unity MCP
 * Handles Unity Addressables build operations
 */
export default class AddressablesBuildToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super('addressables_build', 'Build Unity Addressables content or clean build cache', {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['build', 'clean_build'],
          description: 'The Addressables build operation to perform'
        },
        buildTarget: {
          type: 'string',
          enum: [
            'StandaloneWindows64',
            'StandaloneWindows',
            'StandaloneLinux64',
            'StandaloneOSX',
            'iOS',
            'Android',
            'WebGL'
          ],
          description: 'Optional build target platform (for build action)'
        }
      },
      required: ['action']
    });
    this.unityConnection = unityConnection;
  }

  validate(params) {
    const { action, buildTarget } = params || {};

    if (!action) {
      throw new Error('action is required');
    }

    const validActions = ['build', 'clean_build'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`);
    }

    if (buildTarget) {
      const validTargets = [
        'StandaloneWindows64',
        'StandaloneWindows',
        'StandaloneLinux64',
        'StandaloneOSX',
        'iOS',
        'Android',
        'WebGL'
      ];
      if (!validTargets.includes(buildTarget)) {
        throw new Error(
          `Invalid buildTarget: ${buildTarget}. Must be one of: ${validTargets.join(', ')}`
        );
      }
    }
  }

  async execute(params) {
    const { action, workspaceRoot, ...parameters } = params;

    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Build operations can take several minutes
    const timeout = 300000; // 5 minutes

    const { WORKSPACE_ROOT } = await import('../../core/config.js');
    const resolvedWorkspaceRoot = workspaceRoot ?? WORKSPACE_ROOT;
    const result = await this.unityConnection.sendCommand(
      'addressables_build',
      {
        action,
        workspaceRoot: resolvedWorkspaceRoot,
        ...parameters
      },
      timeout
    );

    return this.formatResponse(action, result);
  }

  formatResponse(action, result) {
    if (result && result.error) {
      throw new Error(result.error.message || result.error);
    }

    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response from Unity');
    }

    // Return formatted response
    return {
      content: [
        {
          type: 'text',
          text: this.formatResultText(action, result)
        }
      ]
    };
  }

  formatResultText(action, result) {
    const lines = [];

    switch (action) {
      case 'build':
        if (result.data) {
          if (result.data.success) {
            lines.push('✅ Addressablesビルドが成功しました');
            lines.push(`  ⏱️  所要時間: ${result.data.duration.toFixed(2)}秒`);
            if (result.data.outputPath) {
              lines.push(`  📁 出力先: ${result.data.outputPath}`);
            }
          } else {
            lines.push('❌ Addressablesビルドが失敗しました');
            lines.push(`  ⏱️  所要時間: ${result.data.duration.toFixed(2)}秒`);
            if (result.data.errors && result.data.errors.length > 0) {
              lines.push('\n  エラー:');
              result.data.errors.forEach(error => {
                lines.push(`    ❌ ${error}`);
              });
            }
          }
        }
        break;

      case 'clean_build':
        lines.push(`✅ ${result.message}`);
        lines.push('  ビルドキャッシュをクリアしました。次回ビルドは完全ビルドになります。');
        break;

      default:
        lines.push(JSON.stringify(result, null, 2));
    }

    return lines.join('\n');
  }
}
