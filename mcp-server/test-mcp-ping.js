#!/usr/bin/env node

import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

console.log('Unity MCP Server Test');
console.log('====================\n');

async function testMCPServer() {
  try {
    console.log('Starting MCP client...');
    
    // Create transport to connect to our MCP server
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['src/server.js'],
      cwd: process.cwd()
    });

    // Create MCP client
    const client = new Client({
      name: 'test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    console.log('Connecting to MCP server...');
    await client.connect(transport);
    console.log('✓ Connected to MCP server\n');

    // List available tools
    console.log('Listing available tools...');
    const tools = await client.listTools();
    console.log('Available tools:');
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // Call the ping tool
    console.log('Calling ping tool...');
    const result = await client.callTool('ping', {
      message: 'Test from MCP client!'
    });

    console.log('\nPing result:');
    if (result.content && result.content.length > 0) {
      console.log('✓', result.content[0].text);
    } else {
      console.log('✗ No response content');
    }

    // Close client
    await client.close();
    console.log('\n✓ Test completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.log('\nMake sure:');
    console.log('1. Unity is running with the MCP package');
    console.log('2. Unity TCP server is listening on port 6400');
    console.log('3. Run this from the mcp-server directory');
    process.exit(1);
  }
}

// Run the test
testMCPServer();