import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AssetDependencyAnalyzeToolHandler } from '../../../src/handlers/asset/AssetDependencyAnalyzeToolHandler.js';

describe('AssetDependencyAnalyzeToolHandler', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: () => true,
      connect: async () => {},
      sendCommand: async (command, params) => {
        if (command === 'analyze_asset_dependencies') {
          const action = params.action;

          if (action === 'get_dependencies') {
            const assetPath = params.assetPath;
            const recursive = params.recursive || false;

            if (assetPath === 'Assets/Prefabs/Player.prefab') {
              return {
                success: true,
                action: 'get_dependencies',
                assetPath: assetPath,
                recursive: recursive,
                dependencies: [
                  {
                    path: 'Assets/Materials/PlayerMaterial.mat',
                    type: 'Material',
                    isDirectDependency: true,
                    depth: 1
                  },
                  {
                    path: 'Assets/Textures/player_diffuse.png',
                    type: 'Texture2D',
                    isDirectDependency: recursive ? false : true,
                    depth: recursive ? 2 : 1
                  },
                  {
                    path: 'Assets/Scripts/PlayerController.cs',
                    type: 'MonoScript',
                    isDirectDependency: true,
                    depth: 1
                  }
                ],
                count: 3,
                maxDepth: recursive ? 2 : 1
              };
            }

            if (assetPath === 'Assets/NonExistent.prefab') {
              throw new Error('Asset not found: Assets/NonExistent.prefab');
            }
          }

          if (action === 'get_dependents') {
            const assetPath = params.assetPath;

            if (assetPath === 'Assets/Materials/PlayerMaterial.mat') {
              return {
                success: true,
                action: 'get_dependents',
                assetPath: assetPath,
                dependents: [
                  {
                    path: 'Assets/Prefabs/Player.prefab',
                    type: 'GameObject',
                    usage: 'Renderer.material'
                  },
                  {
                    path: 'Assets/Prefabs/Enemy.prefab',
                    type: 'GameObject',
                    usage: 'Renderer.material'
                  }
                ],
                count: 2
              };
            }
          }

          if (action === 'analyze_circular') {
            return {
              success: true,
              action: 'analyze_circular',
              circularDependencies: [
                {
                  cycle: ['Assets/Scripts/A.cs', 'Assets/Scripts/B.cs', 'Assets/Scripts/A.cs'],
                  length: 3,
                  severity: 'warning'
                }
              ],
              hasCircularDependencies: true,
              totalCycles: 1
            };
          }

          if (action === 'find_unused') {
            const includeBuiltIn = params.includeBuiltIn || false;

            return {
              success: true,
              action: 'find_unused',
              includeBuiltIn: includeBuiltIn,
              unusedAssets: [
                {
                  path: 'Assets/Textures/old_icon.png',
                  type: 'Texture2D',
                  size: 512,
                  lastModified: '2023-12-01T10:00:00Z'
                },
                {
                  path: 'Assets/Audio/unused_sound.wav',
                  type: 'AudioClip',
                  size: 2048,
                  lastModified: '2023-11-15T14:30:00Z'
                }
              ],
              count: 2,
              totalSizeKB: 2560
            };
          }

          if (action === 'analyze_size_impact') {
            const assetPath = params.assetPath;

            if (assetPath === 'Assets/Textures/large_texture.png') {
              return {
                success: true,
                action: 'analyze_size_impact',
                assetPath: assetPath,
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
              };
            }
          }

          if (action === 'validate_references') {
            return {
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
            };
          }
        }

        throw new Error('Unknown command');
      }
    };

    handler = new AssetDependencyAnalyzeToolHandler(mockUnityConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'analyze_asset_dependencies');
      assert.equal(
        handler.description,
        'Analyze Unity asset dependencies (get dependencies, dependents, circular deps, unused assets, size impact)'
      );
      assert.ok(handler.inputSchema);
      assert.equal(handler.inputSchema.type, 'object');
    });
  });

  describe('validate', () => {
    it('should validate get_dependencies action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'get_dependencies', assetPath: 'Assets/Prefabs/Player.prefab' });
      });
    });

    it('should validate get_dependencies with recursive option', () => {
      assert.doesNotThrow(() => {
        handler.validate({
          action: 'get_dependencies',
          assetPath: 'Assets/Prefabs/Player.prefab',
          recursive: true
        });
      });
    });

    it('should validate get_dependents action', () => {
      assert.doesNotThrow(() => {
        handler.validate({
          action: 'get_dependents',
          assetPath: 'Assets/Materials/PlayerMaterial.mat'
        });
      });
    });

    it('should validate analyze_circular action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'analyze_circular' });
      });
    });

    it('should validate find_unused action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'find_unused' });
      });
    });

    it('should validate find_unused with includeBuiltIn option', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'find_unused', includeBuiltIn: true });
      });
    });

    it('should validate analyze_size_impact action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'analyze_size_impact', assetPath: 'Assets/Textures/large.png' });
      });
    });

    it('should validate validate_references action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'validate_references' });
      });
    });

    it('should fail without action', () => {
      assert.throws(
        () => {
          handler.validate({});
        },
        { message: /action is required/ }
      );
    });

    it('should fail with invalid action', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'invalid' });
        },
        { message: /action must be one of/ }
      );
    });

    it('should fail get_dependencies without assetPath', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'get_dependencies' });
        },
        { message: /assetPath is required/ }
      );
    });

    it('should fail get_dependents without assetPath', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'get_dependents' });
        },
        { message: /assetPath is required/ }
      );
    });

    it('should fail analyze_size_impact without assetPath', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'analyze_size_impact' });
        },
        { message: /assetPath is required/ }
      );
    });

    it('should fail with empty assetPath', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'get_dependencies', assetPath: '' });
        },
        { message: /assetPath cannot be empty/ }
      );
    });

    it('should fail with invalid assetPath format', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'get_dependencies', assetPath: 'Prefabs/Player.prefab' });
        },
        { message: /assetPath must start with "Assets\/"/ }
      );
    });
  });

  describe('execute', () => {
    it('should get dependencies successfully', async () => {
      const result = await handler.execute({
        action: 'get_dependencies',
        assetPath: 'Assets/Prefabs/Player.prefab'
      });

      assert.equal(result.success, true);
      assert.equal(result.action, 'get_dependencies');
      assert.equal(result.assetPath, 'Assets/Prefabs/Player.prefab');
      assert.equal(result.dependencies.length, 3);
      assert.equal(result.count, 3);
      assert.equal(result.maxDepth, 1);

      const materialDep = result.dependencies.find(d => d.type === 'Material');
      assert.ok(materialDep);
      assert.equal(materialDep.isDirectDependency, true);
    });

    it('should get dependencies recursively', async () => {
      const result = await handler.execute({
        action: 'get_dependencies',
        assetPath: 'Assets/Prefabs/Player.prefab',
        recursive: true
      });

      assert.equal(result.recursive, true);
      assert.equal(result.maxDepth, 2);

      const textureDep = result.dependencies.find(d => d.type === 'Texture2D');
      assert.equal(textureDep.depth, 2);
      assert.equal(textureDep.isDirectDependency, false);
    });

    it('should get dependents successfully', async () => {
      const result = await handler.execute({
        action: 'get_dependents',
        assetPath: 'Assets/Materials/PlayerMaterial.mat'
      });

      assert.equal(result.success, true);
      assert.equal(result.action, 'get_dependents');
      assert.equal(result.dependents.length, 2);
      assert.equal(result.count, 2);

      const playerDependent = result.dependents.find(d => d.path.includes('Player'));
      assert.ok(playerDependent);
      assert.equal(playerDependent.usage, 'Renderer.material');
    });

    it('should analyze circular dependencies', async () => {
      const result = await handler.execute({ action: 'analyze_circular' });

      assert.equal(result.success, true);
      assert.equal(result.action, 'analyze_circular');
      assert.equal(result.hasCircularDependencies, true);
      assert.equal(result.totalCycles, 1);
      assert.equal(result.circularDependencies.length, 1);

      const cycle = result.circularDependencies[0];
      assert.equal(cycle.length, 3);
      assert.equal(cycle.severity, 'warning');
      assert.ok(cycle.cycle.includes('Assets/Scripts/A.cs'));
    });

    it('should find unused assets', async () => {
      const result = await handler.execute({ action: 'find_unused' });

      assert.equal(result.success, true);
      assert.equal(result.action, 'find_unused');
      assert.equal(result.unusedAssets.length, 2);
      assert.equal(result.count, 2);
      assert.equal(result.totalSizeKB, 2560);

      const textureAsset = result.unusedAssets.find(a => a.type === 'Texture2D');
      assert.ok(textureAsset);
      assert.equal(textureAsset.size, 512);
    });

    it('should analyze size impact', async () => {
      const result = await handler.execute({
        action: 'analyze_size_impact',
        assetPath: 'Assets/Textures/large_texture.png'
      });

      assert.equal(result.success, true);
      assert.equal(result.action, 'analyze_size_impact');
      assert.equal(result.analysis.directSize, 2048);
      assert.equal(result.analysis.totalSize, 3072);
      assert.equal(result.analysis.dependencyCount, 5);
      assert.ok(result.analysis.largestDependency);
      assert.ok(result.analysis.buildImpact);
    });

    it('should validate references', async () => {
      const result = await handler.execute({ action: 'validate_references' });

      assert.equal(result.success, true);
      assert.equal(result.action, 'validate_references');
      assert.equal(result.validation.totalAssets, 150);
      assert.equal(result.validation.validReferences, 145);
      assert.equal(result.validation.missingReferences, 5);
      assert.equal(result.validation.brokenReferences.length, 1);
      assert.ok(typeof result.validation.validationTime === 'number');
    });

    it('should handle non-existent asset', async () => {
      await assert.rejects(
        handler.execute({ action: 'get_dependencies', assetPath: 'Assets/NonExistent.prefab' }),
        { message: /Asset not found: Assets\/NonExistent.prefab/ }
      );
    });
  });

  describe('getExamples', () => {
    it('should return array of examples', () => {
      const examples = handler.getExamples();
      assert.ok(Array.isArray(examples));
      assert.ok(examples.length >= 5);

      // Check first example structure
      const firstExample = examples[0];
      assert.ok(firstExample.input);
      assert.ok(firstExample.output);
      assert.equal(firstExample.input.action, 'get_dependencies');
    });

    it('should include examples for all main actions', () => {
      const examples = handler.getExamples();
      const actions = examples.map(e => e.input.action);

      assert.ok(actions.includes('get_dependencies'));
      assert.ok(actions.includes('get_dependents'));
      assert.ok(actions.includes('analyze_circular'));
      assert.ok(actions.includes('find_unused'));
      assert.ok(actions.includes('analyze_size_impact'));
    });
  });
});
