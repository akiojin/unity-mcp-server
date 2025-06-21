/**
 * Base class for all tool handlers
 * Provides common functionality for validation, execution, and error handling
 */
export class BaseToolHandler {
  constructor(name, description, inputSchema = {}) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
  }

  /**
   * Validates the input parameters against the schema
   * Override this method for custom validation
   * @param {object} params - Input parameters
   * @throws {Error} If validation fails
   */
  validate(params) {
    // Basic validation - check required fields from schema
    if (this.inputSchema.required) {
      for (const field of this.inputSchema.required) {
        if (params[field] === undefined || params[field] === null) {
          throw new Error(`Missing required parameter: ${field}`);
        }
      }
    }
  }

  /**
   * Executes the tool logic
   * Must be implemented by subclasses
   * @param {object} params - Validated input parameters
   * @returns {Promise<object>} Tool result
   */
  async execute(params) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Main handler method that orchestrates validation and execution
   * @param {object} params - Input parameters
   * @returns {Promise<object>} Standardized response
   */
  async handle(params = {}) {
    try {
      // Validate parameters
      this.validate(params);
      
      // Execute tool logic
      const result = await this.execute(params);
      
      // Return success response in new format
      return {
        status: 'success',
        result
      };
    } catch (error) {
      // Return error response in new format
      return {
        status: 'error',
        error: error.message,
        code: error.code || 'TOOL_ERROR',
        details: {
          tool: this.name,
          params: this.summarizeParams(params),
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      };
    }
  }

  /**
   * Summarizes parameters for error reporting
   * @param {object} params - Parameters to summarize
   * @returns {string} Summary string
   */
  summarizeParams(params) {
    if (!params || typeof params !== 'object') {
      return 'No parameters';
    }

    const entries = Object.entries(params);
    if (entries.length === 0) {
      return 'Empty parameters';
    }

    return entries
      .map(([key, value]) => {
        let valueStr = '';
        if (value === null) {
          valueStr = 'null';
        } else if (value === undefined) {
          valueStr = 'undefined';
        } else if (typeof value === 'string') {
          // Truncate long strings
          valueStr = value.length > 50 ? `"${value.substring(0, 47)}..."` : `"${value}"`;
        } else if (typeof value === 'object') {
          valueStr = Array.isArray(value) ? `[Array(${value.length})]` : '[Object]';
        } else {
          valueStr = String(value);
        }
        return `${key}: ${valueStr}`;
      })
      .join(', ');
  }

  /**
   * Returns the tool definition for MCP
   * @returns {object} Tool definition
   */
  getDefinition() {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema
    };
  }
}