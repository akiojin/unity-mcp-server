import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for reading Unity Editor console logs with advanced filtering
 */
export class ConsoleReadToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'read_console',
      'Read Console logs with filters (type/text/time), formatting, sort, and grouping.',
      {
        type: 'object',
        properties: {
          raw: {
            type: 'boolean',
            description:
              'When true, do not expand/validate logTypes and pass them directly to Unity. Use with caution.'
          },
          count: {
            type: 'number',
            description: 'Number of logs to retrieve (1-1000, default: 100)',
            minimum: 1,
            maximum: 1000
          },
          logTypes: {
            type: 'array',
            description:
              'Filter by log types. Allowed: Log, Warning, Error. Error expands to include Exception/Assert internally. Default: all three.',
            items: {
              type: 'string',
              enum: ['Log', 'Warning', 'Error']
            }
          },
          filterText: {
            type: 'string',
            description: 'Filter logs containing this text (case-insensitive)'
          },
          includeStackTrace: {
            type: 'boolean',
            description:
              'Include stack traces in results (default: false). Set to true only when debugging to reduce response size.',
            default: false
          },
          format: {
            type: 'string',
            description:
              'Output format for logs. Unity default: compact. RECOMMENDED: compact for general use, detailed for debugging',
            enum: ['detailed', 'compact', 'json', 'plain']
          },
          sinceTimestamp: {
            type: 'string',
            description: 'Only return logs after this timestamp (ISO 8601)'
          },
          untilTimestamp: {
            type: 'string',
            description: 'Only return logs before this timestamp (ISO 8601)'
          },
          sortOrder: {
            type: 'string',
            description: 'Sort order for logs (default: newest)',
            enum: ['newest', 'oldest']
          },
          groupBy: {
            type: 'string',
            description: 'Group logs by criteria (default: none)',
            enum: ['none', 'type', 'file', 'time']
          }
        },
        required: []
      }
    );

    this.unityConnection = unityConnection;
  }

  /**
   * Validates the input parameters
   * @param {Object} params - The input parameters
   * @throws {Error} If validation fails
   */
  validate(params) {
    const { count, logTypes, format, sinceTimestamp, untilTimestamp, sortOrder, groupBy } = params;

    // Validate count
    if (count !== undefined) {
      if (typeof count !== 'number' || count < 1 || count > 1000) {
        throw new Error('count must be between 1 and 1000');
      }
    }

    // Validate log types
    if (logTypes !== undefined) {
      if (!Array.isArray(logTypes)) {
        throw new Error('logTypes must be an array');
      }

      const validTypes = ['Log', 'Warning', 'Error'];
      for (const type of logTypes) {
        if (!validTypes.includes(type)) {
          throw new Error(`logTypes must be one of: ${validTypes.join(', ')}`);
        }
      }
    }

    // Validate timestamps
    if (sinceTimestamp !== undefined) {
      if (!this.isValidISO8601(sinceTimestamp)) {
        throw new Error('sinceTimestamp must be a valid ISO 8601 timestamp');
      }
    }

    if (untilTimestamp !== undefined) {
      if (!this.isValidISO8601(untilTimestamp)) {
        throw new Error('untilTimestamp must be a valid ISO 8601 timestamp');
      }
    }

    // Validate timestamp order
    if (sinceTimestamp && untilTimestamp) {
      const since = new Date(sinceTimestamp);
      const until = new Date(untilTimestamp);
      if (until <= since) {
        throw new Error('untilTimestamp must be after sinceTimestamp');
      }
    }

    // Validate format
    if (format !== undefined) {
      const validFormats = ['detailed', 'compact', 'json', 'plain'];
      if (!validFormats.includes(format)) {
        throw new Error(`format must be one of: ${validFormats.join(', ')}`);
      }
    }

    // Validate sort order
    if (sortOrder !== undefined) {
      const validOrders = ['newest', 'oldest'];
      if (!validOrders.includes(sortOrder)) {
        throw new Error(`sortOrder must be one of: ${validOrders.join(', ')}`);
      }
    }

    // Validate groupBy
    if (groupBy !== undefined) {
      const validGroups = ['none', 'type', 'file', 'time'];
      if (!validGroups.includes(groupBy)) {
        throw new Error(`groupBy must be one of: ${validGroups.join(', ')}`);
      }
    }
  }

  /**
   * Checks if a string is a valid ISO 8601 timestamp
   * @param {string} timestamp - The timestamp to validate
   * @returns {boolean} True if valid
   */
  isValidISO8601(timestamp) {
    const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (!regex.test(timestamp)) {
      return false;
    }

    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  }

  /**
   * Executes the enhanced log reading operation
   * @param {Object} params - The input parameters
   * @returns {Promise<Object>} The result of the log reading
   */
  async execute(params) {
    const {
      count,
      logTypes,
      filterText,
      includeStackTrace,
      format,
      sinceTimestamp,
      untilTimestamp,
      sortOrder,
      groupBy
    } = params;

    // Allowed: Log / Warning / Error. Error expands to include Exception/Assert.
    let expandedLogTypes = [];
    if (!logTypes || logTypes.length === 0) {
      expandedLogTypes = ['Log', 'Warning', 'Error', 'Exception', 'Assert'];
    } else {
      logTypes.forEach(type => {
        switch (type) {
          case 'Log':
            expandedLogTypes.push('Log');
            break;
          case 'Warning':
            expandedLogTypes.push('Warning');
            break;
          case 'Error':
            expandedLogTypes.push('Error', 'Exception', 'Assert');
            break;
          default:
            // ignore (validate already enforces)
            break;
        }
      });
      expandedLogTypes = [...new Set(expandedLogTypes)];
      if (expandedLogTypes.length === 0) {
        expandedLogTypes = ['Log', 'Warning', 'Error', 'Exception', 'Assert'];
      }
    }

    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Prepare command parameters
    const commandParams = {
      count,
      logTypes: expandedLogTypes,
      includeStackTrace: includeStackTrace ?? false,
      format,
      sortOrder,
      groupBy
    };

    // Add optional parameters
    if (filterText !== undefined) {
      commandParams.filterText = filterText;
    }
    if (sinceTimestamp !== undefined) {
      commandParams.sinceTimestamp = sinceTimestamp;
    }
    if (untilTimestamp !== undefined) {
      commandParams.untilTimestamp = untilTimestamp;
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('read_console', commandParams);

    // Handle Unity response
    if (response.success === false) {
      throw new Error(response.error || 'Failed to read logs');
    }

    // Build result object
    const rawLogs = Array.isArray(response.logs) ? response.logs : [];
    const logs = rawLogs.map(log => {
      const type = log.type ?? log.logType ?? null;
      return {
        ...log,
        type,
        logType: log.logType ?? type,
        timestamp: log.timestamp ?? log.time ?? null
      };
    });

    const totalCaptured = response.totalCaptured ?? response.totalCount ?? logs.length;
    const returnedCount = response.count ?? logs.length;

    const result = {
      logs,
      count: returnedCount,
      totalCaptured,
      totalCount: totalCaptured
    };

    // Include optional fields if available
    if (response.filteredCount !== undefined) {
      result.filteredCount = response.filteredCount;
    }
    if (response.statistics !== undefined) {
      result.statistics = response.statistics;
    }
    if (response.groupedLogs !== undefined) {
      result.groupedLogs = response.groupedLogs;
    }
    if (response.format !== undefined) {
      result.format = response.format;
    }
    if (response.groupBy !== undefined) {
      result.groupBy = response.groupBy;
    }

    return result;
  }
}
