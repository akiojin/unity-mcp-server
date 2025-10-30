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

        // Text selection
        private bool _isSelecting = false;
        private int _selectionStartLine = -1;
        private int _selectionEndLine = -1;
        private System.Collections.Generic.List<Rect> _lineRects = new System.Collections.Generic.List<Rect>();

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

            // Handle copy command (Ctrl+C or Cmd+C)
            HandleCopyCommand(lines);

            // Scroll view for output
            _scrollPosition = EditorGUILayout.BeginScrollView(_scrollPosition, GUILayout.ExpandHeight(true));

            // Clear line rects
            _lineRects.Clear();

            // Draw each line
            for (int i = 0; i < lines.Count; i++)
            {
                var line = lines[i];
                var style = new GUIStyle(GUI.skin.label)
                {
                    richText = false,
                    wordWrap = false,
                    font = GetMonospaceFont()
                };

                // Apply color based on isError or ansiColor
                if (line.IsError)
                {
                    style.normal.textColor = Color.red;
                }
                else
                {
                    style.normal.textColor = line.AnsiColor;
                }

                // Get rect for this line
                var rect = EditorGUILayout.GetControlRect(GUILayout.Height(EditorGUIUtility.singleLineHeight));
                _lineRects.Add(rect);

                // Draw selection highlight
                if (IsLineSelected(i))
                {
                    EditorGUI.DrawRect(rect, new Color(0.3f, 0.5f, 0.8f, 0.3f));
                }

                // Draw line text
                GUI.Label(rect, line.Text ?? "", style);
            }

            // Handle mouse selection
            HandleMouseSelection(lines.Count);

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

        private bool IsLineSelected(int lineIndex)
        {
            if (_selectionStartLine == -1 || _selectionEndLine == -1)
                return false;

            int minLine = Mathf.Min(_selectionStartLine, _selectionEndLine);
            int maxLine = Mathf.Max(_selectionStartLine, _selectionEndLine);

            return lineIndex >= minLine && lineIndex <= maxLine;
        }

        private void HandleMouseSelection(int totalLines)
        {
            Event e = Event.current;

            if (e.type == EventType.MouseDown && e.button == 0)
            {
                // Start selection
                int lineIndex = GetLineIndexFromMousePosition(e.mousePosition);
                if (lineIndex >= 0 && lineIndex < totalLines)
                {
                    _isSelecting = true;
                    _selectionStartLine = lineIndex;
                    _selectionEndLine = lineIndex;
                    e.Use();
                }
            }
            else if (e.type == EventType.MouseDrag && e.button == 0 && _isSelecting)
            {
                // Update selection
                int lineIndex = GetLineIndexFromMousePosition(e.mousePosition);
                if (lineIndex >= 0 && lineIndex < totalLines)
                {
                    _selectionEndLine = lineIndex;
                    e.Use();
                }
            }
            else if (e.type == EventType.MouseUp && e.button == 0)
            {
                // End selection
                _isSelecting = false;
            }
        }

        private int GetLineIndexFromMousePosition(Vector2 mousePosition)
        {
            for (int i = 0; i < _lineRects.Count; i++)
            {
                if (_lineRects[i].Contains(mousePosition))
                {
                    return i;
                }
            }
            return -1;
        }

        private void HandleCopyCommand(System.Collections.Generic.List<TerminalLine> lines)
        {
            Event e = Event.current;

            // Check for Ctrl+C (Windows/Linux) or Cmd+C (Mac)
            bool copyCommand = (e.type == EventType.KeyDown) &&
                               (e.keyCode == KeyCode.C) &&
                               (e.control || e.command);

            if (copyCommand && _selectionStartLine >= 0 && _selectionEndLine >= 0)
            {
                CopySelectedText(lines);
                e.Use();
            }
        }

        private void CopySelectedText(System.Collections.Generic.List<TerminalLine> lines)
        {
            if (_selectionStartLine == -1 || _selectionEndLine == -1)
                return;

            int minLine = Mathf.Min(_selectionStartLine, _selectionEndLine);
            int maxLine = Mathf.Max(_selectionStartLine, _selectionEndLine);

            var selectedText = new System.Text.StringBuilder();
            for (int i = minLine; i <= maxLine && i < lines.Count; i++)
            {
                if (i > minLine)
                    selectedText.AppendLine();
                selectedText.Append(lines[i].Text ?? "");
            }

            EditorGUIUtility.systemCopyBuffer = selectedText.ToString();
            Debug.Log($"[TerminalWindow] Copied {maxLine - minLine + 1} lines to clipboard");
        }
    }
}
