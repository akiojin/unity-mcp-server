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
                
                // Use only monitored messages from current compilation
                var allMessages = new List<CompilationMessage>();
                allMessages.AddRange(lastCompilationMessages);
                // allMessages.AddRange(compilationLogMessages); // Disabled - causes stale errors
                
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
                // Use reflection to access Unity's console window entries
                var consoleWindowType = typeof(EditorWindow).Assembly.GetType("UnityEditor.ConsoleWindow");
                if (consoleWindowType != null)
                {
                    var getEntriesMethod = consoleWindowType.GetMethod("GetEntries", 
                        System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.NonPublic);
                    
                    if (getEntriesMethod != null)
                    {
                        // This is a simplified approach - Unity's internal API may vary
                        Debug.Log("[CompilationHandler] Attempting to read console buffer");
                    }
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
                // Read fresh compilation logs
                var logMessages = ReadCompilationLogFile();
                
                // Add to our collection without duplicates
                foreach (var msg in logMessages)
                {
                    if (!lastCompilationMessages.Any(existing => 
                        existing.file == msg.file && 
                        existing.line == msg.line && 
                        existing.message == msg.message))
                    {
                        lastCompilationMessages.Add(msg);
                    }
                }

                Debug.Log($"[CompilationHandler] Captured {lastCompilationMessages.Count} compilation messages");
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