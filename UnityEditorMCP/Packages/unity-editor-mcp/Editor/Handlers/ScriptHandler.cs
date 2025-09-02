using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEditor.PackageManager;
using UnityEditor.PackageManager.Requests;
using UnityEngine;
using UnityEditorMCP.Core.Settings;
using UnityEditorMCP.Helpers;
using UnityEditorMCP.Core.CodeIndex;

namespace UnityEditorMCP.Handlers
{
    /// <summary>
    /// Script/Code handler (M0): packages list, safe read (chunked), patch preview, and basic search (substring/regex).
    /// Editing apply for embedded packages is guarded and will be enabled in a later milestone.
    /// </summary>
    public static class ScriptHandler
    {
        private struct Diag
        {
            public string type;
            public string file;
            public int line;
            public string message;
            public string code;
        }

        private static List<Diag> ExtractDiagnostics(object comp)
        {
            var list = new List<Diag>();
            try
            {
                var jo = JObject.FromObject(comp);
                var msgs = jo["messages"] as JArray;
                if (msgs == null) return list;
                foreach (var m in msgs)
                {
                    var msgText = m["message"]?.ToString() ?? "";
                    string code = null;
                    try
                    {
                        var match = System.Text.RegularExpressions.Regex.Match(msgText, @"\b([A-Z]{2}\d{4})\b");
                        if (match.Success) code = match.Groups[1].Value;
                    }
                    catch { }
                    list.Add(new Diag
                    {
                        type = m["type"]?.ToString() ?? "",
                        file = m["file"]?.ToString() ?? "",
                        line = m["line"]?.ToObject<int?>() ?? 0,
                        message = msgText,
                        code = code
                    });
                }
            }
            catch { }
            return list;
        }

        private static object BuildImpactReport(object compBefore, object compAfter)
        {
            try
            {
                var before = ExtractDiagnostics(compBefore);
                var after = ExtractDiagnostics(compAfter);
                int eBefore = before.Count(d => string.Equals(d.type, "Error", StringComparison.OrdinalIgnoreCase));
                int wBefore = before.Count(d => string.Equals(d.type, "Warning", StringComparison.OrdinalIgnoreCase));
                int eAfter = after.Count(d => string.Equals(d.type, "Error", StringComparison.OrdinalIgnoreCase));
                int wAfter = after.Count(d => string.Equals(d.type, "Warning", StringComparison.OrdinalIgnoreCase));

                var beforeSet = new HashSet<string>(before.Select(d => $"{d.type}|{d.file}|{d.line}|{d.message}"));
                var newOnes = after.Where(d => !beforeSet.Contains($"{d.type}|{d.file}|{d.line}|{d.message}")).Take(50)
                    .Select(d => new { d.type, d.file, d.line, d.message }).ToList();

                // Resolved diagnostics (present before but not after)
                var afterSet = new HashSet<string>(after.Select(d => $"{d.type}|{d.file}|{d.line}|{d.message}"));
                var resolved = before.Where(d => !afterSet.Contains($"{d.type}|{d.file}|{d.line}|{d.message}")).Take(50)
                    .Select(d => new { d.type, d.file, d.line, d.message }).ToList();

                var byCodeDelta = new List<object>();
                try
                {
                    var byCodeBefore = before.Where(d => !string.IsNullOrEmpty(d.code))
                        .GroupBy(d => d.code)
                        .ToDictionary(g => g.Key, g => g.Count());
                    var byCodeAfter = after.Where(d => !string.IsNullOrEmpty(d.code))
                        .GroupBy(d => d.code)
                        .ToDictionary(g => g.Key, g => g.Count());
                    var codes = new HashSet<string>(byCodeBefore.Keys);
                    foreach (var k in byCodeAfter.Keys) codes.Add(k);
                    foreach (var code in codes)
                    {
                        var b = byCodeBefore.ContainsKey(code) ? byCodeBefore[code] : 0;
                        var a = byCodeAfter.ContainsKey(code) ? byCodeAfter[code] : 0;
                        var delta = a - b;
                        if (delta != 0)
                            byCodeDelta.Add(new { code, before = b, after = a, delta });
                    }
                }
                catch { }

                // Split increases/decreases Top lists
                var byCodeIncreaseTop = byCodeDelta
                    .OrderByDescending(x => (int)x.GetType().GetProperty("delta").GetValue(x))
                    .Where(x => (int)x.GetType().GetProperty("delta").GetValue(x) > 0)
                    .Take(10)
                    .ToList();
                var byCodeDecreaseTop = byCodeDelta
                    .OrderBy(x => (int)x.GetType().GetProperty("delta").GetValue(x))
                    .Where(x => (int)x.GetType().GetProperty("delta").GetValue(x) < 0)
                    .Take(10)
                    .ToList();

                // By-file delta (errors + warnings)
                var byFileBefore = before.GroupBy(d => d.file ?? string.Empty).ToDictionary(g => g.Key, g => g.Count());
                var byFileAfter = after.GroupBy(d => d.file ?? string.Empty).ToDictionary(g => g.Key, g => g.Count());
                var files = new HashSet<string>(byFileBefore.Keys);
                foreach (var f in byFileAfter.Keys) files.Add(f);
                var byFileDelta = new List<object>();
                foreach (var f in files)
                {
                    var b = byFileBefore.ContainsKey(f) ? byFileBefore[f] : 0;
                    var a = byFileAfter.ContainsKey(f) ? byFileAfter[f] : 0;
                    var delta = a - b;
                    if (delta != 0)
                        byFileDelta.Add(new { file = f, before = b, after = a, delta });
                }
                var byFileDeltaTop = byFileDelta
                    .OrderByDescending(x => Math.Abs((int)x.GetType().GetProperty("delta").GetValue(x)))
                    .Take(20)
                    .ToList();

                return new
                {
                    errorsBefore = eBefore,
                    errorsAfter = eAfter,
                    errorDelta = eAfter - eBefore,
                    warningsBefore = wBefore,
                    warningsAfter = wAfter,
                    warningDelta = wAfter - wBefore,
                    newDiagnostics = newOnes,
                    resolvedDiagnostics = resolved,
                    byCodeIncreaseTop = byCodeIncreaseTop,
                    byCodeDecreaseTop = byCodeDecreaseTop,
                    byFileDeltaTop = byFileDeltaTop
                };
            }
            catch
            {
                return new { };
            }
        }

        private static int CountWordBoundaryOccurrences(string[] lines, string token)
        {
            if (string.IsNullOrEmpty(token)) return 0;
            int count = 0;
            try
            {
                var rx = new Regex($@"\\b{Regex.Escape(token)}\\b", RegexOptions.CultureInvariant);
                for (int i = 0; i < lines.Length; i++) count += rx.Matches(lines[i]).Count;
            }
            catch { }
            return count;
        }

        private static List<object> BuildProximityClusters(IEnumerable<int> lineNumbers, int threshold = 3, int minClusterSize = 2)
        {
            var clusters = new List<object>();
            var lines = lineNumbers?.Distinct().OrderBy(x => x).ToList() ?? new List<int>();
            if (lines.Count <= 1) return clusters;
            int start = lines[0];
            int prev = lines[0];
            int size = 1;
            for (int i = 1; i < lines.Count; i++)
            {
                if (lines[i] - prev <= threshold)
                {
                    size++;
                }
                else
                {
                    if (size >= minClusterSize) clusters.Add(new { startLine = start, endLine = prev, size });
                    start = lines[i];
                    size = 1;
                }
                prev = lines[i];
            }
            if (size >= minClusterSize) clusters.Add(new { startLine = start, endLine = prev, size });
            return clusters;
        }
        // --------------- Packages ---------------
        public static object ListPackages(JObject parameters)
        {
            try
            {
                var includeBuiltIn = parameters["includeBuiltIn"]?.ToObject<bool>() ?? false;
                var req = Client.List(includeBuiltIn);
                while (!req.IsCompleted) System.Threading.Thread.Sleep(10);
                if (req.Status != StatusCode.Success)
                {
                    return new { error = req.Error?.message ?? "Package list failed" };
                }

                var results = req.Result
                    .Select(p => new
                    {
                        packageId = p.packageId,
                        name = p.name,
                        displayName = p.displayName,
                        version = p.version,
                        source = p.source.ToString(),
                        isEmbedded = p.source == PackageSource.Embedded,
                        resolvedPath = p.resolvedPath
                    })
                    .OrderBy(p => p.name)
                    .ToList();

                return new { success = true, packages = results, totalCount = results.Count };
            }
            catch (Exception e)
            {
                Debug.LogError($"[ScriptHandler] ListPackages error: {e}");
                return new { error = e.Message };
            }
        }

