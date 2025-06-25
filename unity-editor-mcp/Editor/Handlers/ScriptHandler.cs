using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEngine;
using UnityEditorMCP.Helpers;
using Newtonsoft.Json.Linq;

namespace UnityEditorMCP.Handlers
{
    /// <summary>
    /// Handles script management operations (CRUD) for C# scripts in Unity
    /// </summary>
    public static class ScriptHandler
    {
        /// <summary>
        /// Creates a new C# script file
        /// </summary>
        public static object CreateScript(JObject parameters)
        {
            try
            {
                // Extract parameters
                string scriptName = parameters["scriptName"]?.ToString();
                string scriptType = parameters["scriptType"]?.ToString() ?? "MonoBehaviour";
                string path = parameters["path"]?.ToString() ?? "Assets/Scripts/";
                string namespaceName = parameters["namespace"]?.ToString() ?? "";
                string scriptContent = parameters["scriptContent"]?.ToString();

                // Validate required parameters
                if (string.IsNullOrEmpty(scriptName))
                {
                    return Response.Error("scriptName parameter is required");
                }

                // Validate script name format
                if (!Regex.IsMatch(scriptName, @"^[A-Za-z_][A-Za-z0-9_]*$"))
                {
                    return Response.Error($"Invalid script name format: {scriptName}. Must be a valid C# class name.");
                }

                // Normalize path
                path = NormalizePath(path);
                string fullDirectory = Path.Combine(Application.dataPath, 
                    path.StartsWith("Assets/") ? path.Substring(7) : path);
                string fileName = $"{scriptName}.cs";
                string fullPath = Path.Combine(fullDirectory, fileName);
                string relativePath = Path.Combine(path, fileName).Replace('\\', '/');

                // Check if script already exists
                if (File.Exists(fullPath))
                {
                    return Response.Error($"Script already exists at {relativePath}");
                }

                // Ensure directory exists
                Directory.CreateDirectory(fullDirectory);

                // Generate script content if not provided
                if (string.IsNullOrEmpty(scriptContent))
                {
                    scriptContent = GenerateScriptTemplate(scriptName, scriptType, namespaceName);
                }

                // Create the script file
                File.WriteAllText(fullPath, scriptContent);
                AssetDatabase.ImportAsset(relativePath);
                AssetDatabase.Refresh();

                return Response.Success($"Script '{scriptName}.cs' created successfully", new
                {
                    scriptPath = relativePath,
                    message = "Script created successfully"
                });
            }
            catch (Exception ex)
            {
                return Response.Error($"Failed to create script: {ex.Message}");
            }
        }

        /// <summary>
        /// Reads the contents of an existing C# script file
        /// </summary>
        public static object ReadScript(JObject parameters)
        {
            try
            {
                string scriptPath = parameters["scriptPath"]?.ToString();
                string scriptName = parameters["scriptName"]?.ToString();
                string searchPath = parameters["searchPath"]?.ToString() ?? "Assets/";
                bool includeMetadata = parameters["includeMetadata"]?.ToObject<bool>() ?? true;

                string fullPath;
                string relativePath;

                if (!string.IsNullOrEmpty(scriptPath))
                {
                    // Read by path
                    relativePath = scriptPath;
                    fullPath = Path.Combine(Application.dataPath, "../", scriptPath);
                }
                else if (!string.IsNullOrEmpty(scriptName))
                {
                    // Search for script by name
                    var foundPath = FindScriptByName(scriptName, searchPath);
                    if (foundPath == null)
                    {
                        return Response.Error($"Script '{scriptName}' not found in {searchPath}");
                    }
                    relativePath = foundPath;
                    fullPath = Path.Combine(Application.dataPath, "../", foundPath);
                }
                else
                {
                    return Response.Error("Either scriptPath or scriptName must be provided");
                }

                if (!File.Exists(fullPath))
                {
                    return Response.Error($"Script not found at {relativePath}");
                }

                string content = File.ReadAllText(fullPath);
                var result = new
                {
                    scriptContent = content,
                    scriptPath = relativePath
                };

                // Add metadata if requested
                if (includeMetadata)
                {
                    var fileInfo = new FileInfo(fullPath);
                    var resultWithMetadata = new
                    {
                        scriptContent = content,
                        scriptPath = relativePath,
                        lastModified = fileInfo.LastWriteTime.ToString("o"),
                        lineCount = content.Split('\n').Length,
                        fileSize = fileInfo.Length,
                        encoding = "UTF-8"
                    };
                    return Response.Success("Script read successfully", resultWithMetadata);
                }

                return Response.Success("Script read successfully", result);
            }
            catch (Exception ex)
            {
                return Response.Error($"Failed to read script: {ex.Message}");
            }
        }

