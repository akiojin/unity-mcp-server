using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEditor;
#if UNITY_INCLUDE_TESTS
using UnityEditor.TestTools.TestRunner.Api;
#endif
using UnityEngine;

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

                if (testMode != "EditMode" && testMode != "PlayMode" && testMode != "All")
                {
                    return new { error = "Invalid testMode. Must be EditMode, PlayMode, or All" };
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

                currentCollector = new TestResultCollector();
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

                return new
                {
                    status = "completed",
                    success = collector.FailedTests.Count == 0,
                    totalTests = collector.TotalTests,
                    passedTests = collector.PassedTests.Count,
                    failedTests = collector.FailedTests.Count,
                    skippedTests = collector.SkippedTests.Count,
                    inconclusiveTests = collector.InconclusiveTests.Count,
                    failures = collector.FailedTests.Select(t => new
                    {
                        testName = t.fullName,
                        message = t.message,
                        stackTrace = t.stackTrace
                    }).ToList(),
                    tests = collector.AllResults.Select(t => new
                    {
                        name = t.name,
                        fullName = t.fullName,
                        status = t.status,
                        duration = t.duration,
                        message = t.message,
                        output = t.output
                    }).ToList()
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[TestExecutionHandler] Error getting test status: {e.Message}");
                return new { status = "error", error = $"Failed to get test status: {e.Message}" };
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

        private class TestResultCollector : ICallbacks
        {
            public int TotalTests { get; private set; }
            public List<TestResultData> PassedTests { get; } = new List<TestResultData>();
            public List<TestResultData> FailedTests { get; } = new List<TestResultData>();
            public List<TestResultData> SkippedTests { get; } = new List<TestResultData>();
            public List<TestResultData> InconclusiveTests { get; } = new List<TestResultData>();
            public List<TestResultData> AllResults { get; } = new List<TestResultData>();

            public void RunStarted(ITestAdaptor testsToRun)
            {
                TotalTests = CountTests(testsToRun);
                Debug.Log($"[TestExecutionHandler] Starting test run with {TotalTests} tests");
            }

            public void RunFinished(ITestResultAdaptor result)
            {
                isTestRunning = false;
                Debug.Log($"[TestExecutionHandler] Test run finished. Passed: {PassedTests.Count}, Failed: {FailedTests.Count}");
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
#endif
    }
}
