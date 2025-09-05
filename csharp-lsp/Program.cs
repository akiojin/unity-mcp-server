using System.Text.Json;
using System.Text;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

// Minimal LSP over stdio: initialize / initialized / shutdown / exit / documentSymbol / workspace/symbol / mcp/referencesByName / mcp/renameByNamePath / mcp/replaceSymbolBody / mcp/insertBeforeSymbol / mcp/insertAfterSymbol
// This is a lightweight PoC that parses each file independently using Roslyn SyntaxTree.

var server = new LspServer();
await server.RunAsync();

sealed class LspServer
{
    private readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };
    private bool _shutdownRequested;
    private string _rootDir = "";

    public async Task RunAsync()
    {
        while (true)
        {
            var msg = await ReadMessageAsync();
            if (msg is null) break;
            try
            {
                var json = JsonDocument.Parse(msg);
                var root = json.RootElement;
                var method = root.TryGetProperty("method", out var m) ? m.GetString() : null;
                var id = root.TryGetProperty("id", out var idEl) ? idEl : default;
                if (method is not null)
                {
                    if (method == "initialize")
                    {
                        try
                        {
                            var rootUri = root.GetProperty("params").GetProperty("rootUri").GetString();
                            if (!string.IsNullOrEmpty(rootUri)) _rootDir = Uri2Path(rootUri);
                        }
                        catch { }
                        var resp = new
                        {
                            jsonrpc = "2.0",
                            id = id.ValueKind == JsonValueKind.Number ? id.GetInt32() : (int?)null,
                            result = new
                            {
                                capabilities = new { documentSymbolProvider = true }
                            }
                        };
                        await WriteMessageAsync(resp);
                    }
                    else if (method == "shutdown")
                    {
                        _shutdownRequested = true;
                        var resp = new { jsonrpc = "2.0", id = id.GetInt32(), result = (object?)null };
                        await WriteMessageAsync(resp);
                    }
                    else if (method == "exit")
                    {
                        break;
                    }
                    else if (method == "textDocument/documentSymbol")
                    {
                        var uri = root.GetProperty("params").GetProperty("textDocument").GetProperty("uri").GetString() ?? "";
                        var path = Uri2Path(uri);
                        var result = await DocumentSymbolsAsync(path);
                        var resp = new { jsonrpc = "2.0", id = id.GetInt32(), result };
                        await WriteMessageAsync(resp);
                    }
                    else if (method == "workspace/symbol")
                    {
                        var query = root.GetProperty("params").GetProperty("query").GetString() ?? "";
                        var result = await WorkspaceSymbolAsync(query);
                        await WriteMessageAsync(new { jsonrpc = "2.0", id = id.GetInt32(), result });
                    }
                    else if (method == "mcp/referencesByName")
                    {
                        var symName = root.GetProperty("params").GetProperty("name").GetString() ?? "";
                        var list = await ReferencesByNameAsync(symName);
                        await WriteMessageAsync(new { jsonrpc = "2.0", id = id.GetInt32(), result = list });
                    }
                    else if (method == "mcp/renameByNamePath")
                    {
                        var p = root.GetProperty("params");
                        var relative = p.GetProperty("relative").GetString() ?? "";
                        var namePath = p.GetProperty("namePath").GetString() ?? "";
                        var newName = p.GetProperty("newName").GetString() ?? "";
                        var apply = p.TryGetProperty("apply", out var a) && a.GetBoolean();
                        var resp = await RenameByNamePathAsync(relative, namePath, newName, apply);
                        await WriteMessageAsync(new { jsonrpc = "2.0", id = id.GetInt32(), result = resp });
                    }
                    else if (method == "mcp/replaceSymbolBody")
                    {
                        var p = root.GetProperty("params");
                        var relative = p.GetProperty("relative").GetString() ?? "";
                        var namePath = p.GetProperty("namePath").GetString() ?? "";
                        var body = p.GetProperty("body").GetString() ?? "";
                        var apply = p.TryGetProperty("apply", out var a2) && a2.GetBoolean();
                        var resp = await ReplaceSymbolBodyAsync(relative, namePath, body, apply);
                        await WriteMessageAsync(new { jsonrpc = "2.0", id = id.GetInt32(), result = resp });
                    }
                    else if (method == "mcp/insertBeforeSymbol" || method == "mcp/insertAfterSymbol")
                    {
                        var p = root.GetProperty("params");
                        var relative = p.GetProperty("relative").GetString() ?? "";
                        var namePath = p.GetProperty("namePath").GetString() ?? "";
                        var text = p.GetProperty("text").GetString() ?? "";
                        var apply = p.TryGetProperty("apply", out var a3) && a3.GetBoolean();
                        bool after = method.EndsWith("AfterSymbol", StringComparison.Ordinal);
                        var resp = await InsertAroundSymbolAsync(relative, namePath, text, after, apply);
                        await WriteMessageAsync(new { jsonrpc = "2.0", id = id.GetInt32(), result = resp });
                    }
                    else
                    {
                        // respond with empty for unknown methods to keep client unblocked
                        if (id.ValueKind != JsonValueKind.Undefined)
                        {
                            await WriteMessageAsync(new { jsonrpc = "2.0", id = id.GetInt32(), result = (object?)null });
                        }
                    }
                }
            }
            catch
            {
                // ignore malformed messages
            }
        }
    }

    private static string Uri2Path(string uri)
    {
        if (uri.StartsWith("file://")) uri = uri.Substring("file://".Length);
        return uri.Replace('/', System.IO.Path.DirectorySeparatorChar);
    }

    private async Task<object> DocumentSymbolsAsync(string path)
    {
        try
        {
            var text = await File.ReadAllTextAsync(path);
            var tree = CSharpSyntaxTree.ParseText(text);
            var root = await tree.GetRootAsync();
            var list = new List<object>();
            foreach (var node in root.DescendantNodes())
            {
                if (node is NamespaceDeclarationSyntax ns)
                {
                    list.Add(MakeSym(ns.Name.ToString(), 3, node));
                }
                else if (node is ClassDeclarationSyntax c)
                {
                    list.Add(MakeSym(c.Identifier.ValueText, 5, node));
                }
                else if (node is StructDeclarationSyntax s)
                {
                    list.Add(MakeSym(s.Identifier.ValueText, 23, node));
                }
                else if (node is InterfaceDeclarationSyntax i)
                {
                    list.Add(MakeSym(i.Identifier.ValueText, 11, node));
                }
                else if (node is EnumDeclarationSyntax e)
                {
                    list.Add(MakeSym(e.Identifier.ValueText, 10, node));
                }
                else if (node is MethodDeclarationSyntax m)
                {
                    list.Add(MakeSym(m.Identifier.ValueText, 6, node));
                }
                else if (node is PropertyDeclarationSyntax p)
                {
                    list.Add(MakeSym(p.Identifier.ValueText, 7, node));
                }
                else if (node is FieldDeclarationSyntax f)
                {
                    var v = f.Declaration.Variables.FirstOrDefault();
                    if (v != null) list.Add(MakeSym(v.Identifier.ValueText, 8, node));
                }
            }
            return list;
        }
        catch
        {
            return Array.Empty<object>();
        }
    }

    private async Task<object> WorkspaceSymbolAsync(string query)
    {
        var results = new List<object>();
        foreach (var file in EnumerateUnityCsFiles(_rootDir))
        {
            try
            {
                var text = await File.ReadAllTextAsync(file);
                var tree = CSharpSyntaxTree.ParseText(text);
                var root = await tree.GetRootAsync();
                foreach (var node in root.DescendantNodes())
                {
                    (int kind, string name) = node switch
                    {
                        ClassDeclarationSyntax c => (5, c.Identifier.ValueText),
                        StructDeclarationSyntax s => (23, s.Identifier.ValueText),
                        InterfaceDeclarationSyntax i => (11, i.Identifier.ValueText),
                        EnumDeclarationSyntax e => (10, e.Identifier.ValueText),
                        MethodDeclarationSyntax m => (6, m.Identifier.ValueText),
                        PropertyDeclarationSyntax p => (7, p.Identifier.ValueText),
                        FieldDeclarationSyntax f => (8, f.Declaration.Variables.FirstOrDefault()?.Identifier.ValueText ?? ""),
                        _ => (0, "")
                    };
                    if (kind == 0 || string.IsNullOrEmpty(name)) continue;
                    if (name.IndexOf(query, StringComparison.OrdinalIgnoreCase) < 0) continue;
                    var span = node.GetLocation().GetLineSpan();
                    var start = new { line = span.StartLinePosition.Line, character = span.StartLinePosition.Character };
                    var end = new { line = span.EndLinePosition.Line, character = span.EndLinePosition.Character };
                    results.Add(new
                    {
                        name,
                        kind,
                        location = new { uri = Path2Uri(file), range = new { start, end } }
                    });
                }
            }
            catch { }
        }
        return results;
    }

    private async Task<object> ReferencesByNameAsync(string name)
    {
        var list = new List<object>();
        foreach (var file in EnumerateUnityCsFiles(_rootDir))
        {
            try
            {
                var lines = await File.ReadAllLinesAsync(file);
                for (int i = 0; i < lines.Length; i++)
                {
                    var line = lines[i];
                    int idx = IndexOfWord(line, name);
                    if (idx >= 0)
                    {
                        string snippet = line.Trim();
                        list.Add(new { path = ToRel(file, _rootDir), line = i + 1, column = idx + 1, snippet });
                    }
                }
            }
            catch { }
        }
        return list;
    }

    private static int IndexOfWord(string line, string word)
    {
        if (string.IsNullOrEmpty(word)) return -1;
        var idx = line.IndexOf(word, StringComparison.Ordinal);
        if (idx < 0) return -1;
        bool leftOk = idx == 0 || !char.IsLetterOrDigit(line[idx - 1]) && line[idx - 1] != '_';
        int end = idx + word.Length;
        bool rightOk = end >= line.Length || !char.IsLetterOrDigit(line[end]) && line[end] != '_';
        return (leftOk && rightOk) ? idx : -1;
    }

    private async Task<object> RenameByNamePathAsync(string relative, string namePath, string newName, bool apply)
    {
        var full = Path.Combine(_rootDir, relative.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(full)) return new { success = false, applied = false, error = "file_not_found" };
        try
        {
            var text = await File.ReadAllTextAsync(full);
            var tree = CSharpSyntaxTree.ParseText(text);
            var root = await tree.GetRootAsync();
            var segments = (namePath ?? "").Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (segments.Length == 0) return new { success = false, applied = false, error = "invalid_namePath" };
            SyntaxNode cursor = root;
            for (int i = 0; i < segments.Length - 1; i++)
            {
                var seg = segments[i];
                var next = cursor.DescendantNodes().FirstOrDefault(n => n is ClassDeclarationSyntax c && c.Identifier.ValueText == seg
                                                                      || n is StructDeclarationSyntax s && s.Identifier.ValueText == seg
                                                                      || n is InterfaceDeclarationSyntax ii && ii.Identifier.ValueText == seg
                                                                      || n is EnumDeclarationSyntax en && en.Identifier.ValueText == seg);
                if (next is null) return new { success = false, applied = false, error = "container_not_found", segment = seg };
                cursor = next;
            }
            var targetName = segments[^1];
            SyntaxNode? decl = cursor.DescendantNodes().FirstOrDefault(n => n is ClassDeclarationSyntax c && c.Identifier.ValueText == targetName
                                                                          || n is StructDeclarationSyntax s && s.Identifier.ValueText == targetName
                                                                          || n is InterfaceDeclarationSyntax ii && ii.Identifier.ValueText == targetName
                                                                          || n is EnumDeclarationSyntax en && en.Identifier.ValueText == targetName)
                             ?? cursor.DescendantNodes().FirstOrDefault(n => n is MethodDeclarationSyntax m && m.Identifier.ValueText == targetName
                                                                          || n is PropertyDeclarationSyntax p && p.Identifier.ValueText == targetName
                                                                          || n is FieldDeclarationSyntax f && f.Declaration.Variables.Any(v => v.Identifier.ValueText == targetName));
            if (decl is null) return new { success = false, applied = false, error = "symbol_not_found" };

            // Replace identifier token text (declaration only)
            SyntaxNode newRoot = root;
            if (decl is ClassDeclarationSyntax dc)
                newRoot = root.ReplaceToken(dc.Identifier, SyntaxFactory.Identifier(newName).WithTriviaFrom(dc.Identifier));
            else if (decl is StructDeclarationSyntax ds)
                newRoot = root.ReplaceToken(ds.Identifier, SyntaxFactory.Identifier(newName).WithTriviaFrom(ds.Identifier));
            else if (decl is InterfaceDeclarationSyntax di)
                newRoot = root.ReplaceToken(di.Identifier, SyntaxFactory.Identifier(newName).WithTriviaFrom(di.Identifier));
            else if (decl is EnumDeclarationSyntax de)
                newRoot = root.ReplaceToken(de.Identifier, SyntaxFactory.Identifier(newName).WithTriviaFrom(de.Identifier));
            else if (decl is MethodDeclarationSyntax dm)
                newRoot = root.ReplaceToken(dm.Identifier, SyntaxFactory.Identifier(newName).WithTriviaFrom(dm.Identifier));
            else if (decl is PropertyDeclarationSyntax dp)
                newRoot = root.ReplaceToken(dp.Identifier, SyntaxFactory.Identifier(newName).WithTriviaFrom(dp.Identifier));
            else if (decl is FieldDeclarationSyntax df)
            {
                var v = df.Declaration.Variables.FirstOrDefault(v => v.Identifier.ValueText == targetName);
                if (v != null) newRoot = root.ReplaceToken(v.Identifier, SyntaxFactory.Identifier(newName).WithTriviaFrom(v.Identifier));
            }

            var newText = newRoot.ToFullString();
            if (apply)
            {
                await File.WriteAllTextAsync(full, newText, Encoding.UTF8);
                return new { success = true, applied = true };
            }
            return new { success = true, applied = false, preview = DiffPreview(text, newText) };
        }
        catch (Exception ex)
        {
            return new { success = false, applied = false, error = ex.Message };
        }
    }

    private static string DiffPreview(string oldText, string newText)
    {
        // Minimal diff: return new text truncated
        if (newText.Length > 1000) return newText.Substring(0, 1000) + "…";
        return newText;
    }

    private async Task<object> ReplaceSymbolBodyAsync(string relative, string namePath, string bodyText, bool apply)
    {
        var full = Path.Combine(_rootDir, relative.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(full)) return new { success = false, applied = false, error = "file_not_found" };
        var text = await File.ReadAllTextAsync(full);
        var tree = CSharpSyntaxTree.ParseText(text);
        var root = await tree.GetRootAsync();
        var (cursor, last) = FindNodeByNamePath(root, namePath);
        if (last is not MethodDeclarationSyntax method) return new { success = false, applied = false, error = "method_not_found" };
        var trimmed = bodyText.Trim();
        if (!trimmed.StartsWith("{")) trimmed = "{" + trimmed;
        if (!trimmed.EndsWith("}")) trimmed += "}";
        var block = SyntaxFactory.ParseStatement(trimmed) as BlockSyntax ?? SyntaxFactory.Block();
        var newRoot = root.ReplaceNode(method, method.WithBody(block));
        var newText = newRoot.ToFullString();
        if (apply) { await File.WriteAllTextAsync(full, newText, Encoding.UTF8); return new { success = true, applied = true }; }
        return new { success = true, applied = false, preview = DiffPreview(text, newText) };
    }

    private async Task<object> InsertAroundSymbolAsync(string relative, string namePath, string textToInsert, bool after, bool apply)
    {
        var full = Path.Combine(_rootDir, relative.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(full)) return new { success = false, applied = false, error = "file_not_found" };
        var text = await File.ReadAllTextAsync(full);
        var tree = CSharpSyntaxTree.ParseText(text);
        var root = await tree.GetRootAsync();
        var (cursor, last) = FindNodeByNamePath(root, namePath);
        if (last is null) return new { success = false, applied = false, error = "symbol_not_found" };
        var insertPos = after ? last.FullSpan.End : last.FullSpan.Start;
        var newText = text.Substring(0, insertPos) + textToInsert + text.Substring(insertPos);
        if (apply) { await File.WriteAllTextAsync(full, newText, Encoding.UTF8); return new { success = true, applied = true }; }
        return new { success = true, applied = false, preview = DiffPreview(text, newText) };
    }

    private static (SyntaxNode cursor, SyntaxNode? last) FindNodeByNamePath(SyntaxNode root, string namePath)
    {
        var segs = (namePath ?? "").Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        SyntaxNode cursor = root;
        SyntaxNode? last = null;
        for (int i = 0; i < segs.Length; i++)
        {
            var seg = segs[i];
            var next = cursor.DescendantNodes().FirstOrDefault(n => n is ClassDeclarationSyntax c && c.Identifier.ValueText == seg
                                                                  || n is StructDeclarationSyntax s && s.Identifier.ValueText == seg
                                                                  || n is InterfaceDeclarationSyntax ii && ii.Identifier.ValueText == seg
                                                                  || n is EnumDeclarationSyntax en && en.Identifier.ValueText == seg
                                                                  || n is MethodDeclarationSyntax m && m.Identifier.ValueText == seg
                                                                  || n is PropertyDeclarationSyntax p && p.Identifier.ValueText == seg
                                                                  || (n is FieldDeclarationSyntax f && f.Declaration.Variables.Any(v => v.Identifier.ValueText == seg)));
            if (next is null) break;
            cursor = next; last = next;
        }
        return (cursor, last);
    }

    private static IEnumerable<string> EnumerateUnityCsFiles(string rootDir)
    {
        IEnumerable<string> EnumDir(string dir)
        {
            if (!Directory.Exists(dir)) yield break;
            foreach (var f in Directory.EnumerateFiles(dir, "*.cs", SearchOption.AllDirectories))
            {
                var norm = f.Replace('\\','/');
                if (norm.Contains("/obj/") || norm.Contains("/bin/")) continue;
                yield return f;
            }
        }
        foreach (var f in EnumDir(Path.Combine(rootDir, "Assets"))) yield return f;
        foreach (var f in EnumDir(Path.Combine(rootDir, "Packages"))) yield return f;
        foreach (var f in EnumDir(Path.Combine(rootDir, "Library", "PackageCache"))) yield return f;
    }

    private static string Path2Uri(string path)
    {
        return "file://" + path.Replace('\\','/');
    }

    private static string ToRel(string fullPath, string root)
    {
        var normFull = fullPath.Replace('\\', '/');
        var normRoot = root.Replace('\\', '/').TrimEnd('/');
        if (normFull.StartsWith(normRoot, StringComparison.OrdinalIgnoreCase))
            return normFull.Substring(normRoot.Length + 1);
        return normFull;
    }

    private static object MakeSym(string name, int kind, SyntaxNode node)
    {
        var span = node.GetLocation().GetLineSpan();
        var start = new { line = span.StartLinePosition.Line, character = span.StartLinePosition.Character };
        var end = new { line = span.EndLinePosition.Line, character = span.EndLinePosition.Character };
        return new
        {
            name,
            kind,
            range = new { start, end },
            selectionRange = new { start, end }
        };
    }

    private async Task<string?> ReadMessageAsync()
    {
        // Read headers
        string? line;
        int contentLength = 0;
        while (!string.IsNullOrEmpty(line = await Console.In.ReadLineAsync()))
        {
            var idx = line.IndexOf(":", StringComparison.Ordinal);
            if (idx > 0)
            {
                var key = line.Substring(0, idx).Trim();
                var val = line.Substring(idx + 1).Trim();
                if (key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                {
                    int.TryParse(val, out contentLength);
                }
            }
        }
        if (contentLength <= 0) return null;
        var buf = new char[contentLength];
        int read = 0;
        while (read < contentLength)
        {
            int n = await Console.In.ReadAsync(buf, read, contentLength - read);
            if (n <= 0) break;
            read += n;
        }
        return new string(buf, 0, read);
    }

    private async Task WriteMessageAsync(object payload)
    {
        var json = JsonSerializer.Serialize(payload, _json);
        var header = $"Content-Length: {Encoding.UTF8.GetByteCount(json)}\r\n\r\n";
        await Console.Out.WriteAsync(header);
        await Console.Out.WriteAsync(json);
        await Console.Out.FlushAsync();
    }
}
