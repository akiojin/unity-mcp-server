using System.Diagnostics;
using System.IO;
using System;
using UnityEditor;
using UnityEngine;

public class McpServerWindow : EditorWindow
{
    private bool useHttp;
    private bool telemetry;
    private int httpPort = 6401;
    private string status = "Stopped";
    private readonly System.Collections.Generic.List<(string level, string message)> logs = new();

    [MenuItem("MCP Server/Start Window")]
    public static void ShowWindow()
    {
        var window = GetWindow<McpServerWindow>(false, "MCP Server", true);
        window.minSize = new Vector2(360, 180);
        window.Show();
    }

    private void OnGUI()
    {
        scroll = EditorGUILayout.BeginScrollView(scroll);

        GUILayout.Label("Start/Stop", EditorStyles.boldLabel);
        if (EditorApplication.isPlaying)
        {
            EditorGUILayout.HelpBox("Play Mode中はサーバー起動を無効化しています", MessageType.Info);
            GUI.enabled = false;
        }
        useHttp = EditorGUILayout.Toggle("HTTP", useHttp);
        if (useHttp)
        {
            httpPort = EditorGUILayout.IntField("HTTP Port", httpPort);
        }
        telemetry = EditorGUILayout.Toggle("Telemetry", telemetry);

        GUILayout.Space(4);
        EditorGUILayout.LabelField("Status", status);

        GUILayout.Space(6);
        using (new EditorGUILayout.HorizontalScope())
        {
            if (GUILayout.Button("Start")) StartServer();
            if (GUILayout.Button("Stop")) StopServer();
        }

        GUI.enabled = true; // reset

        GUILayout.Space(10);
        GUILayout.Label("Samples", EditorStyles.boldLabel);
        var hasAddressables = Type.GetType("UnityEditor.AddressableAssets.AddressableAssetSettings, Unity.Addressables.Editor") != null;
        if (EditorApplication.isPlaying)
        {
            EditorGUILayout.HelpBox("Play Mode中はサンプル実行をスキップします", MessageType.Info);
            GUI.enabled = false;
        }
        using (new EditorGUILayout.HorizontalScope())
        {
            if (GUILayout.Button("Run Sample (Scene)")) SampleWorkflows.RunSceneSample();
            if (GUILayout.Button("Run Sample (Addressables)")) SampleWorkflows.RunAddressablesSample();
        }

        if (!hasAddressables)
        {
            EditorGUILayout.HelpBox("Addressables未導入のため、Addressablesサンプルはスキップされます", MessageType.Info);
        }

        GUI.enabled = true;

        GUILayout.Space(10);
        GUILayout.Label("Logs", EditorStyles.boldLabel);
        foreach (var (level, line) in logs)
        {
            var style = GUIStyles.Log;
            var color = level == "ERR" ? Color.red : Color.white;
            var prev = GUI.color;
            GUI.color = color;
            EditorGUILayout.LabelField(line, style);
            GUI.color = prev;
        }

        EditorGUILayout.EndScrollView();
    }

    private Process serverProcess;

    private void StartServer()
    {
        if (serverProcess != null && !serverProcess.HasExited)
        {
            status = "Already running";
            Repaint();
            return;
        }

        var psi = new ProcessStartInfo
        {
            FileName = "npx",
            Arguments = BuildArgs(),
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };

        serverProcess = Process.Start(psi);
        status = "Starting";
        serverProcess.OutputDataReceived += (_, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog("INFO", e.Data); };
        serverProcess.ErrorDataReceived += (_, e) => { if (!string.IsNullOrEmpty(e.Data)) AppendLog("ERR", e.Data); };
        serverProcess.EnableRaisingEvents = true;
        serverProcess.Exited += (_, __) => { status = "Stopped"; AppendLog("[MCP] process exited"); Repaint(); };
        serverProcess.BeginOutputReadLine();
        serverProcess.BeginErrorReadLine();
        Repaint();
    }

    private string BuildArgs()
    {
        var args = "@akiojin/unity-mcp-server";
        if (useHttp) args += $" --http {httpPort}";
        if (!telemetry) args += " --no-telemetry";
        return args;
    }

    private void StopServer()
    {
        if (serverProcess == null || serverProcess.HasExited)
        {
            status = "Stopped";
            Repaint();
            return;
        }

        try
        {
            serverProcess.Kill(true);
            serverProcess.Dispose();
        }
        catch { }
        finally
        {
            serverProcess = null;
            status = "Stopped";
            Repaint();
        }
    }

    private void AppendLog(string level, string line)
    {
        logs.Add((level, line));
        const int maxLines = 50;
        if (logs.Count > maxLines) logs.RemoveAt(0);
    }

    private void OnDisable()
    {
        StopServer();
    }
}
    private Vector2 scroll;
