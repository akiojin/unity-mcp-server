#!/usr/bin/env node

import net from 'net';

console.log('Testing raw ping string...\n');

const client = new net.Socket();

client.connect(6400, 'localhost', () => {
  console.log('Connected. Sending raw "ping" string...');
  client.write('ping');
});

client.on('data', (data) => {
  console.log('Response:', data.toString());
  client.destroy();
});

client.on('error', (err) => {
  console.error('Error:', err.message);
});

client.on('close', () => {
  console.log('Connection closed');
});