        // --------------- Read (chunked) ---------------
        public static object ReadFile(JObject parameters)
        {
            var settings = UnityMCPSettings.Load();
            try
            {
                var path = parameters["path"]?.ToString();
                var startLine = Math.Max(1, parameters["startLine"]?.ToObject<int?>() ?? 1);
                var endLine = Math.Max(startLine, parameters["endLine"]?.ToObject<int?>() ?? (startLine + 199));
                var maxBytes = Math.Max(1024, parameters["maxBytes"]?.ToObject<int?>() ?? settings.tokenBudget.maxBytes);

                if (string.IsNullOrEmpty(path)) return new { error = "path is required" };
                var norm = PathPolicy.Normalize(path);

                // Only allow reading .cs files under Assets or Packages
                if (!PathPolicy.IsAssetsPath(norm) && !PathPolicy.IsPackagesPath(norm))
                {
                    return new { error = "Path must be under Assets/ or Packages/" };
                }
                if (Path.GetExtension(norm).ToLowerInvariant() != ".cs")
                {
                    return new { error = "Only .cs files are supported" };
                }

                var abs = ToAbsoluteProjectPath(norm);
                if (!File.Exists(abs)) return new { error = "File not found", path = norm };

                var lines = File.ReadAllLines(abs);
                startLine = Math.Min(Math.Max(1, startLine), lines.Length == 0 ? 1 : lines.Length);
                endLine = Math.Min(Math.Max(startLine, endLine), lines.Length);
                var slice = string.Join("\n", lines.Skip(startLine - 1).Take(endLine - startLine + 1));

                // Enforce maxBytes budget
                var utf8 = Encoding.UTF8.GetBytes(slice);
                if (utf8.Length > maxBytes)
                {
                    var truncated = Encoding.UTF8.GetString(utf8, 0, maxBytes);
                    slice = truncated;
                }

                return new
                {
                    success = true,
                    path = norm,
                    startLine,
                    endLine,
                    content = slice
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[ScriptHandler] ReadFile error: {e}");
                return new { error = e.Message };
            }
        }

        // --------------- Patch (preview only in M0) ---------------
        public static object EditPatch(JObject parameters)
        {
            var settings = UnityMCPSettings.Load();
            try
            {
                var preview = parameters["preview"]?.ToObject<bool?>() ?? true;
                var edits = parameters["edits"] as JArray; // [{ path, startLine, endLine, newText }]
                if (edits == null || edits.Count == 0) return new { error = "edits array is required" };

                var applied = new List<object>();
                int totalBytes = 0;
                var parsedEdits = new List<(string norm, string abs, int start, int end, string newText)>();
                foreach (var e in edits)
                {
                    var path = e["path"]?.ToString();
                    var startLine = Math.Max(1, e["startLine"]?.ToObject<int?>() ?? 1);
                    var endLine = Math.Max(startLine, e["endLine"]?.ToObject<int?>() ?? startLine);
                    var newText = e["newText"]?.ToString() ?? string.Empty;
                    if (string.IsNullOrEmpty(path)) return new { error = "edits[*].path is required" };
                    var norm = PathPolicy.Normalize(path);

                    // Write policy guard (Assets or Embedded Packages only, .cs only)
                    var allowed = PathPolicy.IsAllowedWritePath(norm, settings.writePolicy.allowedExtensions,
                        settings.writePolicy.allowAssets, settings.writePolicy.allowEmbeddedPackages);
                    if (!allowed)
                    {
                        return new { error = "Write not allowed for this path", path = norm };
                    }

                    var abs = ToAbsoluteProjectPath(norm);
                    var exists = File.Exists(abs);

                    if (!exists)
                    {
                        // New file creation allowed?
                        bool allowCreate = settings.writePolicy.allowNewFiles;
                        if (!allowCreate)
                        {
                            return new { error = "Write not allowed for this path", path = norm, reason = "new_file_blocked" };
                        }

                        // Preview for new file: before = empty, adjust endLine for unified diff header
                        int startAdj = Math.Max(1, startLine);
                        int endAdj = Math.Max(0, startAdj - 1);
                        var previewDiffNew = BuildUnifiedDiff(norm, startAdj, endAdj, string.Empty, newText);
                        totalBytes += Encoding.UTF8.GetByteCount(previewDiffNew);
                        if (totalBytes > settings.tokenBudget.maxBytes)
                        {
                            return new { error = "Preview too large", exceeded = true };
                        }
                        applied.Add(new { path = norm, startLine = startAdj, endLine = endAdj, preview = previewDiffNew });
                        parsedEdits.Add((norm, abs, startAdj, endAdj, newText));
                        continue;
                    }

                    var originalLines = File.ReadAllLines(abs).ToList();
                    startLine = Math.Min(Math.Max(1, startLine), originalLines.Count == 0 ? 1 : originalLines.Count);
                    endLine = Math.Min(Math.Max(startLine, endLine), Math.Max(1, originalLines.Count));
                    var before = string.Join("\n", originalLines.Skip(startLine - 1).Take(endLine - startLine + 1));

                    var previewDiff = BuildUnifiedDiff(norm, startLine, endLine, before, newText);
                    totalBytes += Encoding.UTF8.GetByteCount(previewDiff);
                    if (totalBytes > settings.tokenBudget.maxBytes)
                    {
                        return new { error = "Preview too large", exceeded = true };
                    }

                    applied.Add(new { path = norm, startLine, endLine, preview = previewDiff });
                    parsedEdits.Add((norm, abs, startLine, endLine, newText));
                }


                // Patch size guard (safeMode)
                bool safeMode = parameters["safeMode"]?.ToObject<bool?>() ?? true;
                bool allowLarge = parameters["allowLarge"]?.ToObject<bool?>() ?? false;
                if (safeMode && !allowLarge)
                {
                    foreach (var pe in parsedEdits)
                    {
                        int span = pe.end - pe.start + 1;
                        if (span > 80)
                            return new { error = "Patch too large (>80 lines). Use structured edit (replace_body).", code = "PATCH_TOO_LARGE", path = pe.norm, span };
                    }
                }

                // Always run Roslyn preflight in preview and apply
                object preflightInfo = null;
                try
                {
                    var pfParams = new JObject
                    {
                        ["edits"] = edits.DeepClone(),
                        ["assemblies"] = "editor",
                        ["includeWarnings"] = true,
                        ["allFiles"] = false,
                        ["contextLines"] = 2
                    };
                    preflightInfo = RoslynPreflightHandler.Preflight(pfParams);
                    var pf = JObject.FromObject(preflightInfo);
                    int pfErrors = pf["errorCount"]?.ToObject<int?>() ?? 0;
                    if (!preview && pfErrors > 0)
                    {
                        return new { success = false, applied = false, preflight = preflightInfo, note = "Blocked by Roslyn preflight errors" };
                    }
                }
                catch (Exception ex)
                {
                    Debug.LogWarning($"[ScriptHandler] Roslyn preflight unavailable: {ex.Message}");
                }

                if (preview == false)
                {
                    int proxThreshold = parameters["proximityThreshold"]?.ToObject<int?>() ?? 3;
                    int minCluster = parameters["minClusterSize"]?.ToObject<int?>() ?? 2;
                    // Apply allowed for Assets and Embedded packages per write policy (new files allowed when enabled)
                    foreach (var pe in parsedEdits)
                    {
                        bool okAssets = PathPolicy.IsAssetsPath(pe.norm) && settings.writePolicy.allowAssets;
                        bool okEmbedded = PathPolicy.IsEmbeddedPackagesPath(pe.norm) && settings.writePolicy.allowEmbeddedPackages;
                        if (!(okAssets || okEmbedded))
                        {
                            return new { error = "Apply not allowed for this path per write policy", path = pe.norm };
                        }
                    }

                    var compBeforeParams = new JObject { ["includeMessages"] = true, ["maxMessages"] = 200 };
                    var compBefore = CompilationHandler.GetCompilationState(compBeforeParams);

                    // Group edits per file and apply from bottom to top to avoid line shift issues
                    var perFile = parsedEdits
                        .GroupBy(x => x.abs)
                        .ToDictionary(g => g.Key, g => g.OrderByDescending(e => e.start).ToList());

                    var backups = new List<object>();
                    // Avoid starting during compilation to prevent losing Stop in reload
                    if (!EditorApplication.isCompiling)
                        AssetEditingGuard.Begin();
                    try
                    {
                        var projectRoot = GetProjectRoot();
                        foreach (var kv in perFile)
                        {
                            var abs = kv.Key;
                            var rel = abs.Replace('\\', '/').Substring(projectRoot.Length).TrimStart('/');
                            var originalLines = File.Exists(abs) ? File.ReadAllLines(abs).ToList() : new List<string>();

                            foreach (var edit in kv.Value)
                            {
                                var newLines = (edit.newText ?? string.Empty).Split(new[] {"\n"}, StringSplitOptions.None).ToList();
                                var replaceCount = Math.Max(0, edit.end - edit.start + 1);
                                if (replaceCount > 0 && originalLines.Count >= edit.start - 1 + replaceCount)
                                    originalLines.RemoveRange(edit.start - 1, replaceCount);
                                originalLines.InsertRange(Math.Max(0, edit.start - 1), newLines);
                            }

                            // Backup
                            var originalContent = File.Exists(abs) ? File.ReadAllText(abs) : string.Empty;
                            var backupPath = CreateBackupFor(rel, originalContent);
                            backups.Add(new { path = rel, backup = backupPath });

                            // Ensure directory then write; import/refresh will be batched after editing
                            var dir = Path.GetDirectoryName(abs);
                            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
                            File.WriteAllText(abs, string.Join("\n", originalLines));
                        }
                    }
                    finally
                    {
                        AssetEditingGuard.End();
                        var mode = parameters["refreshMode"]?.ToString()?.ToLowerInvariant();
                        if (mode == "immediate") RefreshController.ImmediateThrottled();
                        else if (mode == "none") { }
                        else RefreshController.Debounced();
                    }

                    // Optionally return compilation state (may still be compiling)
                    var compParams = new JObject
                    {
                        ["includeMessages"] = true,
                        ["maxMessages"] = 50
                    };
                    var compState = CompilationHandler.GetCompilationState(compParams);
                    var impact = BuildImpactReport(compBefore, compState);
                    // Proximity warning clusters by file using start lines of edits
                    var prox = parsedEdits
                        .GroupBy(x => x.norm)
                        .Select(g => new { path = g.Key, clusters = BuildProximityClusters(g.Select(v => v.start), proxThreshold, minCluster) })
                        .Where(x => (x.clusters as List<object>).Count > 0)
                        .ToList();
                    return new { success = true, applied = true, previews = applied, backups, compilation = compState, impact = impact, preflight = preflightInfo, warnings = new { proximity = prox } };
                }

                // Proximity warnings in preview
                int proxThresholdPrev = parameters["proximityThreshold"]?.ToObject<int?>() ?? 3;
                int minClusterPrev = parameters["minClusterSize"]?.ToObject<int?>() ?? 2;
                var proximity = parsedEdits
                    .GroupBy(x => x.norm)
                    .Select(g => new { path = g.Key, clusters = BuildProximityClusters(g.Select(v => v.start), proxThresholdPrev, minClusterPrev) })
                    .Where(x => (x.clusters as List<object>).Count > 0)
                    .ToList();
                return new { success = true, previews = applied, warnings = new { proximity }, preflight = preflightInfo };
            }
            catch (Exception e)
            {
                Debug.LogError($"[ScriptHandler] EditPatch error: {e}");
                return new { error = e.Message };
            }
        }


