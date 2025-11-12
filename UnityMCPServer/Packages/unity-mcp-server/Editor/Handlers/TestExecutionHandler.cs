using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using UnityEditor;
#if UNITY_INCLUDE_TESTS
using UnityEditor.TestTools.TestRunner.Api;
#endif
using UnityEngine;
using UnityEngine.SceneManagement;

namespace UnityMCPServer.Handlers
{
    /// <summary>
    /// Handles Unity Test Runner execution for automated testing via MCP
    /// Implements SPEC-e7c9b50c: Unity Test Execution Feature
    /// </summary>
    public static class TestExecutionHandler
    {
#if UNITY_INCLUDE_TESTS
        private static TestRunnerApi testRunnerApi;
        private static TestResultCollector currentCollector;
        private static bool isTestRunning;
        internal static Func<bool> DirtySceneDetector = DetectDirtyScenes;
        internal static Func<(bool success, string failureReason)> AutoSaveDirtyScenesExecutor = TryAutoSaveDirtyScenes;
        internal static Func<bool> PlayModeDetector = () => Application.isPlaying;
        private static readonly string DefaultResultsFolder = Path.GetFullPath(Path.Combine(Application.dataPath, "../.unity/test-results"));
        private const string DirtySceneErrorMessage = "There are unsaved scene changes. Please save or discard your changes before running tests.";
        private static string lastResultPath;
        private static JObject lastResultSummary;
        private static DateTime? lastResultTimestampUtc;

        /// <summary>
        /// Test result structure
        /// </summary>
        public class TestResultData
        {
            public string name;
            public string fullName;
            public string status;
            public double duration;
            public string message;
            public string stackTrace;
            public string output;
        }

        /// <summary>
        /// Execute Unity tests based on specified filters and modes.
        /// </summary>
        public static object RunTests(JObject parameters)
        {
            try
            {
                string testMode = parameters["testMode"]?.ToString() ?? "EditMode";
                string filter = parameters["filter"]?.ToString();
                string category = parameters["category"]?.ToString();
                string namespaceFilter = parameters["namespace"]?.ToString();
                bool includeDetails = parameters["includeDetails"]?.ToObject<bool>() ?? false;
                string exportPath = parameters["exportPath"]?.ToString();
                string resolvedExportPath = ResolveExportPath(exportPath, testMode);
                bool autoSaveScenes = parameters["autoSaveScenes"]?.ToObject<bool>() ?? false;

                if (testMode != "EditMode" && testMode != "PlayMode" && testMode != "All")
                {
                    return new { error = "Invalid testMode. Must be EditMode, PlayMode, or All" };
                }

                if (PlayModeDetector?.Invoke() ?? Application.isPlaying)
                {
                    return new { error = "Cannot run tests while Play Mode is active. Exit Play Mode before running tests." };
                }

                if (DirtySceneDetector())
                {
                    if (autoSaveScenes)
                    {
                        var autoSaveResult = AutoSaveDirtyScenesExecutor?.Invoke() ?? (false, "Auto-save handler unavailable");
                        if (!autoSaveResult.success)
                        {
                            return new { error = $"Failed to auto-save scenes: {autoSaveResult.failureReason ?? "Unknown error"}" };
                        }

                        if (DirtySceneDetector())
                        {
                            return new { error = DirtySceneErrorMessage };
                        }
                    }
                    else
                    {
                        return new { error = DirtySceneErrorMessage };
                    }
                }

                // Save current scene to avoid "Save Scene" dialog after tests
                var activeScene = UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene();
                if (activeScene.isDirty)
                {
                    if (!UnityEditor.SceneManagement.EditorSceneManager.SaveScene(activeScene))
                    {
                        Debug.LogWarning("[TestExecutionHandler] Failed to save scene before test execution. Scene save dialog may appear.");
                    }
                }

                // Cancel previous execution if running (no manual execution expected)
                if (isTestRunning && currentCollector != null && testRunnerApi != null)
                {
                    testRunnerApi.UnregisterCallbacks(currentCollector);
                    isTestRunning = false;
                }

                if (testRunnerApi == null)
                {
                    testRunnerApi = ScriptableObject.CreateInstance<TestRunnerApi>();
                }

                var filterSettings = new Filter
                {
                    testMode = ParseTestMode(testMode)
                };

                if (!string.IsNullOrEmpty(filter))
                {
                    filterSettings.testNames = new[] { filter };
                }

                if (!string.IsNullOrEmpty(category))
                {
                    filterSettings.categoryNames = new[] { category };
                }

                if (!string.IsNullOrEmpty(namespaceFilter))
                {
                    filterSettings.assemblyNames = new[] { namespaceFilter };
                }

                currentCollector = new TestResultCollector(resolvedExportPath, includeDetails, testMode);
                var collector = currentCollector;
                testRunnerApi.RegisterCallbacks(collector);

                isTestRunning = true;

                testRunnerApi.Execute(new ExecutionSettings(filterSettings));

                // Return immediately - test runs asynchronously
                return new
                {
                    status = "running",
                    message = "Test execution started. Use get_test_status to check progress."
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[TestExecutionHandler] Error running tests: {e.Message}\\n{e.StackTrace}");
                isTestRunning = false;
                return new { error = $"Failed to run tests: {e.Message}" };
            }
        }

