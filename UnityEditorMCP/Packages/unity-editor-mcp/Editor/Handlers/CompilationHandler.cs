using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEditor.Compilation;
using UnityEngine;
using Newtonsoft.Json.Linq;

namespace UnityEditorMCP.Handlers
{
    /// <summary>
    /// Handles compilation monitoring and error detection for Unity Editor MCP
    /// </summary>
    public static class CompilationHandler
    {
        private static List<CompilationMessage> lastCompilationMessages = new List<CompilationMessage>();
        private static bool isMonitoring = false;
        private static DateTime lastCompilationTime = DateTime.MinValue;

        /// <summary>
        /// Compilation message structure
        /// </summary>
        public class CompilationMessage
        {
            public string type;
            public string message;
            public string file;
            public int line;
            public int column;
            public string timestamp;
        }

        /// <summary>
        /// Start monitoring compilation events
        /// </summary>
        public static object StartCompilationMonitoring(JObject parameters)
        {
            try
            {
                if (!isMonitoring)
                {
                    // Subscribe to compilation events
                    CompilationPipeline.compilationStarted += OnCompilationStarted;
                    CompilationPipeline.compilationFinished += OnCompilationFinished;
                    CompilationPipeline.assemblyCompilationFinished += OnAssemblyCompilationFinished;
                    
                    isMonitoring = true;
                    Debug.Log("[CompilationHandler] Compilation monitoring started");
                }

                return new
                {
                    success = true,
                    isMonitoring = isMonitoring,
                    message = "Compilation monitoring activated"
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[CompilationHandler] Error starting compilation monitoring: {e.Message}");
                return new { error = $"Failed to start compilation monitoring: {e.Message}" };
            }
        }

        /// <summary>
        /// Stop monitoring compilation events
        /// </summary>
        public static object StopCompilationMonitoring(JObject parameters)
        {
            try
            {
                if (isMonitoring)
                {
                    // Unsubscribe from compilation events
                    CompilationPipeline.compilationStarted -= OnCompilationStarted;
                    CompilationPipeline.compilationFinished -= OnCompilationFinished;
                    CompilationPipeline.assemblyCompilationFinished -= OnAssemblyCompilationFinished;
                    
                    isMonitoring = false;
                    Debug.Log("[CompilationHandler] Compilation monitoring stopped");
                }

                return new
                {
                    success = true,
                    isMonitoring = isMonitoring,
                    message = "Compilation monitoring deactivated"
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[CompilationHandler] Error stopping compilation monitoring: {e.Message}");
                return new { error = $"Failed to stop compilation monitoring: {e.Message}" };
            }
        }

        /// <summary>
        /// Get current compilation state and recent errors
        /// </summary>
        public static object GetCompilationState(JObject parameters)
        {
            try
            {
                // Parse parameters
                bool includeMessages = parameters["includeMessages"]?.ToObject<bool>() ?? false;
                int maxMessages = parameters["maxMessages"]?.ToObject<int>() ?? 50;

                // Get current compilation state
                bool isCompiling = EditorApplication.isCompiling;
                bool isUpdating = EditorApplication.isUpdating;
                
                // NOTE: Disabled reading old log files to prevent reporting stale errors
                // Only use messages from CompilationPipeline events for accuracy
                // var compilationLogMessages = ReadCompilationLogFile();
                
                // Merge monitored messages and a snapshot of current console (errors/warnings only)
                var allMessages = new List<CompilationMessage>();
                allMessages.AddRange(lastCompilationMessages);
                var consoleSnapshot = SnapshotConsoleMessages(maxMessages);
                allMessages.AddRange(consoleSnapshot);
                
                // Remove duplicates and sort by timestamp
                var uniqueMessages = allMessages
                    .GroupBy(m => $"{m.file}:{m.line}:{m.message}")
                    .Select(g => g.First())
                    .OrderByDescending(m => DateTime.Parse(m.timestamp))
                    .Take(maxMessages)
                    .ToList();

                var result = new
                {
                    success = true,
                    isCompiling = isCompiling,
                    isUpdating = isUpdating,
                    isMonitoring = isMonitoring,
                    lastCompilationTime = lastCompilationTime.ToString("o"),
                    messageCount = uniqueMessages.Count,
                    errorCount = uniqueMessages.Count(m => m.type == "Error"),
                    warningCount = uniqueMessages.Count(m => m.type == "Warning")
                };

                if (includeMessages)
                {
                    return new
                    {
                        success = result.success,
                        isCompiling = result.isCompiling,
                        isUpdating = result.isUpdating,
                        isMonitoring = result.isMonitoring,
                        lastCompilationTime = result.lastCompilationTime,
                        messageCount = result.messageCount,
                        errorCount = result.errorCount,
                        warningCount = result.warningCount,
                        messages = uniqueMessages
                    };
                }

                return result;
            }
            catch (Exception e)
            {
                Debug.LogError($"[CompilationHandler] Error getting compilation state: {e.Message}");
                return new { error = $"Failed to get compilation state: {e.Message}" };
            }
        }