        private static string BuildUnifiedDiff(string path, int startLine, int endLine, string oldText, string newText)
        {
            // Minimal unified diff formatter for preview
            var oldLines = (oldText ?? string.Empty).Split(new[] {"\n"}, StringSplitOptions.None);
            var newLines = (newText ?? string.Empty).Split(new[] {"\n"}, StringSplitOptions.None);
            var sb = new StringBuilder();
            sb.AppendLine($"--- a/{path}");
            sb.AppendLine($"+++ b/{path}");
            sb.AppendLine($"@@ -{startLine},{oldLines.Length} +{startLine},{newLines.Length} @@");
            foreach (var l in oldLines) sb.AppendLine("-" + l);
            foreach (var l in newLines) sb.AppendLine("+" + l);
            return sb.ToString();
        }

        private static string ToAbsoluteProjectPath(string normalizedRelativePath)
        {
            var projectRoot = GetProjectRoot();
            return Path.Combine(projectRoot, normalizedRelativePath).Replace('\\', '/');
        }

        private static string GetProjectRoot()
        {
            return Application.dataPath.Substring(0, Application.dataPath.Length - "/Assets".Length).Replace('\\', '/');
        }



        private static string CreateBackupFor(string relPath, string originalContent)
        {
            var projectRoot = GetProjectRoot();
            var backupsRoot = Path.Combine(projectRoot, "Library/UnityMCP/Backups").Replace('\\', '/');
            var ts = DateTime.Now.ToString("yyyyMMdd_HHmmssfff");
            var backupDir = Path.Combine(backupsRoot, ts, Path.GetDirectoryName(relPath) ?? string.Empty).Replace('\\', '/');
            Directory.CreateDirectory(backupDir);
            var fileName = Path.GetFileName(relPath);
            var backupPath = Path.Combine(backupDir, fileName).Replace('\\', '/');
            File.WriteAllText(backupPath, originalContent);
            // Return relative path from project root for transparency
            return backupPath.Substring(projectRoot.Length).TrimStart('/');
        }

        // --------------- Basic search (substring/regex) ---------------
        public static object Search(JObject parameters)
        {
            var settings = UnityMCPSettings.Load();
            try
            {
                var patternType = (parameters["patternType"]?.ToString() ?? settings.searchDefaults.patternType).ToLowerInvariant();
                var pattern = parameters["pattern"]?.ToString();
                var flags = parameters["flags"] as JArray;
                var include = parameters["include"]?.ToString() ?? "**/*.cs";
                var exclude = parameters["exclude"]?.ToString();
                var scope = (parameters["scope"]?.ToString() ?? "assets").ToLowerInvariant();
                var pageSize = Math.Max(1, parameters["pageSize"]?.ToObject<int?>() ?? settings.searchDefaults.maxResults);
                bool maxProvided = parameters["maxMatchesPerFile"] != null;
                var maxMatchesPerFile = Math.Max(1, parameters["maxMatchesPerFile"]?.ToObject<int?>() ?? settings.searchDefaults.maxMatchesPerFile);
                var snippetContext = Math.Max(0, parameters["snippetContext"]?.ToObject<int?>() ?? settings.tokenBudget.snippetContext);
                var maxBytes = Math.Max(1024, parameters["maxBytes"]?.ToObject<int?>() ?? settings.tokenBudget.maxBytes);
                var returnMode = (parameters["returnMode"]?.ToString() ?? settings.tokenBudget.returnMode).ToLowerInvariant();
                var startAfter = parameters["startAfter"]?.ToString(); // cursor: "relPath|line|matchIndex"
                var maxFileSizeKB = Math.Max(0, parameters["maxFileSizeKB"]?.ToObject<int?>() ?? 0); // 0 = unlimited
                var codeOnly = parameters["codeOnly"]?.ToObject<bool?>() ?? true;
                var semContainer = parameters["container"]?.ToString();
                var semNamespace = parameters["namespace"]?.ToString();
                var semIdentifier = parameters["identifier"]?.ToString();

                if (patternType != "glob" && string.IsNullOrEmpty(pattern)) return new { error = "pattern is required", code = "PATTERN_REQUIRED" };

                var files = EnumerateFiles(scope, include, exclude, maxFileSizeKB).OrderBy(f => f.rel).ToList();
                var results = new List<object>();
                int totalBytes = 0;

                Regex regex = null;
                if (patternType == "regex")
                {
                    var options = RegexOptions.CultureInvariant;
                    var flagSet = flags?.Select(f => f.ToString()).ToHashSet(StringComparer.OrdinalIgnoreCase) ?? new HashSet<string>();
                    if (flagSet.Contains("i")) options |= RegexOptions.IgnoreCase;
                    if (flagSet.Contains("m")) options |= RegexOptions.Multiline;
                    if (flagSet.Contains("s")) options |= RegexOptions.Singleline;
                    regex = new Regex(pattern, options, TimeSpan.FromMilliseconds(500));
                }

                // Special case: glob patternType filters only by file path; return metadata list
                if (patternType == "glob")
                {
                    foreach (var file in files.Take(pageSize))
                    {
                        results.Add(new { path = file.rel });
                    }
                    return new { success = true, results, total = results.Count };
                }

                // Decode cursor
                string cursorRel = null; int cursorLine = 0; int cursorMatchIndex = -1;
                if (!string.IsNullOrEmpty(startAfter))
                {
                    var parts = startAfter.Split('|');
                    if (parts.Length >= 3)
                    {
                        cursorRel = parts[0];
                        int.TryParse(parts[1], out cursorLine);
                        int.TryParse(parts[2], out cursorMatchIndex);
                    }
                }

                bool pastCursor = string.IsNullOrEmpty(cursorRel);
                string lastRel = null; int lastLine = 0; int lastMatchIdx = 0;

                var mixedList = new List<object>();
                foreach (var file in files)
                {
                    if (results.Count >= pageSize) break;
                    // Optional semantic pre-filter
                    if ((!(string.IsNullOrEmpty(semContainer) && string.IsNullOrEmpty(semNamespace))) && RoslynAdapter.IsAvailable())
                    {
                        string ident = semIdentifier;
                        if (string.IsNullOrEmpty(ident) && patternType == "substring" && Regex.IsMatch(pattern ?? string.Empty, @"^[A-Za-z_][A-Za-z0-9_]*$"))
                        {
                            ident = pattern;
                        }
                        if (!string.IsNullOrEmpty(ident))
                        {
                            var contentForSem = File.ReadAllText(file.abs);
                            var toks = RoslynAdapter.FindIdentifierTokens(contentForSem, ident);
                            bool ok = toks.Any(t => (string.IsNullOrEmpty(semContainer) || string.Equals(t.container, semContainer, StringComparison.Ordinal)) &&
                                                   (string.IsNullOrEmpty(semNamespace) || string.Equals(t.ns, semNamespace, StringComparison.Ordinal)));
                            if (!ok) continue;
                        }
                    }
                    var origLines = File.ReadAllLines(file.abs);
                    var lines = origLines; // for snippet/full display
                    var matchLines = origLines;
                    if (codeOnly)
                    {
                        matchLines = Helpers.CSharpTextFilter.FilterLines(origLines);
                    }
                    var matchesForFile = 0;
                    for (int i = 0; i < lines.Length; i++)
                    {
                        if (matchesForFile >= maxMatchesPerFile || results.Count >= pageSize) break;

                        bool isMatch = false;
                        Match m = null;
                        if (patternType == "regex")
                        {
                            try { m = regex.Match(matchLines[i]); isMatch = m.Success; }
                            catch (RegexMatchTimeoutException) { return new { error = "regex timeout", code = "REGEX_TIMEOUT" }; }
                        }
                        else // substring
                        {
                            isMatch = matchLines[i].IndexOf(pattern, StringComparison.OrdinalIgnoreCase) >= 0;
                        }

                        if (!isMatch) continue;

                        // Honor cursor: skip until strictly after startAfter
                        int currentMatchIdx = matchesForFile;
                        if (!pastCursor)
                        {
                            int cmp = string.Compare(file.rel, cursorRel, StringComparison.Ordinal);
                            if (cmp < 0) continue;
                            if (cmp == 0)
                            {
                                if (i + 1 < cursorLine) continue;
                                if (i + 1 == cursorLine && currentMatchIdx <= cursorMatchIndex) continue;
                            }
                            pastCursor = true;
                        }

                        string snippet = null;
                        if (returnMode != "metadata")
                        {
                            var start = Math.Max(0, i - snippetContext);
                            var end = Math.Min(lines.Length - 1, i + snippetContext);
                            snippet = string.Join("\n", lines.Skip(start).Take(end - start + 1));
                        }

                        var payloadBytes = 0;
                        if (returnMode == "full")
                        {
                            var full = string.Join("\n", origLines);
                            payloadBytes = Encoding.UTF8.GetByteCount(full);
                            if (totalBytes + payloadBytes > maxBytes)
                                return new { success = true, truncated = true, results, total = results.Count };
                            results.Add(new { path = file.rel, line = i + 1, content = full });
                        }
                        else if (returnMode == "snippets")
                        {
                            var snippetBytes = Encoding.UTF8.GetByteCount(snippet ?? string.Empty);
                            if (totalBytes + snippetBytes > maxBytes)
                                return new { success = true, truncated = true, results, total = results.Count };
                            results.Add(new { path = file.rel, line = i + 1, snippet });
                            payloadBytes = snippetBytes;
                        }
                        else // metadata
                        {
                            results.Add(new { path = file.rel, line = i + 1 });
                            payloadBytes = 0;
                        }

                        totalBytes += payloadBytes;
                        matchesForFile++;
                        lastRel = file.rel; lastLine = i + 1; lastMatchIdx = currentMatchIdx;
                    }
                }

                var next = (results.Count >= pageSize && lastRel != null) ? $"{lastRel}|{lastLine}|{lastMatchIdx}" : null;
                return new { success = true, results, total = results.Count, nextStartAfter = next };
            }
            catch (Exception e)
            {
                Debug.LogError($"[ScriptHandler] Search error: {e}");
                return new { error = e.Message, code = "SEARCH_ERROR" };
            }
        }

