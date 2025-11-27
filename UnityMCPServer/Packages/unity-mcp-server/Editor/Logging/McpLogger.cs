using UnityEngine;

namespace UnityMCPServer.Logging
{
    /// <summary>
    /// Centralized logging utility for Unity MCP Server.
    /// All log messages are prefixed with [UnityMCPServer] for easy filtering.
    /// </summary>
    public static class McpLogger
    {
        private const string Prefix = "[UnityMCPServer]";

        public static void Log(string message)
        {
            Debug.Log($"{Prefix} {message}");
        }

        public static void Log(string category, string message)
        {
            Debug.Log($"{Prefix}[{category}] {message}");
        }

        public static void LogWarning(string message)
        {
            Debug.LogWarning($"{Prefix} {message}");
        }

        public static void LogWarning(string category, string message)
        {
            Debug.LogWarning($"{Prefix}[{category}] {message}");
        }

        public static void LogError(string message)
        {
            Debug.LogError($"{Prefix} {message}");
        }

        public static void LogError(string category, string message)
        {
            Debug.LogError($"{Prefix}[{category}] {message}");
        }

        public static void LogException(System.Exception ex)
        {
            Debug.LogError($"{Prefix} Exception: {ex.Message}\n{ex.StackTrace}");
        }

        public static void LogException(string category, System.Exception ex)
        {
            Debug.LogError($"{Prefix}[{category}] Exception: {ex.Message}\n{ex.StackTrace}");
        }
    }
}
