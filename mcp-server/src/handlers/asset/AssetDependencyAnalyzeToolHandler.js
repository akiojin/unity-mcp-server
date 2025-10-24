import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for Unity asset dependency analysis
 */
export class AssetDependencyAnalyzeToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'asset_dependency_analyze',
      'Analyze Unity asset dependencies (get dependencies, dependents, circular deps, unused assets, size impact)',
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['get_dependencies', 'get_dependents', 'analyze_circular', 'find_unused', 'analyze_size_impact', 'validate_references'],
            description: 'The analysis action to perform'
          },
          assetPath: {
            type: 'string',
            description: 'Path to the asset (required for specific asset analysis)'
          },
          recursive: {
            type: 'boolean',
            description: 'Whether to analyze dependencies recursively (for get_dependencies)'
          },
          includeBuiltIn: {
            type: 'boolean',
            description: 'Whether to include built-in assets in analysis (for find_unused)'
          }
        },
        required: ['action']
      }
    );
    this.unityConnection = unityConnection;
  }

  validate(params) {
    if (!params.action) {
      throw new Error('action is required');
    }

    const validActions = ['get_dependencies', 'get_dependents', 'analyze_circular', 'find_unused', 'analyze_size_impact', 'validate_references'];
    if (!validActions.includes(params.action)) {
      throw new Error(`action must be one of: ${validActions.join(', ')}`);
    }

    // Actions that require assetPath
    const assetPathRequiredActions = ['get_dependencies', 'get_dependents', 'analyze_size_impact'];
    if (assetPathRequiredActions.includes(params.action)) {
      if (params.assetPath === undefined || params.assetPath === null) {
        throw new Error(`assetPath is required for ${params.action} action`);
      }
      
      if (params.assetPath === '') {
        throw new Error('assetPath cannot be empty');
      }
      
      // Validate assetPath starts with "Assets/"
      if (!params.assetPath.startsWith('Assets/')) {
        throw new Error('assetPath must start with "Assets/"');
      }
    }
  }

  async execute(params) {
    this.validate(params);
    
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    const result = await this.unityConnection.sendCommand('analyze_asset_dependencies', params);
    return result;
  }

  getExamples() {
    return [
      {
        input: { action: 'get_dependencies', assetPath: 'Assets/Prefabs/Player.prefab' },
        output: {
          success: true,
          action: 'get_dependencies',
          assetPath: 'Assets/Prefabs/Player.prefab',
          recursive: false,
          dependencies: [
            {
              path: 'Assets/Materials/PlayerMaterial.mat',
              type: 'Material',
              isDirectDependency: true,
              depth: 1
            },
            {
              path: 'Assets/Scripts/PlayerController.cs',
              type: 'MonoScript',
              isDirectDependency: true,
              depth: 1
            }
          ],
          count: 2,
          maxDepth: 1
        }
      },
      {
        input: { action: 'get_dependents', assetPath: 'Assets/Materials/PlayerMaterial.mat' },
        output: {
          success: true,
          action: 'get_dependents',
          assetPath: 'Assets/Materials/PlayerMaterial.mat',
          dependents: [
            {
              path: 'Assets/Prefabs/Player.prefab',
              type: 'GameObject',
              usage: 'Renderer.material'
            }
          ],
          count: 1
        }
      },
      {
        input: { action: 'analyze_circular' },
        output: {
          success: true,
          action: 'analyze_circular',
          circularDependencies: [
            {
              cycle: [
                'Assets/Scripts/A.cs',
                'Assets/Scripts/B.cs',
                'Assets/Scripts/A.cs'
              ],
              length: 3,
              severity: 'warning'
            }
          ],
          hasCircularDependencies: true,
          totalCycles: 1
        }
      },
      {
        input: { action: 'find_unused' },
        output: {
          success: true,
          action: 'find_unused',
          includeBuiltIn: false,
          unusedAssets: [
            {
              path: 'Assets/Textures/old_icon.png',
              type: 'Texture2D',
              size: 512,
              lastModified: '2023-12-01T10:00:00Z'
            }
          ],
          count: 1,
          totalSizeKB: 512
        }
      },
      {
        input: { action: 'analyze_size_impact', assetPath: 'Assets/Textures/large_texture.png' },
        output: {
          success: true,
          action: 'analyze_size_impact',
          assetPath: 'Assets/Textures/large_texture.png',
          analysis: {
            directSize: 2048,
            totalSize: 3072,
            dependencyCount: 5,
            largestDependency: {
              path: 'Assets/Textures/dependency.png',
              size: 1024
            },
            buildImpact: {
              estimatedBuildSize: 3072,
              compressionRatio: 0.75
            }
          }
        }
      },
      {
        input: { action: 'validate_references' },
        output: {
          success: true,
          action: 'validate_references',
          validation: {
            totalAssets: 150,
            validReferences: 145,
            brokenReferences: [
              {
                asset: 'Assets/Prefabs/Broken.prefab',
                missingReference: 'Assets/Scripts/DeletedScript.cs',
                referenceType: 'MonoScript'
              }
            ],
            missingReferences: 5,
            validationTime: 1.25
          }
        }
      }
    ];
  }
}