        // --------------- Symbols overview ---------------
        public static object GetSymbolsOverview(JObject parameters)
        {
            try
            {
                var path = parameters["path"]?.ToString();
                if (string.IsNullOrEmpty(path)) return new { error = "path is required", code = "PATH_REQUIRED" };
                var norm = PathPolicy.Normalize(path);
                if (Path.GetExtension(norm).ToLowerInvariant() != ".cs") return new { error = "Only .cs supported", code = "ONLY_CS_SUPPORTED" };
                var fs = CodeIndexService.GetFileSymbols(norm);
                if (fs == null) return new { error = "File not found", code = "FILE_NOT_FOUND" };
                return new { success = true, path = fs.path, symbols = fs.symbols };
            }
            catch (Exception e)
            {
                Debug.LogError($"[ScriptHandler] GetSymbolsOverview error: {e}");
                return new { error = e.Message, code = "SYMBOLS_GET_ERROR" };
            }
        }

        // --------------- Symbol find ---------------
        public static object FindSymbol(JObject parameters)
        {
            try
            {
                var scope = (parameters["scope"]?.ToString() ?? "assets").ToLowerInvariant();
                var name = parameters["name"]?.ToString();
                var kind = parameters["kind"]?.ToString();
                var exact = parameters["exact"]?.ToObject<bool?>() ?? false;
                if (string.IsNullOrEmpty(name)) return new { error = "name is required", code = "NAME_REQUIRED" };
                var results = CodeIndexService.FindSymbols(scope, name, kind, exact)
                    .Take(200)
                    .Select(t => new { path = t.rel, symbol = t.sym })
                    .ToList();
                return new { success = true, results, total = results.Count };
            }
            catch (Exception e)
            {
                Debug.LogError($"[ScriptHandler] FindSymbol error: {e}");
                return new { error = e.Message, code = "SYMBOL_FIND_ERROR" };
            }
        }

        // --------------- References find ---------------
        public static object FindReferences(JObject parameters)
        {
            var settings = UnityMCPSettings.Load();
            try
            {
                var scope = (parameters["scope"]?.ToString() ?? "assets").ToLowerInvariant();
                var name = parameters["name"]?.ToString();
                var snippetContext = Math.Max(0, parameters["snippetContext"]?.ToObject<int?>() ?? settings.tokenBudget.snippetContext);
                var maxMatchesPerFile = Math.Max(1, parameters["maxMatchesPerFile"]?.ToObject<int?>() ?? settings.searchDefaults.maxMatchesPerFile);
                var pageSize = Math.Max(1, parameters["pageSize"]?.ToObject<int?>() ?? settings.searchDefaults.maxResults);
                var maxBytes = Math.Max(1024, parameters["maxBytes"]?.ToObject<int?>() ?? settings.tokenBudget.maxBytes);
                if (string.IsNullOrEmpty(name)) return new { error = "name is required", code = "NAME_REQUIRED" };

                var refs = new List<object>();
                bool truncated;
                var container = parameters["container"]?.ToString();
                var ns = parameters["namespace"]?.ToString();
                var path = parameters["path"]?.ToString();
                var kind = parameters["kind"]?.ToString();
                if (!string.IsNullOrEmpty(path) && (string.IsNullOrEmpty(container) || string.IsNullOrEmpty(ns)))
                {
                    var norm = PathPolicy.Normalize(path);
                    var fs = CodeIndexService.GetFileSymbols(norm);
                    if (fs != null)
                    {
                        var target = fs.symbols.FirstOrDefault(s => (string.IsNullOrEmpty(kind) || s.kind == kind) && string.Equals(s.name, name, StringComparison.Ordinal));
                        if (target != null)
                        {
                            if (string.IsNullOrEmpty(container)) container = target.container;
                            if (string.IsNullOrEmpty(ns)) ns = target.@namespace;
                        }
                    }
                }
                foreach (var (rel, line, snippet) in CodeIndexService.FindReferences(scope, name, snippetContext, maxMatchesPerFile, pageSize, maxBytes, out truncated, container, ns))
                {
                    refs.Add(new { path = rel, line, snippet });
                }
                return new { success = true, results = refs, total = refs.Count };
            }
            catch (Exception e)
            {
                Debug.LogError($"[ScriptHandler] FindReferences error: {e}");
                return new { error = e.Message, code = "REFS_FIND_ERROR" };
            }
        }

