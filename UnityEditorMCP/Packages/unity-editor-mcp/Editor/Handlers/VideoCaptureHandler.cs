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
        // Recorder integration
        private static bool s_UseRecorder;
        private static object s_RecorderController; // UnityEditor.Recorder.RecorderController
        private static object s_RecorderControllerSettings; // UnityEditor.Recorder.RecorderControllerSettings
        private static object s_MovieRecorderSettings; // UnityEditor.Recorder.MovieRecorderSettings
        private static bool s_IncludeUI;
        private static double s_MaxDurationSec;
        private static bool s_AutoStopping;

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
                    return new { error = "Invalid capture mode. Must be 'game', 'scene', 'window', or 'explorer'", code = "E_INVALID_MODE" };
                }

                s_Width = parameters["width"]?.ToObject<int>() ?? 0;
                s_Height = parameters["height"]?.ToObject<int>() ?? 0;
                s_Fps = Math.Max(1, parameters["fps"]?.ToObject<int>() ?? 30);
                s_IncludeUI = parameters["includeUI"]?.ToObject<bool>() ?? true;
                s_MaxDurationSec = Math.Max(0, parameters["maxDurationSec"]?.ToObject<double>() ?? 0);

                s_OutputPath = parameters["outputPath"]?.ToString();
                string format = parameters["format"]?.ToString() ?? "mp4";
                if (!IsValidFormat(format))
                {
                    return new { error = "Invalid format. Use 'mp4', 'webm' or 'png_sequence'", code = "E_INVALID_FORMAT" };
                }
                if (string.IsNullOrEmpty(s_OutputPath))
                {
                    string timestamp = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss");
                    s_OutputPath = $"Assets/Screenshots/recordings/recording_{s_CaptureMode}_{timestamp}.{format}";
                }

                // Guard: dimensions
                if (s_Width < 0 || s_Height < 0)
                {
                    return new { error = "Width/Height must be >= 0", code = "E_INVALID_SIZE" };
                }

                // Ensure outputs land under Assets/
                if (!string.IsNullOrEmpty(s_OutputPath) && !s_OutputPath.Replace('\\','/').StartsWith("Assets/", StringComparison.OrdinalIgnoreCase))
                {
                    return new { error = "outputPath must be under Assets/", code = "E_PATH_DENIED" };
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
                    // Try Recorder for mp4/webm only in Game mode. Others fallback to PNG sequence for now.
                    s_UseRecorder = string.Equals(s_CaptureMode, "game", StringComparison.OrdinalIgnoreCase)
                        && TryStartRecorder(format, out string recorderNote);
                    if (!s_UseRecorder)
                    {
                        // fallback to PNG sequence even if format requested mp4/webm
                        s_UsePngSequence = true;
                        var ext = Path.GetExtension(s_OutputPath);
                        s_OutputDir = string.IsNullOrEmpty(ext) ? s_OutputPath : Path.GetDirectoryName(s_OutputPath);
                        if (string.IsNullOrEmpty(s_OutputDir)) s_OutputDir = "Assets/Screenshots/recordings";
                        EnsureDirectory(Path.Combine(s_OutputDir, "."));
                        s_FilePattern = "frame_{0:D6}.png";
                        s_FrameIndex = 0;
                        s_LastCaptureTime = EditorApplication.timeSinceStartup;
                        EditorApplication.update -= OnEditorUpdate;
                        EditorApplication.update += OnEditorUpdate;
                    }
                }

                s_RecordingId = Guid.NewGuid().ToString("N");
                s_StartedAt = DateTime.UtcNow;
                s_Frames = 0;
                s_IsRecording = true;

                // Start session
                return new
                {
                    recordingId = s_RecordingId,
                    outputPath = s_UsePngSequence ? s_OutputDir : s_OutputPath,
                    captureMode = s_CaptureMode,
                    fps = s_Fps,
                    width = s_Width,
                    height = s_Height,
                    startedAt = s_StartedAt.ToString("o"),
                    note = s_UseRecorder ? "Recording started (Recorder mp4/webm)." : (s_UsePngSequence ? "Recording started (PNG sequence fallback)." : "Recording session started.")
                };
            }
            catch (Exception ex)
            {
                Debug.LogError($"[VideoCaptureHandler] Start error: {ex.Message}");
                return new { error = $"Failed to start recording: {ex.Message}", code = "E_UNKNOWN" };
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
                // stop recorder if used
                if (s_UseRecorder && s_RecorderController != null)
                {
                    try
                    {
                        var ctrlType = s_RecorderController.GetType();
                        var stop = ctrlType.GetMethod("StopRecording");
                        stop?.Invoke(s_RecorderController, null);
                    }
                    catch (Exception e)
                    {
                        Debug.LogWarning($"[VideoCaptureHandler] Recorder stop warning: {e.Message}");
                    }
                }
                s_UseRecorder = false;
                s_AutoStopping = false;

                double duration = (DateTime.UtcNow - started).TotalSeconds;

                return new
                {
                    recordingId = id,
                    outputPath = s_UsePngSequence ? s_OutputDir : path,
                    captureMode = mode,
                    durationSec = Math.Max(0, duration),
                    frames = frames,
                    fps = fps,
                    note = s_UseRecorder ? "Recording stopped (Recorder)." : (s_UsePngSequence ? "Recording stopped. PNG sequence saved." : "Recording stopped.")
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

        private static bool IsValidFormat(string fmt)
        {
            if (string.IsNullOrEmpty(fmt)) return false;
            fmt = fmt.ToLowerInvariant();
            return fmt == "mp4" || fmt == "webm" || fmt == "png_sequence";
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
            if (!s_IsRecording) return;
            double now = EditorApplication.timeSinceStartup;
            double interval = 1.0 / Math.Max(1, s_Fps);
            if (now - s_LastCaptureTime + 1e-6 < interval) return;
            s_LastCaptureTime = now;

            if (s_UsePngSequence)
            {
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
            else if (s_UseRecorder)
            {
                // Just advance frame counter to reflect expected frame cadence
                s_Frames++;
            }

            // Auto stop by duration
            if (!s_AutoStopping && s_MaxDurationSec > 0)
            {
                double elapsed = (DateTime.UtcNow - s_StartedAt).TotalSeconds;
                if (elapsed >= s_MaxDurationSec)
                {
                    s_AutoStopping = true;
                    EditorApplication.delayCall += () => {
                        try { Stop(null); } catch { /* ignore */ }
                    };
                }
            }
        }

        private static bool TryStartRecorder(string format, out string note)
        {
            note = null;
            try
            {
                var ctrlType = FindType("UnityEditor.Recorder.RecorderController");
                var ctrlSettingsType = FindType("UnityEditor.Recorder.RecorderControllerSettings");
                var movieSettingsType = FindType("UnityEditor.Recorder.MovieRecorderSettings");
                var gameViewInputType = FindType("UnityEditor.Recorder.Input.GameViewInputSettings");
                if (ctrlType == null || ctrlSettingsType == null || movieSettingsType == null || gameViewInputType == null)
                {
                    note = "Recorder types not found";
                    return false;
                }

                // Create settings
                var controllerSettings = ScriptableObject.CreateInstance(ctrlSettingsType);
                s_RecorderControllerSettings = controllerSettings;
                s_RecorderController = Activator.CreateInstance(ctrlType, new object[] { controllerSettings });
                s_MovieRecorderSettings = ScriptableObject.CreateInstance(movieSettingsType);

                // movie settings properties
                TrySetProp(s_MovieRecorderSettings, "Enabled", true);
                TrySetProp(s_MovieRecorderSettings, "Name", "MCP_Recorder");
                // Output file path without extension; Recorder adds extension
                string outNoExt = s_OutputPath;
                try { if (Path.HasExtension(outNoExt)) outNoExt = Path.Combine(Path.GetDirectoryName(outNoExt) ?? "Assets", Path.GetFileNameWithoutExtension(outNoExt)); } catch {}
                TrySetProp(s_MovieRecorderSettings, "OutputFile", outNoExt);

                // Output format (best-effort)
                var fmtVal = TryGetEnumValue(movieSettingsType, "OutputFormat", format.Equals("webm", StringComparison.OrdinalIgnoreCase) ? "WebM" : "MP4");
                if (fmtVal != null) TrySetProp(s_MovieRecorderSettings, "OutputFormat", fmtVal);

                // Bitrate best-effort
                var bitrateKbps = Math.Max(1000, (int)(s_Fps * (s_Width > 0 ? s_Width : 1280) * 0.01));
                var bitrateEnum = TryGetEnumValue(movieSettingsType, "VideoBitRateMode", "High");
                if (bitrateEnum != null) TrySetProp(s_MovieRecorderSettings, "VideoBitRateMode", bitrateEnum);

                // Image input (GameView)
                var inputSettings = ScriptableObject.CreateInstance(gameViewInputType);
                TrySetProp(inputSettings, "OutputWidth", s_Width > 0 ? s_Width : 0);
                TrySetProp(inputSettings, "OutputHeight", s_Height > 0 ? s_Height : 0);
                TrySetProp(inputSettings, "IncludeUI", s_IncludeUI);
                TrySetProp(s_MovieRecorderSettings, "ImageInputSettings", inputSettings);

                // FPS
                TrySetProp(s_MovieRecorderSettings, "FrameRate", s_Fps);
                TrySetProp(s_MovieRecorderSettings, "CaptureEveryNthFrame", 1);

                // Audio (optional)
                var audioInputType = FindType("UnityEditor.Recorder.Input.AudioInputSettings");
                if (audioInputType != null)
                {
                    var audio = ScriptableObject.CreateInstance(audioInputType);
                    TrySetProp(audio, "PreserveAudio", true);
                    TrySetProp(s_MovieRecorderSettings, "AudioInputSettings", audio);
                }

                // Add to controller settings
                var addRec = ctrlSettingsType.GetMethod("AddRecorderSettings");
                addRec?.Invoke(controllerSettings, new object[] { s_MovieRecorderSettings });
                // Manual mode
                var setManual = ctrlSettingsType.GetMethod("SetRecordModeToManual");
                setManual?.Invoke(controllerSettings, null);

                // Prepare & start
                var prepare = ctrlType.GetMethod("PrepareRecording");
                var start = ctrlType.GetMethod("StartRecording");
                prepare?.Invoke(s_RecorderController, null);
                start?.Invoke(s_RecorderController, null);

                // Drive update for duration limit
                EditorApplication.update -= OnEditorUpdate;
                EditorApplication.update += OnEditorUpdate;

                return true;
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[VideoCaptureHandler] Recorder init failed: {ex.Message}");
                note = ex.Message;
                return false;
            }
        }

        private static Type FindType(string fullName)
        {
            foreach (var asm in AppDomain.CurrentDomain.GetAssemblies())
            {
                var t = asm.GetType(fullName, false);
                if (t != null) return t;
            }
            return null;
        }

        private static void TrySetProp(object target, string propName, object value)
        {
            if (target == null) return;
            var p = target.GetType().GetProperty(propName);
            if (p == null || !p.CanWrite) return;
            try
            {
                if (value != null && p.PropertyType.IsEnum && value is string s)
                {
                    var parsed = Enum.Parse(p.PropertyType, s, true);
                    p.SetValue(target, parsed);
                }
                else
                {
                    p.SetValue(target, value);
                }
            }
            catch { /* ignore */ }
        }

        private static object TryGetEnumValue(Type declaringType, string propertyName, string desiredName)
        {
            try
            {
                var p = declaringType.GetProperty(propertyName);
                if (p == null) return null;
                var enumType = p.PropertyType;
                if (!enumType.IsEnum) return null;
                foreach (var name in Enum.GetNames(enumType))
                {
                    if (string.Equals(name, desiredName, StringComparison.OrdinalIgnoreCase))
                    {
                        return Enum.Parse(enumType, name);
                    }
                }
            }
            catch { }
            return null;
        }
    }
}
