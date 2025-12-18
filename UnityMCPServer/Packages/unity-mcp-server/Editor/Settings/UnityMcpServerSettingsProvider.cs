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
        }[SettingsProvider]
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