        // --------------- Structured edit ---------------
        public static object EditStructured(JObject parameters)
        {
            var settings = UnityMCPSettings.Load();
            try
            {
                var operation = parameters["operation"]?.ToString(); // insert_before|insert_after|replace_body
                var path = parameters["path"]?.ToString();
                var symbolName = parameters["symbolName"]?.ToString();
                var kind = parameters["kind"]?.ToString();
                var preview = parameters["preview"]?.ToObject<bool?>() ?? true;
                var newText = parameters["newText"]?.ToString() ?? string.Empty;
                if (string.IsNullOrEmpty(operation) || string.IsNullOrEmpty(path) || string.IsNullOrEmpty(symbolName))
                    return new { error = "operation, path, symbolName are required", code = "PARAMS_REQUIRED" };

                var norm = PathPolicy.Normalize(path);
                if (!PathPolicy.IsAllowedWritePath(norm, settings.writePolicy.allowedExtensions, settings.writePolicy.allowAssets, settings.writePolicy.allowEmbeddedPackages))
                    return new { error = "Write not allowed for this path", code = "WRITE_NOT_ALLOWED", path = norm };

                var abs = ToAbsoluteProjectPath(norm);
                if (!File.Exists(abs)) return new { error = "File not found", code = "FILE_NOT_FOUND", path = norm };

                var fs = CodeIndexService.GetFileSymbols(norm);
                if (fs == null) return new { error = "No symbols found", code = "NO_SYMBOLS" };
                var target = fs.symbols.FirstOrDefault(s => (string.IsNullOrEmpty(kind) || s.kind == kind) && string.Equals(s.name, symbolName, StringComparison.Ordinal));
                if (target == null && !string.Equals(kind, "event", StringComparison.OrdinalIgnoreCase))
                    return new { error = "Symbol not found", code = "SYMBOL_NOT_FOUND" };

                var lines = File.ReadAllLines(abs).ToList();

                // Scope guard: forbid inserting members into method scope
                if ((operation == "insert_before" || operation == "insert_after") && string.Equals(kind, "method", StringComparison.OrdinalIgnoreCase))
                    return new { error = "Insert operations must target class/namespace, not method scope. Use kind:\"class\" and insert at class level.", code = "INVALID_SCOPE" };

                int insertLine = target != null ? target.startLine : 1;
                int endLine = target != null ? target.endLine : lines.Count;
                string before, after;

                if (operation == "insert_before") {
                    var segment = lines.Skip(segStart).Take(segLen).ToList();
                    var joined = string.Join("\n", segment);

                    int FindBodyStart(string text)
                    {
                        bool inStr = false, inChr = false, inSL = false, inML = false;
                        for (int i = 0; i < text.Length; i++)
                        {
                            char c = text[i]; char n = (i + 1 < text.Length) ? text[i + 1] : '\0';
                            if (inSL) { if (c == '\n') inSL = false; continue; }
                            if (inML) { if (c == '*' && n == '/') { inML = false; i++; } continue; }
                            if (inStr) { if (c == '\\' && n != '\0') { i++; continue; } if (c == '"') inStr = false; continue; }
                            if (inChr) { if (c == '\\' && n != '\0') { i++; continue; } if (c == '\'') inChr = false; continue; }
                            if (c == '/' && n == '/') { inSL = true; i++; continue; }
                            if (c == '/' && n == '*') { inML = true; i++; continue; }
                            if (c == '"') { inStr = true; continue; }
                            if (c == '\'') { inChr = true; continue; }
                            if (c == '{') return i; // first body brace
                        }
                        return -1;
                    }

                    int bodyStart = FindBodyStart(joined);
                    if (bodyStart < 0)
                        return new { error = "METHOD_BODY_NOT_FOUND", code = "BODY_NOT_FOUND" };

                    int depth = 0; bool inStr2 = false, inChr2 = false, inSL2 = false, inML2 = false; int bodyEnd = -1;
                    for (int i = bodyStart; i < joined.Length; i++)
                    {
                        char c = joined[i]; char n = (i + 1 < joined.Length) ? joined[i + 1] : '\0';
                        if (inSL2) { if (c == '\n') inSL2 = false; continue; }
                        if (inML2) { if (c == '*' && n == '/') { inML2 = false; i++; } continue; }
                        if (inStr2) { if (c == '\\' && n != '\0') { i++; continue; } if (c == '"') inStr2 = false; continue; }
                        if (inChr2) { if (c == '\\' && n != '\0') { i++; continue; } if (c == '\'') inChr2 = false; continue; }
                        if (c == '/' && n == '/') { inSL2 = true; i++; continue; }
                        if (c == '/' && n == '*') { inML2 = true; i++; continue; }
                        if (c == '"') { inStr2 = true; continue; }
                        if (c == '\'') { inChr2 = true; continue; }
                        if (c == '{') depth++;
                        else if (c == '}') { depth--; if (depth == 0) { bodyEnd = i; break; } }
                    }
                    if (bodyEnd < 0)
                        return new { error = "METHOD_BODY_END_NOT_FOUND", code = "BODY_END_NOT_FOUND" };

                    // map char index -> (line,col)
                    var lineOffsets = new List<int>();
                    int off = 0; foreach (var l in segment) { lineOffsets.Add(off); off += l.Length + 1; } // +1 for \n join
                    int FindLine(int idx) { for (int li = 0; li < lineOffsets.Count; li++) { int start = lineOffsets[li]; int end = (li + 1 < lineOffsets.Count) ? lineOffsets[li + 1] : int.MaxValue; if (idx < end) return li; } return lineOffsets.Count - 1; }

                    int startLi = FindLine(bodyStart);
                    int startCol = bodyStart - lineOffsets[startLi];
                    int endLi = FindLine(bodyEnd);
                    int endCol = bodyEnd - lineOffsets[endLi];

                    var newBody = (newText ?? string.Empty).Split(new[] {"\n"}, StringSplitOptions.None).ToList();
                    string prefix = segment[startLi].Substring(0, startCol);
                    string suffix = segment[endLi].Substring(Math.Min(segment[endLi].Length, endCol + 1));
                    if (newBody.Count == 0) newBody.Add("{}");
                    newBody[0] = prefix + newBody[0];
                    newBody[newBody.Count - 1] = newBody[newBody.Count - 1] + suffix;

                    int absStart = segStart + startLi;
                    int absRemove = endLi - startLi + 1;
                    var oldSeg = string.Join("\n", segment);

                    // preview before applying
                    var tmpLines = new List<string>(lines);
                    tmpLines.RemoveRange(absStart, absRemove);
                    tmpLines.InsertRange(absStart, newBody);
                    var newSeg = string.Join("\n", tmpLines.Skip(segStart).Take(tmpLines.Count - segStart - (lines.Count - (segStart + segLen))));
                    var previewDiff = BuildUnifiedDiff(norm, target.startLine, endLine, oldSeg, newSeg);
                    if (preview) return new { success = true, preview = previewDiff };

                    lines.RemoveRange(absStart, absRemove);
                    lines.InsertRange(absStart, newBody);
                }

                // Apply
                var compBefore2Params = new JObject { ["includeMessages"] = true, ["maxMessages"] = 200 };
                var compBefore2 = CompilationHandler.GetCompilationState(compBefore2Params);
                var backup = CreateBackupFor(norm, File.ReadAllText(abs));
                if (!EditorApplication.isCompiling)
                    AssetEditingGuard.Begin();
                try
                {
                    File.WriteAllText(abs, string.Join("\n", lines));
                }
                finally
                {
                    AssetEditingGuard.End();
                    var mode = parameters["refreshMode"]?.ToString()?.ToLowerInvariant();
                    if (mode == "immediate") RefreshController.ImmediateThrottled();
                    else if (mode == "none") { }
                    else RefreshController.Debounced();
                }

                var compParams = new JObject { ["includeMessages"] = true, ["maxMessages"] = 50 };
                var comp = CompilationHandler.GetCompilationState(compParams);
                var impact2 = BuildImpactReport(compBefore2, comp);
                return new { success = true, backup, compilation = comp, summary = new { path = norm, operation }, impact = impact2 };
            }
            catch (Exception e)
            {
                Debug.LogError($"[ScriptHandler] EditStructured error: {e}");
                return new { error = e.Message, code = "EDIT_STRUCTURED_ERROR" };
            }
        }

        private static IEnumerable<(string abs, string rel)> EnumerateFiles(string scope, string includeGlob, string excludeGlob = null, int maxFileSizeKB = 0)
        {
            // Enumerate Assets and/or Packages depending on scope, then apply glob include/exclude and size filter
            var roots = new List<string>();
            var projectRoot = Application.dataPath.Substring(0, Application.dataPath.Length - "/Assets".Length).Replace('\\', '/');
            if (scope == "assets" || scope == "all") roots.Add(Path.Combine(projectRoot, "Assets").Replace('\\', '/'));
            if (scope == "packages" || scope == "embedded" || scope == "all") roots.Add(Path.Combine(projectRoot, "Packages").Replace('\\', '/'));

            foreach (var root in roots)
            {
                if (!Directory.Exists(root)) continue;
                var files = Directory.EnumerateFiles(root, "*.cs", SearchOption.AllDirectories);
                foreach (var abs in files)
                {
                    var rel = abs.Replace('\\', '/').Substring(projectRoot.Length).TrimStart('/');
                    if (scope == "embedded" && !PathPolicy.IsEmbeddedPackagesPath(rel)) continue;
                    // glob include/exclude
                    if (!GlobMatcher.IsMatch(rel, includeGlob)) continue;
                    if (!string.IsNullOrEmpty(excludeGlob) && GlobMatcher.IsMatch(rel, excludeGlob)) continue;
                    // size filter
                    if (maxFileSizeKB > 0)
                    {
                        try { var fi = new FileInfo(abs); if (fi.Length > (long)maxFileSizeKB * 1024) continue; }
                        catch { }
                    }
                    yield return (abs.Replace('\\', '/'), rel);
                }
            }
        }

        // --------------- Index status ---------------
        public static object IndexStatus(JObject parameters)
        {
            try
            {
                return new { success = true, storedFiles = 0 };
            }
            catch (Exception e)
            {
                Debug.LogError($"[ScriptHandler] IndexStatus error: {e}");
                return new { error = e.Message };
            }
        }

