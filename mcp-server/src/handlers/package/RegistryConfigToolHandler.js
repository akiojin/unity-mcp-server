/**
 * Registry Configuration Tool Handler for Unity MCP
 * Handles Unity Package Registry configuration (OpenUPM, Unity NuGet, etc.)
 */

export default class RegistryConfigToolHandler {
  constructor(unityConnection) {
    this.unityConnection = unityConnection;
  }

  /**
   * Get tool definitions for registry configuration operations
   */
  static getToolDefinitions() {
    return {
      registry_config: {
        description: 'Configure Unity package registries (OpenUPM, Unity NuGet) for third-party packages',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['list', 'add_openupm', 'add_nuget', 'remove', 'add_scope', 'recommend'],
              description: 'The registry operation to perform'
            },
            registryName: {
              type: 'string',
              description: 'Name of the registry (for remove and add_scope actions)'
            },
            scope: {
              type: 'string',
              description: 'Package scope to add (e.g., com.unity, com.cysharp)'
            },
            scopes: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of package scopes to add'
            },
            autoAddPopular: {
              type: 'boolean',
              description: 'Automatically add popular package scopes (default: true)'
            },
            registry: {
              type: 'string',
              enum: ['openupm', 'nuget'],
              description: 'Registry type for recommendations'
            }
          },
          required: ['action']
        }
      }
    };
  }

  /**
   * Handle registry configuration tool execution
   */
  async handle(toolName, args) {
    if (toolName !== 'registry_config') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const { action, ...parameters } = args;

    // Validate required parameters based on action
    switch (action) {
      case 'remove':
        if (!parameters.registryName) {
          throw new Error('Registry name is required for remove action');
        }
        break;
      case 'add_scope':
        if (!parameters.registryName || !parameters.scope) {
          throw new Error('Registry name and scope are required for add_scope action');
        }
        break;
    }

    // Send command to Unity
    const result = await this.unityConnection.sendCommand('registry_config', {
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
      case 'list':
        return {
          success: result.success,
          action: 'list',
          totalCount: result.totalCount || 0,
          registries: (result.registries || []).map(reg => ({
            name: reg.name,
            url: reg.url,
            scopeCount: reg.scopes ? reg.scopes.length : 0,
            scopes: reg.scopes || []
          })),
          message: result.message || `Found ${result.totalCount || 0} configured registries`
        };

      case 'add_openupm':
        return {
          success: result.success,
          action: 'add_openupm',
          registryUrl: result.registryUrl,
          scopes: result.scopes || [],
          message: result.message || 'Successfully configured OpenUPM registry',
          instructions: [
            'OpenUPM registry has been added to your project.',
            'You can now install packages from OpenUPM using their package IDs.',
            'Popular packages include:',
            '  - com.cysharp.unitask (UniTask)',
            '  - com.neuecc.unirx (UniRx)',
            '  - com.demigiant.dotween (DOTween)'
          ]
        };

      case 'add_nuget':
        return {
          success: result.success,
          action: 'add_nuget',
          registryUrl: result.registryUrl,
          scopes: result.scopes || [],
          message: result.message || 'Successfully configured Unity NuGet registry',
          instructions: [
            'Unity NuGet registry has been added to your project.',
            'You can now install NuGet packages that are compatible with Unity.',
            'Popular packages include:',
            '  - org.nuget.newtonsoft.json (Newtonsoft.Json)',
            '  - org.nuget.system.threading.tasks.extensions',
            '  - org.nuget.sqlite-net-pcl (SQLite)'
          ]
        };

      case 'remove':
        return {
          success: result.success,
          action: 'remove',
          message: result.message || `Successfully removed registry`
        };

      case 'add_scope':
        return {
          success: result.success,
          action: 'add_scope',
          scopes: result.scopes || [],
          message: result.message || 'Successfully added scope to registry'
        };

      case 'recommend':
        if (result.allRecommendations) {
          // Format all recommendations
          const formatted = {
            success: result.success,
            action: 'recommend',
            recommendations: {},
            message: result.message || 'Package recommendations for available registries'
          };

          for (const [registry, packages] of Object.entries(result.allRecommendations)) {
            formatted.recommendations[registry] = packages.map(pkg => ({
              packageId: pkg.packageId,
              name: pkg.name,
              description: pkg.description,
              scope: pkg.scope
            }));
          }

          return formatted;
        } else {
          // Single registry recommendations
          return {
            success: result.success,
            action: 'recommend',
            registry: result.registry,
            packages: (result.packages || []).map(pkg => ({
              packageId: pkg.packageId,
              name: pkg.name,
              description: pkg.description,
              scope: pkg.scope
            })),
            message: result.message || `Recommendations for ${result.registry}`
          };
        }

      default:
        return result;
    }
  }

  /**
   * Get examples for the tool
   */
  static getExamples() {
    return [
      {
        description: 'List configured registries',
        input: {
          action: 'list'
        }
      },
      {
        description: 'Add OpenUPM registry with popular scopes',
        input: {
          action: 'add_openupm',
          autoAddPopular: true
        }
      },
      {
        description: 'Add OpenUPM with custom scopes',
        input: {
          action: 'add_openupm',
          scopes: ['com.cysharp', 'com.neuecc', 'jp.keijiro'],
          autoAddPopular: false
        }
      },
      {
        description: 'Add Unity NuGet registry',
        input: {
          action: 'add_nuget',
          autoAddPopular: true
        }
      },
      {
        description: 'Add scope to existing registry',
        input: {
          action: 'add_scope',
          registryName: 'OpenUPM',
          scope: 'com.yasirkula'
        }
      },
      {
        description: 'Remove a registry',
        input: {
          action: 'remove',
          registryName: 'OpenUPM'
        }
      },
      {
        description: 'Get recommended packages for OpenUPM',
        input: {
          action: 'recommend',
          registry: 'openupm'
        }
      },
      {
        description: 'Get all registry recommendations',
        input: {
          action: 'recommend'
        }
      }
    ];
  }
}