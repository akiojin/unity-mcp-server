# Unity Log Reader & Asset Refresh Tools

The Unity MCP integration now includes tools for reading Unity console logs and triggering asset refreshes directly from your MCP client.

## Available Commands

### read_logs
Reads Unity console logs with optional filtering.

**Parameters:**
- `count` (optional): Number of logs to retrieve (1-1000, default: 100)
- `logType` (optional): Filter by log type: "Log", "Warning", "Error", "Assert", "Exception"

**Example usage:**
```javascript
// Read last 10 logs
const result = await callTool('read_logs', { count: 10 });

// Read only error logs
const errors = await callTool('read_logs', { 
  count: 50, 
  logType: 'Error' 
});

// Read all warnings
const warnings = await callTool('read_logs', { 
  logType: 'Warning' 
});
```

**Response format:**
```json
{
  "status": "success",
  "result": {
    "logs": [
      {
        "message": "Log message text",
        "stackTrace": "Stack trace if available",
        "logType": "Log|Warning|Error|Assert|Exception",
        "timestamp": "2025-06-21T10:00:00Z"
      }
    ],
    "count": 10,
    "totalCaptured": 10,
    "formattedLogs": [
      "📝 [2025-06-21T10:00:00Z] Log message text"
    ]
  }
}
```

### clear_logs
Clears the captured log buffer.

**Parameters:** None

**Example usage:**
```javascript
await callTool('clear_logs', {});
```

### refresh_assets
Triggers Unity to refresh its asset database, which can force recompilation of scripts.

**Parameters:** None

**Example usage:**
```javascript
const result = await callTool('refresh_assets', {});
console.log(result.isCompiling); // Check if Unity is compiling
```

**Response format:**
```json
{
  "status": "success",
  "result": {
    "message": "Asset refresh triggered",
    "isCompiling": false,
    "timestamp": "2025-06-21T10:00:00Z",
    "note": "Asset refresh complete. Unity is not currently compiling."
  }
}
```

## Implementation Details

- Unity captures up to 1000 logs in a circular buffer
- Logs are captured from the moment Unity starts
- The log capture runs automatically when the MCP package is loaded
- Stack traces are included for errors and exceptions
- Timestamps are in ISO 8601 format

## Use Cases

1. **Debugging**: Check Unity logs without switching to Unity Editor
2. **Error Monitoring**: Filter and monitor errors during development
3. **Automated Testing**: Verify expected log messages in tests
4. **Remote Debugging**: Access Unity logs when Unity is running on a different machine

## Notes

- The log reader requires Unity Editor with the MCP package version 0.2.1 or higher
- Unity must be recompiled after updating the package for new commands to be recognized
- Logs are stored in memory and cleared when Unity restarts