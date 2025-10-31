using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace UnityMCPServer.AI
{
    public class AIChatWindow : EditorWindow
    {
        private const int StreamingBatchPerFrame = 5;

        private AgentSessionManager _sessionManager;
        private IReadOnlyList<AgentDefinition> _agents;
        private AgentSession _activeSession;
        private Vector2 _scrollPosition;
        private string _inputBuffer = string.Empty;
        private int _selectedAgentIndex;
        private ActionRequestController _actionController;

        [MenuItem("Window/Unity MCP Server/AI Agent Window")]
        public static void ShowWindow()
        {
            var window = GetWindow<AIChatWindow>();
            window.titleContent = new GUIContent("AI Agent");
            window.minSize = new Vector2(420, 320);
            window.Initialize();
            window.Show();
        }

        public static void EnsureOpen()
        {
            if (HasOpenInstances<AIChatWindow>())
            {
                return;
            }

            ShowWindow();
        }

        public static void FocusSession(string sessionId)
        {
            var window = GetWindow<AIChatWindow>();
            window.Initialize();
            window._activeSession = window._sessionManager.TryGetSession(sessionId, out var session)
                ? session
                : window._activeSession;
            window.Repaint();
        }

        private void Initialize()
        {
            _sessionManager = AIEditorContext.SessionManager;
            _agents = AIEditorContext.Agents;
            _selectedAgentIndex = Mathf.Clamp(_selectedAgentIndex, 0, Mathf.Max(0, _agents.Count - 1));
            _actionController = new ActionRequestController(_sessionManager);
        }

        private void OnEnable()
        {
            Initialize();
            EditorApplication.update += OnEditorUpdate;
            AIEditorContext.StreamHandler.ChunkReceived += OnChunkReceived;
        }

        private void OnDisable()
        {
            EditorApplication.update -= OnEditorUpdate;
            AIEditorContext.StreamHandler.ChunkReceived -= OnChunkReceived;
        }

        private void OnEditorUpdate()
        {
            var buffer = AIEditorContext.StreamHandler.Buffer;
            if (!buffer.HasPending)
            {
                return;
            }

            var chunks = buffer.Dequeue(StreamingBatchPerFrame);
            foreach (var chunk in chunks)
            {
                _sessionManager.AddAgentMessage(chunk.SessionId, chunk.Text);
            }

            Repaint();
        }

        private void OnChunkReceived(StreamChunk chunk)
        {
            if (_activeSession != null && _activeSession.SessionId == chunk.SessionId)
            {
                Repaint();
            }
        }

        private void OnGUI()
        {
            if (_sessionManager == null)
            {
                Initialize();
            }

            using (new EditorGUILayout.HorizontalScope())
            {
                DrawSessionSidebar();
                DrawConversationPane();
            }
        }

        private void DrawSessionSidebar()
        {
            using (new GUILayout.VerticalScope(GUI.skin.box, GUILayout.Width(200)))
            {
                GUILayout.Label("Agents", EditorStyles.boldLabel);

                if (_agents.Count == 0)
                {
                    EditorGUILayout.HelpBox("No AI agents are configured.", MessageType.Warning);
                }
                else
                {
                    _selectedAgentIndex = EditorGUILayout.Popup("Agent", _selectedAgentIndex, _agents.Select(a => a.Id).ToArray());
                }

                GUILayout.Space(6);

                if (GUILayout.Button("Start Session"))
                {
                    CreateSession();
                }

                GUILayout.Space(12);
                GUILayout.Label("Sessions", EditorStyles.boldLabel);

                foreach (var session in _sessionManager.ListSessions())
                {
                    var isActive = _activeSession != null && _activeSession.SessionId == session.SessionId;
                    if (GUILayout.Toggle(isActive, session.Title, "Button"))
                    {
                        _activeSession = session;
                    }
                }
            }
        }

        private void DrawConversationPane()
        {
            using (new GUILayout.VerticalScope())
            {
                if (_activeSession == null)
                {
                    EditorGUILayout.HelpBox("Select or start a session to begin chatting.", MessageType.Info);
                    return;
                }

                GUILayout.Label(_activeSession.Title, EditorStyles.boldLabel);

                using (var scroll = new EditorGUILayout.ScrollViewScope(_scrollPosition))
                {
                    _scrollPosition = scroll.scrollPosition;

                    foreach (var message in _activeSession.Messages)
                    {
                        var style = message.Sender == "user" ? EditorStyles.wordWrappedLabel : EditorStyles.wordWrappedMiniLabel;
                        GUILayout.Label($"[{message.Sender}] {message.Content}", style);
                        GUILayout.Space(4);
                    }
                }

                GUILayout.Space(6);

                EditorGUILayout.LabelField("Message", EditorStyles.boldLabel);
                _inputBuffer = EditorGUILayout.TextArea(_inputBuffer, GUILayout.Height(60));

                using (new EditorGUILayout.HorizontalScope())
                {
                    GUILayout.FlexibleSpace();
                    using (new EditorGUI.DisabledGroupScope(string.IsNullOrWhiteSpace(_inputBuffer)))
                    {
                        if (GUILayout.Button("Send", GUILayout.Width(80)))
                        {
                            SendMessage();
                        }
                    }
                }

                GUILayout.Space(12);
                DrawActionList();
            }
        }

        private void CreateSession()
        {
            if (_agents.Count == 0)
            {
                return;
            }

            var agent = _agents[Mathf.Clamp(_selectedAgentIndex, 0, _agents.Count - 1)];
            var session = _sessionManager.CreateSession(agent, "workspace");
            _activeSession = session;
        }

        private void SendMessage()
        {
            var text = _inputBuffer.Trim();
            if (string.IsNullOrEmpty(text) || _activeSession == null)
            {
                return;
            }

            _sessionManager.AddUserMessage(_activeSession.SessionId, text);
            _inputBuffer = string.Empty;
        }

        private void DrawActionList()
        {
            GUILayout.Label("Pending Actions", EditorStyles.boldLabel);

            if (_activeSession.Actions.Count == 0)
            {
                EditorGUILayout.HelpBox("No actions pending approval.", MessageType.Info);
                return;
            }

            foreach (var action in _activeSession.Actions)
            {
                using (new GUILayout.VerticalScope(GUI.skin.box))
                {
                    GUILayout.Label($"Type: {action.Type}");
                    GUILayout.Label($"Status: {action.Status}");

                    using (new EditorGUILayout.HorizontalScope())
                    {
                        GUILayout.FlexibleSpace();
                        using (new EditorGUI.DisabledGroupScope(action.Status != ActionRequestStatus.Pending))
                        {
                            if (GUILayout.Button("Approve", GUILayout.Width(80)))
                            {
                                if (_actionController.Approve(_activeSession.SessionId, action.ActionId))
                                {
                                    Repaint();
                                }
                            }

                            if (GUILayout.Button("Reject", GUILayout.Width(80)))
                            {
                                if (_actionController.Reject(_activeSession.SessionId, action.ActionId))
                                {
                                    Repaint();
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
