import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for executing Unity Editor menu items
 */
export class ExecuteMenuItemToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'execute_menu_item',
      'Execute Unity Editor menu items',
      {
        type: 'object',
        properties: {
          menuPath: {
            type: 'string',
            description: 'Unity menu path (e.g., "Assets/Refresh", "Window/General/Console")'
          },
          action: {
            type: 'string',
            enum: ['execute', 'get_available_menus'],
            default: 'execute',
            description: 'Action to perform: execute menu item or get available menus'
          },
          alias: {
            type: 'string',
            description: 'Menu alias for common operations (e.g., "refresh", "console")'
          },
          parameters: {
            type: 'object',
            description: 'Additional parameters for menu execution (if supported)'
          },
          safetyCheck: {
            type: 'boolean',
            default: true,
            description: 'Enable safety checks to prevent execution of dangerous menu items'
          }
        },
        required: ['menuPath']
      }
    );
    
    this.unityConnection = unityConnection;
    
    // Define blacklisted menu items for safety
    this.blacklistedMenus = new Set([
      'File/Quit',
      'Edit/Preferences...',
      'File/Build Settings...',
      'File/Build And Run',
      'Assets/Delete'
    ]);
    
    // Common menu aliases
    this.menuAliases = new Map([
      ['refresh', 'Assets/Refresh'],
      ['console', 'Window/General/Console'],
      ['inspector', 'Window/General/Inspector'],
      ['hierarchy', 'Window/General/Hierarchy'],
      ['project', 'Window/General/Project'],
      ['scene', 'Window/General/Scene'],
      ['game', 'Window/General/Game'],
      ['animation', 'Window/Animation/Animation'],
      ['animator', 'Window/Animation/Animator']
    ]);
  }

  /**
   * Validates the input parameters
   * @param {Object} params - The input parameters
   * @throws {Error} If validation fails
   */
  validate(params) {
    const { menuPath, action, safetyCheck = true } = params;

    // menuPath is required
    if (!menuPath) {
      throw new Error('menuPath is required');
    }

    if (typeof menuPath !== 'string' || menuPath.trim() === '') {
      throw new Error('menuPath cannot be empty');
    }

    // Validate menu path format (should contain at least one slash)
    if (!menuPath.includes('/') || menuPath.startsWith('/') || menuPath.endsWith('/')) {
      throw new Error('menuPath must be in format "Category/MenuItem" (e.g., "Assets/Refresh")');
    }

    // Safety check for blacklisted items
    if (safetyCheck && this.blacklistedMenus.has(menuPath)) {
      throw new Error(`Menu item is blacklisted for safety: ${menuPath}. Use safetyCheck: false to override.`);
    }

    // Validate action if provided
    if (action && !['execute', 'get_available_menus'].includes(action)) {
      throw new Error('action must be one of: execute, get_available_menus');
    }
  }

  /**
   * Executes the menu item operation
   * @param {Object} params - The input parameters
   * @returns {Promise<Object>} The result of the menu operation
   */
  async execute(params) {
    const {
      menuPath,
      action = 'execute',
      alias,
      parameters,
      safetyCheck = true
    } = params;

    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Resolve alias if provided
    let resolvedMenuPath = menuPath;
    if (alias && this.menuAliases.has(alias)) {
      resolvedMenuPath = this.menuAliases.get(alias);
    }

    // Prepare command parameters
    const commandParams = {
      action,
      menuPath: resolvedMenuPath,
      safetyCheck
    };

    // Add optional parameters
    if (alias) {
      commandParams.alias = alias;
    }
    if (parameters) {
      commandParams.parameters = parameters;
    }

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('execute_menu_item', commandParams);

    // Handle Unity response
    if (response.success === false) {
      throw new Error(response.error || 'Failed to execute menu operation');
    }

    // Build result object based on action
    if (action === 'get_available_menus') {
      return {
        availableMenus: response.availableMenus || [],
        totalMenus: response.totalMenus,
        filteredCount: response.filteredCount,
        message: response.message || 'Available menus retrieved successfully'
      };
    } else {
      // Execute action
      const result = {
        menuPath: response.menuPath || resolvedMenuPath,
        message: response.message || 'Menu item executed successfully'
      };

      // Include optional metadata if available
      if (response.executed !== undefined) {
        result.executed = response.executed;
      }
      if (response.executionTime !== undefined) {
        result.executionTime = response.executionTime;
      }
      if (response.menuExists !== undefined) {
        result.menuExists = response.menuExists;
      }
      if (response.alias) {
        result.alias = response.alias;
      }

      return result;
    }
  }

  /**
   * Gets a list of common menu aliases
   * @returns {Object} Map of aliases to menu paths
   */
  getMenuAliases() {
    return Object.fromEntries(this.menuAliases);
  }

  /**
   * Gets a list of blacklisted menu items
   * @returns {Array} List of blacklisted menu paths
   */
  getBlacklistedMenus() {
    return Array.from(this.blacklistedMenus);
  }

  /**
   * Adds a custom menu alias
   * @param {string} alias - The alias name
   * @param {string} menuPath - The Unity menu path
   */
  addMenuAlias(alias, menuPath) {
    this.menuAliases.set(alias, menuPath);
  }

  /**
   * Adds a menu item to the blacklist
   * @param {string} menuPath - The Unity menu path to blacklist
   */
  addToBlacklist(menuPath) {
    this.blacklistedMenus.add(menuPath);
  }
}