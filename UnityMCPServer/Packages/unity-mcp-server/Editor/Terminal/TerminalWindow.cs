using System;
using UnityEditor;
using UnityEngine;

namespace UnityMCPServer.Editor.Terminal
{
    /// <summary>
    /// Terminal window for Unity Editor
    /// Implements CreateInstance pattern for multiple terminal windows
    /// </summary>
    public class TerminalWindow : EditorWindow
    {
        private TerminalSession _session;
        private string _sessionId;
        private string _initialWorkingDirectory;
        private string _initialShellType = "auto";
        private string _commandInput = "";
        private Vector2 _scrollPosition;
        private const int MAX_DISPLAY_LINES = 1000;

        // Delayed execution pattern for Enter key handling
        private string _pendingCommand = null;
        private bool _shouldClearInput = false;
        private bool _shouldRestoreFocus = false;

        // Live output update tracking
        private int _lastOutputCount = 0;

        /// <summary>
        /// Opens terminal at workspace root
        /// </summary>
        [MenuItem("Window/Unity MCP Server/Terminal (Workspace Root)")]
        public static void OpenAtWorkspaceRoot()
        {
            var window = CreateInstance<TerminalWindow>();
            window._initialWorkingDirectory = PathResolver.GetWorkspaceRoot();
            window.titleContent = new GUIContent("Terminal (workspace)");
            window.Show();
        }

        /// <summary>
        /// Opens terminal at project root
        /// </summary>
        [MenuItem("Window/Unity MCP Server/Terminal (Project Root)")]
        public static void OpenAtProjectRoot()
        {
            var window = CreateInstance<TerminalWindow>();
            window._initialWorkingDirectory = PathResolver.GetProjectRoot();
            window.titleContent = new GUIContent("Terminal (project)");
            window.Show();
        }

        private void OnEnable()
        {
            // Initialize session if not already created
            if (string.IsNullOrEmpty(_sessionId))
            {
                try
                {
                    // Use provided working directory or fallback to workspace root
                    if (string.IsNullOrEmpty(_initialWorkingDirectory))
                    {
                        _initialWorkingDirectory = PathResolver.GetWorkspaceRoot();
                    }

                    // Detect shell
                    var (shellType, shellPath) = ShellDetector.DetectShell(_initialShellType);

                    // Generate session ID
                    _sessionId = Guid.NewGuid().ToString();

                    // Create session
                    _session = TerminalSessionManager.CreateSession(_sessionId, _initialWorkingDirectory, shellType, shellPath);

                    Debug.Log($"[TerminalWindow] Created session {_sessionId} at {_initialWorkingDirectory}");
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[TerminalWindow] Failed to initialize terminal: {ex.Message}");
                    EditorUtility.DisplayDialog("Terminal Error", $"Failed to start terminal:\n{ex.Message}", "OK");
                    Close();
                }
            }

            // Register for editor updates to handle live output
            EditorApplication.update += OnEditorUpdate;
        }

        private void OnDestroy()
        {
            // Unregister editor updates
            EditorApplication.update -= OnEditorUpdate;

            // Close session when window is closed
            if (!string.IsNullOrEmpty(_sessionId))
            {
                try
                {
                    TerminalSessionManager.CloseSession(_sessionId);
                    Debug.Log($"[TerminalWindow] Closed session {_sessionId}");
                }
                catch (Exception ex)
                {
                    Debug.LogWarning($"[TerminalWindow] Error closing session: {ex.Message}");
                }
            }
        }

        private void OnEditorUpdate()
        {
            // Check if output has changed
            if (_session != null && _session.IsRunning)
            {
                int currentOutputCount = _session.OutputBuffer.GetLines(MAX_DISPLAY_LINES).Count;
                if (currentOutputCount != _lastOutputCount)
                {
                    _lastOutputCount = currentOutputCount;
                    Repaint();
                }
            }
        }

        private void OnGUI()
        {
            if (_session == null || !_session.IsRunning)
            {
                EditorGUILayout.HelpBox("Terminal session is not running.", MessageType.Warning);
                if (GUILayout.Button("Restart Terminal"))
                {
                    OnEnable();
                }
                return;
            }

            // Header with session info
            EditorGUILayout.BeginHorizontal(EditorStyles.toolbar);
            GUILayout.Label($"{_session.ShellType} | {_session.WorkingDirectory}", EditorStyles.miniLabel);
            GUILayout.FlexibleSpace();

            // Clear button
            if (GUILayout.Button("Clear", EditorStyles.toolbarButton, GUILayout.Width(60)))
            {
                _session.OutputBuffer.Clear();
            }

            EditorGUILayout.EndHorizontal();

            // Output area
            DrawOutputArea();

            // Command input area
            DrawCommandInput();
        }