        /// <summary>
        /// Updates an existing C# script file
        /// </summary>
        public static object UpdateScript(JObject parameters)
        {
            try
            {
                string scriptPath = parameters["scriptPath"]?.ToString();
                string scriptName = parameters["scriptName"]?.ToString();
                string searchPath = parameters["searchPath"]?.ToString() ?? "Assets/";
                string scriptContent = parameters["scriptContent"]?.ToString();
                string updateMode = parameters["updateMode"]?.ToString() ?? "replace";
                bool createBackup = parameters["createBackup"]?.ToObject<bool>() ?? false;

                if (string.IsNullOrEmpty(scriptContent))
                {
                    return Response.Error("scriptContent is required");
                }

                string fullPath;
                string relativePath;

                if (!string.IsNullOrEmpty(scriptPath))
                {
                    relativePath = scriptPath;
                    fullPath = Path.Combine(Application.dataPath, "../", scriptPath);
                }
                else if (!string.IsNullOrEmpty(scriptName))
                {
                    var foundPath = FindScriptByName(scriptName, searchPath);
                    if (foundPath == null)
                    {
                        return Response.Error($"Script '{scriptName}' not found in {searchPath}");
                    }
                    relativePath = foundPath;
                    fullPath = Path.Combine(Application.dataPath, "../", foundPath);
                }
                else
                {
                    return Response.Error("Either scriptPath or scriptName must be provided");
                }

                if (!File.Exists(fullPath))
                {
                    return Response.Error($"Script not found at {relativePath}");
                }

                // Create backup if requested
                string backupPath = null;
                if (createBackup)
                {
                    backupPath = $"{fullPath}.backup";
                    File.Copy(fullPath, backupPath, true);
                }

                // Handle different update modes
                string finalContent;
                switch (updateMode.ToLower())
                {
                    case "replace":
                        finalContent = scriptContent;
                        break;
                    case "append":
                        string existingContent = File.ReadAllText(fullPath);
                        finalContent = existingContent + scriptContent;
                        break;
                    case "prepend":
                        existingContent = File.ReadAllText(fullPath);
                        finalContent = scriptContent + existingContent;
                        break;
                    default:
                        return Response.Error($"Unknown update mode: {updateMode}. Valid modes: replace, append, prepend");
                }

                // Write updated content
                File.WriteAllText(fullPath, finalContent);
                AssetDatabase.ImportAsset(relativePath);
                AssetDatabase.Refresh();

                var result = new
                {
                    scriptPath = relativePath,
                    message = "Script updated successfully"
                };

                if (createBackup && backupPath != null)
                {
                    var resultWithBackup = new
                    {
                        scriptPath = relativePath,
                        message = "Script updated successfully",
                        backupPath = backupPath.Replace(Application.dataPath + "/../", "")
                    };
                    return Response.Success("Script updated successfully", resultWithBackup);
                }

                return Response.Success("Script updated successfully", result);
            }
            catch (Exception ex)
            {
                return Response.Error($"Failed to update script: {ex.Message}");
            }
        }