        // --------------- Refactor: rename ---------------
        public static object RefactorRename(JObject parameters)
        {
            var settings = UnityMCPSettings.Load();
            try
            {
                var name = parameters["name"]?.ToString();
                var newName = parameters["newName"]?.ToString();
                var scope = (parameters["scope"]?.ToString() ?? "assets").ToLowerInvariant();
                var preview = parameters["preview"]?.ToObject<bool?>() ?? true;
                var maxMatchesPerFile = Math.Max(1, parameters["maxMatchesPerFile"]?.ToObject<int?>() ?? settings.searchDefaults.maxMatchesPerFile);
                var pageSize = Math.Max(1, parameters["pageSize"]?.ToObject<int?>() ?? settings.searchDefaults.maxResults);
                var allowCollisions = parameters["allowCollisions"]?.ToObject<bool?>() ?? false;
                var includeSemantic = parameters["includeSemantic"] as JArray; // [{ container, namespace }]
                if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(newName)) return new { error = "name and newName are required", code = "PARAMS_REQUIRED" };

                bool truncated;
                var occ = CodeIndexService.FindRenameOccurrences(scope, name, maxMatchesPerFile, pageSize, out truncated)
                    .ToList();

                // Group by file and filter to write-allowed paths
                var allowedOcc = occ
                    .GroupBy(o => o.rel)
                    .Select(g => new { rel = g.Key, matches = g.OrderByDescending(m => m.line).ThenByDescending(m => m.startColumn).ToList() })
                    .Where(g => PathPolicy.IsAllowedWritePath(g.rel, settings.writePolicy.allowedExtensions, settings.writePolicy.allowAssets, settings.writePolicy.allowEmbeddedPackages))
                    .ToList();

                // If includeSemantic specified and Roslyn available, restrict matches to selected container/namespace pairs
                if (includeSemantic != null && includeSemantic.Count > 0 && RoslynAdapter.IsAvailable())
                {
                    var allowPairs = new HashSet<(string c, string ns)>();
                    foreach (var it in includeSemantic)
                    {
                        var c = it["container"]?.ToString();
                        var ns = it["namespace"]?.ToString();
                        allowPairs.Add((c, ns));
                    }
                    // Filter while preserving anonymous type of allowedOcc (rel, matches)
                    var filtered = allowedOcc
                        .Select(f =>
                        {
                            var abs = ToAbsoluteProjectPath(f.rel);
                            var content = File.ReadAllText(abs);
                            var toks = RoslynAdapter.FindIdentifierTokens(content, name);
                            var allowedLines = new HashSet<int>(toks.Where(t => allowPairs.Contains((t.container, t.ns))).Select(t => t.line));
                            var newMatches = f.matches.Where(m => allowedLines.Contains(m.line)).ToList();
                            return new { rel = f.rel, matches = newMatches };
                        })
                        .Where(x => x.matches.Count > 0)
                        .ToList();
                    allowedOcc = filtered;
                }

                var previews = new List<object>();
                var collisionReport = new List<object>();
                var proximityList = new List<object>();
                bool returnLineMeta = parameters["returnLineMeta"]?.ToObject<bool?>() ?? false;
                var mixedList = new List<object>();
                foreach (var file in allowedOcc)
                {
                    var abs = ToAbsoluteProjectPath(file.rel);
                    var lines = File.ReadAllLines(abs).ToList();
                    // Build preview by applying replacements to a copy
                    var copy = new List<string>(lines);
                    // Pre-scan collision risk: newName already exists as word in file
                    try
                    {
                        var rxNew = new Regex($"\\b{Regex.Escape(newName)}\\b");
                        var existing = 0;
                        foreach (var line in lines) existing += rxNew.Matches(line).Count;
                        if (existing > 0) collisionReport.Add(new { path = file.rel, existing });
                        // Mixed names detection
                        var filtered = Helpers.CSharpTextFilter.FilterLines(lines.ToArray());
                        int oldCount = CountWordBoundaryOccurrences(filtered, name);
                        int newCount = CountWordBoundaryOccurrences(filtered, newName);
                        if (oldCount > 0 && newCount > 0)
                        {
                            proximityList.Add(new { path = file.rel, oldCount, newCount });
                        }
                    }
                    catch { }
                    foreach (var m in file.matches)
                    {
                        var idx = m.line - 1;
                        if (idx < 0 || idx >= copy.Count) continue;
                        var line = copy[idx];
                        // startColumn is 1-based
                        int start = Math.Max(0, m.startColumn - 1);
                        if (start + m.length <= line.Length)
                        {
                            copy[idx] = line.Substring(0, start) + newName + line.Substring(start + m.length);
                        }
                    }
                    var before = string.Join("\n", lines);
                    var after = string.Join("\n", copy);
                    var diff = BuildUnifiedDiff(file.rel, 1, lines.Count, before, after);
                    var linesMeta = returnLineMeta ? file.matches.Select(m => m.line).Distinct().OrderBy(x => x).ToList() : null;
                    previews.Add(new { path = file.rel, preview = diff, meta = returnLineMeta ? new { lines = linesMeta } : null });
                }

                if (preview)
                {
                    int totalOccurrencesPrev = allowedOcc.Sum(f => f.matches.Count);
                    // Proximity clusters per file
                    int proxThreshold = parameters["proximityThreshold"]?.ToObject<int?>() ?? 3;
                    int minCluster = parameters["minClusterSize"]?.ToObject<int?>() ?? 2;
                    int semMin = parameters["semanticMinCount"]?.ToObject<int?>() ?? 3;
                    var prox = allowedOcc
                        .Select(f => new { path = f.rel, clusters = BuildProximityClusters(f.matches.Select(m => m.line), proxThreshold, minCluster) })
                        .Where(x => (x.clusters as List<object>).Count > 0)
                        .ToList();
                    // Semantic proximity by container/namespace (Roslyn only)
                    var semantic = new List<object>();
                    try
                    {
                        var ctx = CodeIndexService.FindIdentifierOccurrencesByContainer(scope, name, maxMatchesPerFile, pageSize)
                            .GroupBy(o => new { o.container, o.ns })
                            .Select(g => new { container = g.Key.container, ns = g.Key.ns, count = g.Count() })
                            .Where(x => x.count >= semMin)
                            .OrderByDescending(x => x.count)
                            .Take(20)
                            .ToList();
                        semantic = ctx.Cast<object>().ToList();
                    }
                    catch { }
                    return new { success = true, previews, truncated, summary = new { filesAffected = allowedOcc.Count, occurrences = totalOccurrencesPrev }, collisions = collisionReport, warnings = new { proximity = prox, semanticProximityTypes = semantic, mixedNames = proximityList } };
                }

                // Apply
                if (!allowCollisions && collisionReport.Count > 0)
                {
                    return new { error = "Rename collision risk detected", code = "COLLISION_DETECTED", collisions = collisionReport };
                }
                var compBeforeParams = new JObject { ["includeMessages"] = true, ["maxMessages"] = 200 };
                var compBefore = CompilationHandler.GetCompilationState(compBeforeParams);
                if (!EditorApplication.isCompiling)
                    AssetEditingGuard.Begin();
                var backups = new List<object>();
                try
                {
                    foreach (var file in allowedOcc)
                    {
                        var abs = ToAbsoluteProjectPath(file.rel);
                        var lines = File.ReadAllLines(abs).ToList();
                        foreach (var m in file.matches)
                        {
                            var idx = m.line - 1;
                            if (idx < 0 || idx >= lines.Count) continue;
                            var line = lines[idx];
                            int start = Math.Max(0, m.startColumn - 1);
                            if (start + m.length <= line.Length)
                            {
                                lines[idx] = line.Substring(0, start) + newName + line.Substring(start + m.length);
                            }
                        }

                        var backup = CreateBackupFor(file.rel, File.ReadAllText(abs));
                        backups.Add(new { path = file.rel, backup });
                        File.WriteAllText(abs, string.Join("\n", lines));
                    }
                }
                finally
                {
                    AssetEditingGuard.End();
                    var mode = parameters["refreshMode"]?.ToString()?.ToLowerInvariant();
                    if (mode == "immediate") RefreshController.ImmediateThrottled();
                    else if (mode == "none") { }
                    else RefreshController.Debounced();
                }