        private void DrawOutputArea()
        {
            // Get output lines
            var lines = _session.OutputBuffer.GetLines(MAX_DISPLAY_LINES);

            // Build combined text from all lines
            var textBuilder = new System.Text.StringBuilder();
            foreach (var line in lines)
            {
                textBuilder.AppendLine(line.Text ?? "");
            }
            string outputText = textBuilder.ToString();

            // Create monospace text area style
            var textAreaStyle = new GUIStyle(EditorStyles.textArea)
            {
                font = GetMonospaceFont(),
                wordWrap = false,
                richText = false
            };

            // Calculate height for text area (approximate)
            float lineHeight = EditorGUIUtility.singleLineHeight;
            float textHeight = lines.Count * lineHeight;

            // Scroll view for output
            _scrollPosition = EditorGUILayout.BeginScrollView(_scrollPosition, GUILayout.ExpandHeight(true));

            // Draw text area with all output
            EditorGUILayout.SelectableLabel(outputText, textAreaStyle, GUILayout.Height(Mathf.Max(textHeight, position.height - 100)));

            EditorGUILayout.EndScrollView();
        }

        private void DrawCommandInput()
        {
            EditorGUILayout.BeginVertical();

            Event e = Event.current;

            // CRITICAL: Clear input field at Layout event BEFORE TextArea initializes its internal state
            // This is the only reliable way to prevent TextArea from inserting a newline
            if (_shouldClearInput && e.type == EventType.Layout)
            {
                Debug.Log($"[TerminalWindow] Clearing input at Layout, before='{_commandInput}'");
                _commandInput = "";
                _shouldClearInput = false;
                Debug.Log($"[TerminalWindow] Cleared input at Layout, after='{_commandInput}'");
            }

            // Handle Enter key at KeyDown event
            if (e.type == EventType.KeyDown &&
                e.keyCode == KeyCode.Return &&
                GUI.GetNameOfFocusedControl() == "CommandInput")
            {
                if (e.shift)
                {
                    // Shift+Enter: Manually insert newline
                    _commandInput += "\n";
                    _shouldRestoreFocus = true;
                    e.Use();
                    Repaint();
                }
                else if (!string.IsNullOrWhiteSpace(_commandInput))
                {
                    // Enter only: Execute command
                    Debug.Log($"[TerminalWindow] Enter pressed, setting _shouldClearInput=true, command='{_commandInput}'");
                    _pendingCommand = _commandInput;
                    _shouldClearInput = true;
                    _shouldRestoreFocus = true;

                    // Consume the event to prevent TextArea from processing it
                    e.Use();

                    // Trigger next frame to apply the clear
                    Repaint();
                }
            }

            // Execute pending command at Repaint event (after Layout has cleared the input)
            if (_pendingCommand != null && e.type == EventType.Repaint)
            {
                ExecuteCommand(_pendingCommand);
                _pendingCommand = null;

                // Scroll to bottom after command execution
                _scrollPosition.y = float.MaxValue;
            }

            // Command input area (multi-line)
            EditorGUILayout.BeginHorizontal();
            GUILayout.Label("$", GUILayout.Width(15));

            GUI.SetNextControlName("CommandInput");
            _commandInput = EditorGUILayout.TextArea(_commandInput,
                GUILayout.ExpandWidth(true),
                GUILayout.MinHeight(20),
                GUILayout.MaxHeight(100));

            EditorGUILayout.EndHorizontal();

            // Restore focus after everything is drawn (in Repaint event)
            // This must happen AFTER TextArea has been drawn and AFTER _commandInput has been cleared
            if (_shouldRestoreFocus && e.type == EventType.Repaint)
            {
                EditorGUI.FocusTextInControl("CommandInput");
                _shouldRestoreFocus = false;
            }

            EditorGUILayout.EndVertical();
        }

        private void ExecuteCommand(string command)
        {
            try
            {
                // Add command to output buffer (echo the input)
                _session.OutputBuffer.Add($"$ {command}", isError: false);

                // Execute the command
                _session.ExecuteCommand(command);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[TerminalWindow] Failed to execute command: {ex.Message}");
            }
        }

        private Font GetMonospaceFont()
        {
            // Try to load a monospace font
            var font = Font.CreateDynamicFontFromOSFont(new[] { "Consolas", "Monaco", "Courier New", "Courier" }, 12);
            return font ?? GUI.skin.font;
        }
    }
}
