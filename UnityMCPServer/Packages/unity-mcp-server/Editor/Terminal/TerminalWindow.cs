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
        private bool _autoScroll = true;
        private const int MAX_DISPLAY_LINES = 1000;

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
        }

        private void OnDestroy()
        {
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

            // Auto-scroll toggle
            _autoScroll = GUILayout.Toggle(_autoScroll, "Auto-scroll", EditorStyles.toolbarButton, GUILayout.Width(100));

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

            // Auto-repaint for live output updates
            Repaint();
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

            // Auto-scroll to bottom
            if (_autoScroll && lines.Count > 0)
            {
                _scrollPosition.y = float.MaxValue;
            }
        }

        private void DrawCommandInput()
        {
            EditorGUILayout.BeginHorizontal();

            // Prompt
            GUILayout.Label("$", GUILayout.Width(15));

            // Command input field
            GUI.SetNextControlName("CommandInput");
            var newCommand = EditorGUILayout.TextField(_commandInput, GUILayout.ExpandWidth(true));

            // Handle Enter key
            if (Event.current.type == EventType.KeyDown && Event.current.keyCode == KeyCode.Return)
            {
                if (!string.IsNullOrWhiteSpace(_commandInput))
                {
                    ExecuteCommand(_commandInput);
                    _commandInput = "";
                    GUI.FocusControl("CommandInput");
                }
                Event.current.Use();
            }
            else
            {
                _commandInput = newCommand;
            }

            // Execute button
            if (GUILayout.Button("Run", GUILayout.Width(60)))
            {
                if (!string.IsNullOrWhiteSpace(_commandInput))
                {
                    ExecuteCommand(_commandInput);
                    _commandInput = "";
                    GUI.FocusControl("CommandInput");
                }
            }

            EditorGUILayout.EndHorizontal();
        }

        private void ExecuteCommand(string command)
        {
            try
            {
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