                var compParams = new JObject { ["includeMessages"] = true, ["maxMessages"] = 50 };
                var comp = CompilationHandler.GetCompilationState(compParams);
                var impact = BuildImpactReport(compBefore, comp);
                int totalOccurrences = allowedOcc.Sum(f => f.matches.Count);
                int proxThreshold2 = parameters["proximityThreshold"]?.ToObject<int?>() ?? 3;
                int minCluster2 = parameters["minClusterSize"]?.ToObject<int?>() ?? 2;
                var prox2 = allowedOcc
                    .Select(f => new { path = f.rel, clusters = BuildProximityClusters(f.matches.Select(m => m.line), proxThreshold2, minCluster2) })
                    .Where(x => (x.clusters as List<object>).Count > 0)
                    .ToList();
                // Semantic proximity (apply)
                var semantic2 = new List<object>();
                try
                {
                    var ctx2 = CodeIndexService.FindIdentifierOccurrencesByContainer(scope, name, maxMatchesPerFile, pageSize)
                        .GroupBy(o => new { o.container, o.ns })
                        .Select(g => new { container = g.Key.container, ns = g.Key.ns, count = g.Count() })
                        .Where(x => x.count >= (parameters["semanticMinCount"]?.ToObject<int?>() ?? 3))
                        .OrderByDescending(x => x.count)
                        .Take(20)
                        .ToList();
                    semantic2 = ctx2.Cast<object>().ToList();
                }
                catch { }
                return new { success = true, backups, compilation = comp, impact, truncated, summary = new { filesChanged = backups.Count, occurrences = totalOccurrences }, warnings = new { proximity = prox2, semanticProximityTypes = semantic2, mixedNames = proximityList } };
            }
            catch (Exception e)
            {
                Debug.LogError($"[ScriptHandler] RefactorRename error: {e}");
                return new { error = e.Message, code = "RENAME_ERROR" };
            }
        }

        // --------------- Replace pattern (regex/substring) ---------------
        public static object ReplacePattern(JObject parameters)
        {
            var settings = UnityMCPSettings.Load();
            try
            {
                var patternType = (parameters["patternType"]?.ToString() ?? "substring").ToLowerInvariant();
                var pattern = parameters["pattern"]?.ToString();
                var replacement = parameters["replacement"]?.ToString() ?? string.Empty;
                var flags = parameters["flags"] as JArray;
                var scope = (parameters["scope"]?.ToString() ?? "assets").ToLowerInvariant();
                var include = parameters["include"]?.ToString() ?? "**/*.cs";
                var exclude = parameters["exclude"]?.ToString();
                var preview = parameters["preview"]?.ToObject<bool?>() ?? true;
                var pageSize = Math.Max(1, parameters["pageSize"]?.ToObject<int?>() ?? settings.searchDefaults.maxResults);
                bool maxProvided = parameters["maxMatchesPerFile"] != null;
                var maxMatchesPerFile = Math.Max(1, parameters["maxMatchesPerFile"]?.ToObject<int?>() ?? settings.searchDefaults.maxMatchesPerFile);
                var maxFileSizeKB = Math.Max(0, parameters["maxFileSizeKB"]?.ToObject<int?>() ?? 0);
                var wordBoundary = parameters["wordBoundary"]?.ToObject<bool?>() ?? false;
                var includeSemantic = parameters["includeSemantic"] as JArray; // only supported for substring+wordBoundary when Roslyn available

                if (string.IsNullOrEmpty(pattern)) return new { error = "pattern is required" };

                Regex regex = null;
                if (patternType == "regex")
                {
                    var options = RegexOptions.CultureInvariant;
                    var flagSet = flags?.Select(f => f.ToString()).ToHashSet(StringComparer.OrdinalIgnoreCase) ?? new HashSet<string>();
                    if (flagSet.Contains("i")) options |= RegexOptions.IgnoreCase;
                    if (flagSet.Contains("m")) options |= RegexOptions.Multiline;
                    if (flagSet.Contains("s")) options |= RegexOptions.Singleline;
                    try
                    {
                        regex = new Regex(pattern, options, TimeSpan.FromMilliseconds(500));
                    }
                    catch (Exception)
                    {
                        return new { error = "invalid regex pattern" };
                    }
                }

                var files = EnumerateFiles(scope, include, exclude, maxFileSizeKB).OrderBy(f => f.rel).ToList();
                var previews = new List<object>();
                int changedFiles = 0;
                int totalMatches = 0;
                bool returnLineMeta = parameters["returnLineMeta"]?.ToObject<bool?>() ?? false;
                var mixedList = new List<object>();

                foreach (var file in files)
                {
                    if (changedFiles >= pageSize) break;
                    if (!PathPolicy.IsAllowedWritePath(file.rel, settings.writePolicy.allowedExtensions, settings.writePolicy.allowAssets, settings.writePolicy.allowEmbeddedPackages))
                        continue; // skip non-writable files

                    var abs = ToAbsoluteProjectPath(file.rel);
                    var content = File.ReadAllText(abs);

                    // If includeSemantic specified and Roslyn available, filter files to those containing tokens in selected containers
                    if (includeSemantic != null && includeSemantic.Count > 0 && patternType == "substring" && wordBoundary && RoslynAdapter.IsAvailable())
                    {
                        var allowPairs = new HashSet<(string c, string ns)>();
                        foreach (var it in includeSemantic)
                        {
                            var c = it["container"]?.ToString();
                            var ns = it["namespace"]?.ToString();
                            allowPairs.Add((c, ns));
                        }
                        var toks = RoslynAdapter.FindIdentifierTokens(content, pattern);
                        bool hasAllowed = toks.Any(t => allowPairs.Contains((t.container, t.ns)));
                        if (!hasAllowed) continue;
                    }

                    string newContent = content;
                    int matches = 0;

                    bool useSemanticLines = includeSemantic != null && includeSemantic.Count > 0 && patternType == "substring" && wordBoundary && RoslynAdapter.IsAvailable();
                    if (useSemanticLines)
                    {
                        var allowPairs = new HashSet<(string c, string ns)>();
                        foreach (var it in includeSemantic)
                        {
                            var c = it["container"]?.ToString();
                            var ns = it["namespace"]?.ToString();
                            allowPairs.Add((c, ns));
                        }
                        var toks = RoslynAdapter.FindIdentifierTokens(content, pattern);
                        var allowedLines = new HashSet<int>(toks.Where(t => allowPairs.Contains((t.container, t.ns))).Select(t => t.line));
                        var linesArr = content.Split('\n');
                        var rxWord = new Regex($@"\\b{Regex.Escape(pattern)}\\b", RegexOptions.CultureInvariant);
                        for (int li = 0; li < linesArr.Length; li++)
                        {
                            if (!allowedLines.Contains(li + 1)) continue;
                            if (matches >= maxMatchesPerFile) break;
                            linesArr[li] = rxWord.Replace(linesArr[li], m =>
                            {
                                if (matches >= maxMatchesPerFile) return m.Value;
                                matches++;
                                return replacement;
                            });
                        }
                        newContent = string.Join("\n", linesArr);
                    }
                    else if (patternType == "regex")
                    {
                        try
                        {
                            newContent = regex.Replace(content, m =>
                            {
                                if (matches >= maxMatchesPerFile) return m.Value; // respect per-file cap
                                matches++;
                                return m.Result(replacement);
                            });
                        }
                        catch (RegexMatchTimeoutException)
                        {
                            return new { error = "regex timeout", code = "REGEX_TIMEOUT" };
                        }
                    }
                    else // substring
                    {
                        if (wordBoundary)
                        {
                            var rx = new Regex($@"\\b{Regex.Escape(pattern)}\\b", RegexOptions.CultureInvariant);
                            newContent = rx.Replace(content, m =>
                            {
                                if (matches >= maxMatchesPerFile) return m.Value;
                                matches++;
                                return replacement;
                            });
                        }
                        else
                        {
                            // manual limited replace
                            var sb = new StringBuilder();
                            int idx = 0;
                            while (idx < content.Length)
                            {
                                var pos = content.IndexOf(pattern, idx, StringComparison.Ordinal);
                                if (pos < 0) { sb.Append(content, idx, content.Length - idx); break; }
                                sb.Append(content, idx, pos - idx);
                                if (matches < maxMatchesPerFile)
                                {
                                    sb.Append(replacement);
                                    matches++;
                                }
                                else
                                {
                                    sb.Append(pattern);
                                }
                                idx = pos + pattern.Length;
                            }
                            newContent = sb.ToString();
                        }
                    }

                    if (matches <= 0) continue;
                    totalMatches += matches;
                    var oldLinesArr = content.Split('\n');
                    var newLinesArr = newContent.Split('\n');
                    List<int> changedLinesMeta = null;
                    if (returnLineMeta)
                    {
                        changedLinesMeta = new List<int>();
                        int maxLines = Math.Max(oldLinesArr.Length, newLinesArr.Length);
                        for (int li = 0; li < maxLines; li++)
                        {
                            var oldL = li < oldLinesArr.Length ? oldLinesArr[li] : string.Empty;
                            var newL = li < newLinesArr.Length ? newLinesArr[li] : string.Empty;
                            if (!string.Equals(oldL, newL, StringComparison.Ordinal)) changedLinesMeta.Add(li + 1);
                        }
                    }
                    var diff = BuildUnifiedDiff(file.rel, 1, oldLinesArr.Length, content, newContent);
                    previews.Add(new { path = file.rel, preview = diff, matches, meta = returnLineMeta ? new { lines = changedLinesMeta } : null });
                    // Mixed pattern/replacement detection (substring mode only)
                    try
                    {
                        if (patternType == "substring" && !string.IsNullOrEmpty(replacement))
                        {
                            var filtered = Helpers.CSharpTextFilter.FilterLines(content.Split('\n'));
                            int patCount = wordBoundary ? CountWordBoundaryOccurrences(filtered, pattern) : (content.Split(new[] { pattern }, StringSplitOptions.None).Length - 1);
                            int repCount = wordBoundary ? CountWordBoundaryOccurrences(filtered, replacement) : (content.Split(new[] { replacement }, StringSplitOptions.None).Length - 1);
                            if (patCount > 0 && repCount > 0) mixedList.Add(new { path = file.rel, patternCount = patCount, replacementCount = repCount });
                        }
                    }
                    catch { }
                    changedFiles++;
                }

                if (preview)
                {
                    // Proximity warnings per file by sampling match lines
                    var proximity = new List<object>();
                    int proxThreshold = parameters["proximityThreshold"]?.ToObject<int?>() ?? 3;
                    int minCluster = parameters["minClusterSize"]?.ToObject<int?>() ?? 2;
                    foreach (var p in previews)
                    {
                        var rel = (string)p.GetType().GetProperty("path").GetValue(p, null);
                        // Estimate lines with matches by scanning file lines (lightweight)
                        var abs = ToAbsoluteProjectPath(rel);
                        var lines = File.ReadAllLines(abs);
                        var hitLines = new List<int>();
                        if (patternType == "regex")
                        {
                            for (int i = 0; i < lines.Length; i++)
                            {
                                try { if (regex.IsMatch(lines[i])) hitLines.Add(i + 1); }
                                catch { }
                            }
                        }
                        else
                        {
                            var filtered = Helpers.CSharpTextFilter.FilterLines(lines);
                            for (int i = 0; i < filtered.Length; i++)
                            {
                                if (wordBoundary)
                                {
                                    var rx = new Regex($@"\\b{Regex.Escape(pattern)}\\b", RegexOptions.CultureInvariant);
                                    if (rx.IsMatch(filtered[i])) hitLines.Add(i + 1);
                                }
                                else if (filtered[i].IndexOf(pattern, StringComparison.Ordinal) >= 0)
                                {
                                    hitLines.Add(i + 1);
                                }
                            }
                        }
                        var clusters = BuildProximityClusters(hitLines, proxThreshold, minCluster);
                        if (clusters.Count > 0) proximity.Add(new { path = rel, clusters });
                    }
                    // Semantic proximity types when possible
                    var semantic = new List<object>();
                    if (patternType == "substring" && wordBoundary)
                    {
                        try
                        {
                            var ctx = CodeIndexService.FindIdentifierOccurrencesByContainer(scope, pattern, maxMatchesPerFile, pageSize)
                                .GroupBy(o => new { o.container, o.ns })
                                .Select(g => new { container = g.Key.container, ns = g.Key.ns, count = g.Count() })
                                .Where(x => x.count >= (parameters["semanticMinCount"]?.ToObject<int?>() ?? 3))
                                .OrderByDescending(x => x.count)
                                .Take(20)
                                .ToList();
                            semantic = ctx.Cast<object>().ToList();
                        }
                        catch { }
                    }
                    return new { success = true, previews, changedFiles, warnings = new { proximity, mixedTokens = mixedList, semanticProximityTypes = semantic } };
                }

                // Apply changes
                var compBeforeParams = new JObject { ["includeMessages"] = true, ["maxMessages"] = 200 };
                var compBefore = CompilationHandler.GetCompilationState(compBeforeParams);
                if (!EditorApplication.isCompiling)
                    AssetEditingGuard.Begin();
                var backups = new List<object>();
                try
                {
                    foreach (var p in previews)
                    {
                        var rel = (string)p.GetType().GetProperty("path").GetValue(p, null);
                        var abs = ToAbsoluteProjectPath(rel);
                        var before = File.ReadAllText(abs);
                        // Recompute new content by performing replacement again to avoid carrying big diffs
                        // Simpler: Use diff preview is not used; re-run replacement
                        string content = before;
                        string newContent;
                        int dummy;
                        int perFileCapApply = maxProvided ? maxMatchesPerFile : int.MaxValue;
                        RecomputeReplacement(content, patternType, pattern, replacement, flags, perFileCapApply, out newContent, wordBoundary);
                        var backup = CreateBackupFor(rel, before);
                        backups.Add(new { path = rel, backup });
                        File.WriteAllText(abs, newContent);
                    }
                }
                finally
                {
                    AssetEditingGuard.End();
                    // Replace: refresh immediately to reflect changes for error state
                    AssetDatabase.Refresh();
                }

                var compParams = new JObject { ["includeMessages"] = true, ["maxMessages"] = 50 };
                var comp = CompilationHandler.GetCompilationState(compParams);
                var impact = BuildImpactReport(compBefore, comp);
                // Reuse the preview proximity estimation logic for apply (best-effort)
                var proximityApply = new List<object>();
                int proxThreshold2 = parameters["proximityThreshold"]?.ToObject<int?>() ?? 3;
                int minCluster2 = parameters["minClusterSize"]?.ToObject<int?>() ?? 2;
                foreach (var p in previews)
                {
                    var rel = (string)p.GetType().GetProperty("path").GetValue(p, null);
                    var abs = ToAbsoluteProjectPath(rel);
                    var lines = File.ReadAllLines(abs);
                    var hitLines = new List<int>();
                    if (patternType == "regex")
                    {
                        for (int i = 0; i < lines.Length; i++) { try { if (regex.IsMatch(lines[i])) hitLines.Add(i + 1); } catch { } }
                    }
                    else
                    {
                        var filtered = Helpers.CSharpTextFilter.FilterLines(lines);
                        for (int i = 0; i < filtered.Length; i++)
                        {
                            if (wordBoundary)
                            {
                                var rx = new Regex($@"\\b{Regex.Escape(pattern)}\\b", RegexOptions.CultureInvariant);
                                if (rx.IsMatch(filtered[i])) hitLines.Add(i + 1);
                            }
                            else if (filtered[i].IndexOf(pattern, StringComparison.Ordinal) >= 0)
                            {
                                hitLines.Add(i + 1);
                            }
                        }
                    }
                    var clusters = BuildProximityClusters(hitLines, proxThreshold2, minCluster2);
                    if (clusters.Count > 0) proximityApply.Add(new { path = rel, clusters });
                }
                // Semantic proximity on apply
                var semanticApply = new List<object>();
                if (patternType == "substring" && wordBoundary)
                {
                    try
                    {
                        var ctx2 = CodeIndexService.FindIdentifierOccurrencesByContainer(scope, pattern, maxMatchesPerFile, pageSize)
                            .GroupBy(o => new { o.container, o.ns })
                            .Select(g => new { container = g.Key.container, ns = g.Key.ns, count = g.Count() })
                            .Where(x => x.count >= (parameters["semanticMinCount"]?.ToObject<int?>() ?? 3))
                            .OrderByDescending(x => x.count)
                            .Take(20)
                            .ToList();
                        semanticApply = ctx2.Cast<object>().ToList();
                    }
                    catch { }
                }
                return new { success = true, backups, compilation = comp, changedFiles, impact, summary = new { filesChanged = backups.Count, matches = totalMatches }, warnings = new { proximity = proximityApply, mixedTokens = mixedList, semanticProximityTypes = semanticApply } };
            }
            catch (Exception e)
            {
                Debug.LogError($"[ScriptHandler] ReplacePattern error: {e}");
                return new { error = e.Message, code = "REPLACE_ERROR" };
            }

