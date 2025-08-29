using System;
using System.Collections.Generic;

namespace UnityEditorMCP.Core.CodeIndex
{
    [Serializable]
    public class Symbol
    {
        public string name;
        public string kind; // namespace|class|struct|interface|enum|method|property
        public string @namespace;
        public string container; // enclosing type name
        public int startLine;
        public int endLine;
        public int startColumn;
        public int endColumn;
    }

    [Serializable]
    public class FileSymbols
    {
        public string path; // relative project path
        public List<Symbol> symbols = new List<Symbol>();
    }
}