        /// <summary>
        /// Get current test execution status and results
        /// </summary>
        public static object GetTestStatus(JObject parameters)
        {
            try
            {
                bool includeExportedResults = parameters?["includeTestResults"]?.ToObject<bool>() ?? false;
                bool includeFileContent = parameters?["includeFileContent"]?.ToObject<bool>() ?? false;

                if (isTestRunning)
                {
                    return new
                    {
                        status = "running",
                        message = "Test execution in progress"
                    };
                }

                if (currentCollector == null)
                {
                    return new
                    {
                        status = "idle",
                        message = "No test execution in progress or completed"
                    };
                }

                // Test execution completed - return results
                var collector = currentCollector;

                var completed = new Dictionary<string, object>
                {
                    ["status"] = "completed",
                    ["success"] = collector.FailedTests.Count == 0,
                    ["totalTests"] = collector.TotalTests,
                    ["passedTests"] = collector.PassedTests.Count,
                    ["failedTests"] = collector.FailedTests.Count,
                    ["skippedTests"] = collector.SkippedTests.Count,
                    ["inconclusiveTests"] = collector.InconclusiveTests.Count,
                    ["failures"] = collector.FailedTests.Select(t => new
                    {
                        testName = t.fullName,
                        message = t.message,
                        stackTrace = t.stackTrace
                    }).ToList(),
                    ["tests"] = collector.AllResults.Select(t => new
                    {
                        name = t.name,
                        fullName = t.fullName,
                        status = t.status,
                        duration = t.duration,
                        message = t.message,
                        output = t.output
                    }).ToList()
                };

                if (includeExportedResults)
                {
                    completed["latestResult"] = BuildLatestResult(includeFileContent);
                }

                return completed;
            }
            catch (Exception e)
            {
                Debug.LogError($"[TestExecutionHandler] Error getting test status: {e.Message}");
                return new { status = "error", error = $"Failed to get test status: {e.Message}" };
            }
        }

        /// <summary>
        /// Returns last exported test results (summary + optional file content)
        /// </summary>
        public static object GetLastTestResults(JObject parameters)
        {
            try
            {
                if (string.IsNullOrEmpty(lastResultPath) || !File.Exists(lastResultPath))
                {
                    return new
                    {
                        status = "missing",
                        message = "No exported test results are available yet. Run tests first."
                    };
                }

                bool includeFileContent = parameters?["includeFileContent"]?.ToObject<bool>() ?? true;
                string fileContent = includeFileContent ? File.ReadAllText(lastResultPath) : null;

                return new
                {
                    status = "available",
                    path = lastResultPath,
                    generatedAt = lastResultTimestampUtc?.ToString("o"),
                    summary = lastResultSummary ?? JObject.Parse(File.ReadAllText(lastResultPath)),
                    fileContent
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[TestExecutionHandler] Error reading exported test results: {e.Message}");
                return new { status = "error", error = $"Failed to read test results: {e.Message}" };
            }
        }

        private static TestMode ParseTestMode(string testMode)
        {
            switch (testMode)
            {
                case "EditMode":
                    return TestMode.EditMode;
                case "PlayMode":
                    return TestMode.PlayMode;
                case "All":
                    return TestMode.EditMode | TestMode.PlayMode;
                default:
                    return TestMode.EditMode;
            }
        }

