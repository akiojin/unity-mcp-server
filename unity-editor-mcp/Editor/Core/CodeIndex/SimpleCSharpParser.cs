using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace UnityEditorMCP.Core.CodeIndex
{
    /// <summary>
    /// Lightweight, dependency-free C# symbol parser. Not Roslyn-accurate but good enough for class/method/property spans.
    /// Operates on lines with a simple brace stack and regex-based headers. Designed for Unity Editor usage.
    /// </summary>
    public static class SimpleCSharpParser
    {
        private static readonly Regex NsRx = new Regex(@"^\s*namespace\s+([A-Za-z0-9_.]+)", RegexOptions.Compiled);
        private static readonly Regex TypeRx = new Regex(@"^\s*(?:public|internal|protected|private|abstract|sealed|static|partial|new|readonly|\s)*\s*(class|struct|interface|enum)\s+([A-Za-z0-9_]+)", RegexOptions.Compiled);
        private static readonly Regex MethodRx = new Regex(@"^\s*(?:public|internal|protected|private|static|virtual|override|async|sealed|extern|unsafe|new|readonly|\s)+[A-Za-z0-9_<>,\[\]\?\(\)\.:\s]+\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:\{|=>|;)", RegexOptions.Compiled);
        private static readonly Regex PropertyRx = new Regex(@"^\s*(?:public|internal|protected|private|static|virtual|override|sealed|new|readonly|\s)+[A-Za-z0-9_<>,\[\]\?\.:\s]+\s+([A-Za-z0-9_]+)\s*\{", RegexOptions.Compiled);

        public static FileSymbols Parse(string relPath, string[] lines)
        {
            var result = new FileSymbols { path = relPath };
            var nsStack = new Stack<(string name, int startLine)>();
            var typeStack = new Stack<(string kind, string name, int startLine, int braceDepthAtStart)>();

            int braceDepth = 0;
            for (int i = 0; i < lines.Length; i++)
            {
                var line = lines[i];
                var nsMatch = NsRx.Match(line);
                if (nsMatch.Success)
                {
                    var ns = nsMatch.Groups[1].Value;
                    nsStack.Push((ns, i + 1));
                }

                var typeMatch = TypeRx.Match(line);
                if (typeMatch.Success)
                {
                    var kind = typeMatch.Groups[1].Value;
                    var name = typeMatch.Groups[2].Value;
                    typeStack.Push((kind, name, i + 1, braceDepth));
                    result.symbols.Add(new Symbol
                    {
                        name = name,
                        kind = kind,
                        @namespace = string.Join(".", nsStack.Reverse().Select(n => n.name)),
                        container = typeStack.Count > 1 ? typeStack.ElementAt(1).name : null,
                        startLine = i + 1,
                        startColumn = 1
                    });
                }

                var methodMatch = MethodRx.Match(line);
                if (methodMatch.Success)
                {
                    var name = methodMatch.Groups[1].Value;
                    result.symbols.Add(new Symbol
                    {
                        name = name,
                        kind = "method",
                        @namespace = string.Join(".", nsStack.Reverse().Select(n => n.name)),
                        container = typeStack.Count > 0 ? typeStack.Peek().name : null,
                        startLine = i + 1,
                        startColumn = 1
                    });
                }

                var propMatch = PropertyRx.Match(line);
                if (propMatch.Success)
                {
                    var name = propMatch.Groups[1].Value;
                    result.symbols.Add(new Symbol
                    {
                        name = name,
                        kind = "property",
                        @namespace = string.Join(".", nsStack.Reverse().Select(n => n.name)),
                        container = typeStack.Count > 0 ? typeStack.Peek().name : null,
                        startLine = i + 1,
                        startColumn = 1
                    });
                }

                // Update brace depth and close types
                braceDepth += CountChar(line, '{');
                braceDepth -= CountChar(line, '}');

                // Close types when braces retreat past start depth
                while (typeStack.Count > 0 && braceDepth < typeStack.Peek().braceDepthAtStart)
                {
                    var closed = typeStack.Pop();
                    var sym = result.symbols.LastOrDefault(s => s.kind == closed.kind && s.name == closed.name && s.endLine == 0);
                    if (sym != null) sym.endLine = i + 1;
                }
            }

            // Close any remaining open symbols at EOF
            int lastLine = Math.Max(1, lines.Length);
            foreach (var sym in result.symbols)
            {
                if (sym.endLine == 0) sym.endLine = lastLine;
                if (sym.endColumn == 0) sym.endColumn = 1;
            }

            return result;
        }

        private static int CountChar(string s, char c)
        {
            int count = 0;
            for (int i = 0; i < s.Length; i++) if (s[i] == c) count++;
            return count;
        }
    }
}