        /// <summary>
        /// Deletes a C# script file
        /// </summary>
        public static object DeleteScript(JObject parameters)
        {
            try
            {
                string scriptPath = parameters["scriptPath"]?.ToString();
                string scriptName = parameters["scriptName"]?.ToString();
                string searchPath = parameters["searchPath"]?.ToString() ?? "Assets/";
                bool createBackup = parameters["createBackup"]?.ToObject<bool>() ?? false;
                bool force = parameters["force"]?.ToObject<bool>() ?? false;

                string fullPath;
                string relativePath;

                if (!string.IsNullOrEmpty(scriptPath))
                {
                    relativePath = scriptPath;
                    fullPath = Path.Combine(Application.dataPath, "../", scriptPath);
                }
                else if (!string.IsNullOrEmpty(scriptName))
                {
                    var foundPaths = FindScriptsByName(scriptName, searchPath);
                    if (foundPaths.Count == 0)
                    {
                        return Response.Error($"Script '{scriptName}' not found in {searchPath}");
                    }
                    if (foundPaths.Count > 1 && !force)
                    {
                        return Response.Error($"Multiple scripts named '{scriptName}' found. Use force=true to delete all or specify exact path.");
                    }

                    // Handle multiple deletions
                    if (foundPaths.Count > 1)
                    {
                        var deletedPaths = new List<string>();
                        foreach (var path in foundPaths)
                        {
                            if (AssetDatabase.MoveAssetToTrash(path))
                            {
                                deletedPaths.Add(path);
                            }
                        }
                        AssetDatabase.Refresh();
                        return Response.Success($"Multiple scripts deleted successfully", new
                        {
                            deletedPaths = deletedPaths.ToArray(),
                            message = "Multiple scripts deleted successfully"
                        });
                    }

                    relativePath = foundPaths[0];
                    fullPath = Path.Combine(Application.dataPath, "../", foundPaths[0]);
                }
                else
                {
                    return Response.Error("Either scriptPath or scriptName must be provided");
                }

                if (!File.Exists(fullPath))
                {
                    return Response.Error($"Script not found at {relativePath}");
                }

                // Create backup if requested
                if (createBackup)
                {
                    string backupPath = $"{fullPath}.backup";
                    File.Copy(fullPath, backupPath, true);
                }

                // Use Unity's safe deletion (moves to trash)
                bool deleted = AssetDatabase.MoveAssetToTrash(relativePath);
                if (!deleted)
                {
                    return Response.Error($"Failed to delete script at {relativePath}");
                }

                AssetDatabase.Refresh();

                return Response.Success("Script deleted successfully", new
                {
                    scriptPath = relativePath,
                    message = "Script deleted successfully"
                });
            }
            catch (Exception ex)
            {
                return Response.Error($"Failed to delete script: {ex.Message}");
            }
        }

