/**
 * Base class for all tool handlers
 * Provides common functionality for validation, execution, and error handling
 */
import { logger } from '../../core/config.js';

function cloneSchema(schema) {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  if (typeof structuredClone === 'function') {
    return structuredClone(schema);
  }

  try {
    return JSON.parse(JSON.stringify(schema));
  } catch {
    return schema;
  }
}

function sanitizeSchema(schema) {
  if (!schema) {
    return schema;
  }

  if (Array.isArray(schema)) {
    schema.forEach(item => sanitizeSchema(item));
    return schema;
  }

  if (typeof schema !== 'object') {
    return schema;
  }

  if (Array.isArray(schema.required) && schema.required.length === 0) {
    delete schema.required;
  }

  if (schema.properties && typeof schema.properties === 'object') {
    Object.values(schema.properties).forEach(value => sanitizeSchema(value));
  }

  if (schema.items) {
    sanitizeSchema(schema.items);
  }

  if (Array.isArray(schema.anyOf)) {
    schema.anyOf.forEach(branch => sanitizeSchema(branch));
  }

  if (Array.isArray(schema.oneOf)) {
    schema.oneOf.forEach(branch => sanitizeSchema(branch));
  }

  if (Array.isArray(schema.allOf)) {
    schema.allOf.forEach(branch => sanitizeSchema(branch));
  }

  if (schema.then) {
    sanitizeSchema(schema.then);
  }

  if (schema.else) {
    sanitizeSchema(schema.else);
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    sanitizeSchema(schema.additionalProperties);
  }

  return schema;
}

export class BaseToolHandler {
  constructor(name, description, inputSchema = {}) {
    this.name = name;
    this.description = description;
    const clonedSchema = cloneSchema(inputSchema) || {};
    this.inputSchema = sanitizeSchema(clonedSchema);
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
  async execute(_params) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Main handler method that orchestrates validation and execution
   * @param {object} params - Input parameters
   * @returns {Promise<object>} Standardized response
   */
  async handle(params = {}) {
    logger.debug(`[Handler ${this.name}] Starting handle() with params:`, params);
    
    try {
      // Validate parameters
      logger.debug(`[Handler ${this.name}] Validating parameters...`);
      this.validate(params);
      logger.debug(`[Handler ${this.name}] Validation passed`);
      
      // Execute tool logic
      logger.debug(`[Handler ${this.name}] Executing tool logic...`);
      const startTime = Date.now();
      const result = await this.execute(params);
      const duration = Date.now() - startTime;
      logger.info(`[Handler ${this.name}] Execution completed in ${duration}ms`);
      
      // Return success response in new format
      return {
        status: 'success',
        result
      };
    } catch (error) {
      logger.error(`[Handler ${this.name}] Error occurred: ${error.message}`);
      if (error.stack) {
        logger.debug(`[Handler ${this.name}] Error stack: ${error.stack}`);
      }
      
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
