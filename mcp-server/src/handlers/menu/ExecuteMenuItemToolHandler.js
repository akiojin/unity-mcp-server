import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for executing Unity Editor menu items
 */
export class ExecuteMenuItemToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'menu_item_execute',
      'Execute a Unity menu item or list available menus (with safety checks).',
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
            description: 'Action to perform: execute menu item or get available menus (default: execute)'
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
            description: 'Enable safety checks to prevent execution of dangerous menu items (default: true)'
          }
        },
        required: ['menuPath']
      }
    );
    
    this.unityConnection = unityConnection;
    
    // Define blacklisted menu items for safety
    // Includes dialog-opening menus that cause MCP hanging
    this.blacklistedMenus = new Set([
      // Application control
      'File/Quit',
      
      // Dialog-opening file operations (cause MCP hanging)
      'File/Open Scene',
      'File/New Scene', 
      'File/Save Scene As...',
      'File/Build Settings...',
      'File/Build And Run',
      
      // Dialog-opening asset operations (cause MCP hanging)
      'Assets/Import New Asset...',
      'Assets/Import Package/Custom Package...',
      'Assets/Export Package...',
      'Assets/Delete',
      
      // Dialog-opening preferences and settings (cause MCP hanging)
      'Edit/Preferences...',
      'Edit/Project Settings...',
      
      // Dialog-opening window operations (may cause issues)
      'Window/Package Manager',
      'Window/Asset Store',
      
      // Scene view operations that may require focus (potential hanging)
      'GameObject/Align With View',
      'GameObject/Align View to Selected'
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

    // Safety check for blacklisted items with security normalization (BEFORE format validation)
    if (safetyCheck && this.isMenuPathBlacklisted(menuPath)) {
      throw new Error(`Menu item is blacklisted for safety: ${menuPath}. Use safetyCheck: false to override.`);
    }

    // Validate menu path format (should contain at least one slash) - after normalization for security
    const normalizedForValidation = this.normalizeMenuPath(menuPath);
    if (!normalizedForValidation.includes('/') || normalizedForValidation.startsWith('/') || normalizedForValidation.endsWith('/')) {
      throw new Error('menuPath must be in format "Category/MenuItem" (e.g., "Assets/Refresh")');
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

  /**
   * Securely checks if a menu path is blacklisted using normalized comparison
   * Prevents bypass attacks using case changes, whitespace, Unicode, etc.
   * @param {string} menuPath - The menu path to check
   * @returns {boolean} True if the path is blacklisted
   */
  isMenuPathBlacklisted(menuPath) {
    // Normalize the input path to prevent bypass attacks
    const normalizedPath = this.normalizeMenuPath(menuPath);
    
    // Check against normalized blacklist entries
    for (const blacklistedItem of this.blacklistedMenus) {
      const normalizedBlacklistItem = this.normalizeMenuPath(blacklistedItem);
      if (normalizedPath === normalizedBlacklistItem) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Normalizes a menu path to prevent security bypass attacks
   * @param {string} menuPath - The raw menu path
   * @returns {string} The normalized path
   */
  normalizeMenuPath(menuPath) {
    if (!menuPath || typeof menuPath !== 'string') {
      return '';
    }

    // Step 1: Remove zero-width and invisible Unicode characters
    let normalized = menuPath.replace(/[\u200B-\u200D\uFEFF\u00AD\u034F\u061C\u180E\u2060-\u2069]/g, '');
    
    // Step 2: Normalize Unicode to canonical form (handles homograph attacks)
    normalized = normalized.normalize('NFC');
    
    // Step 3: Convert to lowercase for case-insensitive comparison
    normalized = normalized.toLowerCase();
    
    // Step 4: Trim whitespace and remove all internal whitespace (security bypass prevention)
    normalized = normalized.trim().replace(/\s+/g, '');
    
    // Step 5: Normalize path separators (convert backslashes to forward slashes)
    normalized = normalized.replace(/\\/g, '/');
    
    // Step 6: Remove duplicate path separators
    normalized = normalized.replace(/\/+/g, '/');
    
    // Step 7: Handle common homograph substitutions for ASCII characters
    const homographMap = {
      // Cyrillic lookalikes
      'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y',
      'і': 'i', 'ј': 'j', 'ѕ': 's', 'һ': 'h', 'ց': 'q', 'ԁ': 'd', 'ɡ': 'g',
      // Greek lookalikes
      'α': 'a', 'β': 'b', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'h',
      'θ': 'o', 'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x',
      'ο': 'o', 'π': 'p', 'ρ': 'p', 'σ': 's', 'τ': 't', 'υ': 'u', 'φ': 'f',
      'χ': 'x', 'ψ': 'y', 'ω': 'w'
    };
    
    // Replace homographs
    for (const [homograph, ascii] of Object.entries(homographMap)) {
      normalized = normalized.replace(new RegExp(homograph, 'g'), ascii);
    }
    
    return normalized;
  }
}
