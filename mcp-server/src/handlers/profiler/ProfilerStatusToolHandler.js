/**
 * Handler for getting Unity Profiler recording status (via MCP)
 */
import { BaseToolHandler } from '../base/BaseToolHandler.js';

export class ProfilerStatusToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'profiler_status',
      'Get current Unity Profiler recording status. Returns information about active session, elapsed time, and remaining time (if auto-stop is configured).',
      {
        type: 'object',
        properties: {}
      }
    );
    this.unityConnection = unityConnection;
  }

  /** @override */
  async execute(_params, _context) {
    // TODO: Implement in T019
    return { error: 'Not implemented', code: 'E_NOT_IMPLEMENTED' };
  }
}
