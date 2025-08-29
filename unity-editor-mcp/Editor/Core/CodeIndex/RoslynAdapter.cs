using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace UnityEditorMCP.Core.CodeIndex
{
    /// <summary>
    /// Reflection-based Roslyn adapter. Uses Microsoft.CodeAnalysis.CSharp if available at runtime.
    /// Never references types directly to avoid hard dependency.
    /// </summary>
    public static class RoslynAdapter
    {
        public static bool IsAvailable()
        {
            return GetCSharpAssembly() != null && GetCoreAssembly() != null;
        }

        public static FileSymbols TryParse(string relPath, string sourceText)
        {
            try
            {
                var csharpAsm = GetCSharpAssembly();
                var coreAsm = GetCoreAssembly();
                if (csharpAsm == null || coreAsm == null) return null;

                var csharpSyntaxTreeType = csharpAsm.GetType("Microsoft.CodeAnalysis.CSharp.CSharpSyntaxTree");
                var syntaxNodeType = coreAsm.GetType("Microsoft.CodeAnalysis.SyntaxNode");
                var syntaxTree = csharpSyntaxTreeType?.GetMethod("ParseText", new[] { typeof(string) })?.Invoke(null, new object[] { sourceText });
                if (syntaxTree == null) return null;

                var getRoot = syntaxTree.GetType().GetMethod("GetRoot", Type.EmptyTypes);
                var root = getRoot?.Invoke(syntaxTree, null);
                if (root == null) return null;

                var fs = new FileSymbols { path = relPath };

                // Enumerate all nodes
                var descMethod = syntaxNodeType.GetMethod("DescendantNodes", Type.EmptyTypes);
                var nodesEnum = descMethod.Invoke(root, null) as System.Collections.IEnumerable;
                if (nodesEnum == null) return null;

                var nodeList = new List<object>();
                foreach (var n in nodesEnum) nodeList.Add(n);

                foreach (var node in nodeList)
                {
                    var t = node.GetType();
                    var tn = t.Name;
                    if (tn == "ClassDeclarationSyntax" || tn == "StructDeclarationSyntax" || tn == "InterfaceDeclarationSyntax" || tn == "EnumDeclarationSyntax")
                    {
                        var name = GetIdentifierText(t, node);
                        var kind = tn.Replace("DeclarationSyntax", string.Empty).ToLowerInvariant();
                        var (startLine, endLine) = GetLineSpan(node);
                        fs.symbols.Add(new Symbol
                        {
                            name = name,
                            kind = kind,
                            @namespace = GetNamespace(node),
                            container = GetEnclosingTypeName(node),
                            startLine = startLine,
                            endLine = endLine,
                            startColumn = 1,
                            endColumn = 1
                        });
                    }
                    else if (tn == "MethodDeclarationSyntax")
                    {
                        var name = GetIdentifierText(t, node);
                        var (startLine, endLine) = GetLineSpan(node);
                        fs.symbols.Add(new Symbol
                        {
                            name = name,
                            kind = "method",
                            @namespace = GetNamespace(node),
                            container = GetEnclosingTypeName(node),
                            startLine = startLine,
                            endLine = endLine,
                            startColumn = 1,
                            endColumn = 1
                        });
                    }
                    else if (tn == "PropertyDeclarationSyntax")
                    {
                        var name = GetIdentifierText(t, node);
                        var (startLine, endLine) = GetLineSpan(node);
                        fs.symbols.Add(new Symbol
                        {
                            name = name,
                            kind = "property",
                            @namespace = GetNamespace(node),
                            container = GetEnclosingTypeName(node),
                            startLine = startLine,
                            endLine = endLine,
                            startColumn = 1,
                            endColumn = 1
                        });
                    }
                }

                return fs;
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Finds all identifier token occurrences matching the given name. Skips strings/comments automatically by relying on the syntax tree.
        /// Returns 1-based line/column and token length.
        /// </summary>
        public static IEnumerable<(int line, int column, int length, string container, string ns)> FindIdentifierTokens(string sourceText, string name)
        {
            var list = new List<(int, int, int, string, string)>();
            try
            {
                var csharpAsm = GetCSharpAssembly();
                var coreAsm = GetCoreAssembly();
                if (csharpAsm == null || coreAsm == null) return list;

                var csharpSyntaxTreeType = csharpAsm.GetType("Microsoft.CodeAnalysis.CSharp.CSharpSyntaxTree");
                var syntaxNodeType = coreAsm.GetType("Microsoft.CodeAnalysis.SyntaxNode");
                var syntaxTokenType = coreAsm.GetType("Microsoft.CodeAnalysis.SyntaxToken");
                var syntaxKindType = csharpAsm.GetType("Microsoft.CodeAnalysis.CSharp.SyntaxKind");
                if (csharpSyntaxTreeType == null || syntaxNodeType == null || syntaxTokenType == null || syntaxKindType == null) return list;

                var tree = csharpSyntaxTreeType.GetMethod("ParseText", new[] { typeof(string) })?.Invoke(null, new object[] { sourceText });
                if (tree == null) return list;
                var root = tree.GetType().GetMethod("GetRoot", Type.EmptyTypes)?.Invoke(tree, null);
                if (root == null) return list;

                // Enumerate tokens
                var descTokens = syntaxNodeType.GetMethod("DescendantTokens", Type.EmptyTypes)?.Invoke(root, null) as System.Collections.IEnumerable;
                if (descTokens == null) return list;

                // SyntaxKind.IdentifierToken value
                var idKind = Enum.Parse(syntaxKindType, "IdentifierToken");

                foreach (var tok in descTokens)
                {
                    // if (tok.Kind() == SyntaxKind.IdentifierToken && tok.ValueText == name)
                    var kindObj = syntaxTokenType.GetMethod("get_Kind")?.Invoke(tok, null);
                    if (kindObj == null || !kindObj.Equals(idKind)) continue;
                    var valueText = syntaxTokenType.GetProperty("ValueText")?.GetValue(tok) as string;
                    if (!string.Equals(valueText, name, StringComparison.Ordinal)) continue;

                    var loc = syntaxTokenType.GetMethod("GetLocation")?.Invoke(tok, null);
                    var lineSpan = loc?.GetType().GetMethod("GetLineSpan", Type.EmptyTypes)?.Invoke(loc, null);
                    if (lineSpan == null) continue;
                    var start = lineSpan.GetType().GetProperty("StartLinePosition")?.GetValue(lineSpan);
                    int line = (int)(start?.GetType().GetProperty("Line")?.GetValue(start) ?? 0) + 1;
                    int column = (int)(start?.GetType().GetProperty("Character")?.GetValue(start) ?? 0) + 1;
                    int length = name.Length;
                    // container/ns via token.Parent chain
                    var parent = syntaxTokenType.GetProperty("Parent")?.GetValue(tok);
                    string container = GetEnclosingTypeName(parent ?? root);
                    string ns = GetNamespace(parent ?? root);
                    list.Add((line, column, length, container, ns));
                }
            }
            catch { }
            return list;
        }

        private static (int, int) GetLineSpan(object node)
        {
            var loc = node.GetType().GetMethod("GetLocation")?.Invoke(node, null);
            var lineSpan = loc?.GetType().GetMethod("GetLineSpan", Type.EmptyTypes)?.Invoke(loc, null);
            var spanType = lineSpan?.GetType();
            var start = spanType?.GetProperty("StartLinePosition")?.GetValue(lineSpan);
            var end = spanType?.GetProperty("EndLinePosition")?.GetValue(lineSpan);
            int s = (int)(start?.GetType().GetProperty("Line")?.GetValue(start) ?? 0) + 1;
            int e = (int)(end?.GetType().GetProperty("Line")?.GetValue(end) ?? 0) + 1;
            return (s, e);
        }

        private static string GetIdentifierText(Type nodeType, object node)
        {
            var ident = nodeType.GetProperty("Identifier")?.GetValue(node);
            if (ident == null) return null;
            var vt = ident.GetType().GetProperty("ValueText")?.GetValue(ident) as string;
            return vt;
        }

        private static string GetNamespace(object node)
        {
            // Walk parents to find namespaces; supports file-scoped and block namespace
            var nsParts = new List<string>();
            var cur = node;
            while (cur != null)
            {
                var p = cur.GetType().GetProperty("Parent")?.GetValue(cur);
                if (p == null) break;
                var pn = p.GetType().Name;
                if (pn == "NamespaceDeclarationSyntax" || pn == "FileScopedNamespaceDeclarationSyntax")
                {
                    var nameProp = p.GetType().GetProperty("Name")?.GetValue(p);
                    var nsStr = nameProp?.ToString();
                    if (!string.IsNullOrEmpty(nsStr)) nsParts.Add(nsStr);
                }
                cur = p;
            }
            nsParts.Reverse();
            return string.Join(".", nsParts);
        }

        private static string GetEnclosingTypeName(object node)
        {
            var cur = node;
            while (cur != null)
            {
                var p = cur.GetType().GetProperty("Parent")?.GetValue(cur);
                if (p == null) break;
                var pn = p.GetType().Name;
                if (pn == "ClassDeclarationSyntax" || pn == "StructDeclarationSyntax" || pn == "InterfaceDeclarationSyntax" || pn == "EnumDeclarationSyntax")
                {
                    var name = GetIdentifierText(p.GetType(), p);
                    return name;
                }
                cur = p;
            }
            return null;
        }

        private static Assembly GetCSharpAssembly()
        {
            return AppDomain.CurrentDomain.GetAssemblies().FirstOrDefault(a => a.GetName().Name == "Microsoft.CodeAnalysis.CSharp");
        }

        private static Assembly GetCoreAssembly()
        {
            // Some distributions ship the common assembly under the name "Microsoft.CodeAnalysis.Common".
            // Accept either the canonical name or the common-suffixed variant.
            return AppDomain.CurrentDomain
                .GetAssemblies()
                .FirstOrDefault(a =>
                {
                    var name = a.GetName().Name;
                    return name == "Microsoft.CodeAnalysis" || name == "Microsoft.CodeAnalysis.Common";
                });
        }
    }
}
