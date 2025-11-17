/**
 * Handler for starting Unity Profiler recording session (via MCP)
 */
import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ProfilerStartToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'profiler_start',
      'Start Unity Profiler recording session. Records CPU, memory, rendering, and GC metrics. Data can be saved to .data file for later analysis in Unity Profiler Window.',
      {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['normal', 'deep'],
            default: 'normal',
            description:
              "Profiling mode. 'normal' for standard profiling, 'deep' for deep profiling (more detailed but higher overhead)"
          },
          recordToFile: {
            type: 'boolean',
            default: true,
            description:
              'Save profiling data to .data file in .unity/capture/ directory. Set to false for real-time metrics only.'
          },
          metrics: {
            type: 'array',
            items: { type: 'string' },
            description:
              "Specific metrics to record. Leave empty to record all available metrics. Examples: 'System Used Memory', 'Draw Calls Count', 'GC Allocated In Frame'"
          },
          maxDurationSec: {
            type: 'number',
            minimum: 0,
            description:
              'Auto-stop profiling after N seconds. Set to 0 for unlimited recording (manual stop required).'
          }
        }
      }
    );
    this.unityConnection = unityConnection;
  }

  /** @override */
  async execute(_params, _context) {
    // TODO: Implement in T017
    return { error: 'Not implemented', code: 'E_NOT_IMPLEMENTED' };
  }
}
