import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MenuItemExecuteToolHandler } from '../../src/handlers/menu/MenuItemExecuteToolHandler.js';

describe('Menu Security Patch Tests', () => {
  let handler;
  let mockUnityConnection;

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(async () => {}),
      sendCommand: mock.fn(async () => ({
        success: true,
        message: 'Menu item executed successfully'
      }))
    };
    
    handler = new MenuItemExecuteToolHandler(mockUnityConnection);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('Security Bypass Prevention', () => {
    const bypassAttempts = [
      // Case-insensitive bypasses
      { input: 'file/quit', description: 'lowercase bypass' },
      { input: 'FILE/QUIT', description: 'uppercase bypass' },
      { input: 'File/quit', description: 'mixed case bypass' },
      { input: 'fILe/QuIt', description: 'random case bypass' },
      
      // Whitespace manipulation
      { input: ' File/Quit ', description: 'surrounding whitespace' },
      { input: 'File/Quit\t', description: 'tab character' },
      { input: 'File/Quit\n', description: 'newline character' },
      { input: 'File /Quit', description: 'internal space' },
      { input: 'File\t/Quit', description: 'internal tab' },
      
      // Path separator manipulation
      { input: 'File//Quit', description: 'double forward slash' },
      { input: 'File\\Quit', description: 'backslash separator' },
      { input: 'File\\\\Quit', description: 'double backslash' },
      
      // Unicode homograph attacks (Cyrillic)
      { input: 'Fіle/Quit', description: 'Cyrillic і instead of i' },
      { input: 'Fіlе/Quit', description: 'Cyrillic і and е' },
      { input: 'Filе/Quit', description: 'Cyrillic е instead of e' },
      
      // Zero-width character injection
      { input: 'File\u200B/Quit', description: 'zero-width space' },
      { input: 'File/\u200CQuit', description: 'zero-width non-joiner' },
      { input: 'File/Qu\uFEFFit', description: 'zero-width no-break space' },
      
      // Greek homographs
      { input: 'Filε/Quit', description: 'Greek epsilon' },
      { input: 'Fiλe/Quit', description: 'Greek lambda' },
      
      // Multiple attack vectors combined
      { input: ' fіlе/quit ', description: 'combined: whitespace + Cyrillic' },
      { input: 'FILE\\\\QUIT', description: 'combined: uppercase + double backslash' },
      { input: '\u200BFile/Quit\u200C', description: 'combined: zero-width chars' }
    ];

    bypassAttempts.forEach(({ input, description }) => {
      it(`should block ${description}: "${input}"`, () => {
        assert.throws(
          () => handler.validate({ menuPath: input }),
          /Menu item is blacklisted for safety/,
          `Failed to block bypass attempt: ${description} (${input})`
        );
      });
    });

    it('should block all traditional dangerous menu items', () => {
      const dangerousMenus = [
        'Assets/Delete',
        'File/Build Settings...',
        'File/Build And Run',
        'Edit/Preferences...'
      ];

      dangerousMenus.forEach(menuPath => {
        assert.throws(
          () => handler.validate({ menuPath }),
          /Menu item is blacklisted for safety/,
          `Failed to block dangerous menu: ${menuPath}`
        );
      });
    });
  });

  describe('Normalization Function Tests', () => {
    it('should normalize case correctly', () => {
      const testCases = [
        ['File/Quit', 'file/quit'],
        ['FILE/QUIT', 'file/quit'],
        ['fILe/QuIt', 'file/quit']
      ];

      testCases.forEach(([input, expected]) => {
        const result = handler.normalizeMenuPath(input);
        assert.equal(result, expected, `Failed to normalize case: ${input} -> ${result} (expected: ${expected})`);
      });
    });

    it('should normalize whitespace correctly', () => {
      const testCases = [
        [' File/Quit ', 'file/quit'],
        ['File /Quit', 'file/quit'],
        ['File\t/Quit', 'file/quit'],
        ['File   /   Quit', 'file/quit']
      ];

      testCases.forEach(([input, expected]) => {
        const result = handler.normalizeMenuPath(input);
        assert.equal(result, expected, `Failed to normalize whitespace: ${input} -> ${result} (expected: ${expected})`);
      });
    });

    it('should normalize path separators correctly', () => {
      const testCases = [
        ['File\\Quit', 'file/quit'],
        ['File//Quit', 'file/quit'],
        ['File\\\\Quit', 'file/quit'],
        ['File///Quit', 'file/quit']
      ];

      testCases.forEach(([input, expected]) => {
        const result = handler.normalizeMenuPath(input);
        assert.equal(result, expected, `Failed to normalize separators: ${input} -> ${result} (expected: ${expected})`);
      });
    });

    it('should remove zero-width characters correctly', () => {
      const testCases = [
        ['File\u200B/Quit', 'file/quit'],
        ['File/\u200CQuit', 'file/quit'],
        ['File/Qu\uFEFFit', 'file/quit'],
        ['File\u200D/Qu\u200Bit', 'file/quit']
      ];

      testCases.forEach(([input, expected]) => {
        const result = handler.normalizeMenuPath(input);
        assert.equal(result, expected, `Failed to remove zero-width chars: ${input} -> ${result} (expected: ${expected})`);
      });
    });

    it('should handle Unicode homographs correctly', () => {
      const testCases = [
        ['Fіle/Quit', 'file/quit'], // Cyrillic і
        ['Filе/Quit', 'file/quit'], // Cyrillic е
        ['Filε/Quit', 'file/quit'], // Greek ε
        ['Fiλe/Quit', 'file/quit']  // Greek λ
      ];

      testCases.forEach(([input, expected]) => {
        const result = handler.normalizeMenuPath(input);
        assert.equal(result, expected, `Failed to handle homograph: ${input} -> ${result} (expected: ${expected})`);
      });
    });

    it('should handle edge cases safely', () => {
      const testCases = [
        [null, ''],
        [undefined, ''],
        ['', ''],
        [123, ''], // Number
        [{}, ''], // Object
        [[], '']  // Array
      ];

      testCases.forEach(([input, expected]) => {
        const result = handler.normalizeMenuPath(input);
        assert.equal(result, expected, `Failed to handle edge case: ${input} -> ${result} (expected: ${expected})`);
      });
    });
  });

  describe('Legitimate Menu Paths', () => {
    it('should allow legitimate menu paths', () => {
      const legitimateMenus = [
        'Assets/Refresh',
        'Window/General/Console',
        'GameObject/Create Empty',
        'Edit/Undo',
        'Help/About Unity'
      ];

      legitimateMenus.forEach(menuPath => {
        assert.doesNotThrow(
          () => handler.validate({ menuPath }),
          `Incorrectly blocked legitimate menu: ${menuPath}`
        );
      });
    });

    it('should allow legitimate menu paths with safety disabled', () => {
      const dangerousMenus = [
        'File/Quit',
        'Assets/Delete',
        'File/Build Settings...'
      ];

      dangerousMenus.forEach(menuPath => {
        assert.doesNotThrow(
          () => handler.validate({ menuPath, safetyCheck: false }),
          `Failed to allow dangerous menu with safety disabled: ${menuPath}`
        );
      });
    });
  });

  describe('Performance Tests', () => {
    it('should process normalization quickly', () => {
      const complexInput = ' \u200BFіlе\u200C//\u200DQuіt\uFEFF ';
      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < 1000; i++) {
        handler.normalizeMenuPath(complexInput);
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;
      
      // Should process 1000 normalizations in under 100ms
      assert.ok(durationMs < 100, `Normalization too slow: ${durationMs}ms for 1000 iterations`);
    });

    it('should handle large blacklist efficiently', () => {
      // Add many items to blacklist
      for (let i = 0; i < 1000; i++) {
        handler.addToBlacklist(`TestMenu${i}/SubMenu${i}`);
      }

      const startTime = process.hrtime.bigint();
      
      // Test blacklist checking performance
      for (let i = 0; i < 100; i++) {
        handler.isMenuPathBlacklisted('File/Quit');
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;
      
      // Should check 100 items against 1000-item blacklist in under 50ms
      assert.ok(durationMs < 50, `Blacklist checking too slow: ${durationMs}ms for 100 checks`);
    });
  });
});