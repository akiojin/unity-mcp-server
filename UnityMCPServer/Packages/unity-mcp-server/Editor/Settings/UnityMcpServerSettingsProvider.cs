using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

namespace UnityMCPServer.Settings
{
    internal class UnityMcpServerSettingsProvider : SettingsProvider
    {
        private const string SettingsPath = "Project/Unity MCP Server";

        public UnityMcpServerSettingsProvider(string path, SettingsScope scopes)
            : base(path, scopes) { }

        public override void OnActivate(string searchContext, VisualElement rootElement)
        {
            // No-op: configuration is environment variable based.
        }

        public override void OnGUI(string searchContext)
        {
            EditorGUILayout.LabelField("Unity Listener (Environment Variables)", EditorStyles.boldLabel);
            EditorGUILayout.HelpBox(
                "Unity MCP Server reads environment variables at Unity startup.\n" +
                "Project Settings are ignored. Restart Unity to apply changes.",
                MessageType.Info);

            DrawEnvVarRow("UNITY_MCP_UNITY_HOST", "Bind/listen host (default: localhost)");
            DrawEnvVarRow("UNITY_MCP_PORT", "TCP port (default: 6400)");

            EditorGUILayout.Space();

            var hostRaw = Environment.GetEnvironmentVariable("UNITY_MCP_UNITY_HOST");
            var portRaw = Environment.GetEnvironmentVariable("UNITY_MCP_PORT");
            var resolvedHost = string.IsNullOrWhiteSpace(hostRaw) ? "localhost" : hostRaw.Trim();
            var resolvedPort = UnityMCPServer.Core.UnityMCPServer.DEFAULT_PORT;
            if (!string.IsNullOrWhiteSpace(portRaw) && int.TryParse(portRaw, out var parsed) && parsed > 0 && parsed < 65536)
            {
                resolvedPort = parsed;
            }

            EditorGUILayout.LabelField("Resolved (Unity process)", EditorStyles.boldLabel);
            EditorGUILayout.LabelField("Host", resolvedHost);
            EditorGUILayout.LabelField("Port", resolvedPort.ToString());

            EditorGUILayout.Space();
            DrawNodeEnvironmentVariables();

            EditorGUILayout.Space();
            if (GUILayout.Button("Restart Listener"))
            {
                UnityMCPServer.Core.UnityMCPServer.Restart();
            }
        }

        private static void DrawNodeEnvironmentVariables()
        {
            EditorGUILayout.LabelField("Node Environment Variables (Node process)", EditorStyles.boldLabel);
            EditorGUILayout.HelpBox(
                "These environment variables configure the Node MCP server.\n" +
                "Set them in your shell or .env file before starting the server.",
                MessageType.None);

            EditorGUI.indentLevel++;

            // Connection
            EditorGUILayout.LabelField("Connection", EditorStyles.miniBoldLabel);
            DrawEnvVarRow("UNITY_MCP_MCP_HOST", "Unity host for Node to connect (default: localhost)");
            DrawEnvVarRow("UNITY_MCP_PORT", "Unity TCP port (must match Unity)");

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
    }
}
