using System.Collections.Generic;

namespace UnityEditorMCP.Core.CodeIndex
{
    // Minimal stub to satisfy legacy references. Returns no semantic data.
    public static class RoslynAdapter
    {
        public static bool IsAvailable() => false;

        public static IEnumerable<(int line, int column, int length, string container, string ns)> FindIdentifierTokens(string sourceText, string name)
        {
            yield break;
        }
    }
}

