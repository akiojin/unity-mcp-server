using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;
using Newtonsoft.Json.Linq;

namespace UnityEditorMCP.Handlers
{
    /// <summary>
    /// Handles compilation monitoring and error detection for Unity Editor MCP
    /// </summary>
    public static class CompilationHandler
    {

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
                
                // 監視機構は廃止。現在のコンソールからのスナップショットのみを返す。
                var uniqueMessages = SnapshotConsoleMessages(maxMessages)
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
                    isMonitoring = false,
                    lastCompilationTime = (string)null,
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
        /// Helper method to capitalize first letter
        /// </summary>
        private static string CapitalizeFirst(string input)
        {
            if (string.IsNullOrEmpty(input))
                return input;
            
            return char.ToUpper(input[0]) + input.Substring(1).ToLower();
        }
    }
}
