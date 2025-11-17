using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using Unity.Profiling;
using UnityEditor;
using UnityEditorInternal;
using UnityEngine;

namespace UnityMCPServer.Handlers
{
    /// <summary>
    /// Unity Profiler performance measurement handler.
    /// Manages profiling sessions, .data file saving, and real-time metrics.
    /// </summary>
    public static class ProfilerHandler
    {
        // Session state (static fields)
        private static bool s_IsRecording;
        private static string s_SessionId;
        private static DateTime s_StartedAt;
        private static string s_OutputPath;
        private static double s_MaxDurationSec;
        private static string s_Mode;
        private static bool s_RecordToFile;
        private static string[] s_Metrics;
        private static List<ProfilerRecorder> s_ProfilerRecorders;
        private static System.Action s_AutoStopCallback;

        /// <summary>
        /// Start profiling session.
        /// </summary>
        public static object Start(JObject parameters)
        {
            try
            {
                var mode = parameters["mode"]?.ToString() ?? "normal";
                var recordToFile = parameters["recordToFile"]?.ToObject<bool>() ?? true;
                var metricsCount = parameters["metrics"]?.ToObject<string[]>()?.Length ?? 0;
                var maxDurationSec = parameters["maxDurationSec"]?.ToObject<double>() ?? 0;

                Debug.Log($"[ProfilerHandler.Start] Starting profiling session: mode={mode}, recordToFile={recordToFile}, metrics={metricsCount}, maxDuration={maxDurationSec}s");

                // 1. Check if already recording
                if (s_IsRecording)
                {
                    return new
                    {
                        error = "A profiling session is already running.",
                        code = "E_ALREADY_RUNNING",
                        sessionId = s_SessionId
                    };
                }

                // 2. Parse parameters
                var metrics = parameters["metrics"]?.ToObject<string[]>();

                // 3. Validate mode
                if (mode != "normal" && mode != "deep")
                {
                    return new
                    {
                        error = "Invalid mode. Must be 'normal' or 'deep'.",
                        code = "E_INVALID_MODE"
                    };
                }

                // 4. Validate metrics (if specified)
                if (metrics != null && metrics.Length > 0)
                {
                    var availableHandles = ProfilerRecorderHandle.GetAvailable();
                    var availableNames = new HashSet<string>(
                        availableHandles.Select(h => h.Name)
                    );

                    var invalidMetrics = metrics.Where(m => !availableNames.Contains(m)).ToArray();
                    if (invalidMetrics.Length > 0)
                    {
                        return new
                        {
                            error = $"Invalid metrics: {string.Join(", ", invalidMetrics)}",
                            code = "E_INVALID_METRICS",
                            invalidMetrics
                        };
                    }
                }

                // 5. Generate session ID (GUID without hyphens)
                s_SessionId = Guid.NewGuid().ToString("N");

                // 6. Record start time
                s_StartedAt = DateTime.UtcNow;

                // 7. Generate output path if recordToFile=true
                if (recordToFile)
                {
                    var timestamp = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss");
                    var projectRoot = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
                    var workspaceRoot = ResolveWorkspaceRoot(projectRoot);
                    var captureDir = Path.Combine(workspaceRoot, ".unity", "capture");
                    s_OutputPath = Path.Combine(captureDir, $"profiler_{s_SessionId}_{timestamp}.data");
                    EnsureDirectory(s_OutputPath);
                }
                else
                {
                    s_OutputPath = null;
                }

                // 8. Enable Unity Profiler
                ProfilerDriver.enabled = true;

                // 9. Set deep profiling if mode="deep"
                ProfilerDriver.deepProfiling = (mode == "deep");

                // 10. Initialize ProfilerRecorders for specified metrics
                s_ProfilerRecorders = new List<ProfilerRecorder>();
                if (metrics != null && metrics.Length > 0)
                {
                    foreach (var metricName in metrics)
                    {
                        var recorder = ProfilerRecorder.StartNew(
                            ProfilerCategory.Internal,
                            metricName,
                            1,
                            ProfilerRecorderOptions.Default
                        );
                        s_ProfilerRecorders.Add(recorder);
                    }
                }

                // 11. Setup auto-stop if maxDurationSec > 0
                if (maxDurationSec > 0)
                {
                    s_MaxDurationSec = maxDurationSec;
                    s_AutoStopCallback = () =>
                    {
                        var elapsed = (DateTime.UtcNow - s_StartedAt).TotalSeconds;
                        if (elapsed >= s_MaxDurationSec)
                        {
                            Stop(new JObject());
                        }
                    };
                    EditorApplication.update += s_AutoStopCallback;
                }

                // 12. Save session state
                s_IsRecording = true;
                s_Mode = mode;
                s_RecordToFile = recordToFile;
                s_Metrics = metrics;

                Debug.Log($"[ProfilerHandler.Start] Profiling session started successfully: sessionId={s_SessionId}, outputPath={s_OutputPath}");

                // 13. Return response
                return new
                {
                    sessionId = s_SessionId,
                    startedAt = s_StartedAt.ToString("o"),
                    isRecording = true,
                    outputPath = s_OutputPath
                };
            }
            catch (Exception ex)
            {
                Debug.LogError($"[ProfilerHandler.Start] Exception: {ex}");
                return new
                {
                    error = $"Failed to start profiling: {ex.Message}",
                    code = "E_INTERNAL_ERROR"
                };
            }
        }

