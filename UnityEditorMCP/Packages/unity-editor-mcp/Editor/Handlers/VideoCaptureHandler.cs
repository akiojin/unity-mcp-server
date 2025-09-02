using System;
using System.IO;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;

namespace UnityEditorMCP.Handlers
{
    /// <summary>
    /// Minimal video capture handler skeleton.
    /// Phase 1: manage session state and paths without actual encoding.
    /// Later phases will integrate Unity Recorder / ffmpeg / PNG fallback.
    /// </summary>
    public static class VideoCaptureHandler
    {
        private static bool s_IsRecording;
        private static string s_RecordingId;
        private static string s_OutputPath;
        private static DateTime s_StartedAt;
        private static int s_Frames;
        private static string s_CaptureMode;
        private static int s_Fps;
        private static int s_Width;
        private static int s_Height;
        // PNG sequence fallback
        private static bool s_UsePngSequence;
        private static double s_LastCaptureTime;
        private static int s_FrameIndex;
        private static string s_OutputDir;
        private static string s_FilePattern; // e.g., frame_{0:D6}.png

        public static object Start(JObject parameters)
        {
            try
            {
                if (s_IsRecording)
                {
                    return new { error = "A recording session is already running.", recordingId = s_RecordingId };
                }

                s_CaptureMode = parameters["captureMode"]?.ToString() ?? "game";
                if (!IsValidCaptureMode(s_CaptureMode))
                {
                    return new { error = "Invalid capture mode. Must be 'game', 'scene', 'window', or 'explorer'" };
                }

                s_Width = parameters["width"]?.ToObject<int>() ?? 0;
                s_Height = parameters["height"]?.ToObject<int>() ?? 0;
                s_Fps = Math.Max(1, parameters["fps"]?.ToObject<int>() ?? 30);

                s_OutputPath = parameters["outputPath"]?.ToString();
                string format = parameters["format"]?.ToString() ?? "mp4";
                if (string.IsNullOrEmpty(s_OutputPath))
                {
                    string timestamp = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss");
                    s_OutputPath = $"Assets/Screenshots/recordings/recording_{s_CaptureMode}_{timestamp}.{format}";
                }

                // Fallback mode setup
                s_UsePngSequence = string.Equals(format, "png_sequence", StringComparison.OrdinalIgnoreCase);
                if (s_UsePngSequence)
                {
                    // Treat outputPath as directory; create default if points to a file
                    var ext = Path.GetExtension(s_OutputPath);
                    s_OutputDir = string.IsNullOrEmpty(ext) ? s_OutputPath : Path.GetDirectoryName(s_OutputPath);
                    if (string.IsNullOrEmpty(s_OutputDir))
                    {
                        s_OutputDir = "Assets/Screenshots/recordings";
                    }
                    EnsureDirectory(Path.Combine(s_OutputDir, "."));
                    s_FilePattern = "frame_{0:D6}.png";
                    s_FrameIndex = 0;
                    s_LastCaptureTime = EditorApplication.timeSinceStartup;
                    EditorApplication.update -= OnEditorUpdate;
                    EditorApplication.update += OnEditorUpdate;
                }
                else
                {
                    EnsureDirectory(s_OutputPath);
                }

                s_RecordingId = Guid.NewGuid().ToString("N");
                s_StartedAt = DateTime.UtcNow;
                s_Frames = 0;
                s_IsRecording = true;

                // Phase 1: no real capture yet.
                return new
                {
                    recordingId = s_RecordingId,
                    outputPath = s_UsePngSequence ? s_OutputDir : s_OutputPath,
                    captureMode = s_CaptureMode,
                    fps = s_Fps,
                    width = s_Width,
                    height = s_Height,
                    startedAt = s_StartedAt.ToString("o"),
                    note = s_UsePngSequence ? "Recording started (PNG sequence fallback)." : "Recording session started (skeleton). Encoding integration pending."
                };
            }
            catch (Exception ex)
            {
                Debug.LogError($"[VideoCaptureHandler] Start error: {ex.Message}");
                return new { error = $"Failed to start recording: {ex.Message}" };
            }
        }

        public static object Stop(JObject _)
        {
            try
            {
                if (!s_IsRecording)
                {
                    return new { error = "No active recording session." };
                }

                var id = s_RecordingId;
                var path = s_OutputPath;
                var started = s_StartedAt;
                var frames = s_Frames;
                var mode = s_CaptureMode;
                var fps = s_Fps;

                s_IsRecording = false;
                s_RecordingId = null;
                // detach update
                EditorApplication.update -= OnEditorUpdate;

                double duration = (DateTime.UtcNow - started).TotalSeconds;

                return new
                {
                    recordingId = id,
                    outputPath = s_UsePngSequence ? s_OutputDir : path,
                    captureMode = mode,
                    durationSec = Math.Max(0, duration),
                    frames = frames,
                    fps = fps,
                    note = s_UsePngSequence ? "Recording stopped. PNG sequence saved." : "Recording session stopped (skeleton). No file produced yet."
                };
            }
            catch (Exception ex)
            {
                Debug.LogError($"[VideoCaptureHandler] Stop error: {ex.Message}");
                return new { error = $"Failed to stop recording: {ex.Message}" };
            }
        }

        public static object Status(JObject _)
        {
            try
            {
                if (!s_IsRecording)
                {
                    return new { isRecording = false };
                }

                double elapsed = (DateTime.UtcNow - s_StartedAt).TotalSeconds;
                return new
                {
                    isRecording = true,
                    recordingId = s_RecordingId,
                    outputPath = s_UsePngSequence ? s_OutputDir : s_OutputPath,
                    captureMode = s_CaptureMode,
                    elapsedSec = Math.Max(0, elapsed),
                    frames = s_Frames,
                    fps = s_Fps
                };
            }
            catch (Exception ex)
            {
                Debug.LogError($"[VideoCaptureHandler] Status error: {ex.Message}");
                return new { error = $"Failed to get recording status: {ex.Message}" };
            }
        }

        private static bool IsValidCaptureMode(string mode)
        {
            return mode == "game" || mode == "scene" || mode == "window" || mode == "explorer";
        }

        private static void EnsureDirectory(string outputPath)
        {
            var dir = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
                UnityEditorMCP.Helpers.DebouncedAssetRefresh.Request();
            }
        }

        private static void OnEditorUpdate()
        {
            if (!s_IsRecording || !s_UsePngSequence) return;
            double now = EditorApplication.timeSinceStartup;
            double interval = 1.0 / Math.Max(1, s_Fps);
            if (now - s_LastCaptureTime + 1e-6 < interval) return;
            s_LastCaptureTime = now;

            try
            {
                string filename = string.Format(s_FilePattern, s_FrameIndex++);
                string path = Path.Combine(s_OutputDir, filename);
                ScreenCapture.CaptureScreenshot(path);
                s_Frames++;
            }
            catch (Exception ex)
            {
                Debug.LogError($"[VideoCaptureHandler] PNG sequence capture error: {ex.Message}");
            }
        }
    }
}
