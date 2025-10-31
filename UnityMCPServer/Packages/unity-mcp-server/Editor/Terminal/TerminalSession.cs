using System;
using System.Collections;
using System.Diagnostics;
using System.Text;
using UnityEngine;

namespace UnityMCPServer.Editor.Terminal
{
    /// <summary>
    /// Represents a single terminal session with a shell process
    /// Implements Process management strategy from research.md
    /// </summary>
    public class TerminalSession
    {
        /// <summary>
        /// Unique session identifier (GUID)
        /// </summary>
        public string SessionId { get; private set; }

        /// <summary>
        /// Working directory (absolute path)
        /// </summary>
        public string WorkingDirectory { get; private set; }

        /// <summary>
        /// Shell type (wsl/bash/zsh/pwsh/powershell/cmd)
        /// </summary>
        public string ShellType { get; private set; }

        /// <summary>
        /// Shell executable path (absolute)
        /// </summary>
        public string ShellPath { get; private set; }

        /// <summary>
        /// Output buffer for terminal lines
        /// </summary>
        public TerminalOutputBuffer OutputBuffer { get; private set; }

        /// <summary>
        /// True if process is running
        /// </summary>
        public bool IsRunning { get; private set; }

        /// <summary>
        /// Session creation timestamp (UTC)
        /// </summary>
        public DateTime CreatedAt { get; private set; }

        private Process _process;
        private readonly object _processLock = new object();

        /// <summary>
        /// Creates and starts a new terminal session
        /// </summary>
        /// <param name="sessionId">Unique session ID</param>
        /// <param name="workingDirectory">Initial working directory</param>
        /// <param name="shellType">Shell type</param>
        /// <param name="shellPath">Shell executable path</param>
        public TerminalSession(string sessionId, string workingDirectory, string shellType, string shellPath)
        {
            SessionId = sessionId;
            WorkingDirectory = workingDirectory;
            ShellType = shellType;
            ShellPath = shellPath;
            CreatedAt = DateTime.UtcNow;
            OutputBuffer = new TerminalOutputBuffer();

            StartProcess();
        }

        private void StartProcess()
        {
            try
            {
                // Use UTF-8 without BOM to avoid encoding issues
                var utf8WithoutBOM = new UTF8Encoding(false);

                var startInfo = new ProcessStartInfo
                {
                    FileName = ShellPath,
                    WorkingDirectory = WorkingDirectory,
                    UseShellExecute = false,
                    RedirectStandardInput = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true,
                    StandardOutputEncoding = utf8WithoutBOM,
                    StandardErrorEncoding = utf8WithoutBOM,
                    StandardInputEncoding = utf8WithoutBOM
                };

                // Copy all environment variables from Unity Editor
                startInfo.EnvironmentVariables.Clear();
                foreach (DictionaryEntry entry in Environment.GetEnvironmentVariables())
                {
                    string key = entry.Key.ToString();
                    string value = entry.Value.ToString();

                    if (startInfo.EnvironmentVariables.ContainsKey(key))
                    {
                        startInfo.EnvironmentVariables[key] = value;
                    }
                    else
                    {
                        startInfo.EnvironmentVariables.Add(key, value);
                    }
                }

                // Add terminal-specific environment variables
                startInfo.EnvironmentVariables["TERM"] = "xterm-256color";
                startInfo.EnvironmentVariables["UNITY_MCP_SESSION_ID"] = SessionId;

                // Set UTF-8 locale to prevent character encoding issues (for Unix shells)
                if (ShellType == "wsl" || ShellType == "bash" || ShellType == "zsh")
                {
                    // Force C.UTF-8 locale for WSL and Unix shells
                    startInfo.EnvironmentVariables["LANG"] = "C.UTF-8";
                    startInfo.EnvironmentVariables["LC_ALL"] = "C.UTF-8";
                    startInfo.EnvironmentVariables["LC_CTYPE"] = "C.UTF-8";
                }
                // PowerShell specific encoding settings
                else if (ShellType == "pwsh" || ShellType == "powershell")
                {
                    startInfo.EnvironmentVariables["POWERSHELL_TELEMETRY_OPTOUT"] = "1";
                }

                // Set shell-specific arguments
                if (ShellType == "wsl")
                {
                    // WSL: Use --cd option to set working directory
                    // WSL automatically converts Windows paths to WSL paths
                    startInfo.Arguments = $"--cd \"{WorkingDirectory}\"";
                    UnityEngine.Debug.Log($"[TerminalSession] Starting WSL with --cd \"{WorkingDirectory}\"");
                }
                else if (ShellType == "pwsh" || ShellType == "powershell")
                {
                    // PowerShell: NoLogo and NoProfile for cleaner output
                    startInfo.Arguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass";
                }

                _process = new Process { StartInfo = startInfo };

                // Setup output event handlers
                _process.OutputDataReceived += OnOutputDataReceived;
                _process.ErrorDataReceived += OnErrorDataReceived;

                _process.Start();
                _process.BeginOutputReadLine();
                _process.BeginErrorReadLine();

                // For WSL, set locale after start
                if (ShellType == "wsl")
                {
                    // Set UTF-8 locale
                    _process.StandardInput.Write("export LANG=C.UTF-8\n");
                    _process.StandardInput.Write("export LC_ALL=C.UTF-8\n");
                    _process.StandardInput.Write("export LC_CTYPE=C.UTF-8\n");
                    _process.StandardInput.Flush();
                }

                IsRunning = true;

                UnityEngine.Debug.Log($"[TerminalSession] Started session {SessionId} with {ShellType} in {WorkingDirectory}");
            }
            catch (Exception ex)
            {
                UnityEngine.Debug.LogError($"[TerminalSession] Failed to start session {SessionId}: {ex.Message}");
                IsRunning = false;
                throw;
            }
        }