        /// <summary>
        /// Stop profiling session and save .data file.
        /// </summary>
        public static object Stop(JObject parameters)
        {
            try
            {
                Debug.Log($"[ProfilerHandler.Stop] Stopping profiling session: sessionId={s_SessionId ?? \"none\"}");

                // 1. Check if profiling is running
                if (!s_IsRecording)
                {
                    return new
                    {
                        error = "No profiling session is currently running.",
                        code = "E_NOT_RECORDING"
                    };
                }

                // 2. Validate sessionId if provided
                var requestedSessionId = parameters["sessionId"]?.ToString();
                if (!string.IsNullOrEmpty(requestedSessionId) && requestedSessionId != s_SessionId)
                {
                    return new
                    {
                        error = $"Invalid session ID. Current session: {s_SessionId}",
                        code = "E_INVALID_SESSION"
                    };
                }

                // 3. Calculate duration and frame count
                var duration = (DateTime.UtcNow - s_StartedAt).TotalSeconds;
                var frameCount = ProfilerDriver.lastFrameIndex - ProfilerDriver.firstFrameIndex;

                // 4. Collect metrics if recordToFile=false
                object metrics = null;
                if (!s_RecordToFile && s_ProfilerRecorders != null)
                {
                    var metricsList = new List<object>();
                    foreach (var recorder in s_ProfilerRecorders)
                    {
                        if (recorder.Valid && recorder.Count > 0)
                        {
                            var sample = recorder.LastValue;
                            metricsList.Add(new
                            {
                                name = recorder.Name,
                                value = sample,
                                unit = GetMetricUnit(recorder.Name)
                            });
                        }
                    }
                    metrics = metricsList.ToArray();
                }

                // 5. Save .data file if recordToFile=true
                string savedPath = s_OutputPath;
                if (s_RecordToFile && !string.IsNullOrEmpty(s_OutputPath))
                {
                    try
                    {
                        ProfilerDriver.SaveProfile(s_OutputPath);
                    }
                    catch (Exception ex)
                    {
                        Debug.LogError($"[ProfilerHandler.Stop] Failed to save .data file: {ex}");
                        return new
                        {
                            error = $"Failed to save profiler data: {ex.Message}",
                            code = "E_FILE_IO"
                        };
                    }
                }

                // 6. Disable ProfilerDriver
                ProfilerDriver.enabled = false;
                ProfilerDriver.deepProfiling = false;

                // 7. Remove auto-stop callback
                if (s_AutoStopCallback != null)
                {
                    EditorApplication.update -= s_AutoStopCallback;
                    s_AutoStopCallback = null;
                }

                // 8. Dispose all ProfilerRecorders
                if (s_ProfilerRecorders != null)
                {
                    foreach (var recorder in s_ProfilerRecorders)
                    {
                        recorder.Dispose();
                    }
                    s_ProfilerRecorders = null;
                }

                // 9. Clear session state
                var sessionId = s_SessionId;
                s_IsRecording = false;
                s_SessionId = null;
                s_StartedAt = DateTime.MinValue;
                s_OutputPath = null;
                s_MaxDurationSec = 0;
                s_Mode = null;
                s_RecordToFile = false;
                s_Metrics = null;

                Debug.Log($"[ProfilerHandler.Stop] Profiling session stopped successfully: sessionId={sessionId}, duration={duration:F2}s, frameCount={frameCount}");

                // 10. Return response
                return new
                {
                    sessionId,
                    outputPath = savedPath,
                    duration,
                    frameCount,
                    metrics
                };
            }
            catch (Exception ex)
            {
                Debug.LogError($"[ProfilerHandler.Stop] Exception: {ex}");
                return new
                {
                    error = $"Failed to stop profiling: {ex.Message}",
                    code = "E_INTERNAL_ERROR"
                };
            }
        }

        /// <summary>
        /// Get current profiling status.
        /// </summary>
        public static object GetStatus(JObject parameters)
        {
            try
            {
                if (!s_IsRecording)
                {
                    // Not recording
                    return new
                    {
                        isRecording = false,
                        sessionId = (string)null,
                        startedAt = (string)null,
                        elapsedSec = 0.0,
                        remainingSec = (double?)null
                    };
                }

                // Recording
                var elapsedSec = (DateTime.UtcNow - s_StartedAt).TotalSeconds;
                double? remainingSec = null;
                if (s_MaxDurationSec > 0)
                {
                    remainingSec = Math.Max(0, s_MaxDurationSec - elapsedSec);
                }

                return new
                {
                    isRecording = true,
                    sessionId = s_SessionId,
                    startedAt = s_StartedAt.ToString("o"),
                    elapsedSec,
                    remainingSec
                };
            }
            catch (Exception ex)
            {
                Debug.LogError($"[ProfilerHandler.GetStatus] Exception: {ex}");
                return new
                {
                    error = $"Failed to get status: {ex.Message}",
                    code = "E_INTERNAL_ERROR"
                };
            }
        }