        private static string ResolveExportPath(string exportPath, string testMode)
        {
            try
            {
                string projectRoot = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
                string targetPath = exportPath;

                if (string.IsNullOrEmpty(targetPath))
                {
                    Directory.CreateDirectory(DefaultResultsFolder);
                    var fileName = $"TestResults_{testMode}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.json";
                    targetPath = Path.Combine(DefaultResultsFolder, fileName);
                }
                else
                {
                    if (!Path.IsPathRooted(targetPath))
                    {
                        targetPath = Path.Combine(projectRoot, targetPath);
                    }

                    var directory = Path.GetDirectoryName(targetPath);
                    if (string.IsNullOrEmpty(directory))
                    {
                        directory = DefaultResultsFolder;
                        targetPath = Path.Combine(directory, targetPath);
                    }

                    Directory.CreateDirectory(directory);

                    if (string.IsNullOrEmpty(Path.GetExtension(targetPath)))
                    {
                        targetPath = targetPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + ".json";
                    }
                }

                return Path.GetFullPath(targetPath);
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[TestExecutionHandler] Failed to resolve export path '{exportPath}': {ex.Message}. Using default folder.");
                Directory.CreateDirectory(DefaultResultsFolder);
                var fallback = Path.Combine(DefaultResultsFolder, $"TestResults_{testMode}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.json");
                return Path.GetFullPath(fallback);
            }
        }

        private static (bool success, string failureReason) TryAutoSaveDirtyScenes()
        {
            try
            {
                var encounteredDirtyScene = false;
                for (int i = 0; i < SceneManager.sceneCount; i++)
                {
                    var scene = SceneManager.GetSceneAt(i);
                    if (!scene.IsValid() || !scene.isDirty)
                    {
                        continue;
                    }

                    encounteredDirtyScene = true;

                    if (string.IsNullOrEmpty(scene.path))
                    {
                        return (false, $"Scene '{scene.name}' has not been saved yet. Use Save As to assign a path before running tests.");
                    }

                    if (!UnityEditor.SceneManagement.EditorSceneManager.SaveScene(scene))
                    {
                        return (false, $"Failed to save scene '{scene.path}'");
                    }
                }

                return (true, encounteredDirtyScene ? null : "No dirty scenes detected");
            }
            catch (Exception ex)
            {
                return (false, ex.Message);
            }
        }

        private static bool DetectDirtyScenes()
        {
            for (int i = 0; i < SceneManager.sceneCount; i++)
            {
                var scene = SceneManager.GetSceneAt(i);
                if (scene.IsValid() && scene.isDirty)
                {
                    return true;
                }
            }

            return false;
        }

        internal static void ResetForTesting()
        {
            DirtySceneDetector = DetectDirtyScenes;
            AutoSaveDirtyScenesExecutor = TryAutoSaveDirtyScenes;
            PlayModeDetector = () => Application.isPlaying;
            lastResultPath = null;
            lastResultSummary = null;
            lastResultTimestampUtc = null;
        }

        internal static void OnResultsExported(string exportPath, JObject summary)
        {
            lastResultPath = exportPath;
            lastResultSummary = summary == null ? null : (JObject)summary.DeepClone();
            lastResultTimestampUtc = DateTime.UtcNow;
        }

        private static object BuildLatestResult(bool includeFileContent)
        {
            if (string.IsNullOrEmpty(lastResultPath) || !File.Exists(lastResultPath) || lastResultSummary == null)
            {
                return new
                {
                    status = "missing",
                    message = "No exported test results are available yet. Run tests first."
                };
            }

            string content = null;
            if (includeFileContent)
            {
                try
                {
                    content = File.ReadAllText(lastResultPath);
                }
                catch (Exception ex)
                {
                    Debug.LogWarning($"[TestExecutionHandler] Failed to read test results file '{lastResultPath}': {ex.Message}");
                }
            }

            return new
            {
                status = "available",
                path = lastResultPath,
                generatedAt = lastResultTimestampUtc?.ToString("o"),
                summary = lastResultSummary,
                fileContent = content
            };
        }

        private class TestResultCollector : ICallbacks
        {
            private readonly string exportPath;
            private readonly bool includeDetailsInFile;
            private readonly string testMode;
            private DateTime runStartedAtUtc;

            public TestResultCollector(string exportPath, bool includeDetailsInFile, string testMode)
            {
                this.exportPath = exportPath;
                this.includeDetailsInFile = includeDetailsInFile;
                this.testMode = testMode;
            }

            public int TotalTests { get; private set; }
            public List<TestResultData> PassedTests { get; } = new List<TestResultData>();
            public List<TestResultData> FailedTests { get; } = new List<TestResultData>();
            public List<TestResultData> SkippedTests { get; } = new List<TestResultData>();
            public List<TestResultData> InconclusiveTests { get; } = new List<TestResultData>();
            public List<TestResultData> AllResults { get; } = new List<TestResultData>();

