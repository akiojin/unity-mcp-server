#!/usr/bin/env node

import net from 'net';

console.log('Unity Debug Test\n');

const client = new net.Socket();
let responseCount = 0;

client.connect(6400, 'localhost', () => {
  console.log('Connected to Unity\n');
  
  // Test 1: Raw ping
  console.log('Test 1: Sending raw "ping"');
  client.write('ping');
  
  setTimeout(() => {
    // Test 2: JSON ping command
    const jsonCommand = {
      id: 'test-json-1',
      type: 'ping',
      params: { message: 'JSON test' }
    };
    console.log('\nTest 2: Sending JSON command:');
    console.log(JSON.stringify(jsonCommand, null, 2));
    client.write(JSON.stringify(jsonCommand) + '\n');
  }, 1000);
  
  setTimeout(() => {
    // Test 3: Invalid command
    console.log('\nTest 3: Sending invalid command');
    client.write('invalid json{\n');
  }, 2000);
  
  setTimeout(() => {
    console.log('\nClosing connection...');
    client.end();
  }, 3000);
});

client.on('data', (data) => {
  responseCount++;
  console.log(`\nResponse ${responseCount}:`, data.toString());
});

client.on('error', (err) => {
  console.error('Error:', err.message);
});

client.on('close', () => {
  console.log('\nConnection closed');
  console.log(`Total responses received: ${responseCount}`);
});