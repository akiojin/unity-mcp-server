using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace UnityMCPServer.Settings
{
    internal static class UnityMcpServerSettingsProvider
    {
        private const string SettingsPath = "Project/Unity MCP Server";
        private const string ServerScriptPath = "Packages/unity-mcp-server/Editor/Core/UnityMCPServer.cs";

        [SettingsProvider]
        public static SettingsProvider CreateProvider()
        {
            return new SettingsProvider(SettingsPath, SettingsScope.Project)
            {
                label = "Unity MCP Server",
                guiHandler = _ => DrawGui(),
                keywords = new HashSet<string>(new[] { "Unity", "MCP", "Server", "TCP", "Host", "Port" })
            };
        }

        private static void DrawGui()
        {
            var settings = UnityMcpServerProjectSettings.instance;
            if (settings == null)
            {
                EditorGUILayout.HelpBox("Failed to load Unity MCP Server settings.", MessageType.Error);
                return;
            }

            var so = new SerializedObject(settings);
            so.Update();

            EditorGUILayout.LabelField("TCP Listener", EditorStyles.boldLabel);
            EditorGUILayout.PropertyField(so.FindProperty("unityHost"), new GUIContent("Host"));
            EditorGUILayout.PropertyField(so.FindProperty("port"), new GUIContent("Port"));

            EditorGUILayout.Space();

            using (new EditorGUI.DisabledScope(!so.hasModifiedProperties))
            {
                if (GUILayout.Button("Apply & Restart"))
                {
                    so.ApplyModifiedProperties();
                    settings.SaveProjectSettings(true);

                    UnityMCPServer.Core.UnityMCPServer.Restart();
                    TriggerReimport();
                }
            }
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
