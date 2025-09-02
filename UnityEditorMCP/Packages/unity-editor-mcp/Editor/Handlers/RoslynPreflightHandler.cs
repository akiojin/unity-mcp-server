using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEditorMCP.Helpers;
using UnityEngine;

namespace UnityEditorMCP.Handlers
{

    /// Stubbed Roslyn preflight: returns an empty diagnostic set without performing compilation.
    /// This avoids Unity-side Roslyn dependencies; real validation is handled by external CLI.
    /// </summary>
    public static class RoslynPreflightHandler
    {
        public class DiagnosticItem
        {
            public string assembly;
            public string type;
            public string id;
            public string message;
            public string file;
            public int line;
            public int column;
            public string snippet;
        }

        /// <summary>
        /// Parameters:
        /// - edits: [ { path, startLine, endLine, newText } ] (same schema as ScriptHandler.EditPatch)
        /// - assemblies: "editor" | "player" | "all" (default: editor)
        /// - includeWarnings: bool (default: true)
        /// - allFiles: bool (default: false) when false, only include diagnostics for changed files
        /// - contextLines: int (default: 2) lines before/after for snippet
        /// </summary>
        public static object Preflight(JObject parameters)
        {
            try
            {
                return new
                {
                    success = true,
                    assembliesChecked = 0,
                    errorCount = 0,
                    warningCount = 0,
                    messages = new System.Collections.Generic.List<DiagnosticItem>()
                };
            }
            catch (Exception e)
            {
                UnityEngine.Debug.LogError($"[RoslynPreflightHandler] Error: {e}");
                return new { error = e.Message };
            }
        }

        private static string ToAbsoluteProjectPath(string normalizedRelativePath)
        {
            var projectRoot = Application.dataPath.Substring(0, Application.dataPath.Length - "/Assets".Length).Replace('\\', '/');
            return Path.Combine(projectRoot, normalizedRelativePath).Replace('\\', '/');
        }
        private static string ToRelativeProjectPath(string absolutePath)
        {
            var proj = Application.dataPath.Substring(0, Application.dataPath.Length - "/Assets".Length).Replace('\\', '/');
            var norm = absolutePath.Replace('\\', '/');
            if (norm.StartsWith(proj, StringComparison.OrdinalIgnoreCase))
                return norm.Substring(proj.Length).TrimStart('/');
            return norm;
        }
    }
}
