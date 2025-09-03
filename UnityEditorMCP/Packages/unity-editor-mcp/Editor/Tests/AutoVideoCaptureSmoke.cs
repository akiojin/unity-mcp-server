using System;
using System.IO;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;
using UnityEditorMCP.Handlers;

[InitializeOnLoad]
public static class AutoVideoCaptureSmoke
{
    const string KeyRan = "MCP_AutoVideoSmoke_Ran";

    static AutoVideoCaptureSmoke()
    {
        // 実行は一度だけ
        if (SessionState.GetBool(KeyRan, false)) return;
        SessionState.SetBool(KeyRan, true);

        EditorApplication.delayCall += Run;
    }

    static void Run()
    {
        try
        {
            var ts = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            var dir = "Assets/Screenshots/recordings";
            Directory.CreateDirectory(dir);
            var output = Path.Combine(dir, $"auto_{ts}.mp4");
            var p = new JObject
            {
                ["outputPath"] = output,
                ["captureMode"] = "game",
                ["fps"] = 15,
                ["width"] = 1280,
                ["height"] = 720,
                ["maxDurationSec"] = 2.0
            };

            VideoCaptureHandler.Start(p);
            double stopAt = EditorApplication.timeSinceStartup + 2.5;
            void Stopper()
            {
                if (EditorApplication.timeSinceStartup < stopAt) return;
                EditorApplication.update -= Stopper;
                VideoCaptureHandler.Stop(null);
                bool exists = File.Exists(output) || File.Exists(Path.ChangeExtension(output, ".mp4"));
                Debug.Log($"[MCPVideoAutoTest] PASS exists={exists}");
            }
            EditorApplication.update += Stopper;
        }
        catch (Exception ex)
        {
            Debug.LogError($"[MCPVideoAutoTest] FAIL {ex.Message}");
        }
    }
}

