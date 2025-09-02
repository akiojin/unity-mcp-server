using System;
using System.Collections.Generic;

namespace UnityEditorMCP.Core.CodeIndex
{
    [Serializable]
    public class Symbol
    {
        public string name;
        public string kind;
        public string @namespace;
        public string container;
        public int startLine;
        public int endLine;
        public int startColumn;
        public int endColumn;
    }

    [Serializable]
    public class FileSymbols
    {
        public string path;
        public List<Symbol> symbols = new List<Symbol>();
    }

    public static class CodeIndexService
    {
        public static FileSymbols GetFileSymbols(string relPath) => new FileSymbols { path = relPath };

        public static IEnumerable<(string rel, Symbol sym)> FindSymbols(string scope, string namePattern, string kind = null, bool exact = false)
        {
            yield break;
        }

        public static IEnumerable<(string rel, int line, string snippet)> FindReferences(string scope, string symbolName, int snippetContext, int maxMatchesPerFile, int maxTotal, int maxBytes, out bool truncated, string containerFilter = null, string namespaceFilter = null)
        {
            truncated = false;
            yield break;
        }

        public static IEnumerable<(string rel, string container, string ns, int line)> FindIdentifierOccurrencesByContainer(string scope, string name, int maxPerFile, int maxTotal)
        {
            yield break;
        }

        public static IEnumerable<(string rel, int line, int startColumn, int length)> FindRenameOccurrences(string scope, string name, int maxMatchesPerFile, int maxTotal, out bool truncated)
        {
            truncated = false;
            yield break;
        }
    }
}

