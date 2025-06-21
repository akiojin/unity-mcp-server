#!/usr/bin/env node

import net from 'net';

console.log('Unity MCP Ping Test');
console.log('==================\n');

// Connect directly to Unity's TCP server
const client = new net.Socket();
const PORT = 6400;
const HOST = 'localhost';

console.log(`Connecting to Unity at ${HOST}:${PORT}...`);

client.connect(PORT, HOST, () => {
  console.log('✓ Connected to Unity TCP server\n');
  
  // Create a ping command
  const pingCommand = {
    id: 'test-' + Date.now(),
    type: 'ping',
    params: {
      message: 'Hello from command line!'
    }
  };
  
  console.log('Sending ping command:', JSON.stringify(pingCommand, null, 2));
  
  // Send the command
  client.write(JSON.stringify(pingCommand) + '\n');
});

// Handle response
client.on('data', (data) => {
  console.log('\nReceived response:');
  try {
    const response = JSON.parse(data.toString());
    console.log(JSON.stringify(response, null, 2));
    
    // Check both response formats (with and without ID)
    if (response.success || response.status === 'success') {
      console.log('\n✓ Ping successful!');
      if (response.id) {
        console.log(`  ID: ${response.id}`);
      }
      const responseData = response.data || {};
      console.log(`  Message: ${responseData.message}`);
      if (responseData.echo) {
        console.log(`  Echo: ${responseData.echo}`);
      }
      if (responseData.timestamp) {
        console.log(`  Timestamp: ${responseData.timestamp}`);
      }
    } else {
      console.log('\n✗ Ping failed:', response.error || 'Unknown error');
    }
  } catch (e) {
    console.log('Raw response:', data.toString());
    console.log('Parse error:', e.message);
  }
  
  // Close connection
  client.end();
});

client.on('error', (err) => {
  console.error('\n✗ Connection error:', err.message);
  console.log('\nMake sure:');
  console.log('1. Unity is running');
  console.log('2. The Unity MCP package is installed');
  console.log('3. No firewall is blocking port 6400');
  process.exit(1);
});

client.on('close', () => {
  console.log('\nConnection closed');
  process.exit(0);
});