        private void OnOutputDataReceived(object sender, DataReceivedEventArgs e)
        {
            if (e.Data != null)
            {
                // Parse ANSI codes and add to buffer
                var (text, color) = ANSIParser.Parse(e.Data);
                OutputBuffer.Add(text, isError: false, ansiColor: color);
            }
        }

        private void OnErrorDataReceived(object sender, DataReceivedEventArgs e)
        {
            if (e.Data != null)
            {
                // Parse ANSI codes and add to buffer
                var (text, color) = ANSIParser.Parse(e.Data);
                OutputBuffer.Add(text, isError: true, ansiColor: color);
            }
        }

        /// <summary>
        /// Executes a command in the terminal
        /// </summary>
        /// <param name="command">Command to execute</param>
        /// <exception cref="InvalidOperationException">Thrown if session is not running</exception>
        public void ExecuteCommand(string command)
        {
            lock (_processLock)
            {
                if (!IsRunning || _process == null || _process.HasExited)
                {
                    throw new InvalidOperationException($"Terminal session {SessionId} is not running");
                }

                try
                {
                    // Use Write with explicit \n to avoid platform-specific line endings (\r\n)
                    _process.StandardInput.Write(command + "\n");
                    _process.StandardInput.Flush();
                }
                catch (Exception ex)
                {
                    UnityEngine.Debug.LogError($"[TerminalSession] Failed to execute command in session {SessionId}: {ex.Message}");
                    throw;
                }
            }
        }

        /// <summary>
        /// Closes the terminal session and terminates the process
        /// </summary>
        public void Close()
        {
            lock (_processLock)
            {
                if (_process != null && !_process.HasExited)
                {
                    try
                    {
                        _process.Kill();
                        _process.WaitForExit(1000);
                    }
                    catch (Exception ex)
                    {
                        UnityEngine.Debug.LogWarning($"[TerminalSession] Error closing session {SessionId}: {ex.Message}");
                    }
                }

                if (_process != null)
                {
                    _process.OutputDataReceived -= OnOutputDataReceived;
                    _process.ErrorDataReceived -= OnErrorDataReceived;
                    _process.Dispose();
                    _process = null;
                }

                IsRunning = false;

                UnityEngine.Debug.Log($"[TerminalSession] Closed session {SessionId}");
            }
        }

        /// <summary>
        /// Checks if process has exited
        /// </summary>
        public bool HasExited
        {
            get
            {
                lock (_processLock)
                {
                    return _process == null || _process.HasExited;
                }
            }
        }
    }
}
