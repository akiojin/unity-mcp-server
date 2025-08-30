using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using UnityEngine;

namespace UnityEditorMCP.Core.CodeIndex
{
    /// <summary>
    /// コードインデックスサービス（Roslyn必須）。
    /// Roslynで構文解析し、結果をJSONストアにキャッシュします。
    /// </summary>
    public static class CodeIndexService
    {
        private static readonly Dictionary<string, FileSymbols> Cache = new Dictionary<string, FileSymbols>(StringComparer.OrdinalIgnoreCase);
        private static string ProjectRoot => Application.dataPath.Substring(0, Application.dataPath.Length - "/Assets".Length).Replace('\\', '/');

        public static FileSymbols GetFileSymbols(string relPath)
        {
            relPath = relPath.Replace('\\', '/');
            if (Cache.TryGetValue(relPath, out var fs)) return fs;
            var abs = Path.Combine(ProjectRoot, relPath).Replace('\\', '/');
            if (!File.Exists(abs)) return null;
            try
            {
                var fileMtime = File.GetLastWriteTimeUtc(abs);
                var (stored, storedTime, ok) = JsonIndexStore.LoadFileSymbols(relPath);
                if (ok && stored != null && storedTime >= fileMtime)
                {
                    Cache[relPath] = stored;
                    return stored;
                }
            }
            catch { /* fallback to parse */ }

            // Roslynで解析（必須）
            if (!RoslynAdapter.IsAvailable())
            {
                Debug.LogError("[UnityEditorMCP] Roslyn assemblies not found. CodeIndexService requires Roslyn.");
                return stored ?? new FileSymbols { path = relPath };
            }

            var text = File.ReadAllText(abs);
            var parsed = RoslynAdapter.TryParse(relPath, text) ?? new FileSymbols { path = relPath };
            Cache[relPath] = parsed;
            try { JsonIndexStore.SaveFileSymbols(parsed, File.GetLastWriteTimeUtc(abs)); } catch { }
            return parsed;
        }

        public static IEnumerable<(string rel, FileSymbols fs)> EnumerateFiles(string scope)
        {
            var roots = new List<string>();
            if (scope == "assets" || scope == "all") roots.Add(Path.Combine(ProjectRoot, "Assets"));
            if (scope == "packages" || scope == "embedded" || scope == "all") roots.Add(Path.Combine(ProjectRoot, "Packages"));
            foreach (var root in roots)
            {
                if (!Directory.Exists(root)) continue;
                foreach (var abs in Directory.EnumerateFiles(root, "*.cs", SearchOption.AllDirectories))
                {
                    var rel = abs.Replace('\\', '/').Substring(ProjectRoot.Length).TrimStart('/');
                    if (scope == "embedded" && !rel.StartsWith("Packages/", StringComparison.OrdinalIgnoreCase)) continue;
                    yield return (rel, GetFileSymbols(rel));
                }
            }
        }

        public static IEnumerable<(string rel, Symbol sym)> FindSymbols(string scope, string namePattern, string kind = null, bool exact = false)
        {
            foreach (var (rel, fs) in EnumerateFiles(scope))
            {
                if (fs == null) continue;
                foreach (var s in fs.symbols)
                {
                    if (!string.IsNullOrEmpty(kind) && !string.Equals(s.kind, kind, StringComparison.OrdinalIgnoreCase)) continue;
                    bool match = exact ? string.Equals(s.name, namePattern, StringComparison.Ordinal) : s.name.IndexOf(namePattern, StringComparison.OrdinalIgnoreCase) >= 0;
                    if (match) yield return (rel, s);
                }
            }
        }

