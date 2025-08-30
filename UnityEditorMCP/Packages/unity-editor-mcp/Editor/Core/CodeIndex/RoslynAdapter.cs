using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace UnityEditorMCP.Core.CodeIndex
{
    /// <summary>
    /// Roslyn adapter (direct references). Parses C# source and exposes symbol info and identifier tokens.
    /// </summary>
    public static class RoslynAdapter
    {
        public static bool IsAvailable() => true;

        public static FileSymbols TryParse(string relPath, string sourceText)
        {
            try
            {
                var tree = CSharpSyntaxTree.ParseText(sourceText);
                var root = tree.GetRoot();
                var fs = new FileSymbols { path = relPath };

                foreach (var node in root.DescendantNodes())
                {
                    if (node is ClassDeclarationSyntax cls)
                    {
                        AddType(fs, cls.Identifier.ValueText, "class", cls);
                    }
                    else if (node is StructDeclarationSyntax str)
                    {
                        AddType(fs, str.Identifier.ValueText, "struct", str);
                    }
                    else if (node is InterfaceDeclarationSyntax iface)
                    {
                        AddType(fs, iface.Identifier.ValueText, "interface", iface);
                    }
                    else if (node is EnumDeclarationSyntax en)
                    {
                        AddType(fs, en.Identifier.ValueText, "enum", en);
                    }
                    else if (node is MethodDeclarationSyntax m)
                    {
                        AddMember(fs, m.Identifier.ValueText, "method", m);
                    }
                    else if (node is PropertyDeclarationSyntax p)
                    {
                        AddMember(fs, p.Identifier.ValueText, "property", p);
                    }
                }

                return fs;
            }
            catch
            {
                return null;
            }
        }

        public static IEnumerable<(int line, int column, int length, string container, string ns)> FindIdentifierTokens(string sourceText, string name)
        {
            var list = new List<(int, int, int, string, string)>();
            try
            {
                var tree = CSharpSyntaxTree.ParseText(sourceText);
                var root = tree.GetRoot();
                foreach (var tok in root.DescendantTokens())
                {
                    if (tok.Kind() == SyntaxKind.IdentifierToken && string.Equals(tok.ValueText, name, StringComparison.Ordinal))
                    {
                        var span = tok.GetLocation().GetLineSpan();
                        int line = span.StartLinePosition.Line + 1;
                        int col = span.StartLinePosition.Character + 1;
                        var parent = tok.Parent as SyntaxNode ?? root;
                        var container = GetEnclosingTypeName(parent);
                        var ns = GetNamespace(parent);
                        list.Add((line, col, name.Length, container, ns));
                    }
                }
            }
            catch { }
            return list;
        }

        private static void AddType(FileSymbols fs, string name, string kind, SyntaxNode node)
        {
            var span = node.GetLocation().GetLineSpan();
            fs.symbols.Add(new Symbol
            {
                name = name,
                kind = kind,
                @namespace = GetNamespace(node),
                container = GetEnclosingTypeName(node),
                startLine = span.StartLinePosition.Line + 1,
                endLine = span.EndLinePosition.Line + 1,
                startColumn = 1,
                endColumn = 1
            });
        }

        private static void AddMember(FileSymbols fs, string name, string kind, SyntaxNode node)
        {
            var span = node.GetLocation().GetLineSpan();
            fs.symbols.Add(new Symbol
            {
                name = name,
                kind = kind,
                @namespace = GetNamespace(node),
                container = GetEnclosingTypeName(node),
                startLine = span.StartLinePosition.Line + 1,
                endLine = span.EndLinePosition.Line + 1,
                startColumn = 1,
                endColumn = 1
            });
        }

        private static string GetNamespace(SyntaxNode node)
        {
            var parts = new List<string>();
            var cur = node;
            while (cur != null)
            {
                if (cur is NamespaceDeclarationSyntax nsDecl)
                {
                    parts.Add(nsDecl.Name.ToString());
                }
                else if (cur is FileScopedNamespaceDeclarationSyntax fileNs)
                {
                    parts.Add(fileNs.Name.ToString());
                }
                cur = cur.Parent;
            }
            parts.Reverse();
            return string.Join(".", parts);
        }

        private static string GetEnclosingTypeName(SyntaxNode node)
        {
            var cur = node;
            while (cur != null)
            {
                switch (cur)
                {
                    case ClassDeclarationSyntax cls:
                        return cls.Identifier.ValueText;
                    case StructDeclarationSyntax str:
                        return str.Identifier.ValueText;
                    case InterfaceDeclarationSyntax iface:
                        return iface.Identifier.ValueText;
                    case EnumDeclarationSyntax en:
                        return en.Identifier.ValueText;
                }
                cur = cur.Parent;
            }
            return null;
        }
    }
}

