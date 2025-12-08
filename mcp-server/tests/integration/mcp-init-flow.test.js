import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { HybridStdioServerTransport } from '../../src/core/transports/HybridStdioServerTransport.js';

describe('MCP Initialize Flow', () => {
  it('should use Content-Length for all messages including notifications', async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();

    // Capture all stdout output
    const chunks = [];
    stdout.on('data', chunk => {
      chunks.push(chunk);
    });

    const transport = new HybridStdioServerTransport(stdin, stdout);
    const server = new Server(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: { listChanged: true }, logging: {} } }
    );

    await server.connect(transport);

    // Send a notification before initialize response (simulating server startup behavior)
    await server.sendLoggingMessage({ level: 'info', logger: 'test', data: 'Starting up...' });

    // Send initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    };

    const initBody = JSON.stringify(initRequest);
    const initMessage =
      'Content-Length: ' + Buffer.byteLength(initBody, 'utf8') + '\r\n\r\n' + initBody;

    stdin.write(initMessage);

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check output - should have multiple messages, all with Content-Length
    const output = Buffer.concat(chunks).toString('utf8');

    console.log('=== FULL RAW OUTPUT ===');
    console.log(output);
    console.log('');

    // Split output into individual messages
    const messages = output.split(/(?=Content-Length:)/);

    console.log('=== MESSAGE COUNT ===');
    console.log('Found ' + messages.length + ' messages');

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg.trim()) continue;

      console.log('');
      console.log('=== MESSAGE ' + (i + 1) + ' ===');
      console.log(msg.substring(0, 200) + (msg.length > 200 ? '...' : ''));

      // Each message should start with Content-Length
      assert.ok(
        msg.startsWith('Content-Length:'),
        'Message ' + (i + 1) + ' must start with Content-Length header'
      );
    }

    await server.close();
  });

  it('should respond with Content-Length framing for initialize request', async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();

    // Capture all stdout output
    const chunks = [];
    stdout.on('data', chunk => {
      chunks.push(chunk);
    });

    const transport = new HybridStdioServerTransport(stdin, stdout);
    const server = new Server(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: { listChanged: true } } }
    );

    await server.connect(transport);

    // Send initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    };

    const initBody = JSON.stringify(initRequest);
    const initMessage =
      'Content-Length: ' + Buffer.byteLength(initBody, 'utf8') + '\r\n\r\n' + initBody;

    stdin.write(initMessage);

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check output
    const output = Buffer.concat(chunks).toString('utf8');

    console.log('=== RAW OUTPUT ===');
    console.log(output);
    console.log('');
    console.log('=== STARTS WITH Content-Length ===');
    console.log(output.startsWith('Content-Length:'));

    // Verify output starts with Content-Length header
    assert.ok(
      output.startsWith('Content-Length:'),
      'Response must start with Content-Length header'
    );

    // Verify proper framing format
    assert.match(
      output,
      /^Content-Length: \d+\r\n\r\n/,
      'Response must use proper Content-Length framing'
    );

    // Parse and verify the response
    const headerEndIndex = output.indexOf('\r\n\r\n');
    assert.ok(headerEndIndex > 0, 'Header end marker must exist');

    const bodyStr = output.substring(headerEndIndex + 4);
    const body = JSON.parse(bodyStr);

    assert.equal(body.jsonrpc, '2.0');
    assert.equal(body.id, 1);
    assert.ok(body.result, 'Response must have result');
    assert.ok(body.result.serverInfo, 'Response must have serverInfo');
    assert.equal(body.result.serverInfo.name, 'test-server');

    await server.close();
  });
});
