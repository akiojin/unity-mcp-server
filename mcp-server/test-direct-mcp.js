#!/usr/bin/env node

// Direct test of MCP server functionality
import { UnityConnection } from './src/unityConnection.js';
import { config } from './src/config.js';

console.log('Direct MCP Server Test');
console.log('=====================\n');

async function testDirectConnection() {
  const connection = new UnityConnection();
  
  try {
    console.log('Connecting to Unity...');
    await connection.connect(config.unity.host, config.unity.port);
    console.log('✓ Connected to Unity\n');
    
    console.log('Sending ping command through UnityConnection...');
    const result = await connection.sendCommand('ping', {
      message: 'Direct test message'
    });
    
    console.log('Response received:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.message === 'pong') {
      console.log('\n✓ Test successful!');
      console.log(`  Echo: ${result.echo || 'Not implemented yet'}`);
      console.log(`  Timestamp: ${result.timestamp || 'N/A'}`);
    }
    
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
  } finally {
    connection.disconnect();
    console.log('\nTest complete');
  }
}

testDirectConnection();