        /// <summary>
        /// Lists C# scripts in the project with filtering options
        /// </summary>
        public static object ListScripts(JObject parameters)
        {
            try
            {
                string searchPath = parameters["searchPath"]?.ToString() ?? "Assets/";
                string pattern = parameters["pattern"]?.ToString();
                string scriptType = parameters["scriptType"]?.ToString();
                string sortBy = parameters["sortBy"]?.ToString() ?? "name";
                string sortOrder = parameters["sortOrder"]?.ToString() ?? "asc";
                bool includeMetadata = parameters["includeMetadata"]?.ToObject<bool>() ?? true;
                int maxResults = parameters["maxResults"]?.ToObject<int>() ?? 100;

                searchPath = NormalizePath(searchPath);

                // Find all .cs files in the search path
                string[] guids = AssetDatabase.FindAssets("t:Script", new[] { searchPath });
                var scripts = new List<object>();

                foreach (string guid in guids.Take(maxResults))
                {
                    string assetPath = AssetDatabase.GUIDToAssetPath(guid);
                    if (!assetPath.EndsWith(".cs")) continue;

                    string scriptName = Path.GetFileNameWithoutExtension(assetPath);

                    // Apply pattern filter
                    if (!string.IsNullOrEmpty(pattern))
                    {
                        string regex = pattern.Replace("*", ".*").Replace("?", ".");
                        if (!Regex.IsMatch(scriptName, regex, RegexOptions.IgnoreCase))
                            continue;
                    }

                    var scriptInfo = new
                    {
                        path = assetPath,
                        name = scriptName,
                        type = DetermineScriptType(assetPath)
                    };

                    // Add metadata if requested
                    if (includeMetadata)
                    {
                        string fullPath = Path.Combine(Application.dataPath, "../", assetPath);
                        if (File.Exists(fullPath))
                        {
                            var fileInfo = new FileInfo(fullPath);
                            var scriptWithMetadata = new
                            {
                                path = assetPath,
                                name = scriptName,
                                type = DetermineScriptType(assetPath),
                                size = fileInfo.Length,
                                lastModified = fileInfo.LastWriteTime.ToString("o")
                            };
                            scripts.Add(scriptWithMetadata);
                        }
                        else
                        {
                            scripts.Add(scriptInfo);
                        }
                    }
                    else
                    {
                        scripts.Add(scriptInfo);
                    }
                }

                // Apply script type filter
                if (!string.IsNullOrEmpty(scriptType))
                {
                    scripts = scripts.Where(s => 
                    {
                        var type = ((dynamic)s).type?.ToString();
                        return string.Equals(type, scriptType, StringComparison.OrdinalIgnoreCase);
                    }).ToList();
                }

                // Apply sorting
                switch (sortBy.ToLower())
                {
                    case "name":
                        scripts = sortOrder.ToLower() == "desc" 
                            ? scripts.OrderByDescending(s => ((dynamic)s).name).ToList()
                            : scripts.OrderBy(s => ((dynamic)s).name).ToList();
                        break;
                    case "path":
                        scripts = sortOrder.ToLower() == "desc"
                            ? scripts.OrderByDescending(s => ((dynamic)s).path).ToList()
                            : scripts.OrderBy(s => ((dynamic)s).path).ToList();
                        break;
                    case "lastmodified":
                        if (includeMetadata)
                        {
                            scripts = sortOrder.ToLower() == "desc"
                                ? scripts.OrderByDescending(s => ((dynamic)s).lastModified ?? "").ToList()
                                : scripts.OrderBy(s => ((dynamic)s).lastModified ?? "").ToList();
                        }
                        break;
                }

                return Response.Success("Scripts listed successfully", new
                {
                    scripts = scripts.ToArray(),
                    totalCount = scripts.Count,
                    message = "Scripts listed successfully"
                });
            }
            catch (Exception ex)
            {
                return Response.Error($"Failed to list scripts: {ex.Message}");
            }
        }

        /// <summary>
        /// Validates a C# script for syntax and Unity compatibility
        /// </summary>
        public static object ValidateScript(JObject parameters)
        {
            try
            {
                string scriptPath = parameters["scriptPath"]?.ToString();
                string scriptContent = parameters["scriptContent"]?.ToString();
                string scriptName = parameters["scriptName"]?.ToString();
                string searchPath = parameters["searchPath"]?.ToString() ?? "Assets/";
                bool checkSyntax = parameters["checkSyntax"]?.ToObject<bool>() ?? true;
                bool checkUnityCompatibility = parameters["checkUnityCompatibility"]?.ToObject<bool>() ?? true;
                bool suggestImprovements = parameters["suggestImprovements"]?.ToObject<bool>() ?? false;

                string content;
                string actualPath = null;

                if (!string.IsNullOrEmpty(scriptContent))
                {
                    content = scriptContent;
                }
                else if (!string.IsNullOrEmpty(scriptPath))
                {
                    actualPath = scriptPath;
                    string fullPath = Path.Combine(Application.dataPath, "../", scriptPath);
                    if (!File.Exists(fullPath))
                    {
                        return Response.Error($"Script not found at {scriptPath}");
                    }
                    content = File.ReadAllText(fullPath);
                }
                else if (!string.IsNullOrEmpty(scriptName))
                {
                    var foundPath = FindScriptByName(scriptName, searchPath);
                    if (foundPath == null)
                    {
                        return Response.Error($"Script '{scriptName}' not found in {searchPath}");
                    }
                    actualPath = foundPath;
                    string fullPath = Path.Combine(Application.dataPath, "../", foundPath);
                    content = File.ReadAllText(fullPath);
                }
                else
                {
                    return Response.Error("Either scriptPath, scriptContent, or scriptName must be provided");
                }

                var errors = new List<object>();
                var warnings = new List<object>();
                var suggestions = new List<object>();

                // Basic syntax validation
                if (checkSyntax)
                {
                    var syntaxErrors = ValidateBasicSyntax(content);
                    errors.AddRange(syntaxErrors);
                }

                // Unity compatibility checks
                if (checkUnityCompatibility)
                {
                    var compatibilityIssues = CheckUnityCompatibility(content);
                    warnings.AddRange(compatibilityIssues);
                }

                // Code improvement suggestions
                if (suggestImprovements)
                {
                    var improvements = SuggestImprovements(content);
                    suggestions.AddRange(improvements);
                }

                bool isValid = errors.Count == 0;

                var result = new
                {
                    isValid = isValid,
                    errors = errors.ToArray(),
                    warnings = warnings.ToArray(),
                    message = isValid ? "Script validation completed successfully" : "Script validation completed with errors"
                };

                if (suggestImprovements && suggestions.Count > 0)
                {
                    var resultWithSuggestions = new
                    {
                        isValid = isValid,
                        errors = errors.ToArray(),
                        warnings = warnings.ToArray(),
                        suggestions = suggestions.ToArray(),
                        message = isValid ? "Script validation completed successfully" : "Script validation completed with errors"
                    };

                    if (actualPath != null)
                    {
                        var resultWithPath = new
                        {
                            isValid = isValid,
                            errors = errors.ToArray(),
                            warnings = warnings.ToArray(),
                            suggestions = suggestions.ToArray(),
                            scriptPath = actualPath,
                            message = isValid ? "Script validation completed successfully" : "Script validation completed with errors"
                        };
                        return Response.Success("Script validation completed", resultWithPath);
                    }

                    return Response.Success("Script validation completed", resultWithSuggestions);
                }

                if (actualPath != null)
                {
                    var resultWithPath = new
                    {
                        isValid = isValid,
                        errors = errors.ToArray(),
                        warnings = warnings.ToArray(),
                        scriptPath = actualPath,
                        message = isValid ? "Script validation completed successfully" : "Script validation completed with errors"
                    };
                    return Response.Success("Script validation completed", resultWithPath);
                }

                return Response.Success("Script validation completed", result);
            }
            catch (Exception ex)
            {
                return Response.Error($"Failed to validate script: {ex.Message}");
            }
        }