        /// <summary>
        /// Take a snapshot of current Unity console for Error/Warning logs and convert to CompilationMessage list.
        /// Uses existing ConsoleHandler.ReadConsole to avoid duplicated reflection logic.
        /// </summary>
        private static List<CompilationMessage> SnapshotConsoleMessages(int maxMessages)
        {
            var list = new List<CompilationMessage>();
            try
            {
                var p = new JObject
                {
                    ["count"] = Math.Max(maxMessages, 50), // capture reasonably large window
                    ["logTypes"] = new JArray("Error", "Warning"),
                    ["includeStackTrace"] = false,
                    ["format"] = "detailed",
                    ["sortOrder"] = "newest",
                    ["groupBy"] = "none"
                };

                var resultObj = ConsoleHandler.ReadConsole(p);
                var result = JObject.FromObject(resultObj);
                var logs = result["logs"] as JArray;
                if (logs != null)
                {
                    foreach (var l in logs)
                    {
                        var type = l["logType"]?.ToString();
                        if (type != "Error" && type != "Warning") continue;

                        list.Add(new CompilationMessage
                        {
                            type = type,
                            message = l["message"]?.ToString() ?? string.Empty,
                            file = l["file"]?.ToString(),
                            line = l["line"]?.ToObject<int?>() ?? 0,
                            column = 0,
                            timestamp = DateTime.Now.ToString("o")
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[CompilationHandler] SnapshotConsoleMessages failed: {ex.Message}");
            }
            return list;
        }

        /// <summary>
        /// Read Unity's compilation log file directly
        /// </summary>
        private static List<CompilationMessage> ReadCompilationLogFile()
        {
            var messages = new List<CompilationMessage>();
            
            try
            {
                // Unity stores compilation logs in different locations depending on version
                var logPaths = new[]
                {
                    Path.Combine(Application.dataPath, "..", "Library", "LastBuild.buildreport"),
                    Path.Combine(Application.dataPath, "..", "Library", "CompilationCompleted"),
                    Path.Combine(Application.dataPath, "..", "Temp", "CompilationLog.txt"),
                    // Editor log location (Mac)
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Personal), 
                                "Library/Logs/Unity/Editor.log"),
                    // Editor log location (Windows)
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
                                "Unity/Editor/Editor.log")
                };

                foreach (var logPath in logPaths)
                {
                    if (File.Exists(logPath))
                    {
                        try
                        {
                            var logContent = File.ReadAllText(logPath);
                            var parsedMessages = ParseCompilationErrors(logContent, logPath);
                            messages.AddRange(parsedMessages);
                        }
                        catch (Exception ex)
                        {
                            Debug.LogWarning($"[CompilationHandler] Could not read log file {logPath}: {ex.Message}");
                        }
                    }
                }

                // Also try to read from Unity Console log buffer
                var consoleMessages = ReadUnityConsoleBuffer();
                messages.AddRange(consoleMessages);
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[CompilationHandler] Error reading compilation logs: {ex.Message}");
            }

            return messages;
        }

        /// <summary>
        /// Parse compilation errors from log content
        /// </summary>
        private static List<CompilationMessage> ParseCompilationErrors(string logContent, string source)
        {
            var messages = new List<CompilationMessage>();
            
            // Regex patterns for different error formats
            var patterns = new[]
            {
                // Standard C# compiler errors: Assets/Scripts/MyScript.cs(10,15): error CS0103: ...
                @"(?<file>Assets[^(]+)\((?<line>\d+),(?<column>\d+)\):\s*(?<type>error|warning)\s+(?<code>\w+):\s*(?<message>.*)",
                // Unity console format: Assets/Scripts/MyScript.cs:10:15: error CS0103: ...
                @"(?<file>Assets[^:]+):(?<line>\d+):(?<column>\d+):\s*(?<type>error|warning)\s+(?<code>\w+):\s*(?<message>.*)",
                // Alternative format without column: Assets/Scripts/MyScript.cs(10): error: ...
                @"(?<file>Assets[^(]+)\((?<line>\d+)\):\s*(?<type>error|warning)[^:]*:\s*(?<message>.*)"
            };

            foreach (var pattern in patterns)
            {
                var regex = new Regex(pattern, RegexOptions.IgnoreCase | RegexOptions.Multiline);
                var matches = regex.Matches(logContent);

                foreach (Match match in matches)
                {
                    if (match.Success)
                    {
                        var message = new CompilationMessage
                        {
                            type = CapitalizeFirst(match.Groups["type"].Value),
                            message = match.Groups["message"].Value.Trim(),
                            file = match.Groups["file"].Value,
                            line = int.TryParse(match.Groups["line"].Value, out int line) ? line : 0,
                            column = int.TryParse(match.Groups["column"].Value, out int col) ? col : 0,
                            timestamp = DateTime.Now.ToString("o")
                        };

                        messages.Add(message);
                    }
                }
            }

            return messages;
        }

        /// <summary>
        /// Try to read Unity's internal console buffer
        /// </summary>
        private static List<CompilationMessage> ReadUnityConsoleBuffer()
        {
            var messages = new List<CompilationMessage>();

            try
            {
                // Reflect internal LogEntries API (same approach as ConsoleHandler)
                var editorAsm = typeof(EditorApplication).Assembly;
                var logEntriesType = editorAsm.GetType("UnityEditor.LogEntries");
                var logEntryType = editorAsm.GetType("UnityEditor.LogEntry");

                if (logEntriesType == null || logEntryType == null)
                {
                    Debug.LogWarning("[CompilationHandler] LogEntries/LogEntry types not found; skipping console read");
                    return messages;
                }

                var startGettingEntries = logEntriesType.GetMethod("StartGettingEntries", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
                var endGettingEntries = logEntriesType.GetMethod("EndGettingEntries", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
                var getCount = logEntriesType.GetMethod("GetCount", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
                var getEntryInternal = logEntriesType.GetMethod("GetEntryInternal", System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);

                var modeField = logEntryType.GetField("mode", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
                var messageField = logEntryType.GetField("message", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
                var fileField = logEntryType.GetField("file", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);
                var lineField = logEntryType.GetField("line", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic);

                if (startGettingEntries == null || endGettingEntries == null || getCount == null || getEntryInternal == null ||
                    modeField == null || messageField == null || fileField == null || lineField == null)
                {
                    Debug.LogWarning("[CompilationHandler] Console reflection incomplete; skipping console read");
                    return messages;
                }

                startGettingEntries.Invoke(null, null);
                try
                {
                    int total = (int)getCount.Invoke(null, null);
                    var entry = Activator.CreateInstance(logEntryType);

                    // Iterate newest → oldest (stop if too many collected to avoid large allocations)
                    for (int i = total - 1; i >= 0; i--)
                    {
                        getEntryInternal.Invoke(null, new object[] { i, entry });

                        int mode = (int)modeField.GetValue(entry);
                        string fullMessage = (string)messageField.GetValue(entry);
                        string file = (string)fileField.GetValue(entry);
                        int line = (int)lineField.GetValue(entry);

                        if (string.IsNullOrEmpty(fullMessage))
                            continue;

                        // Classify as Error/Warning/Other based on mode bits (aligned with ConsoleHandler)
                        bool isError = (mode & (1 << 0)) != 0   /* Error */
                                     || (mode & (1 << 4)) != 0   /* Fatal/Exception */
                                     || (mode & (1 << 9)) != 0   /* ScriptingError */
                                     || (mode & (1 << 18)) != 0; /* ScriptingException */

                        bool isWarning = (mode & (1 << 2)) != 0 /* Warning */
                                       || (mode & (1 << 10)) != 0; /* ScriptingWarning */

                        if (!isError && !isWarning)
                            continue;

                        // Use first line as the concise message
                        string concise = fullMessage.Split(new[] { '\\n', '\\r' }, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? fullMessage;

                        messages.Add(new CompilationMessage
                        {
                            type = isError ? "Error" : "Warning",
                            message = concise,
                            file = file,
                            line = line,
                            column = 0,
                            timestamp = DateTime.Now.ToString("o")
                        });
                    }
                }
                finally
                {
                    endGettingEntries.Invoke(null, null);
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[CompilationHandler] Could not access console buffer: {ex.Message}");
            }

            return messages;
        }

        /// <summary>
        /// Event handler for compilation started
        /// </summary>
        private static void OnCompilationStarted(object obj)
        {
            Debug.Log("[CompilationHandler] Compilation started");
            lastCompilationMessages.Clear();
        }

        /// <summary>
        /// Event handler for compilation finished
        /// </summary>
        private static void OnCompilationFinished(object obj)
        {
            lastCompilationTime = DateTime.Now;
            Debug.Log($"[CompilationHandler] Compilation finished at {lastCompilationTime:HH:mm:ss}");
            
            // Capture any compilation messages after a brief delay
            EditorApplication.delayCall += () => CaptureCompilationResults();
        }


        /// <summary>
        /// Event handler for assembly compilation finished
        /// </summary>
        private static void OnAssemblyCompilationFinished(string assemblyName, CompilerMessage[] messages)
        {
            Debug.Log($"[CompilationHandler] Assembly compilation finished: {assemblyName} ({messages.Length} messages)");
            
            // Convert CompilerMessage to our format
            foreach (var msg in messages)
            {
                var compilationMessage = new CompilationMessage
                {
                    type = msg.type == CompilerMessageType.Error ? "Error" : "Warning",
                    message = msg.message,
                    file = msg.file,
                    line = msg.line,
                    column = msg.column,
                    timestamp = DateTime.Now.ToString("o")
                };
                
                lastCompilationMessages.Add(compilationMessage);
            }
        }

        /// <summary>
        /// Capture compilation results after compilation finishes
        /// </summary>
        private static void CaptureCompilationResults()
        {
            try
            {
                // Avoid reading Editor/Temp log files to prevent stale errors from previous sessions.
                // We rely solely on CompilationPipeline.assemblyCompilationFinished events to populate messages.
                Debug.Log($"[CompilationHandler] Using assembly messages only (no log scan). Current messages: {lastCompilationMessages.Count}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[CompilationHandler] Error capturing compilation results: {ex.Message}");
            }
        }

        /// <summary>
        /// Helper method to capitalize first letter
        /// </summary>
        private static string CapitalizeFirst(string input)
        {
            if (string.IsNullOrEmpty(input))
                return input;
            
            return char.ToUpper(input[0]) + input.Substring(1).ToLower();
        }

        /// <summary>
        /// Initialize compilation monitoring on domain reload
        /// </summary>
        [InitializeOnLoadMethod]
        private static void Initialize()
        {
            // Auto-start monitoring when Unity loads
            EditorApplication.delayCall += () =>
            {
                if (!isMonitoring)
                {
                    StartCompilationMonitoring(new JObject());
                }
            };
        }
    }
}
