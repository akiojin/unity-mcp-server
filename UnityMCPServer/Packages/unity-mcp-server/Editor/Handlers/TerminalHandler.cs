using System;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityMCPServer.Editor.Terminal;

namespace UnityMCPServer.Handlers
{
    /// <summary>
    /// Handles Terminal-related operations
    /// Routes terminal_* commands to TerminalSessionManager
    /// Implements SPEC-3a7f2e8d: Terminal Integration
    /// </summary>
    public static class TerminalHandler
    {
        /// <summary>
        /// Opens a new terminal session
        /// Command: terminal_open
        /// </summary>
        public static object Open(JObject parameters)
        {
            try
            {
                // Get working directory type (required)
                var workingDirectory = parameters["workingDirectory"]?.ToString();
                if (string.IsNullOrEmpty(workingDirectory))
                {
                    return new { error = "workingDirectory parameter is required" };
                }

                // Validate working directory type
                if (workingDirectory != "workspace" && workingDirectory != "project")
                {
                    return new { error = $"Invalid workingDirectory: {workingDirectory}. Expected 'workspace' or 'project'" };
                }

                // Get shell type (optional, default: auto)
                var shell = parameters["shell"]?.ToString() ?? "auto";

                // Get optional title
                var title = parameters["title"]?.ToString();

                // Resolve working directory path
                string workingDirPath;
                try
                {
                    workingDirPath = PathResolver.ResolveWorkingDirectory(workingDirectory);
                }
                catch (ArgumentException ex)
                {
                    return new { error = ex.Message };
                }

                // Detect shell
                string shellType, shellPath;
                try
                {
                    (shellType, shellPath) = ShellDetector.DetectShell(shell);
                }
                catch (Exception ex)
                {
                    return new { error = $"SHELL_NOT_FOUND: {ex.Message}" };
                }

                // Generate session ID
                var sessionId = Guid.NewGuid().ToString();

                // Create terminal session
                try
                {
                    var session = TerminalSessionManager.CreateSession(sessionId, workingDirPath, shellType, shellPath);

                    return new
                    {
                        sessionId = session.SessionId,
                        shellType = session.ShellType,
                        shellPath = session.ShellPath,
                        workingDirectory = session.WorkingDirectory
                    };
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[TerminalHandler] Failed to create session: {ex.Message}");
                    return new { error = $"Failed to create terminal session: {ex.Message}" };
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[TerminalHandler] Open error: {ex}");
                return new { error = ex.Message };
            }
        }

        /// <summary>
        /// Executes a command in a terminal session
        /// Command: terminal_execute
        /// </summary>
        public static object Execute(JObject parameters)
        {
            try
            {
                // Get session ID (required)
                var sessionId = parameters["sessionId"]?.ToString();
                if (string.IsNullOrEmpty(sessionId))
                {
                    return new { error = "sessionId parameter is required" };
                }

                // Get command text (required)
                var commandText = parameters["commandText"]?.ToString();
                if (commandText == null)
                {
                    return new { error = "commandText parameter is required" };
                }

                // Get session
                var session = TerminalSessionManager.GetSession(sessionId);
                if (session == null)
                {
                    return new { error = $"SESSION_NOT_FOUND: Terminal session '{sessionId}' not found" };
                }

                // Check if session is running
                if (!session.IsRunning)
                {
                    return new { error = $"SESSION_CLOSED: Terminal session '{sessionId}' is already closed" };
                }

                // Execute command
                try
                {
                    session.ExecuteCommand(commandText);

                    return new
                    {
                        success = true,
                        message = "Command sent successfully"
                    };
                }
                catch (InvalidOperationException ex)
                {
                    return new { error = $"PROCESS_NOT_RUNNING: {ex.Message}" };
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[TerminalHandler] Execute error: {ex}");
                return new { error = ex.Message };
            }
        }

        /// <summary>
        /// Reads terminal output from a session
        /// Command: terminal_read
        /// </summary>
        public static object Read(JObject parameters)
        {
            try
            {
                // Get session ID (required)
                var sessionId = parameters["sessionId"]?.ToString();
                if (string.IsNullOrEmpty(sessionId))
                {
                    return new { error = "sessionId parameter is required" };
                }

                // Get max lines (optional, default: 100)
                var maxLines = parameters["maxLines"]?.ToObject<int>() ?? 100;

                // Validate maxLines
                if (maxLines > 1000)
                {
                    return new { error = $"MAX_LINES_EXCEEDED: maxLines {maxLines} exceeds maximum allowed (1000)" };
                }

                // Get session
                var session = TerminalSessionManager.GetSession(sessionId);
                if (session == null)
                {
                    return new { error = $"SESSION_NOT_FOUND: Terminal session '{sessionId}' not found" };
                }

                // Get output lines
                var lines = session.OutputBuffer.GetLines(maxLines);
                var hasMore = session.OutputBuffer.HasMore(maxLines);

                // Convert lines to JSON format
                var jsonLines = lines.Select(line => new
                {
                    text = line.Text,
                    isError = line.IsError,
                    timestamp = line.Timestamp.ToString("o") // ISO 8601 format
                }).ToArray();

                return new
                {
                    lines = jsonLines,
                    hasMore = hasMore
                };
            }
            catch (Exception ex)
            {
                Debug.LogError($"[TerminalHandler] Read error: {ex}");
                return new { error = ex.Message };
            }
        }

        /// <summary>
        /// Closes a terminal session
        /// Command: terminal_close
        /// </summary>
        public static object Close(JObject parameters)
        {
            try
            {
                // Get session ID (required)
                var sessionId = parameters["sessionId"]?.ToString();
                if (string.IsNullOrEmpty(sessionId))
                {
                    return new { error = "sessionId parameter is required" };
                }

                // Check if session exists
                var session = TerminalSessionManager.GetSession(sessionId);
                if (session == null)
                {
                    // Idempotent: treat as success
                    return new
                    {
                        success = true,
                        message = $"Terminal session '{sessionId}' not found (may already be closed)"
                    };
                }

                // Close session
                try
                {
                    TerminalSessionManager.CloseSession(sessionId);

                    return new
                    {
                        success = true,
                        message = "Session closed successfully"
                    };
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[TerminalHandler] Failed to close session: {ex.Message}");
                    return new { error = $"PROCESS_KILL_FAILED: Failed to terminate shell process: {ex.Message}" };
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[TerminalHandler] Close error: {ex}");
                return new { error = ex.Message };
            }
        }
    }
}
