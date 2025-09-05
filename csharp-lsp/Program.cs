using System.Text.Json;
using System.Text;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

// Minimal LSP over stdio: initialize / initialized / shutdown / exit / documentSymbol
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
