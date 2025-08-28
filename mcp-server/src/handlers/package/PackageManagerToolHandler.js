/**
 * Package Manager Tool Handler for Unity MCP
 * Handles Unity Package Manager operations including search, install, and management
 */

export default class PackageManagerToolHandler {
  constructor(unityConnection) {
    this.unityConnection = unityConnection;
  }

  /**
   * Get tool definitions for package manager operations
   */
  static getToolDefinitions() {
    return {
      package_manager: {
        description: 'Manage Unity packages - search, install, remove, and list packages',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['search', 'list', 'install', 'remove', 'info', 'recommend'],
              description: 'The package operation to perform'
            },
            keyword: {
              type: 'string',
              description: 'Search keyword (for search action)'
            },
            packageId: {
              type: 'string',
              description: 'Package ID to install (e.g., com.unity.textmeshpro)'
            },
            packageName: {
              type: 'string',
              description: 'Package name to remove or get info'
            },
            version: {
              type: 'string',
              description: 'Specific version to install (optional)'
            },
            category: {
              type: 'string',
              enum: ['essential', 'rendering', 'tools', 'networking', 'mobile'],
              description: 'Category for recommendations'
            },
            includeBuiltIn: {
              type: 'boolean',
              description: 'Include built-in packages in list (default: false)'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of search results (default: 20)'
            }
          },
          required: ['action']
        }
      }
    };
  }

  /**
   * Handle package manager tool execution
   */
  async handle(toolName, args) {
    if (toolName !== 'package_manager') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const { action, ...parameters } = args;

    // Validate required parameters based on action
    switch (action) {
      case 'search':
        if (!parameters.keyword) {
          throw new Error('Search keyword is required for search action');
        }
        break;
      case 'install':
        if (!parameters.packageId) {
          throw new Error('Package ID is required for install action');
        }
        break;
      case 'remove':
        if (!parameters.packageName) {
          throw new Error('Package name is required for remove action');
        }
        break;
      case 'info':
        if (!parameters.packageName) {
          throw new Error('Package name is required for info action');
        }
        break;
    }

    // Send command to Unity
    const result = await this.unityConnection.sendCommand('package_manager', {
      action,
      ...parameters
    });

    // Format the response based on action
    return this.formatResponse(action, result);
  }

  /**
   * Format the response for better readability
   */
  formatResponse(action, result) {
    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    switch (action) {
      case 'search':
        return {
          success: result.success,
          action: 'search',
          keyword: result.keyword,
          totalCount: result.totalCount || 0,
          packages: (result.packages || []).map(pkg => ({
            packageId: pkg.packageId,
            name: pkg.name,
            displayName: pkg.displayName,
            description: this.truncateDescription(pkg.description),
            version: pkg.version,
            category: pkg.category
          })),
          message: result.message || `Found ${result.totalCount || 0} packages`
        };

      case 'list':
        return {
          success: result.success,
          action: 'list',
          totalCount: result.totalCount || 0,
          packages: (result.packages || []).map(pkg => ({
            packageId: pkg.packageId,
            name: pkg.name,
            displayName: pkg.displayName,
            version: pkg.version,
            source: pkg.source,
            isDirectDependency: pkg.isDirectDependency
          })),
          message: result.message || `Listed ${result.totalCount || 0} installed packages`
        };

      case 'install':
        return {
          success: result.success,
          action: 'install',
          packageId: result.packageId,
          name: result.name,
          displayName: result.displayName,
          version: result.version,
          message: result.message || `Successfully installed ${result.displayName || result.name}`
        };

      case 'remove':
        return {
          success: result.success,
          action: 'remove',
          packageName: result.packageName,
          message: result.message || `Successfully removed ${result.packageName}`
        };

      case 'info':
        if (result.package) {
          return {
            success: result.success,
            action: 'info',
            package: {
              ...result.package,
              description: this.truncateDescription(result.package.description)
            },
            message: `Package information for ${result.package.displayName || result.package.name}`
          };
        }
        return result;

      case 'recommend':
        return {
          success: result.success,
          action: 'recommend',
          category: result.category,
          categories: result.categories,
          packages: result.packages,
          allPackages: result.allPackages,
          message: result.message || 'Package recommendations retrieved'
        };

      default:
        return result;
    }
  }

  /**
   * Truncate long descriptions for better readability
   */
  truncateDescription(description) {
    if (!description) return '';
    const maxLength = 150;
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  }

  /**
   * Get examples for the tool
   */
  static getExamples() {
    return [
      {
        description: 'Search for packages',
        input: {
          action: 'search',
          keyword: 'timeline',
          limit: 10
        }
      },
      {
        description: 'Install a package',
        input: {
          action: 'install',
          packageId: 'com.unity.textmeshpro'
        }
      },
      {
        description: 'Install a specific version',
        input: {
          action: 'install',
          packageId: 'com.unity.timeline',
          version: '1.7.1'
        }
      },
      {
        description: 'List installed packages',
        input: {
          action: 'list',
          includeBuiltIn: false
        }
      },
      {
        description: 'Remove a package',
        input: {
          action: 'remove',
          packageName: 'com.unity.timeline'
        }
      },
      {
        description: 'Get package info',
        input: {
          action: 'info',
          packageName: 'com.unity.textmeshpro'
        }
      },
      {
        description: 'Get recommended packages',
        input: {
          action: 'recommend',
          category: 'essential'
        }
      }
    ];
  }
}