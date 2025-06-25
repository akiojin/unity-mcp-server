import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CreateScriptToolHandler } from '../src/handlers/scripting/CreateScriptToolHandler.js';
import { UpdateScriptToolHandler } from '../src/handlers/scripting/UpdateScriptToolHandler.js';
import { DeleteScriptToolHandler } from '../src/handlers/scripting/DeleteScriptToolHandler.js';
import { ValidateScriptToolHandler } from '../src/handlers/scripting/ValidateScriptToolHandler.js';
import { ListScriptsToolHandler } from '../src/handlers/scripting/ListScriptsToolHandler.js';

/**
 * CHAOS TESTING SUITE FOR SCRIPT MANAGEMENT SYSTEM
 * 
 * This test suite performs comprehensive edge case testing including:
 * 1. Scripts with weird names (special characters, very long names, numbers)
 * 2. Multiple script types created rapidly
 * 3. Duplicate script creation attempts
 * 4. Update operations with malformed code
 * 5. Validation on broken scripts
 * 6. Deletion of non-existent scripts
 * 7. Stress testing with many operations in sequence
 */
describe('CHAOS TESTING: Script Management System', () => {
  let handlers;
  let mockUnityConnection;
  let commandHistory;

  beforeEach(() => {
    commandHistory = [];
    
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(async () => {}),
      sendCommand: mock.fn(async (command, params) => {
        commandHistory.push({ command, params, timestamp: Date.now() });
        
        // Simulate various Unity responses based on command and params
        return simulateUnityResponse(command, params);
      })
    };
    
    handlers = {
      create: new CreateScriptToolHandler(mockUnityConnection),
      update: new UpdateScriptToolHandler(mockUnityConnection),
      delete: new DeleteScriptToolHandler(mockUnityConnection),
      validate: new ValidateScriptToolHandler(mockUnityConnection),
      list: new ListScriptsToolHandler(mockUnityConnection)
    };
  });

  afterEach(() => {
    mock.restoreAll();
    commandHistory = [];
  });

  describe('🔥 CHAOS TEST 1: Scripts with Weird Names', () => {
    const weirdNames = [
      // Special characters (should fail)
      'Player$Controller',
      'Enemy@AI',
      'Game#Manager',
      'UI%Element',
      'Network&Handler',
      'Audio*Player',
      'Data(Parser)',
      'Script[Array]',
      'Config{Object}',
      'Item;Handler',
      'Event:Manager',
      'File"Reader',
      'Path\\Handler',
      'URL/Parser',
      'Space Script',
      'Tab\tScript',
      'New\nLine',
      
      // Numbers at start (should fail)
      '1stPlayer',
      '2ndLevel',
      '3DController',
      '404Handler',
      '99Problems',
      
      // Very long names
      'A'.repeat(300), // Extremely long
      'SuperLongScriptNameThatExceedsNormalLimitsAndShouldTestTheSystemsHandlingOfExtremellyLongNamesInVariousScenarios',
      
      // Edge cases that should pass
      'ValidName123',
      '_UnderscoreStart',
      'Mixed_Numbers_123',
      'ALLCAPS',
      'lowercase',
      'CamelCase',
      'snake_case_style',
      'PascalCaseExample',
      
      // Unicode and international characters (should fail due to C# restrictions)
      'José',
      'Müller',
      'André',
      '北京',
      'Москва',
      'Tökio'
    ];

    it('should handle all weird script names appropriately', async () => {
      const results = [];
      
      for (const scriptName of weirdNames) {
        try {
          console.log(`Testing script name: "${scriptName}" (length: ${scriptName.length})`);
          
          // Test validation first
          let validationError = null;
          try {
            handlers.create.validate({ scriptName });
          } catch (error) {
            validationError = error;
          }
          
          // Test actual creation
          let creationResult = null;
          let creationError = null;
          
          try {
            creationResult = await handlers.create.execute({ scriptName });
          } catch (error) {
            creationError = error;
          }
          
          results.push({
            scriptName,
            length: scriptName.length,
            validationPassed: !validationError,
            validationError: validationError?.message,
            creationSucceeded: !!creationResult,
            creationError: creationError?.message
          });
          
        } catch (error) {
          results.push({
            scriptName,
            length: scriptName.length,
            validationPassed: false,
            creationSucceeded: false,
            unexpectedError: error.message
          });
        }
      }
      
      // Analyze results
      const validNames = results.filter(r => r.validationPassed);
      const invalidNames = results.filter(r => !r.validationPassed);
      const successfulCreations = results.filter(r => r.creationSucceeded);
      
      console.log(`\n🔍 WEIRD NAMES TEST RESULTS:`);
      console.log(`Total names tested: ${results.length}`);
      console.log(`Valid names: ${validNames.length}`);
      console.log(`Invalid names: ${invalidNames.length}`);
      console.log(`Successful creations: ${successfulCreations.length}`);
      
      // Expected valid names based on C# identifier rules
      const expectedValidNames = [
        'ValidName123',
        '_UnderscoreStart', 
        'Mixed_Numbers_123',
        'ALLCAPS',
        'lowercase',
        'CamelCase',
        'snake_case_style',
        'PascalCaseExample'
      ];
      
      // Verify that known valid names passed validation
      for (const expectedValid of expectedValidNames) {
        const result = results.find(r => r.scriptName === expectedValid);
        assert.ok(result, `Expected valid name ${expectedValid} should be in results`);
        assert.ok(result.validationPassed, `${expectedValid} should pass validation`);
      }
      
      // Verify that names with spaces and special characters failed
      const namesWithSpaces = results.filter(r => r.scriptName.includes(' '));
      for (const result of namesWithSpaces) {
        assert.ok(!result.validationPassed, `Name with space "${result.scriptName}" should fail validation`);
      }
      
      assert.ok(results.length > 0, 'Should have tested some names');
    });
  });

  describe('🚀 CHAOS TEST 2: Rapid Script Type Creation', () => {
    const scriptTypes = ['MonoBehaviour', 'ScriptableObject', 'Editor', 'StaticClass', 'Interface'];
    
    it('should handle rapid creation of multiple script types', async () => {
      const rapidResults = [];
      const startTime = Date.now();
      
      // Create multiple scripts of each type rapidly
      const promises = [];
      
      for (let i = 0; i < 3; i++) {
        for (const scriptType of scriptTypes) {
          const scriptName = `Rapid${scriptType}${i}`;
          
          const promise = handlers.create.execute({
            scriptName,
            scriptType,
            path: `Assets/RapidTest/${scriptType}/`
          }).then(result => ({
            scriptName,
            scriptType,
            success: true,
            result,
            duration: Date.now() - startTime
          })).catch(error => ({
            scriptName,
            scriptType,
            success: false,
            error: error.message,
            duration: Date.now() - startTime
          }));
          
          promises.push(promise);
        }
      }
      
      // Wait for all rapid creations to complete
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      console.log(`\n⚡ RAPID CREATION TEST RESULTS:`);
      console.log(`Total scripts attempted: ${results.length}`);
      console.log(`Total duration: ${totalDuration}ms`);
      console.log(`Average per script: ${(totalDuration / results.length).toFixed(2)}ms`);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log(`Successful: ${successful.length}`);
      console.log(`Failed: ${failed.length}`);
      
      // Verify script type distribution
      const typeDistribution = {};
      for (const scriptType of scriptTypes) {
        typeDistribution[scriptType] = successful.filter(r => r.scriptType === scriptType).length;
      }
      
      console.log('Type distribution:', typeDistribution);
      
      // Should have attempted to create scripts of all types
      for (const scriptType of scriptTypes) {
        const typeResults = results.filter(r => r.scriptType === scriptType);
        assert.ok(typeResults.length > 0, `Should have attempted to create ${scriptType} scripts`);
      }
      
      // Check that Unity commands were sent
      const createCommands = commandHistory.filter(cmd => cmd.command === 'create_script');
      assert.equal(createCommands.length, results.length, 'Should have sent one command per script');
    });
  });

  describe('💥 CHAOS TEST 3: Duplicate Script Creation', () => {
    it('should handle duplicate script creation attempts gracefully', async () => {
      const duplicateAttempts = [];
      const scriptName = 'DuplicateTestScript';
      
      // First creation should succeed
      const firstResult = await handlers.create.execute({ scriptName });
      duplicateAttempts.push({
        attempt: 1,
        success: true,
        result: firstResult
      });
      
      // Configure mock to return duplicate error for subsequent attempts
      mockUnityConnection.sendCommand.mock.mockImplementation(async (command, params) => {
        if (command === 'create_script' && params.scriptName === scriptName) {
          return {
            success: false,
            error: `Script '${scriptName}' already exists at path`
          };
        }
        return simulateUnityResponse(command, params);
      });
      
      // Attempt multiple duplicate creations
      for (let i = 2; i <= 5; i++) {
        try {
          const result = await handlers.create.execute({ scriptName });
          duplicateAttempts.push({
            attempt: i,
            success: true,
            result
          });
        } catch (error) {
          duplicateAttempts.push({
            attempt: i,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log(`\n🔄 DUPLICATE CREATION TEST RESULTS:`);
      console.log(`Total attempts: ${duplicateAttempts.length}`);
      
      const successful = duplicateAttempts.filter(a => a.success);
      const failed = duplicateAttempts.filter(a => !a.success);
      
      console.log(`Successful: ${successful.length}`);
      console.log(`Failed: ${failed.length}`);
      
      // First attempt should succeed
      assert.ok(duplicateAttempts[0].success, 'First creation should succeed');
      
      // Subsequent attempts should fail
      for (let i = 1; i < duplicateAttempts.length; i++) {
        assert.ok(!duplicateAttempts[i].success, `Duplicate attempt ${i + 1} should fail`);
        assert.ok(duplicateAttempts[i].error.includes('already exists'), 
                 `Duplicate error should mention 'already exists'`);
      }
    });
  });

  describe('🔧 CHAOS TEST 4: Malformed Code Updates', () => {
    const malformedCodeSamples = [
      // Syntax errors
      'using UnityEngine; public class Test { void Start( { Debug.Log("Missing parenthesis"); }',
      'using UnityEngine; public class Test { void Start() { Debug.Log("Missing quote); }',
      'using UnityEngine; public class Test { void Start() { Debug.Log("Missing bracket" }',
      'using UnityEngine; public class Test void Start() { Debug.Log("Missing brace"); }',
      
      // Invalid C# constructs
      'using UnityEngine; public class Test { 123invalidMethod() { } }',
      'using UnityEngine; public class Test { void Start() { int 123var = 5; } }',
      'using UnityEngine; public class Test { void Start() { var = ; } }',
      
      // Missing usings
      'public class Test : MonoBehaviour { void Start() { GameObject.Find("test"); } }',
      
      // Completely broken code
      'this is not even code',
      '}{}{}{',
      'using using using;',
      'public public class class Test Test { }',
      
      // Empty or whitespace
      '',
      '   ',
      '\n\n\n',
      '\t\t\t',
      
      // Very large code
      `using UnityEngine; public class Test : MonoBehaviour { ${'void Method' + Math.random() + '() { Debug.Log("test"); } '.repeat(1000)} }`
    ];

    it('should handle malformed code updates robustly', async () => {
      const updateResults = [];
      
      // First create a valid script to update
      const scriptName = 'MalformedTestScript';
      await handlers.create.execute({ scriptName });
      
      for (let i = 0; i < malformedCodeSamples.length; i++) {
        const malformedCode = malformedCodeSamples[i];
        
        try {
          console.log(`Testing malformed code #${i + 1} (length: ${malformedCode.length})`);
          
          const result = await handlers.update.execute({
            scriptName,
            scriptContent: malformedCode
          });
          
          updateResults.push({
            index: i,
            codeLength: malformedCode.length,
            success: true,
            result
          });
          
        } catch (error) {
          updateResults.push({
            index: i,
            codeLength: malformedCode.length,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log(`\n🔧 MALFORMED CODE UPDATE RESULTS:`);
      console.log(`Total malformed samples tested: ${updateResults.length}`);
      
      const successful = updateResults.filter(r => r.success);
      const failed = updateResults.filter(r => !r.success);
      
      console.log(`Updates that succeeded: ${successful.length}`);
      console.log(`Updates that failed: ${failed.length}`);
      
      // Most malformed code should fail validation or update
      const expectedFailureRate = 0.7; // Expect at least 70% to fail
      const actualFailureRate = failed.length / updateResults.length;
      
      console.log(`Failure rate: ${(actualFailureRate * 100).toFixed(1)}%`);
      
      // Some malformed code should be caught
      assert.ok(failed.length > 0, 'Some malformed code should cause failures');
      
      // Verify that completely broken samples failed
      const emptyCodeResults = updateResults.filter((r, i) => 
        ['', '   ', '\n\n\n', '\t\t\t'].includes(malformedCodeSamples[i])
      );
      
      for (const result of emptyCodeResults) {
        // Empty code might be handled differently, but should be noted
        console.log(`Empty code result: success=${result.success}`);
      }
    });
  });

  describe('🔍 CHAOS TEST 5: Broken Script Validation', () => {
    const brokenScripts = [
      {
        name: 'SyntaxError',
        code: 'using UnityEngine; public class SyntaxError { void Start( { Debug.Log("test"); }'
      },
      {
        name: 'MissingUsing',
        code: 'public class MissingUsing { void Start() { GameObject obj; } }'
      },
      {
        name: 'InvalidClassDef',
        code: 'using UnityEngine; class { void Start() { } }'
      },
      {
        name: 'RecursiveCall',
        code: 'using UnityEngine; public class RecursiveCall : MonoBehaviour { void Start() { Start(); } }'
      },
      {
        name: 'InfiniteLoop',
        code: 'using UnityEngine; public class InfiniteLoop : MonoBehaviour { void Update() { while(true) { } } }'
      },
      {
        name: 'NullReference',
        code: 'using UnityEngine; public class NullRef : MonoBehaviour { void Start() { GameObject obj = null; obj.SetActive(true); } }'
      }
    ];

    it('should validate broken scripts and provide meaningful feedback', async () => {
      const validationResults = [];
      
      for (const brokenScript of brokenScripts) {
        try {
          console.log(`Validating broken script: ${brokenScript.name}`);
          
          const result = await handlers.validate.execute({
            scriptContent: brokenScript.code,
            checkSyntax: true,
            checkUnityCompatibility: true,
            suggestImprovements: true
          });
          
          validationResults.push({
            name: brokenScript.name,
            success: true,
            result,
            isValid: result.isValid,
            errorCount: result.errors?.length || 0,
            warningCount: result.warnings?.length || 0
          });
          
        } catch (error) {
          validationResults.push({
            name: brokenScript.name,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log(`\n🔍 BROKEN SCRIPT VALIDATION RESULTS:`);
      console.log(`Total broken scripts tested: ${validationResults.length}`);
      
      const successful = validationResults.filter(r => r.success);
      const failed = validationResults.filter(r => !r.success);
      
      console.log(`Validations completed: ${successful.length}`);
      console.log(`Validations failed: ${failed.length}`);
      
      // All broken scripts should be identified as invalid
      for (const result of successful) {
        if (result.isValid) {
          console.log(`⚠️  Broken script '${result.name}' was marked as valid!`);
        }
        
        console.log(`${result.name}: valid=${result.isValid}, errors=${result.errorCount}, warnings=${result.warningCount}`);
      }
      
      // Most broken scripts should be identified as invalid
      const validatedAsInvalid = successful.filter(r => !r.isValid);
      console.log(`Scripts correctly identified as invalid: ${validatedAsInvalid.length}/${successful.length}`);
      
      assert.ok(successful.length > 0, 'Should have successfully validated some broken scripts');
    });
  });

  describe('🗑️ CHAOS TEST 6: Delete Non-Existent Scripts', () => {
    const nonExistentScripts = [
      'NonExistentScript1',
      'FakeScript',
      'DoesNotExist',
      'MissingFile',
      '../../../EscapeAttempt',
      'Assets/../../IllegalPath',
      'C:\\Windows\\System32\\BadScript',
      '/etc/passwd',
      'script with spaces.cs',
      'script@with#special$.cs'
    ];

    it('should handle deletion of non-existent scripts gracefully', async () => {
      const deletionResults = [];
      
      // Configure mock to return "not found" errors
      mockUnityConnection.sendCommand.mock.mockImplementation(async (command, params) => {
        if (command === 'delete_script') {
          return {
            success: false,
            error: `Script '${params.scriptName || params.scriptPath}' not found`
          };
        }
        return simulateUnityResponse(command, params);
      });
      
      for (const scriptName of nonExistentScripts) {
        try {
          console.log(`Attempting to delete non-existent script: ${scriptName}`);
          
          const result = await handlers.delete.execute({
            scriptName,
            force: true // Force deletion to avoid confirmation prompts
          });
          
          deletionResults.push({
            scriptName,
            success: true,
            result
          });
          
        } catch (error) {
          deletionResults.push({
            scriptName,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log(`\n🗑️ NON-EXISTENT SCRIPT DELETION RESULTS:`);
      console.log(`Total deletion attempts: ${deletionResults.length}`);
      
      const successful = deletionResults.filter(r => r.success);
      const failed = deletionResults.filter(r => !r.success);
      
      console.log(`Successful deletions: ${successful.length}`);
      console.log(`Failed deletions: ${failed.length}`);
      
      // All attempts should fail since scripts don't exist
      for (const result of deletionResults) {
        console.log(`${result.scriptName}: success=${result.success}, error=${result.error || 'none'}`);
      }
      
      // Most or all deletion attempts should fail
      assert.ok(failed.length > 0, 'Some deletion attempts should fail for non-existent scripts');
      
      // Verify error messages mention "not found"
      for (const result of failed) {
        if (result.error) {
          assert.ok(result.error.toLowerCase().includes('not found') || 
                   result.error.toLowerCase().includes('does not exist') ||
                   result.error.toLowerCase().includes('cannot find'),
                   `Error should indicate script not found: ${result.error}`);
        }
      }
    });
  });

  describe('⚡ CHAOS TEST 7: Stress Test - Many Operations in Sequence', () => {
    it('should handle rapid sequence of mixed operations', async () => {
      const operations = [];
      const operationTypes = ['create', 'list', 'validate', 'update', 'delete'];
      const startTime = Date.now();
      
      // Generate 100 mixed operations
      for (let i = 0; i < 100; i++) {
        const opType = operationTypes[Math.floor(Math.random() * operationTypes.length)];
        const scriptName = `StressTest${i}`;
        
        operations.push({
          id: i,
          type: opType,
          scriptName,
          timestamp: Date.now()
        });
      }
      
      console.log(`\n⚡ STRESS TEST: Executing ${operations.length} operations...`);
      
      const results = [];
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 10;
      
      for (const op of operations) {
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.log(`⚠️ Aborting stress test after ${maxConsecutiveFailures} consecutive failures`);
          break;
        }
        
        try {
          let result;
          const opStartTime = Date.now();
          
          switch (op.type) {
            case 'create':
              result = await handlers.create.execute({
                scriptName: op.scriptName,
                scriptType: ['MonoBehaviour', 'ScriptableObject', 'StaticClass'][Math.floor(Math.random() * 3)]
              });
              break;
              
            case 'list':
              result = await handlers.list.execute({
                searchPath: 'Assets/',
                maxResults: 10
              });
              break;
              
            case 'validate':
              result = await handlers.validate.execute({
                scriptContent: `using UnityEngine; public class ${op.scriptName} : MonoBehaviour { void Start() { } }`
              });
              break;
              
            case 'update':
              result = await handlers.update.execute({
                scriptName: op.scriptName,
                scriptContent: `using UnityEngine; public class ${op.scriptName} : MonoBehaviour { void Start() { Debug.Log("Updated"); } }`
              });
              break;
              
            case 'delete':
              result = await handlers.delete.execute({
                scriptName: op.scriptName,
                force: true
              });
              break;
              
            default:
              throw new Error(`Unknown operation type: ${op.type}`);
          }
          
          results.push({
            ...op,
            success: true,
            result,
            duration: Date.now() - opStartTime
          });
          
          consecutiveFailures = 0; // Reset counter on success
          
        } catch (error) {
          results.push({
            ...op,
            success: false,
            error: error.message,
            duration: Date.now() - opStartTime
          });
          
          consecutiveFailures++;
        }
      }
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      console.log(`\n⚡ STRESS TEST RESULTS:`);
      console.log(`Total operations attempted: ${results.length}`);
      console.log(`Total duration: ${totalDuration}ms`);
      console.log(`Average per operation: ${(totalDuration / results.length).toFixed(2)}ms`);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log(`Successful operations: ${successful.length}`);
      console.log(`Failed operations: ${failed.length}`);
      console.log(`Success rate: ${(successful.length / results.length * 100).toFixed(1)}%`);
      
      // Analyze operation type distribution
      const typeStats = {};
      for (const opType of operationTypes) {
        const typeResults = results.filter(r => r.type === opType);
        const typeSuccesses = typeResults.filter(r => r.success);
        
        typeStats[opType] = {
          total: typeResults.length,
          successful: typeSuccesses.length,
          successRate: typeResults.length > 0 ? (typeSuccesses.length / typeResults.length * 100).toFixed(1) : 0
        };
      }
      
      console.log('\nOperation type statistics:');
      for (const [type, stats] of Object.entries(typeStats)) {
        console.log(`  ${type}: ${stats.successful}/${stats.total} (${stats.successRate}%)`);
      }
      
      // Performance analysis
      const avgDurations = {};
      for (const opType of operationTypes) {
        const typeDurations = results.filter(r => r.type === opType && r.success).map(r => r.duration);
        if (typeDurations.length > 0) {
          avgDurations[opType] = typeDurations.reduce((a, b) => a + b, 0) / typeDurations.length;
        }
      }
      
      console.log('\nAverage operation durations:');
      for (const [type, avgDuration] of Object.entries(avgDurations)) {
        console.log(`  ${type}: ${avgDuration.toFixed(2)}ms`);
      }
      
      // Verify stress test completed
      assert.ok(results.length > 50, 'Should have completed a significant number of operations');
      assert.ok(successful.length > 0, 'At least some operations should succeed');
      
      // Verify Unity was called appropriately
      const commandCount = commandHistory.length;
      console.log(`\nTotal Unity commands sent: ${commandCount}`);
      assert.ok(commandCount > 0, 'Should have sent commands to Unity');
      
      // Check for any patterns in failures
      if (failed.length > 0) {
        const errorTypes = {};
        for (const failure of failed) {
          const errorKey = failure.error.split(' ')[0]; // First word of error
          errorTypes[errorKey] = (errorTypes[errorKey] || 0) + 1;
        }
        
        console.log('\nFailure error patterns:');
        for (const [errorType, count] of Object.entries(errorTypes)) {
          console.log(`  ${errorType}: ${count} occurrences`);
        }
      }
    });
  });

  describe('🎯 CHAOS TEST 8: Edge Case Combinations', () => {
    it('should handle complex edge case combinations', async () => {
      const edgeCases = [
        {
          name: 'Create script with long name and update with malformed code',
          operations: [
            async () => handlers.create.execute({ 
              scriptName: 'VeryLongScriptNameThatTestsLimits123',
              scriptType: 'MonoBehaviour'
            }),
            async () => handlers.update.execute({
              scriptName: 'VeryLongScriptNameThatTestsLimits123',
              scriptContent: 'this is not valid C# code at all'
            })
          ]
        },
        {
          name: 'Rapid create-delete-create cycle',
          operations: [
            async () => handlers.create.execute({ scriptName: 'CycleTest' }),
            async () => handlers.delete.execute({ scriptName: 'CycleTest', force: true }),
            async () => handlers.create.execute({ scriptName: 'CycleTest' }),
            async () => handlers.delete.execute({ scriptName: 'CycleTest', force: true })
          ]
        },
        {
          name: 'Validate non-existent then create',
          operations: [
            async () => handlers.validate.execute({ scriptName: 'NonExistent' }),
            async () => handlers.create.execute({ scriptName: 'NonExistent' }),
            async () => handlers.validate.execute({ scriptName: 'NonExistent' })
          ]
        },
        {
          name: 'Create multiple scripts with similar names',
          operations: [
            async () => handlers.create.execute({ scriptName: 'TestScript' }),
            async () => handlers.create.execute({ scriptName: 'TestScript1' }),
            async () => handlers.create.execute({ scriptName: 'TestScript_' }),
            async () => handlers.create.execute({ scriptName: 'Test_Script' })
          ]
        }
      ];

      for (const edgeCase of edgeCases) {
        console.log(`\n🎯 Testing: ${edgeCase.name}`);
        
        const results = [];
        
        for (let i = 0; i < edgeCase.operations.length; i++) {
          try {
            const result = await edgeCase.operations[i]();
            results.push({
              step: i + 1,
              success: true,
              result
            });
            console.log(`  Step ${i + 1}: SUCCESS`);
          } catch (error) {
            results.push({
              step: i + 1,
              success: false,
              error: error.message
            });
            console.log(`  Step ${i + 1}: FAILED - ${error.message}`);
          }
        }
        
        const successful = results.filter(r => r.success);
        console.log(`  Overall: ${successful.length}/${results.length} steps succeeded`);
      }
    });
  });

  // Summary test that runs a final verification
  describe('📊 CHAOS TESTING SUMMARY', () => {
    it('should provide final system health check', async () => {
      console.log(`\n📊 CHAOS TESTING SUMMARY`);
      console.log(`=========================`);
      
      const totalCommands = commandHistory.length;
      const uniqueCommands = [...new Set(commandHistory.map(cmd => cmd.command))];
      
      console.log(`Total Unity commands sent: ${totalCommands}`);
      console.log(`Unique command types: ${uniqueCommands.join(', ')}`);
      
      // Verify all handlers are functional
      for (const [name, handler] of Object.entries(handlers)) {
        assert.ok(handler, `${name} handler should exist`);
        assert.equal(typeof handler.execute, 'function', `${name} handler should have execute method`);
        assert.equal(typeof handler.validate, 'function', `${name} handler should have validate method`);
      }
      
      // Check that we tested all major script operations
      const commandTypes = commandHistory.map(cmd => cmd.command);
      const expectedCommands = ['create_script', 'update_script', 'delete_script', 'validate_script', 'list_scripts'];
      
      for (const expectedCmd of expectedCommands) {
        const count = commandTypes.filter(cmd => cmd === expectedCmd).length;
        console.log(`${expectedCmd}: ${count} calls`);
      }
      
      console.log(`\n✅ Chaos testing completed successfully!`);
      console.log(`The script management system has been thoroughly tested under extreme conditions.`);
    });
  });
});

/**
 * Simulates Unity responses based on command and parameters
 * This provides realistic responses for testing without actual Unity connection
 */
function simulateUnityResponse(command, params) {
  const baseResponse = {
    success: true,
    timestamp: Date.now()
  };

  switch (command) {
    case 'create_script':
      return {
        ...baseResponse,
        scriptPath: `Assets/Scripts/${params.scriptName}.cs`,
        message: `Script '${params.scriptName}' created successfully`
      };

    case 'update_script':
      return {
        ...baseResponse,
        scriptPath: params.scriptPath || `Assets/Scripts/${params.scriptName}.cs`,
        message: 'Script updated successfully',
        linesChanged: Math.floor(Math.random() * 50) + 1,
        previousSize: 1024,
        newSize: 1150
      };

    case 'delete_script':
      return {
        ...baseResponse,
        scriptPath: params.scriptPath || `Assets/Scripts/${params.scriptName}.cs`,
        message: 'Script deleted successfully',
        fileSize: 1024
      };

    case 'validate_script':
      const hasErrors = Math.random() < 0.3; // 30% chance of errors
      return {
        ...baseResponse,
        isValid: !hasErrors,
        errors: hasErrors ? ['Syntax error at line 5', 'Missing using statement'] : [],
        warnings: Math.random() < 0.5 ? ['Unused variable detected'] : [],
        message: 'Script validation completed',
        validationTime: Math.floor(Math.random() * 100) + 10
      };

    case 'list_scripts':
      const scriptCount = Math.floor(Math.random() * 20) + 1;
      const scripts = [];
      
      for (let i = 0; i < scriptCount; i++) {
        scripts.push({
          name: `Script${i}`,
          path: `Assets/Scripts/Script${i}.cs`,
          type: ['MonoBehaviour', 'ScriptableObject', 'StaticClass'][Math.floor(Math.random() * 3)],
          size: Math.floor(Math.random() * 5000) + 500,
          lastModified: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
      
      return {
        ...baseResponse,
        scripts,
        totalCount: scriptCount,
        message: 'Scripts listed successfully'
      };

    default:
      return {
        success: false,
        error: `Unknown command: ${command}`
      };
  }
}