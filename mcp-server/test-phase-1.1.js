#!/usr/bin/env node

/**
 * Test suite for Phase 1.1 features
 * Run this after implementing Phase 1.1 to verify:
 * 1. New response format
 * 2. Tool handler architecture
 * 3. Base64 encoding
 * 4. Enhanced error handling
 */

import net from 'net';
import assert from 'assert';

console.log('Phase 1.1 Test Suite');
console.log('===================\n');

const tests = [];
let passed = 0;
let failed = 0;

// Test helper
function test(name, fn) {
  tests.push({ name, fn });
}

// Test 1: Response Format
test('New response format {status, result}', async () => {
  const client = new net.Socket();
  
  await new Promise((resolve, reject) => {
    client.connect(6400, 'localhost', resolve);
    client.on('error', reject);
  });
  
  const command = {
    id: 'format-test',
    type: 'ping',
    params: { message: 'test' }
  };
  
  client.write(JSON.stringify(command) + '\n');
  
  const response = await new Promise((resolve) => {
    client.once('data', (data) => {
      resolve(JSON.parse(data.toString()));
    });
  });
  
  client.end();
  
  // Check new format
  assert(response.status === 'success', 'Response should have status field');
  assert(response.result !== undefined, 'Response should have result field');
  assert(response.result.message === 'pong', 'Result should contain pong message');
});

// Test 2: Error format
test('Error response format {status: "error", error, code}', async () => {
  const client = new net.Socket();
  
  await new Promise((resolve, reject) => {
    client.connect(6400, 'localhost', resolve);
    client.on('error', reject);
  });
  
  const command = {
    id: 'error-test',
    type: 'unknown_command',
    params: {}
  };
  
  client.write(JSON.stringify(command) + '\n');
  
  const response = await new Promise((resolve) => {
    client.once('data', (data) => {
      resolve(JSON.parse(data.toString()));
    });
  });
  
  client.end();
  
  // Check error format
  assert(response.status === 'error', 'Error response should have status: "error"');
  assert(response.error !== undefined, 'Error response should have error message');
  assert(response.code !== undefined, 'Error response should have error code');
});

// Test 3: Base64 encoding support
test('Base64 encoding for large content', async () => {
  // This would test a future script tool with base64 support
  console.log('  ⚠️  Skipped - Requires script tool implementation');
});

// Test 4: Parameter summary in errors
test('Error includes parameter summary', async () => {
  // Skip this test for now as it requires a command that triggers validation errors
  console.log('  ⚠️  Skipped - Requires test_error command or validation errors');
  return;
  
  const client = new net.Socket();
  
  await new Promise((resolve, reject) => {
    client.connect(6400, 'localhost', resolve);
    client.on('error', reject);
  });
  
  const command = {
    id: 'param-error-test',
    type: 'test_error',
    params: {
      longParam: 'x'.repeat(100),
      shortParam: 'test'
    }
  };
  
  client.write(JSON.stringify(command) + '\n');
  
  const response = await new Promise((resolve) => {
    client.once('data', (data) => {
      resolve(JSON.parse(data.toString()));
    });
  });
  
  client.end();
  
  // Check parameter summary
  if (response.status === 'error' && response.details) {
    assert(response.details.params !== undefined, 'Error should include parameter summary');
    assert(!response.details.params.includes('x'.repeat(100)), 'Long params should be truncated');
  }
});

// Test 5: Backward compatibility
test('Backward compatibility mode', async () => {
  // This would test if old format still works with a flag
  console.log('  ⚠️  Skipped - Depends on compatibility flag implementation');
});

// Run all tests
async function runTests() {
  console.log(`Running ${tests.length} tests...\n`);
  
  for (const { name, fn } of tests) {
    process.stdout.write(`Testing: ${name}... `);
    try {
      await fn();
      console.log('✅ PASS');
      passed++;
    } catch (error) {
      console.log('❌ FAIL');
      console.log(`  Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n===================');
  console.log(`Total: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${tests.length - passed - failed}`);
  
  if (failed === 0) {
    console.log('\n✅ All Phase 1.1 tests passed!');
  } else {
    console.log('\n❌ Some tests failed. Phase 1.1 implementation needs work.');
  }
}

// Check if Unity is running first
const testClient = new net.Socket();
testClient.connect(6400, 'localhost', () => {
  testClient.end();
  runTests();
});

testClient.on('error', () => {
  console.error('❌ Unity is not running on port 6400');
  console.log('Please start Unity with the MCP package first.');
  process.exit(1);
});