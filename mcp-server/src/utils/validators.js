/**
 * Common validation utilities for Unity MCP
 */

/**
 * Validates a Vector3 object
 * @param {Object} obj - The object to validate
 * @param {string} name - The parameter name for error messages
 * @throws {Error} If the object is not a valid Vector3
 */
export function validateVector3(obj, name) {
  if (obj && typeof obj === 'object') {
    const keys = Object.keys(obj);
    const validKeys = ['x', 'y', 'z'];
    
    for (const key of keys) {
      if (!validKeys.includes(key)) {
        throw new Error(`${name} must only contain x, y, z properties`);
      }
      if (typeof obj[key] !== 'number') {
        throw new Error(`${name}.${key} must be a number`);
      }
    }
  }
}

/**
 * Validates that a value is within a specified range
 * @param {number} value - The value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {string} name - The parameter name for error messages
 * @throws {Error} If the value is outside the range
 */
export function validateRange(value, min, max, name) {
  if (typeof value !== 'number') {
    throw new Error(`${name} must be a number`);
  }
  if (value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max}`);
  }
}

/**
 * Validates that a string is not empty
 * @param {string} value - The string to validate
 * @param {string} name - The parameter name for error messages
 * @throws {Error} If the string is empty or not a string
 */
export function validateNonEmptyString(value, name) {
  if (typeof value !== 'string') {
    throw new Error(`${name} must be a string`);
  }
  if (value.trim().length === 0) {
    throw new Error(`${name} cannot be empty`);
  }
}

/**
 * Validates that a value is a boolean
 * @param {*} value - The value to validate
 * @param {string} name - The parameter name for error messages
 * @throws {Error} If the value is not a boolean
 */
export function validateBoolean(value, name) {
  if (typeof value !== 'boolean') {
    throw new Error(`${name} must be a boolean`);
  }
}

/**
 * Validates Unity layer index (0-31)
 * @param {number} layer - The layer index to validate
 * @throws {Error} If the layer is invalid
 */
export function validateLayer(layer) {
  validateRange(layer, 0, 31, 'layer');
}

/**
 * Validates a GameObject path
 * @param {string} path - The path to validate
 * @throws {Error} If the path is invalid
 */
export function validateGameObjectPath(path) {
  validateNonEmptyString(path, 'path');
  if (!path.startsWith('/')) {
    throw new Error('GameObject path must start with /');
  }
}