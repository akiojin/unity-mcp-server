import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CreateScriptToolHandler } from '../src/handlers/scripting/CreateScriptToolHandler.js';
import { UpdateScriptToolHandler } from '../src/handlers/scripting/UpdateScriptToolHandler.js';
import { DeleteScriptToolHandler } from '../src/handlers/scripting/DeleteScriptToolHandler.js';
import { ValidateScriptToolHandler } from '../src/handlers/scripting/ValidateScriptToolHandler.js';
import { ListScriptsToolHandler } from '../src/handlers/scripting/ListScriptsToolHandler.js';

/**
 * FOCUSED STRESS TEST for Script Management System
 */
describe('🔥 FOCUSED CHAOS STRESS TEST', () => {
  let handlers;
  let mockUnityConnection;
  let operationCount = 0;

  beforeEach(() => {
    operationCount = 0;
    
    mockUnityConnection = {
      isConnected: mock.fn(() => true),
      connect: mock.fn(async () => {}),
      sendCommand: mock.fn(async (command, params) => {
        operationCount++;
        
        // Simulate realistic Unity responses with some random delays
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
        
        const baseResponse = { success: true, timestamp: Date.now() };
        
        switch (command) {
          case 'create_script':
            // Simulate duplicate check
            if (params.scriptName === 'DuplicateTest') {
              return { success: false, error: 'Script already exists' };
            }
            return {
              ...baseResponse,
              scriptPath: `Assets/Scripts/${params.scriptName}.cs`,
              message: `Script '${params.scriptName}' created successfully`
            };
            
          case 'update_script':
            // Simulate validation of malformed code
            if (params.scriptContent.includes('this is not valid')) {
              return { success: false, error: 'Invalid C# syntax detected' };
            }
            return {
              ...baseResponse,
              scriptPath: `Assets/Scripts/${params.scriptName || 'Unknown'}.cs`,
              message: 'Script updated successfully'
            };
            
          case 'delete_script':
            // Simulate "not found" for non-existent scripts
            if (params.scriptName?.includes('NonExistent')) {
              return { success: false, error: 'Script not found' };
            }
            return {
              ...baseResponse,
              message: 'Script deleted successfully'
            };
            
          case 'validate_script':
            const hasErrors = params.scriptContent?.includes('syntax error') || false;
            return {
              ...baseResponse,
              isValid: !hasErrors,
              errors: hasErrors ? ['Syntax error detected'] : [],
              warnings: []
            };
            
          case 'list_scripts':
            return {
              ...baseResponse,
              scripts: [
                { name: 'TestScript1', path: 'Assets/Scripts/TestScript1.cs' },
                { name: 'TestScript2', path: 'Assets/Scripts/TestScript2.cs' }
              ],
              totalCount: 2
            };
            
          default:
            return { success: false, error: `Unknown command: ${command}` };
        }
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
  });

  it('🚀 Should handle 50 rapid mixed operations', async () => {
    console.log('\n🚀 Starting rapid mixed operations test...');
    
    const startTime = Date.now();
    const operations = [];
    const results = [];
    
    // Generate 50 mixed operations
    const operationTypes = [
      () => handlers.create.execute({ scriptName: `Script${Math.floor(Math.random() * 1000)}` }),
      () => handlers.create.execute({ scriptName: 'DuplicateTest' }), // This will fail
      () => handlers.update.execute({ scriptName: 'TestScript', scriptContent: 'valid C# code' }),
      () => handlers.update.execute({ scriptName: 'TestScript', scriptContent: 'this is not valid C#' }), // This will fail
      () => handlers.delete.execute({ scriptName: `NonExistentScript${Math.random()}` }), // This will fail
      () => handlers.validate.execute({ scriptContent: 'using UnityEngine; public class Test {}' }),
      () => handlers.validate.execute({ scriptContent: 'syntax error here' }), // This will have errors
      () => handlers.list.execute({ searchPath: 'Assets/' })
    ];
    
    for (let i = 0; i < 50; i++) {
      const randomOp = operationTypes[Math.floor(Math.random() * operationTypes.length)];
      operations.push(randomOp);
    }
    
    console.log(`Generated ${operations.length} operations`);
    
    // Execute all operations
    for (let i = 0; i < operations.length; i++) {
      const opStartTime = Date.now();
      
      try {
        const result = await operations[i]();
        results.push({
          index: i,
          success: true,
          result,
          duration: Date.now() - opStartTime
        });
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error.message,
          duration: Date.now() - opStartTime
        });
      }
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    console.log(`\n⚡ STRESS TEST RESULTS:`);
    console.log(`Total operations: ${results.length}`);
    console.log(`Total duration: ${totalDuration}ms`);
    console.log(`Average per operation: ${(totalDuration / results.length).toFixed(2)}ms`);
    console.log(`Unity commands sent: ${operationCount}`);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`Successful: ${successful.length} (${(successful.length / results.length * 100).toFixed(1)}%)`);
    console.log(`Failed: ${failed.length} (${(failed.length / results.length * 100).toFixed(1)}%)`);
    
    // Performance analysis
    const durations = results.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    console.log(`\n📊 Performance Metrics:`);
    console.log(`Average operation: ${avgDuration.toFixed(2)}ms`);
    console.log(`Fastest operation: ${minDuration}ms`);
    console.log(`Slowest operation: ${maxDuration}ms`);
    
    // Error analysis
    if (failed.length > 0) {
      const errorTypes = {};
      failed.forEach(f => {
        const errorKey = f.error.split(' ')[0];
        errorTypes[errorKey] = (errorTypes[errorKey] || 0) + 1;
      });
      
      console.log(`\n❌ Error Distribution:`);
      Object.entries(errorTypes).forEach(([error, count]) => {
        console.log(`  ${error}: ${count} occurrences`);
      });
    }
    
    // Assert that the system handled the stress well
    assert.ok(results.length === 50, 'Should have completed all 50 operations');
    assert.ok(successful.length > 0, 'At least some operations should succeed');
    assert.ok(operationCount === results.length, 'Should have sent exactly one Unity command per operation');
    assert.ok(avgDuration < 100, 'Average operation should be reasonably fast (< 100ms)');
    
    console.log(`\n✅ Stress test completed successfully!`);
  });

  it('💥 Should handle validation edge cases', async () => {
    console.log('\n💥 Testing validation edge cases...');
    
    const edgeCases = [
      { name: 'Empty script name', params: { scriptName: '' } },
      { name: 'Special characters', params: { scriptName: 'Test@Script#' } },
      { name: 'Numbers at start', params: { scriptName: '123Test' } },
      { name: 'Very long name', params: { scriptName: 'A'.repeat(500) } },
      { name: 'Unicode characters', params: { scriptName: 'Test北京' } },
      { name: 'Path injection', params: { scriptName: 'Test', path: '../../../etc/passwd' } },
      { name: 'Invalid namespace', params: { scriptName: 'Test', namespace: 'Invalid Namespace!' } }
    ];
    
    const results = [];
    
    for (const testCase of edgeCases) {
      try {
        // Test validation
        let validationError = null;
        try {
          handlers.create.validate(testCase.params);
        } catch (error) {
          validationError = error.message;
        }
        
        results.push({
          name: testCase.name,
          params: testCase.params,
          validationPassed: !validationError,
          validationError
        });
        
      } catch (error) {
        results.push({
          name: testCase.name,
          params: testCase.params,
          unexpectedError: error.message
        });
      }
    }
    
    console.log(`\n🔍 VALIDATION EDGE CASE RESULTS:`);
    results.forEach(result => {
      console.log(`${result.name}: ${result.validationPassed ? 'PASS' : 'FAIL'} ${result.validationError || ''}`);
    });
    
    // Verify that problematic inputs were caught
    const problematicCases = ['Empty script name', 'Special characters', 'Numbers at start', 'Unicode characters', 'Path injection', 'Invalid namespace'];
    
    for (const caseName of problematicCases) {
      const result = results.find(r => r.name === caseName);
      assert.ok(result, `Should have tested ${caseName}`);
      assert.ok(!result.validationPassed, `${caseName} should fail validation`);
    }
    
    console.log(`\n✅ Validation edge cases handled correctly!`);
  });

  it('🔄 Should handle rapid create-update-delete cycles', async () => {
    console.log('\n🔄 Testing rapid create-update-delete cycles...');
    
    const scriptName = 'CycleTestScript';
    const cycles = 10;
    const results = [];
    
    const startTime = Date.now();
    
    for (let i = 0; i < cycles; i++) {
      const cycleStartTime = Date.now();
      const cycleResults = [];
      
      try {
        // Create
        const createResult = await handlers.create.execute({ scriptName: `${scriptName}${i}` });
        cycleResults.push({ operation: 'create', success: true, result: createResult });
      } catch (error) {
        cycleResults.push({ operation: 'create', success: false, error: error.message });
      }
      
      try {
        // Update
        const updateResult = await handlers.update.execute({ 
          scriptName: `${scriptName}${i}`, 
          scriptContent: `using UnityEngine; public class ${scriptName}${i} : MonoBehaviour { void Start() { Debug.Log("Cycle ${i}"); } }`
        });
        cycleResults.push({ operation: 'update', success: true, result: updateResult });
      } catch (error) {
        cycleResults.push({ operation: 'update', success: false, error: error.message });
      }
      
      try {
        // Delete
        const deleteResult = await handlers.delete.execute({ scriptName: `${scriptName}${i}`, force: true });
        cycleResults.push({ operation: 'delete', success: true, result: deleteResult });
      } catch (error) {
        cycleResults.push({ operation: 'delete', success: false, error: error.message });
      }
      
      results.push({
        cycle: i,
        duration: Date.now() - cycleStartTime,
        operations: cycleResults,
        allSuccessful: cycleResults.every(r => r.success)
      });
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    console.log(`\n🔄 CYCLE TEST RESULTS:`);
    console.log(`Total cycles: ${cycles}`);
    console.log(`Total duration: ${totalDuration}ms`);
    console.log(`Average per cycle: ${(totalDuration / cycles).toFixed(2)}ms`);
    
    const successfulCycles = results.filter(r => r.allSuccessful);
    console.log(`Successful cycles: ${successfulCycles.length}/${cycles} (${(successfulCycles.length / cycles * 100).toFixed(1)}%)`);
    
    // Operation statistics
    const allOperations = results.flatMap(r => r.operations);
    const operationStats = {};
    
    ['create', 'update', 'delete'].forEach(op => {
      const opResults = allOperations.filter(o => o.operation === op);
      const successful = opResults.filter(o => o.success);
      operationStats[op] = {
        total: opResults.length,
        successful: successful.length,
        successRate: (successful.length / opResults.length * 100).toFixed(1)
      };
    });
    
    console.log(`\n📊 Operation Statistics:`);
    Object.entries(operationStats).forEach(([op, stats]) => {
      console.log(`  ${op}: ${stats.successful}/${stats.total} (${stats.successRate}%)`);
    });
    
    assert.ok(results.length === cycles, 'Should have completed all cycles');
    assert.ok(successfulCycles.length > 0, 'At least some cycles should be fully successful');
    
    console.log(`\n✅ Cycle test completed successfully!`);
  });
});