        #region Helper Methods

        private static string NormalizePath(string path)
        {
            if (string.IsNullOrEmpty(path)) return "Assets/Scripts/";
            
            path = path.Replace('\\', '/').Trim('/');
            if (!path.StartsWith("Assets/"))
            {
                path = "Assets/" + path;
            }
            if (!path.EndsWith("/"))
            {
                path += "/";
            }
            return path;
        }

        private static string FindScriptByName(string scriptName, string searchPath)
        {
            string[] guids = AssetDatabase.FindAssets($"{scriptName} t:Script", new[] { searchPath });
            foreach (string guid in guids)
            {
                string assetPath = AssetDatabase.GUIDToAssetPath(guid);
                if (Path.GetFileNameWithoutExtension(assetPath) == scriptName)
                {
                    return assetPath;
                }
            }
            return null;
        }

        private static List<string> FindScriptsByName(string scriptName, string searchPath)
        {
            var results = new List<string>();
            string[] guids = AssetDatabase.FindAssets($"{scriptName} t:Script", new[] { searchPath });
            foreach (string guid in guids)
            {
                string assetPath = AssetDatabase.GUIDToAssetPath(guid);
                if (Path.GetFileNameWithoutExtension(assetPath) == scriptName)
                {
                    results.Add(assetPath);
                }
            }
            return results;
        }

        private static string DetermineScriptType(string assetPath)
        {
            string fullPath = Path.Combine(Application.dataPath, "../", assetPath);
            if (!File.Exists(fullPath)) return "Unknown";

            string content = File.ReadAllText(fullPath);
            
            if (content.Contains(": MonoBehaviour")) return "MonoBehaviour";
            if (content.Contains(": ScriptableObject")) return "ScriptableObject";
            if (content.Contains(": Editor")) return "Editor";
            if (content.Contains(": EditorWindow")) return "EditorWindow";
            if (content.Contains("static class")) return "StaticClass";
            if (content.Contains("interface ")) return "Interface";
            
            return "MonoBehaviour"; // Default assumption
        }

