using Newtonsoft.Json;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace UnityMCPServer.Helpers
{
    /// <summary>
    /// Helper class for creating standardized response messages
    /// </summary>
    public static class Response
    {
        /// <summary>
        /// Gets the package version from package.json
        /// </summary>
        /// <returns>Package version string</returns>
        private static string GetPackageVersion()
        {
            try
            {
                // Try multiple potential paths for package.json
                string[] possiblePaths = new string[]
                {
                    "Packages/com.unity.editor-mcp/package.json",
                    Path.Combine(Application.dataPath, "../Packages/com.unity.editor-mcp/package.json"),
                    Path.Combine(Application.dataPath, "../Library/PackageCache/com.unity.editor-mcp/package.json")
                };

                foreach (var path in possiblePaths)
                {
                    string fullPath = path;
                    if (!Path.IsPathRooted(path))
                    {
                        fullPath = Path.GetFullPath(path);
                    }

                    if (File.Exists(fullPath))
                    {
                        string jsonContent = File.ReadAllText(fullPath);
                        var packageInfo = JsonConvert.DeserializeObject<Dictionary<string, object>>(jsonContent);
                        if (packageInfo != null && packageInfo.ContainsKey("version"))
                        {
                            return packageInfo["version"].ToString();
                        }
                    }
                }

                // Fallback: try to get from assembly
                var assembly = System.Reflection.Assembly.GetExecutingAssembly();
                if (assembly != null)
                {
                    var location = assembly.Location;
                    if (!string.IsNullOrEmpty(location) && location.Contains("com.unity.editor-mcp"))
                    {
                        // Try to extract version from path if it contains version info
                        var match = System.Text.RegularExpressions.Regex.Match(location, @"com\.unity\.editor-mcp@([0-9]+\.[0-9]+\.[0-9]+)");
                        if (match.Success)
                        {
                            return match.Groups[1].Value;
                        }
                    }
                }
            }
            catch (System.Exception e)
            {
                Debug.LogWarning($"[UnityMCPServer] Failed to get package version: {e.Message}");
            }

            return "unknown";
        }

        /// <summary>
        /// Creates a success response with optional data
        /// </summary>
        /// <param name="data">Optional data to include in the response</param>
        /// <returns>JSON string of the response</returns>
        public static string Success(object data = null)
        {
            var response = new Dictionary<string, object>
            {
                ["status"] = "success",
                ["version"] = GetPackageVersion()
            };
            
            if (data != null)
            {
                response["data"] = data;
            }
            
            return JsonConvert.SerializeObject(response);
        }
        
        /// <summary>
        /// Creates a success response with command ID and optional data
        /// </summary>
        /// <param name="id">Command ID</param>
        /// <param name="data">Optional data to include in the response</param>
        /// <returns>JSON string of the response</returns>
        public static string Success(string id, object data = null)
        {
            var response = new Dictionary<string, object>
            {
                ["id"] = id,
                ["success"] = true,
                ["version"] = GetPackageVersion()
            };
            
            if (data != null)
            {
                response["data"] = data;
            }
            
            return JsonConvert.SerializeObject(response);
        }
        
        /// <summary>
        /// Creates an error response with message and optional error code
        /// </summary>
        /// <param name="message">Error message</param>
        /// <param name="code">Optional error code</param>
        /// <param name="details">Optional additional error details</param>
        /// <returns>JSON string of the response</returns>
        public static string Error(string message, string code = null, object details = null)
        {
            var response = new Dictionary<string, object>
            {
                ["status"] = "error",
                ["error"] = message
            };
            
            if (!string.IsNullOrEmpty(code))
            {
                response["code"] = code;
            }
            
            if (details != null)
            {
                response["details"] = details;
            }
            
            return JsonConvert.SerializeObject(response);
        }
        
        /// <summary>
        /// Creates an error response with command ID
        /// </summary>
        /// <param name="id">Command ID</param>
        /// <param name="message">Error message</param>
        /// <param name="code">Optional error code</param>
        /// <param name="details">Optional additional error details</param>
        /// <returns>JSON string of the response</returns>
        public static string Error(string id, string message, string code = null, object details = null)
        {
            var response = new Dictionary<string, object>
            {
                ["id"] = id,
                ["success"] = false,
                ["error"] = message
            };
            
            if (!string.IsNullOrEmpty(code))
            {
                response["code"] = code;
            }
            
            if (details != null)
            {
                response["details"] = details;
            }
            
            return JsonConvert.SerializeObject(response);
        }
        
        /// <summary>
        /// Creates a response for the ping command
        /// </summary>
        /// <returns>JSON string of the pong response</returns>
        public static string Pong()
        {
            return Success(new { 
                message = "pong", 
                timestamp = System.DateTime.UtcNow.ToString("o"),
                version = GetPackageVersion()
            });
        }
        
        // ===== New Format Methods (Phase 1.1) =====
        
        /// <summary>
        /// Gets the current editor state
        /// </summary>
        /// <returns>Dictionary containing editor state information</returns>
        private static Dictionary<string, object> GetCurrentEditorState()
        {
            return new Dictionary<string, object>
            {
                ["isPlaying"] = EditorApplication.isPlaying,
                ["isPaused"] = EditorApplication.isPaused,
                ["version"] = GetPackageVersion(),
                ["timestamp"] = System.DateTime.UtcNow.ToString("o")
            };
        }
        
        /// <summary>
        /// Creates a standardized success response (new format)
        /// </summary>
        /// <param name="result">The result data</param>
        /// <returns>JSON string of the response</returns>
        public static string SuccessResult(object result)
        {
            var response = new Dictionary<string, object>
            {
                ["status"] = "success",
                ["result"] = result,
                ["editorState"] = GetCurrentEditorState()
            };
            
            return JsonConvert.SerializeObject(response);
        }
        
        /// <summary>
        /// Creates a standardized success response with command ID (new format)
        /// </summary>
        /// <param name="id">Command ID</param>
        /// <param name="result">The result data</param>
        /// <returns>JSON string of the response</returns>
        public static string SuccessResult(string id, object result)
        {
            var response = new Dictionary<string, object>
            {
                ["id"] = id,
                ["status"] = "success",
                ["result"] = result,
                ["editorState"] = GetCurrentEditorState()
            };
            
            return JsonConvert.SerializeObject(response);
        }
        
        /// <summary>
        /// Creates a standardized error response (new format)
        /// </summary>
        /// <param name="errorMessage">Error message</param>
        /// <param name="code">Error code</param>
        /// <param name="details">Optional error details</param>
        /// <returns>JSON string of the response</returns>
        public static string ErrorResult(string errorMessage, string code = "UNKNOWN_ERROR", object details = null)
        {
            var response = new Dictionary<string, object>
            {
                ["status"] = "error",
                ["error"] = errorMessage,
                ["code"] = code
            };
            
            if (details != null)
            {
                response["details"] = details;
            }
            
            return JsonConvert.SerializeObject(response);
        }
        
        /// <summary>
        /// Creates a standardized error response with command ID (new format)
        /// </summary>
        /// <param name="id">Command ID</param>
        /// <param name="errorMessage">Error message</param>
        /// <param name="code">Error code</param>
        /// <param name="details">Optional error details</param>
        /// <returns>JSON string of the response</returns>
        public static string ErrorResult(string id, string errorMessage, string code = "UNKNOWN_ERROR", object details = null)
        {
            var response = new Dictionary<string, object>
            {
                ["id"] = id,
                ["status"] = "error",
                ["error"] = errorMessage,
                ["code"] = code
            };
            
            if (details != null)
            {
                response["details"] = details;
            }
            
            return JsonConvert.SerializeObject(response);
        }
    }
}