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
  async execute(params, _context) {
    // Validate mode parameter
    if (params?.mode && !['normal', 'deep'].includes(params.mode)) {
      return {
        error: `Invalid mode '${params.mode}'. Must be 'normal' or 'deep'.`,
        code: 'E_INVALID_MODE'
      };
    }

    // Validate maxDurationSec parameter
    if (params?.maxDurationSec !== undefined && params.maxDurationSec < 0) {
      return {
        error: `Invalid maxDurationSec '${params.maxDurationSec}'. Must be >= 0.`,
        code: 'E_INVALID_PARAMETER'
      };
    }

    // Validate metrics parameter
    if (params?.metrics !== undefined && !Array.isArray(params.metrics)) {
      return {
        error: 'Invalid metrics parameter. Must be an array of strings.',
        code: 'E_INVALID_PARAMETER'
      };
    }

    if (Array.isArray(params?.metrics) && params.metrics.some(m => typeof m !== 'string')) {
      return {
        error: 'Invalid metrics parameter. All elements must be strings.',
        code: 'E_INVALID_PARAMETER'
      };
    }

    const command = {
      command: 'profiler_start',
      parameters: params
    };

    const result = await this.unityConnection.sendCommand(command);
    return result;
  }
}