        private static string GenerateScriptTemplate(string scriptName, string scriptType, string namespaceName)
        {
            string usings = "using UnityEngine;";
            string classDeclaration;
            string classBody;

            switch (scriptType.ToLower())
            {
                case "monobehaviour":
                    classDeclaration = $"public class {scriptName} : MonoBehaviour";
                    classBody = @"{
    // Start is called before the first frame update
    void Start()
    {
        
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}";
                    break;

                case "scriptableobject":
                    classDeclaration = $"[CreateAssetMenu(fileName = \"New {scriptName}\", menuName = \"{scriptName}\")]\npublic class {scriptName} : ScriptableObject";
                    classBody = @"{
    // Add your ScriptableObject properties here
}";
                    break;

                case "editor":
                    usings += "\nusing UnityEditor;";
                    string targetClass = scriptName.Replace("Editor", "");
                    classDeclaration = $"[CustomEditor(typeof({targetClass}))]\npublic class {scriptName} : Editor";
                    classBody = @"{
    public override void OnInspectorGUI()
    {
        DrawDefaultInspector();
        
        // Add custom inspector GUI here
    }
}";
                    break;

                case "staticclass":
                    classDeclaration = $"public static class {scriptName}";
                    classBody = @"{
    // Add your static methods and properties here
}";
                    break;

                case "interface":
                    usings = "";
                    classDeclaration = $"public interface {scriptName}";
                    classBody = @"{
    // Define your interface methods here
}";
                    break;

                default:
                    classDeclaration = $"public class {scriptName}";
                    classBody = @"{
    // Add your class implementation here
}";
                    break;
            }

            if (!string.IsNullOrEmpty(namespaceName))
            {
                return $@"{usings}

namespace {namespaceName}
{{
    {classDeclaration}
    {classBody}
}}";
            }
            else
            {
                return $@"{usings}

{classDeclaration}
{classBody}";
            }
        }

        private static List<object> ValidateBasicSyntax(string content)
        {
            var errors = new List<object>();

            // Check for balanced braces
            int braceBalance = 0;
            int line = 1;
            for (int i = 0; i < content.Length; i++)
            {
                char c = content[i];
                if (c == '{') braceBalance++;
                else if (c == '}') braceBalance--;
                else if (c == '\n') line++;

                if (braceBalance < 0)
                {
                    errors.Add(new
                    {
                        type = "SyntaxError",
                        line = line,
                        column = 1,
                        message = "Unmatched closing brace",
                        severity = "Error"
                    });
                    break;
                }
            }

            if (braceBalance > 0)
            {
                errors.Add(new
                {
                    type = "SyntaxError",
                    line = line,
                    column = 1,
                    message = "Missing closing brace(s)",
                    severity = "Error"
                });
            }

            return errors;
        }

        private static List<object> CheckUnityCompatibility(string content)
        {
            var warnings = new List<object>();

            // Check for common deprecated Unity APIs
            var deprecatedAPIs = new Dictionary<string, string>
            {
                { "rigidbody.", "Use GetComponent<Rigidbody>() instead" },
                { "renderer.", "Use GetComponent<Renderer>() instead" },
                { "camera.", "Use GetComponent<Camera>() instead" }
            };

            string[] lines = content.Split('\n');
            for (int i = 0; i < lines.Length; i++)
            {
                foreach (var deprecated in deprecatedAPIs)
                {
                    if (lines[i].Contains(deprecated.Key))
                    {
                        warnings.Add(new
                        {
                            type = "UnityCompatibility",
                            line = i + 1,
                            message = $"Deprecated API usage: {deprecated.Value}",
                            severity = "Warning"
                        });
                    }
                }
            }

            return warnings;
        }

        private static List<object> SuggestImprovements(string content)
        {
            var suggestions = new List<object>();

            // Check for GetComponent calls in Update method
            if (content.Contains("void Update()") && content.Contains("GetComponent"))
            {
                suggestions.Add(new
                {
                    type = "Performance",
                    line = -1,
                    message = "Consider caching component references in Start() instead of calling GetComponent in Update()",
                    improvement = "Cache GetComponent calls in Start() method for better performance"
                });
            }

            return suggestions;
        }

        #endregion
    }
}