            public void RunStarted(ITestAdaptor testsToRun)
            {
                runStartedAtUtc = DateTime.UtcNow;
                TotalTests = CountTests(testsToRun);
                Debug.Log($"[TestExecutionHandler] Starting test run with {TotalTests} tests");
            }

            public void RunFinished(ITestResultAdaptor result)
            {
                isTestRunning = false;
                Debug.Log($"[TestExecutionHandler] Test run finished. Passed: {PassedTests.Count}, Failed: {FailedTests.Count}");
                ExportResults(result);
            }

            public void TestStarted(ITestAdaptor test)
            {
                Debug.Log($"[TestExecutionHandler] Test started: {test.FullName}");
            }

            public void TestFinished(ITestResultAdaptor result)
            {
                Debug.Log($"[TestExecutionHandler] Test finished: {result.Test.FullName} [{result.TestStatus}]");

                var testResult = new TestResultData
                {
                    name = result.Test.Name,
                    fullName = result.Test.FullName,
                    status = result.TestStatus.ToString(),
                    duration = result.Duration,
                    message = result.Message,
                    stackTrace = result.StackTrace,
                    output = result.Output
                };

                AllResults.Add(testResult);

                switch (result.TestStatus)
                {
                    case TestStatus.Passed:
                        PassedTests.Add(testResult);
                        break;
                    case TestStatus.Failed:
                        FailedTests.Add(testResult);
                        break;
                    case TestStatus.Skipped:
                        SkippedTests.Add(testResult);
                        break;
                    case TestStatus.Inconclusive:
                        InconclusiveTests.Add(testResult);
                        break;
                }
            }

            private int CountTests(ITestAdaptor test)
            {
                if (!test.HasChildren)
                {
                    return test.IsSuite ? 0 : 1;
                }

                int count = 0;
                foreach (var child in test.Children)
                {
                    count += CountTests(child);
                }
                return count;
            }

            private void ExportResults(ITestResultAdaptor result)
            {
                if (string.IsNullOrEmpty(exportPath)) return;

                try
                {
                    var generatedAt = DateTime.UtcNow;
                    var summary = new JObject
                    {
                        ["generatedAt"] = generatedAt.ToString("o"),
                        ["runStartedAt"] = runStartedAtUtc.ToString("o"),
                        ["durationSeconds"] = result?.Duration ?? (generatedAt - runStartedAtUtc).TotalSeconds,
                        ["testMode"] = testMode,
                        ["totalTests"] = TotalTests,
                        ["passed"] = PassedTests.Count,
                        ["failed"] = FailedTests.Count,
                        ["skipped"] = SkippedTests.Count,
                        ["inconclusive"] = InconclusiveTests.Count,
                        ["status"] = FailedTests.Count == 0 ? "passed" : "failed"
                    };

                    var failures = FailedTests.Select(t => new JObject
                    {
                        ["name"] = t.name,
                        ["fullName"] = t.fullName,
                        ["message"] = t.message,
                        ["stackTrace"] = t.stackTrace
                    }).ToList();

                    summary["failures"] = new JArray(failures);

                    if (includeDetailsInFile)
                    {
                        summary["tests"] = JArray.FromObject(AllResults);
                    }

                    var directory = Path.GetDirectoryName(exportPath);
                    if (!string.IsNullOrEmpty(directory))
                    {
                        Directory.CreateDirectory(directory);
                    }
                    File.WriteAllText(exportPath, summary.ToString(Formatting.Indented));
                    TestExecutionHandler.OnResultsExported(exportPath, summary);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[TestExecutionHandler] Failed to export test results to '{exportPath}': {ex.Message}");
                }
            }
        }
#else
        /// <summary>
        /// Fallback when Unity Test Framework is unavailable.
        /// </summary>
        public static object RunTests(JObject parameters)
        {
            _ = parameters;
            return new
            {
                error = "Unity Test Framework (com.unity.test-framework) が有効ではありません。テストを実行するにはパッケージを導入し UNITY_INCLUDE_TESTS を定義してください。"
            };
        }

        public static object GetTestStatus(JObject parameters)
        {
            _ = parameters;
            return new
            {
                status = "error",
                error = "Unity Test Framework is not available in this project."
            };
        }

        public static object GetLastTestResults(JObject parameters)
        {
            _ = parameters;
            return new
            {
                status = "error",
                error = "Unity Test Framework is not available in this project."
            };
        }
#endif
    }
}