        public static IEnumerable<(string rel, int line, string snippet)> FindReferences(string scope, string symbolName, int snippetContext, int maxMatchesPerFile, int maxTotal, int maxBytes, out bool truncated, string containerFilter = null, string namespaceFilter = null)
        {
            truncated = false;
            int total = 0;
            int totalBytes = 0;
            var results = new List<(string rel, int line, string snippet)>();
            foreach (var (rel, _) in EnumerateFiles(scope))
            {
                if (total >= maxTotal) break;
                var abs = Path.Combine(ProjectRoot, rel).Replace('\\', '/');
                var content = File.ReadAllText(abs);
                var lines = content.Split(new[] { '\n' }, StringSplitOptions.None);

                // Prefer Roslyn identifier tokens to avoid strings/comments
                List<int> lineHits = new List<int>();
                if (RoslynAdapter.IsAvailable())
                {
                    var toks = RoslynAdapter.FindIdentifierTokens(content, symbolName).ToList();
                    var filtered = toks.Where(t =>
                    {
                        bool ok = true;
                        if (!string.IsNullOrEmpty(containerFilter)) ok &= string.Equals(t.container, containerFilter, StringComparison.Ordinal);
                        if (!string.IsNullOrEmpty(namespaceFilter)) ok &= string.Equals(t.ns, namespaceFilter, StringComparison.Ordinal);
                        return ok;
                    });
                    lineHits = filtered.Select(t => t.line).Distinct().OrderBy(x => x).ToList();
                }
                else
                {
                    // fallback to word boundary regex on code-only filtered lines
                    var filtered = Helpers.CSharpTextFilter.FilterLines(lines);
                    for (int i = 0; i < filtered.Length; i++) if (WordContains(filtered[i], symbolName)) lineHits.Add(i + 1);
                }

                int perFile = 0;
                foreach (var line in lineHits)
                {
                    if (perFile >= maxMatchesPerFile || total >= maxTotal) break;
                    int i = line - 1;
                    var start = Math.Max(0, i - snippetContext);
                    var end = Math.Min(lines.Length - 1, i + snippetContext);
                    var snippet = string.Join("\n", lines.Skip(start).Take(end - start + 1));
                    var bytes = Encoding.UTF8.GetByteCount(snippet);
                    if (totalBytes + bytes > maxBytes) { truncated = true; return results; }
                    results.Add((rel, line, snippet));
                    total++; perFile++; totalBytes += bytes;
                }
            }
            return results;
        }

        private static bool WordContains(string line, string word)
        {
            if (string.IsNullOrEmpty(word)) return false;
            var rx = new Regex($@"\\b{Regex.Escape(word)}\\b");
            return rx.IsMatch(line);
        }

        public static IEnumerable<(string rel, int line, int startColumn, int length)> FindRenameOccurrences(string scope, string name, int maxMatchesPerFile, int maxTotal, out bool truncated)
        {
            truncated = false;
            int total = 0;
            var results = new List<(string rel, int line, int startColumn, int length)>();
            foreach (var (rel, _) in EnumerateFiles(scope))
            {
                if (total >= maxTotal) break;
                var abs = Path.Combine(ProjectRoot, rel).Replace('\\', '/');
                var content = File.ReadAllText(abs);
                int perFile = 0;
                if (RoslynAdapter.IsAvailable())
                {
                    foreach (var (line, column, length, container, ns) in RoslynAdapter.FindIdentifierTokens(content, name))
                    {
                        results.Add((rel, line, column, length));
                        perFile++; total++;
                        if (perFile >= maxMatchesPerFile || total >= maxTotal) break;
                    }
                }
                else
                {
                    var rx = new Regex($@"\\b{Regex.Escape(name)}\\b");
                    var lines = content.Split(new[] { '\n' }, StringSplitOptions.None);
                    var filtered = Helpers.CSharpTextFilter.FilterLines(lines);
                    for (int i = 0; i < lines.Length; i++)
                    {
                        if (perFile >= maxMatchesPerFile || total >= maxTotal) break;
                        foreach (Match m in rx.Matches(filtered[i]))
                        {
                            results.Add((rel, i + 1, m.Index + 1, m.Length));
                            perFile++; total++;
                            if (perFile >= maxMatchesPerFile || total >= maxTotal) break;
                        }
                    }
                }
            }
            return results;
        }

        // When Roslyn is available, find identifier occurrences grouped with container/namespace context
        public static IEnumerable<(string rel, string container, string ns, int line)> FindIdentifierOccurrencesByContainer(string scope, string name, int maxPerFile, int maxTotal)
        {
            if (!RoslynAdapter.IsAvailable()) yield break;
            int total = 0;
            foreach (var (rel, _) in EnumerateFiles(scope))
            {
                if (total >= maxTotal) break;
                var abs = Path.Combine(ProjectRoot, rel).Replace('\\', '/');
                var content = File.ReadAllText(abs);
                int perFile = 0;
                foreach (var tok in RoslynAdapter.FindIdentifierTokens(content, name))
                {
                    yield return (rel, tok.container, tok.ns, tok.line);
                    perFile++; total++;
                    if (perFile >= maxPerFile || total >= maxTotal) break;
                }
            }
        }
    }
}
