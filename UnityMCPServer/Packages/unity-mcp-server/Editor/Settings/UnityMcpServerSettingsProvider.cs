using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

namespace UnityMCPServer.Settings
{
    internal class UnityMcpServerSettingsProvider : SettingsProvider
    {
        private const string SettingsPath = "Project/Unity MCP Server";
        private const string ServerScriptPath = "Packages/unity-mcp-server/Editor/Core/UnityMCPServer.cs";

        private SerializedObject _serializedSettings;

        public UnityMcpServerSettingsProvider(string path, SettingsScope scopes)
            : base(path, scopes) { }

        public override void OnActivate(string searchContext, VisualElement rootElement)
        {
            var settings = UnityMcpServerProjectSettings.instance;
            if (settings != null)
            {
                _serializedSettings = new SerializedObject(settings);
            }
        }

        public override void OnGUI(string searchContext)
        {
            if (_serializedSettings == null || _serializedSettings.targetObject == null)
            {
                EditorGUILayout.HelpBox("Failed to load Unity MCP Server settings.", MessageType.Error);
                return;
            }

            if (!_serializedSettings.hasModifiedProperties)
            {
                _serializedSettings.Update();
            }

            EditorGUILayout.LabelField("TCP Listener", EditorStyles.boldLabel);
            
            EditorGUILayout.PropertyField(_serializedSettings.FindProperty("unityHost"), new GUIContent("Host"));
            EditorGUILayout.LabelField("", "Node env: UNITY_MCP_UNITY_HOST", EditorStyles.miniLabel);
            
            EditorGUILayout.PropertyField(_serializedSettings.FindProperty("port"), new GUIContent("Port"));
            EditorGUILayout.LabelField("", "Node env: UNITY_MCP_PORT", EditorStyles.miniLabel);

            EditorGUILayout.Space();

            EditorGUILayout.HelpBox(
                "These settings control where Unity listens for MCP connections.\n" +
                "Node MCP server connects using UNITY_MCP_UNITY_HOST and UNITY_MCP_PORT.\n" +
                "Please ensure these environment variables match the settings above.",
                MessageType.Info);

            EditorGUILayout.Space();
            DrawNodeEnvironmentVariables();
            EditorGUILayout.Space();

            using (new EditorGUI.DisabledScope(!_serializedSettings.hasModifiedProperties))
            {
                if (GUILayout.Button("Apply & Restart"))
                {
                    _serializedSettings.ApplyModifiedProperties();

                    var settings = (UnityMcpServerProjectSettings)_serializedSettings.targetObject;
                    settings.SaveProjectSettings(true);

                    UnityMCPServer.Core.UnityMCPServer.Restart();
                    TriggerReimport();
                }
            }
        }

        private static void DrawNodeEnvironmentVariables()
        {
            EditorGUILayout.LabelField("Node Environment Variables (Reference)", EditorStyles.boldLabel);
            EditorGUILayout.HelpBox(
                "These environment variables configure the Node MCP server.\n" +
                "Set them in your shell or .env file before starting the server.",
                MessageType.None);
            
            EditorGUI.indentLevel++;
            
            // Connection
            EditorGUILayout.LabelField("Connection", EditorStyles.miniBoldLabel);
            DrawEnvVarRow("UNITY_MCP_UNITY_HOST", "Unity TCP host (default: localhost)");
            DrawEnvVarRow("UNITY_MCP_PORT", "Unity TCP port (default: 6400)");
            DrawEnvVarRow("UNITY_MCP_MCP_HOST", "MCP server bind host");
            
            EditorGUILayout.Space(4);
            
            // Logging & Diagnostics
            EditorGUILayout.LabelField("Logging", EditorStyles.miniBoldLabel);
            DrawEnvVarRow("UNITY_MCP_LOG_LEVEL", "debug|info|warn|error (default: info)");
            DrawEnvVarRow("UNITY_MCP_VERSION_MISMATCH", "warn|error|off (default: warn)");
            
            EditorGUILayout.Space(4);
            
            // HTTP Transport
            EditorGUILayout.LabelField("HTTP Transport", EditorStyles.miniBoldLabel);
            DrawEnvVarRow("UNITY_MCP_HTTP_ENABLED", "true|false (default: false)");
            DrawEnvVarRow("UNITY_MCP_HTTP_PORT", "HTTP port (default: 6401)");
            
            EditorGUILayout.Space(4);
            
            // Advanced
            EditorGUILayout.LabelField("Advanced", EditorStyles.miniBoldLabel);
            DrawEnvVarRow("UNITY_MCP_LSP_REQUEST_TIMEOUT_MS", "LSP timeout ms (default: 60000)");
            DrawEnvVarRow("UNITY_MCP_TELEMETRY_ENABLED", "true|false (default: false)");
            DrawEnvVarRow("UNITY_PROJECT_ROOT", "Unity project path (auto-detected)");
            
            EditorGUI.indentLevel--;
        }

        private static void DrawEnvVarRow(string varName, string description)
        {
            EditorGUILayout.BeginHorizontal();
            EditorGUILayout.SelectableLabel(varName, GUILayout.Width(280), GUILayout.Height(EditorGUIUtility.singleLineHeight));
            EditorGUILayout.LabelField(description, EditorStyles.miniLabel);
            EditorGUILayout.EndHorizontal();
        }

        [SettingsProvider]
        public static SettingsProvider CreateProvider()
        {
            return new UnityMcpServerSettingsProvider(SettingsPath, SettingsScope.Project)
            {
                label = "Unity MCP Server",
                keywords = new HashSet<string>(new[] { "Unity", "MCP", "Server", "TCP", "Host", "Port" })
            };
        }

        private static void TriggerReimport()
        {
            try
            {
                AssetDatabase.ImportAsset(ServerScriptPath, ImportAssetOptions.ForceUpdate);
            }
            catch
            {
                // best-effort
            }
        }
    }
}
