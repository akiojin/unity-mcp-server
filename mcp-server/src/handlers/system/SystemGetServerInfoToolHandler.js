import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { CATEGORIES, SCOPES } from '../base/categories.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { config, WORKSPACE_ROOT } from '../../core/config.js';

/**
 * Handler for the get_server_info tool
 * Provides identifiers to distinguish multiple MCP servers
 */
export class SystemGetServerInfoToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'get_server_info',
      'Get MCP server identifying information (pid, project root, workspace)',
      {
        type: 'object',
        properties: {}
      },
      {
        category: CATEGORIES.SYSTEM,
        scope: SCOPES.READ,
        keywords: ['server', 'info', 'pid', 'project', 'workspace', 'identify'],
        tags: ['system', 'diagnostic']
      }
    );

    this.unityConnection = unityConnection;
    this.projectInfo = new ProjectInfoProvider();
  }

  async execute() {
    const info = await this.projectInfo.get();
    return {
      success: true,
      pid: process.pid,
      projectRoot: info.projectRoot,
      assetsPath: info.assetsPath,
      packagesPath: info.packagesPath,
      codeIndexRoot: info.codeIndexRoot,
      workspaceRoot: WORKSPACE_ROOT,
      server: {
        name: config?.server?.name,
        version: config?.server?.version
      },
      unity: {
        host: config?.unity?.unityHost ?? config?.unity?.mcpHost,
        port: config?.unity?.port
      },
      http: {
        enabled: config?.http?.enabled,
        port: config?.http?.port
      }
    };
  }
}
