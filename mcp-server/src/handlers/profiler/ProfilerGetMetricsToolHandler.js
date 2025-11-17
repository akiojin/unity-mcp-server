/**
 * Handler for getting Unity Profiler metrics (via MCP)
 */
import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ProfilerGetMetricsToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'profiler_get_metrics',
      'Get available profiler metrics or current metric values. Can list all available metrics by category, or query current values of specific metrics.',
      {
        type: 'object',
        properties: {
          listAvailable: {
            type: 'boolean',
            default: false,
            description:
              'If true, return list of all available metrics grouped by category. If false, return current values of specified metrics.'
          },
          metrics: {
            type: 'array',
            items: { type: 'string' },
            description:
              "Specific metrics to query (only used when listAvailable=false). Leave empty to get all current metric values. Examples: 'System Used Memory', 'Draw Calls Count'"
          }
        }
      }
    );
    this.unityConnection = unityConnection;
  }

  /** @override */
  async execute(_params, _context) {
    // TODO: Implement in T020
    return { error: 'Not implemented', code: 'E_NOT_IMPLEMENTED' };
  }
}