            // local helper
            void RecomputeReplacement(string content, string ptype, string pat, string repl, JArray flg, int perFileCap, out string newContent, bool wb)
            {
                int matches = 0;
                if (ptype == "regex")
                {
                    var options = RegexOptions.CultureInvariant;
                    var flagSet = flg?.Select(f => f.ToString()).ToHashSet(StringComparer.OrdinalIgnoreCase) ?? new HashSet<string>();
                    if (flagSet.Contains("i")) options |= RegexOptions.IgnoreCase;
                    if (flagSet.Contains("m")) options |= RegexOptions.Multiline;
                    if (flagSet.Contains("s")) options |= RegexOptions.Singleline;
                    var rx = new Regex(pat, options, TimeSpan.FromMilliseconds(500));
                    newContent = rx.Replace(content, m =>
                    {
                        if (matches >= perFileCap) return m.Value;
                        matches++;
                        return m.Result(repl);
                    });
                }
                else
                {
                    if (wb)
                    {
                        var rx = new Regex($@"\\b{Regex.Escape(pat)}\\b", RegexOptions.CultureInvariant);
                        newContent = rx.Replace(content, m =>
                        {
                            if (matches >= perFileCap) return m.Value;
                            matches++;
                            return repl;
                        });
                    }
                    else
                    {
                        var sb = new StringBuilder();
                        int idx = 0;
                        while (idx < content.Length)
                        {
                            var pos = content.IndexOf(pat, idx, StringComparison.Ordinal);
                            if (pos < 0) { sb.Append(content, idx, content.Length - idx); break; }
                            sb.Append(content, idx, pos - idx);
                            if (matches < perFileCap) { sb.Append(repl); matches++; }
                            else { sb.Append(pat); }
                            idx = pos + pat.Length;
                        }
                        newContent = sb.ToString();
                    }
                }
            }
    }
}
}
