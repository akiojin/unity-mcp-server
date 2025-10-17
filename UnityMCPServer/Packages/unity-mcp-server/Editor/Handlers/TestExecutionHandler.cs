using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEditor.TestTools.TestRunner.Api;
using UnityEngine;
using Newtonsoft.Json.Linq;

namespace UnityMCPServer.Handlers
{
    /// <summary>
    /// Handles Unity Test Runner execution for automated testing via MCP
    /// Implements SPEC-e7c9b50c: Unity Test Execution Feature
    /// </summary>
    public static class TestExecutionHandler
    {
        private static TestRunnerApi testRunnerApi;
        private static TestResultCollector currentCollector;
        private static bool isTestRunning = false;

        /// <summary>
        /// Test result structure
        /// </summary>
        public class TestResultData
        {
            public string name;
            public string fullName;
            public string status; // Passed, Failed, Skipped, Inconclusive
            public double duration;
            public string message;
            public string stackTrace;
            public string output;
        }

        /// <summary>
        /// Execute Unity tests based on specified filters and modes
        /// FR-001, FR-002, FR-003, FR-004, FR-005
        /// </summary>
        public static object RunTests(JObject parameters)
        {
            try
            {
                // Parse parameters
                string testMode = parameters["testMode"]?.ToString() ?? "EditMode";
                string filter = parameters["filter"]?.ToString();
                string category = parameters["category"]?.ToString();
                string namespaceName = parameters["namespace"]?.ToString();
                bool includeDetails = parameters["includeDetails"]?.ToObject<bool>() ?? false;
                string exportPath = parameters["exportPath"]?.ToString();

                // Validate testMode
                if (testMode != "EditMode" && testMode != "PlayMode" && testMode != "All")
                {
                    return new { error = "Invalid testMode. Must be EditMode, PlayMode, or All" };
                }

                // Check if test is already running
                if (isTestRunning)
                {
                    return new { error = "Test execution is already in progress" };
                }

                // Initialize Test Runner API
                if (testRunnerApi == null)
                {
                    testRunnerApi = ScriptableObject.CreateInstance<TestRunnerApi>();
                }

                // Build test filter
                var filterSettings = new Filter
                {
                    testMode = ParseTestMode(testMode)
                };

                // Apply class name filter
                if (!string.IsNullOrEmpty(filter))
                {
                    filterSettings.testNames = new[] { filter };
                }

                // Apply category filter (requires Test Framework 1.1+)
                if (!string.IsNullOrEmpty(category))
                {
                    filterSettings.categoryNames = new[] { category };
                }

                // Create result collector
                currentCollector = new TestResultCollector();
                testRunnerApi.RegisterCallbacks(currentCollector);

                // Start test execution
                isTestRunning = true;
                var startTime = DateTime.Now;

                testRunnerApi.Execute(new ExecutionSettings(filterSettings));

                // Wait for test completion (synchronous for MCP)
                int timeout = 300; // 5 minutes max
                int elapsed = 0;
                while (isTestRunning && elapsed < timeout)
                {
                    System.Threading.Thread.Sleep(100);
                    elapsed++;
                }

                if (elapsed >= timeout)
                {
                    isTestRunning = false;
                    testRunnerApi.UnregisterCallbacks(currentCollector);
                    return new { error = "Test execution timed out after 5 minutes" };
                }

                var duration = (DateTime.Now - startTime).TotalSeconds;

                // Collect results
                var summary = new
                {
                    success = currentCollector.FailedTests.Count == 0,
                    totalTests = currentCollector.TotalTests,
                    passedTests = currentCollector.PassedTests.Count,
                    failedTests = currentCollector.FailedTests.Count,
                    skippedTests = currentCollector.SkippedTests.Count,
                    inconclusiveTests = currentCollector.InconclusiveTests.Count,
                    duration = Math.Round(duration, 2),
                    failures = currentCollector.FailedTests.Select(t => new
                    {
                        testName = t.fullName,
                        message = t.message,
                        stackTrace = t.stackTrace
                    }).ToList()
                };

                // Cleanup
                testRunnerApi.UnregisterCallbacks(currentCollector);
                currentCollector = null;

                // Return detailed results if requested
                if (includeDetails)
                {
                    return new
                    {
                        success = summary.success,
                        totalTests = summary.totalTests,
                        passedTests = summary.passedTests,
                        failedTests = summary.failedTests,
                        skippedTests = summary.skippedTests,
                        inconclusiveTests = summary.inconclusiveTests,
                        duration = summary.duration,
                        tests = currentCollector.AllResults.Select(t => new
                        {
                            name = t.name,
                            fullName = t.fullName,
                            status = t.status,
                            duration = t.duration,
                            message = t.message,
                            output = t.output
                        }).ToList(),
                        failures = summary.failures
                    };
                }

                // Export to XML if requested (FR-011, FR-012)
                if (!string.IsNullOrEmpty(exportPath))
                {
                    // TODO: Implement NUnit XML export
                    Debug.LogWarning("[TestExecutionHandler] XML export not yet implemented");
                }

                return summary;
            }
            catch (Exception e)
            {
                Debug.LogError($"[TestExecutionHandler] Error running tests: {e.Message}\n{e.StackTrace}");
                isTestRunning = false;
                return new { error = $"Failed to run tests: {e.Message}" };
            }
        }

        /// <summary>
        /// Parse test mode string to TestMode enum
        /// </summary>
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

        /// <summary>
        /// Test result collector that implements ICallbacks
        /// </summary>
        private class TestResultCollector : ICallbacks
        {
            public int TotalTests = 0;
            public List<TestResultData> PassedTests = new List<TestResultData>();
            public List<TestResultData> FailedTests = new List<TestResultData>();
            public List<TestResultData> SkippedTests = new List<TestResultData>();
            public List<TestResultData> InconclusiveTests = new List<TestResultData>();
            public List<TestResultData> AllResults = new List<TestResultData>();

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
                // Optional: track test start
            }

            public void TestFinished(ITestResultAdaptor result)
            {
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
                    return test.IsSuite ? 0 : 1;

                int count = 0;
                foreach (var child in test.Children)
                {
                    count += CountTests(child);
                }
                return count;
            }
        }
    }
}
