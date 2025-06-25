import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ExecuteMenuItemToolHandler } from '../src/handlers/menu/ExecuteMenuItemToolHandler.js';

describe('🔥 CRITICAL CHAOS TEST: Menu Security', () => {
  let handler;
  let mockUnityConnection;
  let securityIssues = [];

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
    securityIssues = [];
  });

  afterEach(() => {
    mock.restoreAll();
    
    if (securityIssues.length > 0) {
      console.log('\n🚨 CRITICAL SECURITY ISSUES FOUND:');
      securityIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.vulnerability}: "${issue.input}"`);
        console.log(`   Expected: ${issue.expected}`);
        console.log(`   Actual: ${issue.actual}`);
      });
    }
  });

  describe('🚨 SECURITY: Blacklist Bypass Detection', () => {
    const blacklistedMenus = ['File/Quit', 'Edit/Preferences...', 'File/Build Settings...', 'File/Build And Run', 'Assets/Delete'];
    
    const criticalBypassAttempts = [
      // Case variations - HIGH RISK
      { input: 'file/quit', reason: 'Case insensitive bypass' },
      { input: 'FILE/QUIT', reason: 'Uppercase bypass' },
      { input: 'File/quit', reason: 'Mixed case bypass' },
      { input: 'file/Quit', reason: 'Mixed case bypass' },
      
      // Whitespace manipulation - HIGH RISK
      { input: ' File/Quit ', reason: 'Whitespace padding bypass' },
      { input: 'File/Quit\t', reason: 'Tab character bypass' },
      { input: 'File/Quit\n', reason: 'Newline bypass' },
      { input: 'File/ Quit', reason: 'Space in path bypass' },
      { input: 'File / Quit', reason: 'Spaces around slash bypass' },
      
      // Path manipulation - HIGH RISK
      { input: 'File//Quit', reason: 'Double slash bypass' },
      { input: 'File\\Quit', reason: 'Backslash bypass' },
      
      // Unicode normalization attacks - CRITICAL
      { input: 'Fіle/Quit', reason: 'Cyrillic і (U+0456) instead of Latin i' },
      { input: 'File/Quіt', reason: 'Cyrillic і in Quit' },
      { input: 'Filе/Quit', reason: 'Cyrillic е (U+0435) instead of Latin e' },
      
      // Zero-width character injection - CRITICAL
      { input: `File\u200B/Quit`, reason: 'Zero-width space injection' },
      { input: `File\uFEFF/Quit`, reason: 'Byte order mark injection' },
      { input: `Fi\u200Ble/Quit`, reason: 'Zero-width space in File' },
    ];

    criticalBypassAttempts.forEach(({ input, reason }) => {
      it(`should block bypass attempt: ${reason}`, async () => {
        try {
          await handler.execute({ menuPath: input, safetyCheck: true });
          
          // If we get here, the bypass succeeded - SECURITY ISSUE
          securityIssues.push({
            vulnerability: 'BLACKLIST BYPASS',
            input: input,
            expected: 'Should throw error blocking dangerous menu',
            actual: 'Bypass succeeded - menu would execute',
            severity: 'CRITICAL',
            reason: reason
          });
          
          console.log(`🚨 CRITICAL: Blacklist bypass succeeded for "${input}" (${reason})`);
          
          // Fail the test - this is a security vulnerability
          assert.fail(`SECURITY VULNERABILITY: Blacklist bypass succeeded for "${input}"`);
        } catch (error) {
          // This is expected - the dangerous menu should be blocked
          assert.ok(error.message.includes('blacklisted') || error.message.includes('format'), 
            `Should block dangerous menu with appropriate error: ${error.message}`);
        }
      });
    });
  });

  describe('🚨 SECURITY: Input Validation Bypass', () => {
    const injectionAttempts = [
      // Command injection attempts
      { input: 'Assets/Refresh; rm -rf /', type: 'Command injection' },
      { input: 'Assets/Refresh | cat /etc/passwd', type: 'Pipe injection' },
      { input: 'Assets/Refresh && rm -rf /', type: 'Command chaining' },
      { input: 'Assets/Refresh`ls -la`', type: 'Command substitution' },
      { input: 'Assets/Refresh$(whoami)', type: 'Command substitution' },
      
      // Path traversal attempts
      { input: '../../../etc/passwd', type: 'Path traversal' },
      { input: 'Assets/../../../root', type: 'Relative path traversal' },
      { input: 'File/../Assets/../../etc/passwd', type: 'Complex path traversal' },
      
      // Null byte injection
      { input: `Assets/Refresh\x00`, type: 'Null byte injection' },
      { input: `Assets\x00/Refresh`, type: 'Null byte in path' },
      
      // Control character injection
      { input: `Assets/Refresh\r\n`, type: 'CRLF injection' },
      { input: `Assets\r/Refresh`, type: 'CR injection' },
      { input: `Assets\n/Refresh`, type: 'LF injection' },
      
      // Buffer overflow attempts
      { input: 'Assets/' + 'A'.repeat(10000), type: 'Buffer overflow attempt' },
      { input: 'A'.repeat(100000) + '/Menu', type: 'Large category name' },
    ];

    injectionAttempts.forEach(({ input, type }) => {
      it(`should sanitize ${type}`, async () => {
        try {
          await handler.execute({ menuPath: input });
          
          // Check if this could be a security issue
          if (input.includes('rm -rf') || input.includes('etc/passwd') || input.includes('\x00')) {
            securityIssues.push({
              vulnerability: 'INJECTION BYPASS',
              input: input,
              expected: 'Should reject malicious input',
              actual: 'Malicious input accepted',
              severity: 'HIGH',
              type: type
            });
            
            console.log(`⚠️  Potential injection bypass: ${type} - "${input}"`);
          }
        } catch (error) {
          // Expected for most injection attempts
          assert.ok(error.message.length > 0, 'Should have meaningful error message');
        }
      });
    });
  });

  describe('🚨 SECURITY: Type Confusion Attacks', () => {
    const typeConfusionInputs = [
      { input: { toString: () => 'File/Quit' }, type: 'Object with toString' },
      { input: { valueOf: () => 'File/Quit' }, type: 'Object with valueOf' },
      { input: ['File', 'Quit'], type: 'Array input' },
      { input: new String('File/Quit'), type: 'String object' },
      { input: /File\/Quit/, type: 'Regex object' },
      { input: () => 'File/Quit', type: 'Function input' },
    ];

    typeConfusionInputs.forEach(({ input, type }) => {
      it(`should handle ${type} safely`, async () => {
        try {
          await handler.execute({ menuPath: input });
          
          // Check if dangerous menu could be executed through type confusion
          const stringValue = String(input);
          if (stringValue.includes('File/Quit') || stringValue.includes('Assets/Delete')) {
            securityIssues.push({
              vulnerability: 'TYPE CONFUSION',
              input: input,
              expected: 'Should reject non-string input',
              actual: 'Non-string input converted and potentially executed',
              severity: 'MEDIUM',
              type: type
            });
          }
        } catch (error) {
          // Expected behavior
          assert.ok(error.message.length > 0);
        }
      });
    });
  });

  describe('🚨 SECURITY: Alias System Exploitation', () => {
    const aliasExploits = [
      // Attempt to override existing aliases
      { alias: 'refresh', menuPath: 'File/Quit', type: 'Alias override attempt' },
      { alias: 'console', menuPath: 'Assets/Delete', type: 'Alias hijacking' },
      
      // Injection through alias system
      { alias: 'refresh; rm -rf /', menuPath: 'Assets/Refresh', type: 'Alias injection' },
      { alias: '../../../etc/passwd', menuPath: 'Assets/Refresh', type: 'Alias path traversal' },
      
      // Unicode in aliases
      { alias: 'rëfrësh', menuPath: 'File/Quit', type: 'Unicode alias confusion' },
      { alias: 'refreshⅠ', menuPath: 'File/Quit', type: 'Roman numeral confusion' },
    ];

    aliasExploits.forEach(({ alias, menuPath, type }) => {
      it(`should prevent ${type}`, async () => {
        try {
          await handler.execute({ menuPath, alias });
          
          // Check if this resulted in executing a dangerous menu
          if (menuPath.includes('File/Quit') || menuPath.includes('Assets/Delete')) {
            securityIssues.push({
              vulnerability: 'ALIAS EXPLOITATION',
              input: { alias, menuPath },
              expected: 'Should not execute dangerous menu through alias',
              actual: 'Dangerous menu executed via alias',
              severity: 'HIGH',
              type: type
            });
          }
        } catch (error) {
          // Expected for security violations
          assert.ok(error.message.length > 0);
        }
      });
    });
  });

  describe('🚨 SECURITY: Race Condition Exploitation', () => {
    it('should handle concurrent blacklist bypass attempts', async () => {
      const dangerousMenus = ['File/Quit', 'Assets/Delete', 'File/Build And Run'];
      const promises = [];
      
      // Try to overwhelm the safety check with concurrent requests
      for (let i = 0; i < 10; i++) {
        for (const menu of dangerousMenus) {
          promises.push(
            handler.execute({ menuPath: menu, safetyCheck: true })
              .then(() => {
                // If any succeed, it's a security issue
                securityIssues.push({
                  vulnerability: 'RACE CONDITION BYPASS',
                  input: menu,
                  expected: 'Should block dangerous menu',
                  actual: 'Dangerous menu executed via race condition',
                  severity: 'CRITICAL'
                });
                return { success: true, menu };
              })
              .catch(() => ({ success: false, menu }))
          );
        }
      }
      
      const results = await Promise.all(promises);
      const successes = results.filter(r => r.success);
      
      if (successes.length > 0) {
        console.log(`🚨 RACE CONDITION VULNERABILITY: ${successes.length} dangerous menus executed`);
        assert.fail(`Race condition allowed ${successes.length} dangerous menu executions`);
      }
    });
  });

  describe('🚨 SECURITY: Parameter Pollution', () => {
    const pollutionAttempts = [
      // Multiple menuPath parameters (if supported)
      { 
        menuPath: 'Assets/Refresh',
        menuPath2: 'File/Quit', // Attempt parameter pollution
        type: 'Parameter duplication'
      },
      
      // Nested parameter injection
      {
        menuPath: 'Assets/Refresh',
        parameters: {
          menuPath: 'File/Quit',
          action: 'execute',
          safetyCheck: false
        },
        type: 'Nested parameter pollution'
      },
      
      // Prototype pollution attempt
      {
        menuPath: 'Assets/Refresh',
        '__proto__': { safetyCheck: false },
        type: 'Prototype pollution'
      },
      
      // Constructor pollution
      {
        menuPath: 'Assets/Refresh',
        'constructor': { prototype: { safetyCheck: false } },
        type: 'Constructor pollution'
      }
    ];

    pollutionAttempts.forEach(({ type, ...params }) => {
      it(`should prevent ${type}`, async () => {
        try {
          await handler.execute(params);
          
          // Check if any dangerous menus could be executed
          const serialized = JSON.stringify(params);
          if (serialized.includes('File/Quit') || serialized.includes('Assets/Delete')) {
            securityIssues.push({
              vulnerability: 'PARAMETER POLLUTION',
              input: params,
              expected: 'Should not execute dangerous menus via parameter pollution',
              actual: 'Parameter pollution may have bypassed security',
              severity: 'HIGH',
              type: type
            });
          }
        } catch (error) {
          // Expected behavior
          assert.ok(error.message.length > 0);
        }
      });
    });
  });

  describe('🚨 SECURITY SUMMARY', () => {
    it('should report security test results', () => {
      console.log('\n🔒 SECURITY TEST SUMMARY:');
      
      if (securityIssues.length === 0) {
        console.log('✅ No critical security vulnerabilities detected');
      } else {
        console.log(`🚨 ${securityIssues.length} potential security issues found:`);
        
        const bySeverity = {
          CRITICAL: securityIssues.filter(i => i.severity === 'CRITICAL'),
          HIGH: securityIssues.filter(i => i.severity === 'HIGH'),
          MEDIUM: securityIssues.filter(i => i.severity === 'MEDIUM'),
          LOW: securityIssues.filter(i => i.severity === 'LOW')
        };
        
        Object.entries(bySeverity).forEach(([severity, issues]) => {
          if (issues.length > 0) {
            console.log(`${severity}: ${issues.length} issues`);
            issues.forEach((issue, index) => {
              console.log(`  ${index + 1}. ${issue.vulnerability}: ${issue.type || 'General'}`);
            });
          }
        });
        
        // Fail the test if critical issues are found
        if (bySeverity.CRITICAL.length > 0) {
          assert.fail(`${bySeverity.CRITICAL.length} CRITICAL security vulnerabilities found`);
        }
      }
      
      assert.ok(true, 'Security summary completed');
    });
  });
});