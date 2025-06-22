import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { resolve as resolvePath } from 'path';
import { MockUnityServer, testUtils } from './test-utils.js';

describe('MCP Protocol Communication Tests', () => {
  let mockUnity;
  let mcpServer;
  let serverStdout = '';
  let serverStderr = '';

  before(async () => {
    // Start mock Unity on different port
    mockUnity = new MockUnityServer(6403);
    await mockUnity.start();
  });

  after(async () => {
    await mockUnity.stop();
    if (mcpServer) {
      mcpServer.kill();
    }
  });

  function startMCPServer() {
    return new Promise((resolve, reject) => {
      const serverPath = resolvePath('./src/core/server.js');
      mcpServer = spawn('node', [serverPath], {
        env: {
          ...process.env,
          UNITY_PORT: '6403',
          LOG_LEVEL: 'debug'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      mcpServer.stdout.on('data', (data) => {
        serverStdout += data.toString();
        // Look for server ready message
        if (data.toString().includes('MCP server started successfully')) {
          resolve();
        }
      });

      mcpServer.stderr.on('data', (data) => {
        serverStderr += data.toString();
        const msg = data.toString();
        if (msg.includes('MCP server started') || msg.includes('Connected to Unity')) {
          resolve();
        }
      });

      mcpServer.on('error', (err) => {
        console.error('MCP Server spawn error:', err);
        reject(err);
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        console.error('Server stdout:', serverStdout);
        console.error('Server stderr:', serverStderr);
        reject(new Error('Server startup timeout'));
      }, 5000);
    });
  }

  function sendMCPRequest(request) {
    return new Promise((resolve, reject) => {
      let response = '';
      const timeout = setTimeout(() => {
        reject(new Error('Response timeout'));
      }, 10000);

      mcpServer.stdout.on('data', (data) => {
        response += data.toString();
        
        // Try to parse each line as JSON
        const lines = response.split('\n');
        for (const line of lines) {
          if (line.trim() && line.includes('"id":' + request.id)) {
            try {
              const json = JSON.parse(line);
              clearTimeout(timeout);
              resolve(json);
              return;
            } catch (e) {
              // Not complete JSON yet
            }
          }
        }
      });

      // Send request
      mcpServer.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  describe('MCP Server Lifecycle', () => {
    it('should start and initialize correctly', async () => {
      await startMCPServer();
      
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '0.1.0',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      };

      const response = await sendMCPRequest(initRequest);
      
      assert.strictEqual(response.jsonrpc, '2.0');
      assert.strictEqual(response.id, 1);
      assert.ok(response.result);
      assert.ok(response.result.serverInfo);
      assert.strictEqual(response.result.serverInfo.name, 'unity-editor-mcp-server');
    });

    it('should list available tools', async () => {
      const listRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      };

      const response = await sendMCPRequest(listRequest);
      
      assert.ok(response.result);
      assert.ok(Array.isArray(response.result.tools));
      
      const toolNames = response.result.tools.map(t => t.name);
      assert.ok(toolNames.includes('create_gameobject'));
      assert.ok(toolNames.includes('ping'));
      assert.ok(toolNames.includes('read_logs'));
    });

    it('should list resources (empty)', async () => {
      const listRequest = {
        jsonrpc: '2.0',
        id: 2.1,
        method: 'resources/list',
        params: {}
      };

      const response = await sendMCPRequest(listRequest);
      
      assert.ok(response.result);
      assert.ok(Array.isArray(response.result.resources));
      assert.strictEqual(response.result.resources.length, 0);
    });

    it('should list prompts (empty)', async () => {
      const listRequest = {
        jsonrpc: '2.0',
        id: 2.2,
        method: 'prompts/list',
        params: {}
      };

      const response = await sendMCPRequest(listRequest);
      
      assert.ok(response.result);
      assert.ok(Array.isArray(response.result.prompts));
      assert.strictEqual(response.result.prompts.length, 0);
    });
  });

  describe('Tool Execution via MCP', () => {
    it('should execute create_gameobject tool', async () => {
      const toolRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'create_gameobject',
          arguments: {
            name: 'MCPTestObject'
          }
        }
      };

      const response = await sendMCPRequest(toolRequest);
      
      assert.ok(response.result);
      assert.ok(response.result.content);
      assert.ok(response.result.content[0]);
      
      const content = JSON.parse(response.result.content[0].text);
      assert.strictEqual(content.name, 'MCPTestObject');
      assert.strictEqual(content.path, '/MCPTestObject');
    });

    it('should handle invalid tool names', async () => {
      const toolRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'invalid_tool',
          arguments: {}
        }
      };

      const response = await sendMCPRequest(toolRequest);
      
      assert.ok(response.error || (response.result && response.result.content[0].text.includes('Error')));
    });
  });

  describe('Timeout Scenarios', () => {
    it('should handle Unity timeout gracefully', async function() {
      // Skip this test as it takes 30 seconds
      this.skip('Long timeout test - skipping for CI');
      
      // Configure Unity to timeout
      mockUnity.setTimeout(true);
      
      const toolRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'create_gameobject',
          arguments: {
            name: 'TimeoutObject'
          }
        }
      };

      const startTime = Date.now();
      const response = await sendMCPRequest(toolRequest);
      const duration = Date.now() - startTime;
      
      // Should timeout after ~30 seconds
      assert.ok(duration >= 29000, `Duration was only ${duration}ms`);
      assert.ok(response.result);
      assert.ok(response.result.content[0].text.includes('timeout'));
      
      // Reset
      mockUnity.setTimeout(false);
    });

    it('should handle slow Unity responses', async () => {
      // Configure Unity to be slow but not timeout
      mockUnity.setResponseDelay(5000);
      
      const toolRequest = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'create_gameobject',
          arguments: {
            name: 'SlowObject'
          }
        }
      };

      const startTime = Date.now();
      const response = await sendMCPRequest(toolRequest);
      const duration = Date.now() - startTime;
      
      // Should take ~5 seconds
      assert.ok(duration >= 5000 && duration < 7000, `Duration was ${duration}ms`);
      assert.ok(response.result);
      
      const content = JSON.parse(response.result.content[0].text);
      assert.strictEqual(content.name, 'SlowObject');
      
      // Reset
      mockUnity.setResponseDelay(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests', async () => {
      // Send invalid JSON
      mcpServer.stdin.write('invalid json\n');
      
      // Server should not crash
      await testUtils.sleep(100);
      
      // Try a valid request to confirm server is still running
      const validRequest = {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/list',
        params: {}
      };

      const response = await sendMCPRequest(validRequest);
      assert.ok(response.result);
    });

    it('should handle Unity disconnection', async () => {
      // Stop Unity
      await mockUnity.stop();
      
      const toolRequest = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'create_gameobject',
          arguments: {
            name: 'DisconnectedObject'
          }
        }
      };

      const response = await sendMCPRequest(toolRequest);
      
      assert.ok(response.result);
      assert.ok(response.result.content[0].text.includes('Error'));
      assert.ok(response.result.content[0].text.includes('Not connected') || 
                response.result.content[0].text.includes('ECONNREFUSED'));
      
      // Restart Unity
      await mockUnity.start();
    });
  });
});