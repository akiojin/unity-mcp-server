import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'net';
import { spawn } from 'child_process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// NOTE: This test suite uses a legacy mock Unity wire format and hard-coded paths.
// It is kept for reference but skipped by default. Prefer:
// - tests/e2e/all-tools-smoke-mcp-protocol.test.js
// - tests/e2e/ui-automation-mcp-protocol.test.js
const describeLegacy = process.env.UNITY_MCP_RUN_LEGACY_E2E === '1' ? describe : describe.skip;

describeLegacy('End-to-End Tests (legacy)', () => {
  let mockUnityServer;
  let unityServerPort;
  let mcpServerProcess;
  let mcpClient;

  before(async () => {
    // Step 1: Create mock Unity server
    mockUnityServer = net.createServer(socket => {
      console.log('[Mock Unity] Client connected');

      let buffer = '';
      socket.on('data', data => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        lines.forEach(line => {
          if (!line.trim()) return;

          try {
            const command = JSON.parse(line);
            console.log('[Mock Unity] Received command:', command);

            // Process command based on type
            let response = {
              id: command.id,
              success: true,
              data: {}
            };

            switch (command.type) {
              case 'ping':
                response.data = {
                  message: 'pong',
                  echo: command.params?.message || null,
                  timestamp: new Date().toISOString(),
                  unityVersion: '2020.3.0f1'
                };
                break;

              case 'create_gameobject':
                response.data = {
                  gameObjectId: `GameObject_${Date.now()}`,
                  name: command.params?.name || 'GameObject',
                  position: command.params?.position || { x: 0, y: 0, z: 0 }
                };
                break;

              case 'get_scene_info':
                response.data = {
                  sceneName: 'TestScene',
                  gameObjectCount: 42,
                  isPlaying: false
                };
                break;

              default:
                response.success = false;
                response.error = `Unknown command type: ${command.type}`;
            }

            const responseStr = JSON.stringify(response) + '\n';
            console.log('[Mock Unity] Sending response:', response);
            socket.write(responseStr);
          } catch (e) {
            console.error('[Mock Unity] Error processing command:', e);
            const errorResponse = {
              id: 'error',
              success: false,
              error: e.message
            };
            socket.write(JSON.stringify(errorResponse) + '\n');
          }
        });
      });

      socket.on('error', err => {
        console.error('[Mock Unity] Socket error:', err);
      });

      socket.on('close', () => {
        console.log('[Mock Unity] Client disconnected');
      });
    });

    // Start Unity mock server
    await new Promise(resolve => {
      mockUnityServer.listen(6400, 'localhost', () => {
        unityServerPort = mockUnityServer.address().port;
        console.log(`[Mock Unity] Server listening on port ${unityServerPort}`);
        resolve();
      });
    });

    // Step 2: Start MCP server as subprocess
    console.log('[Test] Starting MCP server...');
    mcpServerProcess = spawn('node', ['src/server.js'], {
      cwd: '/Users/ozan/Projects/unity-mcp/mcp-server',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Wait for server to be ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MCP server startup timeout'));
      }, 10000);

      mcpServerProcess.stdout.on('data', data => {
        const output = data.toString();
        console.log('[MCP Server]', output);
        if (
          output.includes('MCP server running') ||
          output.includes('Unity connection established')
        ) {
          clearTimeout(timeout);
          resolve();
        }
      });

      mcpServerProcess.stderr.on('data', data => {
        console.error('[MCP Server Error]', data.toString());
      });

      mcpServerProcess.on('error', err => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // Step 3: Create MCP client
    console.log('[Test] Creating MCP client...');
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['src/server.js'],
      cwd: '/Users/ozan/Projects/unity-mcp/mcp-server',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    mcpClient = new Client(
      {
        name: 'e2e-test-client',
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    );

    await mcpClient.connect(transport);
    console.log('[Test] MCP client connected');
  });

  after(async () => {
    // Clean up
    if (mcpClient) {
      await mcpClient.close();
    }

    if (mcpServerProcess) {
      mcpServerProcess.kill();
      await new Promise(resolve => {
        mcpServerProcess.on('exit', resolve);
        setTimeout(resolve, 1000); // Fallback timeout
      });
    }

    if (mockUnityServer) {
      mockUnityServer.close();
    }
  });

  describe('Full End-to-End Flow', () => {
    it('should complete ping flow from MCP client to Unity and back', async () => {
      console.log('[Test] Calling ping tool...');

      // Call the ping tool through MCP
      const result = await mcpClient.callTool('ping', {
        message: 'Hello from E2E test'
      });

      console.log('[Test] Ping result:', result);

      // Verify the result
      assert(result.content, 'Result should have content');
      assert(result.content.length > 0, 'Content should not be empty');

      const content = result.content[0];
      assert.equal(content.type, 'text');
      assert(content.text.includes('pong'), 'Response should contain pong');
      assert(content.text.includes('Hello from E2E test'), 'Response should echo the message');
    });

    it('should list available tools', async () => {
      const tools = await mcpClient.listTools();

      assert(Array.isArray(tools.tools), 'Should return array of tools');
      assert(tools.tools.length > 0, 'Should have at least one tool');

      const pingTool = tools.tools.find(t => t.name === 'ping');
      assert(pingTool, 'Should have ping tool');
      assert.equal(pingTool.description, 'Ping Unity to test connection');
      assert(pingTool.inputSchema, 'Should have input schema');
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = [];

      // Send 5 concurrent ping requests
      for (let i = 0; i < 5; i++) {
        requests.push(
          mcpClient.callTool('ping', {
            message: `Concurrent request ${i}`
          })
        );
      }

      const results = await Promise.all(requests);

      // Verify all requests succeeded
      results.forEach((result, index) => {
        assert(result.content[0].text.includes('pong'));
        assert(result.content[0].text.includes(`Concurrent request ${index}`));
      });
    });

    it('should maintain connection after errors', async () => {
      // First, verify connection works
      const validResult = await mcpClient.callTool('ping', { message: 'test' });
      assert(validResult.content[0].text.includes('pong'));

      // Try to call non-existent tool (should error)
      await assert.rejects(
        async () => await mcpClient.callTool('nonexistent', {}),
        /Tool not found/
      );

      // Verify connection still works after error
      const afterErrorResult = await mcpClient.callTool('ping', {
        message: 'still working'
      });
      assert(afterErrorResult.content[0].text.includes('pong'));
      assert(afterErrorResult.content[0].text.includes('still working'));
    });
  });

  describe('Performance Tests', () => {
    it('should handle rapid sequential requests', async () => {
      const startTime = Date.now();
      const requestCount = 20;

      for (let i = 0; i < requestCount; i++) {
        const result = await mcpClient.callTool('ping', {
          message: `Sequential ${i}`
        });
        assert(result.content[0].text.includes('pong'));
      }

      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / requestCount;

      console.log(
        `[Performance] ${requestCount} sequential requests in ${totalTime}ms (avg: ${avgTime.toFixed(2)}ms)`
      );
      assert(
        avgTime < 100,
        `Average request time should be under 100ms, was ${avgTime.toFixed(2)}ms`
      );
    });

    it('should measure round-trip latency', async () => {
      const latencies = [];

      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await mcpClient.callTool('ping', { message: `latency-${i}` });
        const latency = Date.now() - start;
        latencies.push(latency);
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const minLatency = Math.min(...latencies);
      const maxLatency = Math.max(...latencies);

      console.log(
        `[Performance] Latency - Min: ${minLatency}ms, Max: ${maxLatency}ms, Avg: ${avgLatency.toFixed(2)}ms`
      );
      assert(
        avgLatency < 50,
        `Average latency should be under 50ms, was ${avgLatency.toFixed(2)}ms`
      );
    });
  });
});

// Simplified E2E test that doesn't require subprocess
describeLegacy('Simplified E2E Tests (legacy)', () => {
  let mockUnityServer;
  let server;
  let unityConnection;

  before(async () => {
    // Create mock Unity server
    mockUnityServer = net.createServer(socket => {
      socket.on('data', data => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
          if (!line.trim()) return;

          try {
            const command = JSON.parse(line);
            const response = {
              id: command.id,
              success: true,
              data: {
                message: 'pong',
                echo: command.params?.message,
                processedBy: 'SimplifiedE2E'
              }
            };
            socket.write(JSON.stringify(response) + '\n');
          } catch (e) {
            // Ignore
          }
        });
      });
    });

    await new Promise(resolve => {
      mockUnityServer.listen(6401, 'localhost', resolve);
    });

    // Create MCP server directly
    const { createServer } = await import('./server.js');
    const config = {
      host: 'localhost',
      port: 6401,
      reconnectInterval: 1000,
      commandTimeout: 5000,
      logLevel: 'info'
    };

    const result = await createServer(config);
    server = result.server;
    unityConnection = result.unityConnection;
  });

  after(() => {
    if (unityConnection) {
      unityConnection.disconnect();
    }
    if (mockUnityServer) {
      mockUnityServer.close();
    }
  });

  it('should complete simplified ping flow', async () => {
    // Simulate tool call
    const toolHandler = server.requestHandlers.get('tools/call');
    const result = await toolHandler({
      params: {
        name: 'ping',
        arguments: { message: 'simplified test' }
      }
    });

    assert(result.content[0].text.includes('pong'));
    assert(result.content[0].text.includes('simplified test'));
    assert(result.content[0].text.includes('SimplifiedE2E'));
  });
});
