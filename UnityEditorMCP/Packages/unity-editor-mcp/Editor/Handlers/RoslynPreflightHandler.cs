using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEditor.Compilation;
using UnityEditorMCP.Helpers;
using UnityEngine;

namespace UnityEditorMCP.Handlers
{

    /// Performs in-memory Roslyn preflight compilation against proposed edits (no file writes).
    /// Leverages Unity's CompilationPipeline to mirror defines and references per assembly.
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
                var edits = parameters["edits"] as JArray;
                if (edits == null || edits.Count == 0)
                    return new { error = "edits array is required" };

                var scope = (parameters["assemblies"]?.ToString() ?? "editor").ToLowerInvariant();
                bool includeWarnings = parameters["includeWarnings"]?.ToObject<bool?>() ?? true;
                bool allFiles = parameters["allFiles"]?.ToObject<bool?>() ?? false;
                int context = Math.Max(0, parameters["contextLines"]?.ToObject<int?>() ?? 2);

                // Build in-memory overrides: rel path -> new content
                var overrides = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                foreach (var e in edits)
                {
                    var rel = e["path"]?.ToString();
                    if (string.IsNullOrEmpty(rel)) return new { error = "edits[*].path is required" };
                    if (!PathPolicy.IsAssetsPath(rel) && !PathPolicy.IsEmbeddedPackagesPath(rel))
                        return new { error = "Write not allowed for this path", path = rel };

                    var abs = ToAbsoluteProjectPath(rel);
                    var start = Math.Max(1, e["startLine"]?.ToObject<int?>() ?? 1);
                    var end = Math.Max(start, e["endLine"]?.ToObject<int?>() ?? start);
                    var newText = e["newText"]?.ToString() ?? string.Empty;

                    string baseText = File.Exists(abs) ? File.ReadAllText(abs) : string.Empty;
                    var lines = baseText.Split(new[] {"\n"}, StringSplitOptions.None).ToList();
                    int startIdx = Math.Min(Math.Max(1, start), Math.Max(1, lines.Count)) - 1;
                    int endIdx = Math.Min(Math.Max(startIdx + 1, end), Math.Max(1, lines.Count)) - 1;
                    if (lines.Count == 0) { startIdx = 0; endIdx = -1; }
                    var insertLines = (newText ?? string.Empty).Split(new[] {"\n"}, StringSplitOptions.None);
                    if (endIdx >= startIdx && lines.Count > 0)
                    {
                        int removeCount = endIdx - startIdx + 1;
                        if (startIdx + removeCount <= lines.Count) lines.RemoveRange(startIdx, removeCount);
                    }
                    lines.InsertRange(Math.Max(0, startIdx), insertLines);
                    overrides[rel] = string.Join("\n", lines);
                }
                var changedSet = new HashSet<string>(overrides.Keys, StringComparer.OrdinalIgnoreCase);

                // Enumerate assemblies per requested scope
                var asmTypes = new List<AssembliesType>();
                if (scope == "all") { asmTypes.Add(AssembliesType.Editor); asmTypes.Add(AssembliesType.Player); }
                else if (scope == "player") asmTypes.Add(AssembliesType.Player);
                else asmTypes.Add(AssembliesType.Editor);

                var allDiags = new List<DiagnosticItem>();
                int asmCount = 0;
                foreach (var asmType in asmTypes)
                {
                    foreach (var asm in CompilationPipeline.GetAssemblies(asmType))
                    {
                        asmCount++;
                        var parseOptions = new CSharpParseOptions(preprocessorSymbols: asm.defines);

                        // Build SyntaxTrees with overridden contents where applicable, and a source map
                        var trees = new List<SyntaxTree>();
                        var sourceMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                        foreach (var srcAbs in asm.sourceFiles)
                        {
                            var rel = ToRelativeProjectPath(srcAbs);
                            string content;
                            if (overrides.TryGetValue(rel, out var ov)) content = ov;
                            else
                            {
                                try { content = File.ReadAllText(srcAbs); }
                                catch { content = string.Empty; }
                            }
                            sourceMap[rel] = content ?? string.Empty;
                            trees.Add(CSharpSyntaxTree.ParseText(content ?? string.Empty, parseOptions, path: rel));
                        }

                        // Metadata references from compiledAssemblyReferences
                        var refs = new List<MetadataReference>();
                        foreach (var r in asm.compiledAssemblyReferences)
                        {
                            try { if (File.Exists(r)) refs.Add(MetadataReference.CreateFromFile(r)); } catch { }
                        }

                        // Create compilation
                        var comp = CSharpCompilation.Create(
                            asm.name,
                            trees,
                            refs,
                            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary, allowUnsafe: true)
                        );

                        var diags = comp.GetDiagnostics();
                        foreach (var d in diags)
                        {
                            if (d.Severity == DiagnosticSeverity.Hidden) continue;
                            if (!includeWarnings && d.Severity == DiagnosticSeverity.Warning) continue;
                            var loc = d.Location.GetLineSpan();
                            var relPath = loc.Path ?? string.Empty;
                            if (!allFiles && changedSet.Count > 0 && !changedSet.Contains(relPath)) continue;

                            string snippet = string.Empty;
                            if (sourceMap.TryGetValue(relPath, out var srcText))
                            {
                                var lines = (srcText ?? string.Empty).Split(new[] {"\n"}, StringSplitOptions.None);
                                int line = Math.Max(1, loc.StartLinePosition.Line + 1);
                                int start = Math.Max(1, line - context);
                                int end = Math.Min(lines.Length, line + context);
                                snippet = string.Join("\n", lines.Skip(start - 1).Take(end - start + 1));
                            }

                            allDiags.Add(new DiagnosticItem
                            {
                                assembly = asm.name,
                                type = d.Severity.ToString(),
                                id = d.Id,
                                message = d.GetMessage(),
                                file = relPath,
                                line = loc.StartLinePosition.Line + 1,
                                column = loc.StartLinePosition.Character + 1,
                                snippet = snippet
                            });
                        }
                    }
                }

                var errorCount = allDiags.Count(d => string.Equals(d.type, "Error", StringComparison.OrdinalIgnoreCase));
                var warningCount = allDiags.Count(d => string.Equals(d.type, "Warning", StringComparison.OrdinalIgnoreCase));
                return new
                {
                    success = true,
                    assembliesChecked = asmCount,
                    errorCount,
                    warningCount,
                    messages = allDiags
                        .OrderByDescending(d => d.type == "Error")
                        .ThenBy(d => d.assembly)
                        .ThenBy(d => d.file)
                        .ThenBy(d => d.line)
                        .Take(500)
                        .ToList()
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