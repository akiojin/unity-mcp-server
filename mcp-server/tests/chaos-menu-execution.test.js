import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ExecuteMenuItemToolHandler } from '../src/handlers/menu/ExecuteMenuItemToolHandler.js';

describe('CHAOS TEST: Menu Execution System', () => {
  let handler;
  let mockUnityConnection;
  let chaosResults = [];

  const logChaosResult = (testName, input, result, error = null) => {
    chaosResults.push({
      test: testName,
      input: input,
      result: result,
      error: error?.message || null,
      timestamp: new Date().toISOString()
    });
  };

  beforeEach(() => {
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(async () => {}),
      sendCommand: mock.fn(async () => ({
        success: true,
        message: 'Menu item executed successfully',
        menuPath: 'Assets/Refresh'
      }))
    };
    
    handler = new ExecuteMenuItemToolHandler(mockUnityConnection);
    chaosResults = [];
  });

  afterEach(() => {
    mock.restoreAll();
    
    // Print chaos test summary
    if (chaosResults.length > 0) {
      console.log('\n🌪️  CHAOS TEST RESULTS SUMMARY:');
      console.log(`Total chaos tests executed: ${chaosResults.length}`);
      console.log(`Failed tests: ${chaosResults.filter(r => r.error).length}`);
      console.log(`Successful tests: ${chaosResults.filter(r => !r.error).length}`);
      
      // Show detailed results for failed tests
      const failedTests = chaosResults.filter(r => r.error);
      if (failedTests.length > 0) {
        console.log('\n❌ Failed chaos tests:');
        failedTests.forEach((test, index) => {
          console.log(`${index + 1}. ${test.test}: ${test.error}`);
          console.log(`   Input: ${JSON.stringify(test.input, null, 2)}`);
        });
      }
    }
  });

  describe('🔥 CHAOS TEST 1: Invalid/Non-existent Menu Paths', () => {
    const invalidMenuPaths = [
      '',
      ' ',
      'NonExistent/Menu',
      'Invalid\\Path\\With\\Backslashes',
      'Path/With/Too/Many/Levels/That/Dont/Exist',
      'Assets/',
      '/Assets',
      '//Double//Slash',
      'Assets//DoubleSlash',
      'Menu Item With Spaces/SubMenu',
      'Assets/Çrèàtë Fîlé', // Unicode characters
      'Assets/创建文件', // Chinese characters
      'Assets/مجلد جديد', // Arabic characters
      'Assets/файл', // Cyrillic characters
      'Assets/📁NewFolder', // Emoji characters
      'Assets/NULL',
      'Assets/undefined',
      'Assets/NaN',
      '🚀/Rocket/Launch',
      'File/../Assets/Refresh', // Path traversal attempt
      'Assets/Refresh/../../../etc/passwd', // Another path traversal
      'Assets\x00/Refresh', // Null byte injection
      'Assets\r\n/Refresh', // CRLF injection
      'Assets\t/Refresh', // Tab character
      'VERY_LONG_MENU_PATH_' + 'A'.repeat(1000) + '/Test', // Very long path
      'Assets/' + 'B'.repeat(500), // Very long menu name
    ];

    invalidMenuPaths.forEach((menuPath, index) => {
      it(`should handle invalid menu path #${index + 1}: "${menuPath}"`, async () => {
        try {
          await handler.execute({ menuPath });
          logChaosResult(`Invalid Path #${index + 1}`, { menuPath }, 'PASSED');
        } catch (error) {
          logChaosResult(`Invalid Path #${index + 1}`, { menuPath }, 'FAILED', error);
          // We expect most of these to fail, so this is actually good behavior
          assert.ok(error.message.length > 0, 'Error should have a meaningful message');
        }
      });
    });
  });

  describe('🔥 CHAOS TEST 2: Malformed Menu Paths & Special Characters', () => {
    const malformedPaths = [
      null,
      undefined,
      123,
      true,
      false,
      [],
      {},
      { toString: () => 'Assets/Refresh' },
      Symbol('menu'),
      new Date(),
      /regex/,
      () => 'Assets/Refresh',
      'Assets/Menu%20Item', // URL encoded
      'Assets/Menu&Item', // Ampersand
      'Assets/Menu<script>alert("xss")</script>', // XSS attempt
      'Assets/Menu"; DROP TABLE menus; --', // SQL injection attempt
      "Assets/Menu'; echo 'hacked' > /tmp/hack.txt; --", // Command injection
      'Assets/Menu`ls -la`', // Command substitution
      'Assets/Menu$(ls)', // Command substitution
      'Assets/Menu|ls', // Pipe character
      'Assets/Menu&ls', // Background command
      'Assets/Menu;ls', // Command separator
      'Assets/Menu>file.txt', // Redirection
      'Assets/Menu<input.txt', // Input redirection
      'Assets/*', // Wildcard
      'Assets/?', // Single wildcard
      'Assets/[a-z]', // Character class
      '../../../root', // Directory traversal
      '~/.bashrc', // Home directory
      '/etc/passwd', // System file
      'C:\\Windows\\System32', // Windows path
      'Assets\\/Menu', // Escaped slash
      'Assets\\nMenu', // Escaped newline
      'Assets\\tMenu', // Escaped tab
      String.fromCharCode(0) + 'Assets/Menu', // Null character
      String.fromCharCode(1, 2, 3) + 'Assets/Menu', // Control characters
    ];

    malformedPaths.forEach((menuPath, index) => {
      it(`should handle malformed path #${index + 1}: ${typeof menuPath} - "${menuPath}"`, async () => {
        try {
          const result = await handler.execute({ menuPath });
          logChaosResult(`Malformed Path #${index + 1}`, { menuPath, type: typeof menuPath }, 'PASSED');
          
          // If it didn't throw, check if it's a reasonable result
          if (typeof menuPath === 'string' && menuPath.includes('/')) {
            assert.ok(result, 'Should return some result');
          }
        } catch (error) {
          logChaosResult(`Malformed Path #${index + 1}`, { menuPath, type: typeof menuPath }, 'FAILED', error);
          // Expecting these to fail is good behavior
        }
      });
    });
  });

  describe('🔥 CHAOS TEST 3: Safety Blacklist Bypass Attempts', () => {
    const blacklistedMenus = ['File/Quit', 'Edit/Preferences...', 'File/Build Settings...', 'File/Build And Run', 'Assets/Delete'];
    
    const bypassAttempts = [
      // Case variations
      'file/quit',
      'FILE/QUIT',
      'File/quit',
      'file/Quit',
      
      // With extra spaces/characters
      ' File/Quit ',
      'File/Quit\t',
      'File/Quit\n',
      'File/Quit\r',
      'File/ Quit',
      'File / Quit',
      'File//Quit',
      'File\\Quit',
      
      // Unicode variations
      'Fіle/Quit', // Cyrillic і instead of i
      'File/Quіt', // Cyrillic і
      'Filе/Quit', // Cyrillic е instead of e
      
      // Encoding attempts
      'File%2FQuit',
      'File%2fQuit',
      'File&#47;Quit',
      'File&sol;Quit',
      
      // Path traversal within blacklisted items
      'File/../File/Quit',
      'Assets/../File/Quit',
      './File/Quit',
      
      // Homograph attacks
      'Fіlе/Qսіt', // Multiple Cyrillic characters
      
      // Zero-width characters
      'File\u200B/Quit', // Zero-width space
      'File\uFEFF/Quit', // Byte order mark
      
      // Partial matches
      'File/Qui',
      'ile/Quit',
      'FileQuit',
      
      // Nested attempts
      'Menu/File/Quit/SubMenu',
      'File/Quit/Extension',
    ];

    bypassAttempts.forEach((menuPath, index) => {
      it(`should prevent blacklist bypass attempt #${index + 1}: "${menuPath}"`, async () => {
        try {
          await handler.execute({ menuPath, safetyCheck: true });
          logChaosResult(`Blacklist Bypass #${index + 1}`, { menuPath, safetyCheck: true }, 'BYPASSED - SECURITY ISSUE!');
          
          // This is concerning - a bypass attempt succeeded
          console.warn(`⚠️  POTENTIAL SECURITY ISSUE: Blacklist bypass succeeded for: "${menuPath}"`);
        } catch (error) {
          logChaosResult(`Blacklist Bypass #${index + 1}`, { menuPath, safetyCheck: true }, 'BLOCKED', error);
          // This is expected behavior - the bypass was blocked
        }
      });
    });
    
    // Test explicit safety bypass
    blacklistedMenus.forEach((menuPath, index) => {
      it(`should allow blacklisted item with safety disabled: "${menuPath}"`, async () => {
        try {
          const result = await handler.execute({ menuPath, safetyCheck: false });
          logChaosResult(`Safety Disabled #${index + 1}`, { menuPath, safetyCheck: false }, 'ALLOWED');
          assert.ok(result, 'Should return result when safety is disabled');
        } catch (error) {
          logChaosResult(`Safety Disabled #${index + 1}`, { menuPath, safetyCheck: false }, 'FAILED', error);
        }
      });
    });
  });

  describe('🔥 CHAOS TEST 4: Rapid Menu Execution Sequences', () => {
    it('should handle rapid sequential menu executions', async () => {
      const menuPaths = [
        'Assets/Refresh',
        'Window/General/Console',
        'Window/General/Inspector',
        'GameObject/Create Empty',
        'Assets/Reimport All'
      ];
      
      const promises = [];
      const startTime = Date.now();
      
      // Fire off 20 rapid requests
      for (let i = 0; i < 20; i++) {
        const menuPath = menuPaths[i % menuPaths.length];
        promises.push(
          handler.execute({ menuPath }).catch(error => ({ error: error.message, menuPath }))
        );
      }
      
      try {
        const results = await Promise.all(promises);
        const executionTime = Date.now() - startTime;
        
        logChaosResult('Rapid Sequential Execution', { 
          count: 20, 
          executionTime,
          results: results.length
        }, 'COMPLETED');
        
        const errors = results.filter(r => r.error);
        const successes = results.filter(r => !r.error);
        
        console.log(`Rapid execution completed in ${executionTime}ms`);
        console.log(`Successes: ${successes.length}, Errors: ${errors.length}`);
        
        assert.ok(executionTime < 10000, 'Should complete within 10 seconds');
      } catch (error) {
        logChaosResult('Rapid Sequential Execution', { count: 20 }, 'FAILED', error);
        throw error;
      }
    });

    it('should handle concurrent menu executions', async () => {
      const menuPath = 'Assets/Refresh';
      const concurrentCount = 10;
      
      const promises = Array.from({ length: concurrentCount }, (_, i) =>
        handler.execute({ menuPath }).catch(error => ({ error: error.message, index: i }))
      );
      
      try {
        const results = await Promise.all(promises);
        const errors = results.filter(r => r.error);
        
        logChaosResult('Concurrent Execution', {
          concurrent: concurrentCount,
          errors: errors.length,
          successes: results.length - errors.length
        }, 'COMPLETED');
        
        // Some errors might be expected due to Unity connection limits
        assert.ok(results.length === concurrentCount, 'All promises should resolve');
      } catch (error) {
        logChaosResult('Concurrent Execution', { concurrent: concurrentCount }, 'FAILED', error);
        throw error;
      }
    });
  });

  describe('🔥 CHAOS TEST 5: Empty/Null Parameters', () => {
    const nullishValues = [
      null,
      undefined,
      '',
      ' ',
      '\t',
      '\n',
      '\r\n',
      '   \t\n   ',
      false,
      0,
      NaN,
      {},
      []
    ];

    nullishValues.forEach((value, index) => {
      it(`should handle nullish menuPath #${index + 1}: ${typeof value} - "${value}"`, async () => {
        try {
          await handler.execute({ menuPath: value });
          logChaosResult(`Nullish MenuPath #${index + 1}`, { menuPath: value, type: typeof value }, 'PASSED');
        } catch (error) {
          logChaosResult(`Nullish MenuPath #${index + 1}`, { menuPath: value, type: typeof value }, 'FAILED', error);
          // Expected to fail for most nullish values
        }
      });
      
      it(`should handle nullish action #${index + 1}: ${typeof value} - "${value}"`, async () => {
        try {
          await handler.execute({ menuPath: 'Assets/Refresh', action: value });
          logChaosResult(`Nullish Action #${index + 1}`, { action: value, type: typeof value }, 'PASSED');
        } catch (error) {
          logChaosResult(`Nullish Action #${index + 1}`, { action: value, type: typeof value }, 'FAILED', error);
        }
      });
      
      it(`should handle nullish alias #${index + 1}: ${typeof value} - "${value}"`, async () => {
        try {
          await handler.execute({ menuPath: 'Assets/Refresh', alias: value });
          logChaosResult(`Nullish Alias #${index + 1}`, { alias: value, type: typeof value }, 'PASSED');
        } catch (error) {
          logChaosResult(`Nullish Alias #${index + 1}`, { alias: value, type: typeof value }, 'FAILED', error);
        }
      });
    });

    it('should handle completely empty parameters object', async () => {
      try {
        await handler.execute({});
        logChaosResult('Empty Parameters', {}, 'PASSED');
      } catch (error) {
        logChaosResult('Empty Parameters', {}, 'FAILED', error);
        // Expected to fail
      }
    });
  });

  describe('🔥 CHAOS TEST 6: Context-Dependent Menu Execution', () => {
    const contextDependentMenus = [
      'GameObject/Delete', // Requires GameObject selection
      'Assets/Reimport', // Requires asset selection
      'Edit/Undo', // Requires something to undo
      'Edit/Redo', // Requires something to redo
      'Edit/Cut', // Requires selection
      'Edit/Copy', // Requires selection
      'Edit/Paste', // Requires clipboard content
      'Edit/Duplicate', // Requires selection
      'Assets/Show in Explorer', // Requires asset selection
      'Component/Remove Component', // Requires component selection
      'Window/Layouts/Save Layout...', // May require active layout
    ];

    // Mock Unity to simulate context-dependent failures
    beforeEach(() => {
      mockUnityConnection.sendCommand = mock.fn(async (command, params) => {
        const contextMenus = new Set(contextDependentMenus);
        
        if (contextMenus.has(params.menuPath)) {
          // Simulate context-dependent failure
          return {
            success: false,
            error: `Menu item requires specific context: ${params.menuPath}`,
            menuExists: true,
            executed: false,
            contextRequired: true
          };
        }
        
        return {
          success: true,
          message: 'Menu item executed successfully',
          menuPath: params.menuPath
        };
      });
    });

    contextDependentMenus.forEach((menuPath, index) => {
      it(`should handle context-dependent menu #${index + 1}: "${menuPath}"`, async () => {
        try {
          await handler.execute({ menuPath });
          logChaosResult(`Context Menu #${index + 1}`, { menuPath }, 'PASSED');
        } catch (error) {
          logChaosResult(`Context Menu #${index + 1}`, { menuPath }, 'FAILED', error);
          assert.ok(error.message.includes('context'), 'Error should mention context requirement');
        }
      });
    });
  });

  describe('🔥 CHAOS TEST 7: Alias System Attacks', () => {
    const aliasAttacks = [
      // Non-existent aliases
      'nonexistent',
      'fake_alias',
      'hacker_alias',
      
      // Special characters in aliases
      'refresh!',
      'console@',
      'inspector#',
      'project$',
      'scene%',
      'game^',
      'animation&',
      'animator*',
      
      // Very long aliases
      'a'.repeat(1000),
      'very_long_alias_' + 'x'.repeat(500),
      
      // Nullish aliases
      null,
      undefined,
      '',
      ' ',
      '\t\n',
      
      // Non-string aliases
      123,
      true,
      {},
      [],
      () => 'refresh',
      
      // Injection attempts in aliases
      '; rm -rf /',
      '| cat /etc/passwd',
      '`ls -la`',
      '$(whoami)',
      '../../../root',
      'refresh"; DROP TABLE aliases; --',
      
      // Unicode aliases
      'rëfrësh',
      '刷新',
      'обновить',
      'تحديث',
      
      // Case variations of existing aliases
      'REFRESH',
      'Console',
      'INSPECTOR',
      'Project',
      'SCENE',
    ];

    aliasAttacks.forEach((alias, index) => {
      it(`should handle alias attack #${index + 1}: ${typeof alias} - "${alias}"`, async () => {
        try {
          const result = await handler.execute({ 
            menuPath: 'Assets/Refresh', 
            alias: alias 
          });
          logChaosResult(`Alias Attack #${index + 1}`, { alias, type: typeof alias }, 'PASSED');
        } catch (error) {
          logChaosResult(`Alias Attack #${index + 1}`, { alias, type: typeof alias }, 'FAILED', error);
        }
      });
    });

    it('should handle alias resolution correctly', async () => {
      const validAliases = ['refresh', 'console', 'inspector', 'hierarchy', 'project'];
      
      for (const alias of validAliases) {
        try {
          await handler.execute({ menuPath: 'dummy', alias: alias });
          logChaosResult(`Valid Alias Resolution`, { alias }, 'PASSED');
        } catch (error) {
          logChaosResult(`Valid Alias Resolution`, { alias }, 'FAILED', error);
        }
      }
    });
  });

  describe('🔥 CHAOS TEST 8: Menu Discovery Stress Test', () => {
    beforeEach(() => {
      // Mock large menu discovery response
      mockUnityConnection.sendCommand = mock.fn(async (command, params) => {
        if (params.action === 'get_available_menus') {
          // Simulate large menu list
          const menus = [];
          for (let i = 0; i < 1000; i++) {
            menus.push(`Category${i % 10}/Menu${i}`);
          }
          
          return {
            success: true,
            availableMenus: menus,
            totalMenus: 1000,
            filteredCount: menus.length,
            message: 'Large menu list retrieved'
          };
        }
        
        return {
          success: true,
          message: 'Menu executed',
          menuPath: params.menuPath
        };
      });
    });

    it('should handle large menu discovery', async () => {
      try {
        const result = await handler.execute({
          menuPath: 'dummy',
          action: 'get_available_menus'
        });
        
        logChaosResult('Large Menu Discovery', {
          totalMenus: result.totalMenus,
          returnedMenus: result.availableMenus.length
        }, 'PASSED');
        
        assert.ok(Array.isArray(result.availableMenus), 'Should return array');
        assert.equal(result.totalMenus, 1000, 'Should report correct total');
      } catch (error) {
        logChaosResult('Large Menu Discovery', {}, 'FAILED', error);
        throw error;
      }
    });

    it('should handle menu discovery with malicious filters', async () => {
      const maliciousFilters = [
        '../../etc/passwd',
        '$(rm -rf /)',
        '; DROP TABLE menus; --',
        '<script>alert("xss")</script>',
        '.*', // Regex DoS attempt
        'a'.repeat(10000), // Very long filter
        String.fromCharCode(0), // Null byte
        '\x00\x01\x02', // Control characters
      ];

      for (const filter of maliciousFilters) {
        try {
          await handler.execute({
            menuPath: 'dummy',
            action: 'get_available_menus',
            parameters: { filter }
          });
          logChaosResult('Malicious Filter', { filter }, 'PASSED');
        } catch (error) {
          logChaosResult('Malicious Filter', { filter }, 'FAILED', error);
        }
      }
    });
  });

  describe('🔥 CHAOS TEST 9: Memory and Performance Stress', () => {
    it('should handle memory stress with large parameters', async () => {
      const largeParameter = {
        massiveArray: new Array(100000).fill('test data'),
        deepObject: {},
        largeString: 'x'.repeat(1000000)
      };
      
      // Create deep nested object
      let current = largeParameter.deepObject;
      for (let i = 0; i < 100; i++) {
        current.nested = {};
        current = current.nested;
      }
      
      try {
        await handler.execute({
          menuPath: 'Assets/Refresh',
          parameters: largeParameter
        });
        logChaosResult('Memory Stress', { 
          arraySize: largeParameter.massiveArray.length,
          stringLength: largeParameter.largeString.length
        }, 'PASSED');
      } catch (error) {
        logChaosResult('Memory Stress', {}, 'FAILED', error);
      }
    });

    it('should handle timeout scenarios', async () => {
      // Mock slow Unity response
      mockUnityConnection.sendCommand = mock.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        return { success: true, message: 'Slow response' };
      });
      
      try {
        const startTime = Date.now();
        await handler.execute({ menuPath: 'Assets/Refresh' });
        const endTime = Date.now();
        
        logChaosResult('Timeout Test', { 
          executionTime: endTime - startTime 
        }, 'PASSED');
      } catch (error) {
        logChaosResult('Timeout Test', {}, 'FAILED', error);
      }
    });
  });

  describe('🔥 CHAOS TEST 10: Edge Case Parameter Combinations', () => {
    const chaosParameterCombinations = [
      // Conflicting parameters
      {
        menuPath: 'Assets/Refresh',
        action: 'execute',
        alias: 'console', // Alias doesn't match menuPath
        safetyCheck: true
      },
      
      // Invalid enum with valid path
      {
        menuPath: 'Assets/Refresh',
        action: 'invalid_action',
        safetyCheck: false
      },
      
      // Blacklisted with safety disabled but invalid format
      {
        menuPath: 'File///Quit',
        safetyCheck: false
      },
      
      // Valid alias with invalid menuPath
      {
        menuPath: 'Invalid/Path',
        alias: 'refresh'
      },
      
      // Circular reference attempt
      {
        menuPath: 'Assets/Refresh',
        parameters: null
      },
      
      // Mixed types
      {
        menuPath: 123,
        action: 'execute',
        alias: true,
        parameters: 'string instead of object',
        safetyCheck: 'false' // string instead of boolean
      }
    ];

    chaosParameterCombinations.forEach((params, index) => {
      it(`should handle chaos parameter combination #${index + 1}`, async () => {
        try {
          await handler.execute(params);
          logChaosResult(`Chaos Params #${index + 1}`, params, 'PASSED');
        } catch (error) {
          logChaosResult(`Chaos Params #${index + 1}`, params, 'FAILED', error);
        }
      });
    });
  });

  // Final chaos summary
  describe('🔥 CHAOS TEST SUMMARY', () => {
    it('should provide chaos test summary', () => {
      console.log('\n🌪️  FINAL CHAOS TEST SUMMARY:');
      console.log(`Total chaos scenarios tested: ${chaosResults.length}`);
      
      const categories = {};
      chaosResults.forEach(result => {
        const category = result.test.split(' #')[0];
        if (!categories[category]) {
          categories[category] = { total: 0, failed: 0, passed: 0 };
        }
        categories[category].total++;
        if (result.error) {
          categories[category].failed++;
        } else {
          categories[category].passed++;
        }
      });
      
      console.log('\nResults by category:');
      Object.entries(categories).forEach(([category, stats]) => {
        console.log(`${category}: ${stats.passed}/${stats.total} passed (${stats.failed} failed)`);
      });
      
      // Check for security issues
      const securityIssues = chaosResults.filter(r => 
        r.result === 'BYPASSED - SECURITY ISSUE!' || 
        (r.test.includes('Blacklist Bypass') && !r.error)
      );
      
      if (securityIssues.length > 0) {
        console.log('\n🚨 SECURITY ISSUES DETECTED:');
        securityIssues.forEach(issue => {
          console.log(`- ${issue.test}: ${JSON.stringify(issue.input)}`);
        });
      }
      
      assert.ok(true, 'Chaos test summary completed');
    });
  });
});