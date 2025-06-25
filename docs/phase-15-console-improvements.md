# Phase 15: Console Improvements

## Overview
Enhance Unity console log reading capabilities with timestamp filtering, multiple output formats, advanced text filtering, and improved search functionality.

## Current State
- Basic log reading with type filtering
- Simple clear console functionality
- Enhanced logs with basic filtering
- No timestamp-based filtering
- Single output format
- Limited search capabilities

## Target Features

### 1. Timestamp Filtering
**Handler:** Enhanced `ConsoleHandler.cs` / `TimestampFilterToolHandler.js`

**Unity Operations:**
- `get_logs_since` - Get logs since specific timestamp
- `get_logs_between` - Get logs within time range
- `get_logs_recent` - Get logs from last N minutes/hours
- `get_log_timeline` - Get log distribution over time

**Implementation Notes:**
- Track log timestamps accurately
- Support multiple timestamp formats (UTC, local)
- Efficient time-based filtering
- Handle timezone conversions

### 2. Multiple Output Formats
**Handler:** Enhanced `ConsoleHandler.cs` / `OutputFormatToolHandler.js`

**Unity Operations:**
- `get_logs_plain` - Plain text format
- `get_logs_detailed` - Structured detailed format
- `get_logs_json` - JSON formatted output
- `get_logs_csv` - CSV format for analysis
- `get_logs_html` - HTML format with styling

**Implementation Notes:**
- Implement format converters
- Handle special characters and escaping
- Support custom formatting templates
- Optimize for different use cases

### 3. Advanced Text Filtering
**Handler:** `AdvancedLogFilterHandler.cs` / `AdvancedLogFilterToolHandler.js`

**Unity Operations:**
- `search_logs_regex` - Regular expression search
- `search_logs_fuzzy` - Fuzzy text matching
- `filter_logs_complex` - Multiple filter criteria
- `exclude_logs_pattern` - Exclude by pattern
- `group_logs_by_pattern` - Group similar messages

**Implementation Notes:**
- Use .NET Regex for pattern matching
- Implement fuzzy search algorithms
- Support boolean logic (AND, OR, NOT)
- Performance-optimized searching

### 4. Advanced Search and Indexing
**Handler:** `LogSearchHandler.cs` / `LogSearchToolHandler.js`

**Unity Operations:**
- `create_log_index` - Build searchable index
- `search_logs_indexed` - Fast indexed search
- `get_log_statistics` - Log analysis and stats
- `find_log_patterns` - Detect recurring patterns
- `get_error_summaries` - Summarize error types

**Implementation Notes:**
- Build inverted index for fast searching
- Use n-gram analysis for patterns
- Implement log categorization
- Statistical analysis of log data

### 5. Enhanced Stack Trace Handling
**Handler:** Enhanced existing handlers / `StackTraceToolHandler.js`

**Unity Operations:**
- `get_logs_with_stacktrace` - Include full stack traces
- `parse_stacktrace` - Parse stack trace elements
- `get_stacktrace_summary` - Summarized stack info
- `find_logs_by_stacktrace` - Search by stack trace patterns

**Implementation Notes:**
- Parse Unity stack trace format
- Extract file names, line numbers, methods
- Handle different stack trace formats
- Link to source code when possible

## MCP Server Tools

### 1. Timestamp Filtering Tools
```javascript
// TimestampFilterToolHandler.js
- get_logs_since_timestamp(timestamp, logTypes=[], maxCount=1000)
- get_logs_between_timestamps(startTime, endTime, logTypes=[])
- get_logs_recent(minutes=60, logTypes=[])
- get_log_timeline(timeRange="24h", bucketSize="1h")
```

### 2. Output Format Tools
```javascript
// OutputFormatToolHandler.js
- get_logs_formatted(format="detailed", filters={}, options={})
- export_logs(format="json", filePath, filters={})
- get_log_summary(format="plain", groupBy="type")
- format_single_log(logEntry, format="detailed")
```

### 3. Advanced Search Tools
```javascript
// AdvancedLogFilterToolHandler.js
- search_logs_regex(pattern, flags="i", logTypes=[], maxResults=100)
- search_logs_fuzzy(query, threshold=0.8, logTypes=[])
- filter_logs_advanced(filters={text, regex, exclude, timeRange})
- group_logs_by_similarity(threshold=0.9, minGroupSize=2)
```

### 4. Log Analysis Tools
```javascript
// LogSearchToolHandler.js
- analyze_log_patterns(timeRange="1h", minOccurrences=3)
- get_error_frequency(timeRange="24h", groupBy="message")
- get_log_statistics(timeRange="1h")
- detect_log_anomalies(baselineHours=24)
```

### 5. Stack Trace Tools
```javascript
// StackTraceToolHandler.js
- get_logs_with_stacktrace(logTypes=["Error", "Exception"], includeWarnings=false)
- parse_stacktrace_elements(stackTrace)
- find_common_stack_patterns(timeRange="1h")
- get_stacktrace_summary(logEntry)
```

## Implementation Priority

### Phase 15.1: Timestamp and Output Formats (Week 1)
- Implement timestamp-based filtering
- Add multiple output format support
- Enhance existing console handlers
- Performance optimization for time queries

### Phase 15.2: Advanced Search and Filtering (Week 2)
- Implement regex and fuzzy search
- Add complex filtering capabilities
- Create search indexing system
- Performance benchmarking

### Phase 15.3: Analysis and Stack Trace Enhancement (Week 3)
- Implement log pattern analysis
- Add statistical analysis features
- Enhance stack trace handling
- Integration testing and optimization

## Technical Considerations

### Performance Optimization
- Implement log indexing for fast searches
- Use streaming for large log sets
- Cache frequently accessed log ranges
- Optimize regex compilation

### Memory Management
- Limit log buffer size
- Implement log rotation
- Efficient string handling
- Garbage collection optimization

### Data Structures
- Circular buffer for recent logs
- Inverted index for search
- Time-based partitioning
- Compressed storage for old logs

### Error Handling
- Invalid regex patterns
- Timestamp parsing errors
- Memory overflow protection
- Search timeout handling

## Success Criteria
- [ ] Timestamp filtering with sub-second precision
- [ ] Multiple output formats working
- [ ] Advanced search under 100ms for typical queries
- [ ] Pattern analysis and anomaly detection
- [ ] Enhanced stack trace parsing
- [ ] Memory usage under 50MB for 10k logs
- [ ] Full test coverage
- [ ] Reference project feature parity

## Dependencies
- Enhanced logging infrastructure
- Search indexing system
- Time handling utilities
- Format conversion libraries

## Risks and Mitigations
- **Risk:** Memory usage with large log sets
  - **Mitigation:** Streaming and pagination
- **Risk:** Search performance degradation
  - **Mitigation:** Indexing and caching strategies
- **Risk:** Regex performance issues
  - **Mitigation:** Timeout and complexity limits
- **Risk:** Timestamp synchronization across systems
  - **Mitigation:** UTC standardization and validation