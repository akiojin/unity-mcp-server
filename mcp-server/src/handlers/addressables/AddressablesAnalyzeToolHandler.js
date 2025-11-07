import { BaseToolHandler } from '../base/BaseToolHandler.js'

/**
 * Addressables Analysis Tool Handler for Unity MCP
 * Handles Unity Addressables dependency and asset analysis operations
 */
export default class AddressablesAnalyzeToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'addressables_analyze',
      'Analyze Unity Addressables for duplicates, dependencies, and unused assets',
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['analyze_duplicates', 'analyze_dependencies', 'analyze_unused'],
            description: 'The Addressables analysis operation to perform'
          },
          assetPath: {
            type: 'string',
            pattern: '^Assets/.+',
            description: 'Asset path to analyze dependencies (required for analyze_dependencies)'
          },
          pageSize: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
            description: 'Number of results per page (for analyze_duplicates, analyze_unused)'
          },
          offset: {
            type: 'integer',
            minimum: 0,
            default: 0,
            description: 'Offset for pagination'
          }
        },
        required: ['action']
      }
    )
    this.unityConnection = unityConnection
  }

  validate(params) {
    const { action, assetPath } = params || {}

    if (!action) {
      throw new Error('action is required')
    }

    const validActions = ['analyze_duplicates', 'analyze_dependencies', 'analyze_unused']
    if (!validActions.includes(action)) {
      throw new Error(`Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`)
    }

    // Action-specific validation
    if (action === 'analyze_dependencies' && !assetPath) {
      throw new Error('assetPath is required for analyze_dependencies')
    }
  }

  async execute(params) {
    const { action, ...parameters } = params

    // Ensure connected
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect()
    }

    const result = await this.unityConnection.sendCommand('addressables_analyze', {
      action,
      ...parameters
    })

    return this.formatResponse(action, result)
  }

  formatResponse(action, result) {
    if (result && result.error) {
      throw new Error(result.error.message || result.error)
    }

    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response from Unity')
    }

    // Return formatted response
    return {
      content: [
        {
          type: 'text',
          text: this.formatResultText(action, result)
        }
      ]
    }
  }

  formatResultText(action, result) {
    const lines = []

    switch (action) {
      case 'analyze_duplicates':
        lines.push('🔍 重複アセット分析結果')
        if (result.data && result.data.duplicates) {
          if (result.data.duplicates.length === 0) {
            lines.push('  ✅ 重複アセットは見つかりませんでした')
          } else {
            lines.push(`  ⚠️  重複アセット: ${result.pagination.total}件`)
            result.data.duplicates.forEach(dup => {
              lines.push(`\n  📁 ${dup.assetPath}`)
              lines.push(`     使用グループ: ${dup.groups.join(', ')}`)
            })
            if (result.pagination.hasMore) {
              lines.push(
                `\n  ... さらに${result.pagination.total - result.pagination.offset - result.pagination.pageSize}件あります`
              )
            }
          }
        }
        break

      case 'analyze_dependencies':
        lines.push('🔍 依存関係分析結果')
        if (result.data && result.data.dependencies) {
          const deps = Object.entries(result.data.dependencies)
          if (deps.length === 0) {
            lines.push('  ✅ 依存関係がありません')
          } else {
            deps.forEach(([assetPath, dependencies]) => {
              lines.push(`\n  📁 ${assetPath}`)
              if (dependencies.length === 0) {
                lines.push('     依存なし')
              } else {
                lines.push(`     依存数: ${dependencies.length}個`)
                dependencies.forEach((dep, idx) => {
                  if (idx < 10) {
                    lines.push(`       → ${dep}`)
                  }
                })
                if (dependencies.length > 10) {
                  lines.push(`       ... 他${dependencies.length - 10}件`)
                }
              }
            })
          }
        }
        break

      case 'analyze_unused':
        lines.push('🔍 未使用アセット分析結果')
        if (result.data && result.data.unused) {
          if (result.data.unused.length === 0) {
            lines.push('  ✅ すべてのアセットが使用されています')
          } else {
            lines.push(`  ⚠️  未使用アセット: ${result.pagination.total}件`)
            result.data.unused.forEach(path => {
              lines.push(`    📁 ${path}`)
            })
            if (result.pagination.hasMore) {
              lines.push(
                `\n  ... さらに${result.pagination.total - result.pagination.offset - result.pagination.pageSize}件あります`
              )
            }
            lines.push(
              '\n  💡 これらのアセットはAddressableとして登録されておらず、他のAddressableからも参照されていません'
            )
          }
        }
        break

      default:
        lines.push(JSON.stringify(result, null, 2))
    }

    return lines.join('\n')
  }
}
