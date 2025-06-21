# Testing Unity Editor MCP Connection

## Prerequisites Check

- [ ] Unity Editor is running (2020.3 LTS or newer)
- [ ] Node.js 18+ is installed (`node --version`)
- [ ] Unity package is installed in Unity project
- [ ] Node.js dependencies are installed (`cd mcp-server && npm install`)

## Test Steps

### 1. Unity Setup
1. Open Unity Editor with a project
2. Check Unity Console for: `[Unity Editor MCP] TCP listener started on port 6400`
3. If you see errors about port 6400, close other Unity instances

### 2. Node.js Server Test
```bash
cd mcp-server
npm install  # If not already done
npm start
```

Expected output:
```
[Unity Editor MCP] Starting Unity Editor MCP Server...
[Unity Editor MCP] Registering tools...
[Unity Editor MCP] MCP server started successfully
[Unity Editor MCP] Connecting to Unity at localhost:6400...
[Unity Editor MCP] Connected to Unity Editor
[Unity Editor MCP] Unity connection established
```

### 3. Direct Connection Test
In a new terminal:
```bash
# Test if port is open
nc -zv localhost 6400

# Send a ping command
echo "ping" | nc localhost 6400
```

Expected response: JSON with pong message

### 4. MCP Client Configuration Test

For Claude Desktop:
1. Close Claude if running
2. Edit config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

3. Add configuration:
```json
{
  "mcpServers": {
    "unity-editor-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/unity-mcp/mcp-server/src/server.js"]
    }
  }
}
```

4. Start Claude Desktop
5. Look for Unity tools in Claude's interface
6. Try the ping command

## Troubleshooting

### Unity Issues
- **No console output**: Ensure package is properly imported
- **Port already in use**: Close all Unity instances and restart
- **Import errors**: Check that Newtonsoft.Json is available

### Node.js Issues
- **Module not found**: Run `npm install` in mcp-server directory
- **Connection refused**: Ensure Unity is running first
- **Syntax errors**: Verify Node.js 18+ is installed

### MCP Client Issues
- **Tools not showing**: Check config file syntax
- **Server not starting**: Verify absolute path in config
- **Permission denied**: Check file permissions

## Success Criteria
- [x] Unity shows TCP listener started
- [x] Node.js server connects to Unity
- [ ] Ping command works via netcat
- [ ] MCP client shows Unity tools
- [ ] Ping tool returns pong response

## Next Steps
Once all tests pass:
1. Document any issues encountered
2. Update progression document
3. Begin Phase 2 (GameObject operations)