        /// <summary>
        /// Get available profiler metrics or current values.
        /// </summary>
        public static object GetAvailableMetrics(JObject parameters)
        {
            try
            {
                var listAvailable = parameters["listAvailable"]?.ToObject<bool>() ?? false;
                var metrics = parameters["metrics"]?.ToObject<string[]>();

                if (listAvailable)
                {
                    // Return available metrics grouped by category
                    var availableHandles = ProfilerRecorderHandle.GetAvailable();
                    var categoriesDict = new Dictionary<string, List<string>>();

                    foreach (var handle in availableHandles)
                    {
                        var categoryName = handle.Category.ToString();
                        if (!categoriesDict.ContainsKey(categoryName))
                        {
                            categoriesDict[categoryName] = new List<string>();
                        }
                        categoriesDict[categoryName].Add(handle.Name);
                    }

                    // Convert to response format
                    var categories = new Dictionary<string, object>();
                    foreach (var kvp in categoriesDict)
                    {
                        categories[kvp.Key] = kvp.Value.ToArray();
                    }

                    return new { categories };
                }
                else
                {
                    // Return current metric values
                    List<ProfilerRecorder> tempRecorders = null;
                    try
                    {
                        tempRecorders = new List<ProfilerRecorder>();
                        var metricsToQuery = metrics ?? new string[0];

                        // If no specific metrics requested, get all available
                        if (metricsToQuery.Length == 0)
                        {
                            var availableHandles = ProfilerRecorderHandle.GetAvailable();
                            metricsToQuery = availableHandles.Select(h => h.Name).ToArray();
                        }

                        // Validate metrics
                        var availableNames = new HashSet<string>(
                            ProfilerRecorderHandle.GetAvailable().Select(h => h.Name)
                        );
                        var invalidMetrics = metricsToQuery.Where(m => !availableNames.Contains(m)).ToArray();
                        if (invalidMetrics.Length > 0)
                        {
                            return new
                            {
                                error = $"Invalid metrics: {string.Join(", ", invalidMetrics)}",
                                code = "E_INVALID_METRICS",
                                invalidMetrics
                            };
                        }

                        // Create temporary recorders and get values
                        var metricsList = new List<object>();
                        foreach (var metricName in metricsToQuery)
                        {
                            var recorder = ProfilerRecorder.StartNew(
                                ProfilerCategory.Internal,
                                metricName,
                                1
                            );
                            tempRecorders.Add(recorder);

                            if (recorder.Valid && recorder.Count > 0)
                            {
                                metricsList.Add(new
                                {
                                    name = metricName,
                                    value = recorder.LastValue,
                                    unit = GetMetricUnit(metricName)
                                });
                            }
                        }

                        return new { metrics = metricsList.ToArray() };
                    }
                    finally
                    {
                        // Dispose temporary recorders
                        if (tempRecorders != null)
                        {
                            foreach (var recorder in tempRecorders)
                            {
                                recorder.Dispose();
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[ProfilerHandler.GetAvailableMetrics] Exception: {ex}");
                return new
                {
                    error = $"Failed to get metrics: {ex.Message}",
                    code = "E_INTERNAL_ERROR"
                };
            }
        }

        /// <summary>
        /// Get metric unit based on metric name.
        /// </summary>
        private static string GetMetricUnit(string metricName)
        {
            if (metricName.Contains("Memory") || metricName.Contains("Bytes"))
                return "bytes";
            if (metricName.Contains("Count") || metricName.Contains("Calls"))
                return "count";
            if (metricName.Contains("Time") || metricName.Contains("ms"))
                return "milliseconds";
            if (metricName.Contains("Percent") || metricName.Contains("%"))
                return "percentage";
            return "count"; // Default
        }

        /// <summary>
        /// Resolve workspace root from project root.
        /// </summary>
        private static string ResolveWorkspaceRoot(string projectRoot)
        {
            // Check if .unity/config.json exists in parent directory
            var parentDir = Directory.GetParent(projectRoot);
            if (parentDir != null)
            {
                var configPath = Path.Combine(parentDir.FullName, ".unity", "config.json");
                if (File.Exists(configPath))
                {
                    return parentDir.FullName;
                }
            }

            // Fallback: use project root
            return projectRoot;
        }

        /// <summary>
        /// Ensure directory exists for the given file path.
        /// </summary>
        private static void EnsureDirectory(string filePath)
        {
            var dir = Path.GetDirectoryName(filePath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
        }
    }
}
