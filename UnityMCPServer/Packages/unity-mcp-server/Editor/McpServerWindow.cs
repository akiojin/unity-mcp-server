using System.Diagnostics;
using System.IO;
using UnityEditor;
using UnityEngine;

public class McpServerWindow : EditorWindow
{
    private bool useHttp;
    private bool telemetry;
    private int httpPort = 6401;
    private string status = "Stopped";

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

        GUILayout.Space(10);
        GUILayout.Label("Samples", EditorStyles.boldLabel);
        using (new EditorGUILayout.HorizontalScope())
        {
            if (GUILayout.Button("Run Sample (Scene)")) SampleWorkflows.RunSceneSample();
            if (GUILayout.Button("Run Sample (Addressables)")) SampleWorkflows.RunAddressablesSample();
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
        serverProcess.OutputDataReceived += (_, e) => { if (!string.IsNullOrEmpty(e.Data)) UnityEngine.Debug.Log(e.Data); };
        serverProcess.ErrorDataReceived += (_, e) => { if (!string.IsNullOrEmpty(e.Data)) UnityEngine.Debug.LogError(e.Data); };
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
}
    private Vector2 scroll;
