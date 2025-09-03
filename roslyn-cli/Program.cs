using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Build.Locator;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.MSBuild;
using Microsoft.CodeAnalysis.FindSymbols;

// roslyn-cli: On-demand CLI for C# symbol queries and structured edits.
// Commands: find-symbol, find-references, replace-symbol-body, insert-before/after, rename-symbol, remove-symbol

var app = new App();
return await app.RunAsync(args);

sealed class App
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false
    };

    public async Task<int> RunAsync(string[] args)
    {
        if (args.Length == 0 || Args.Has(args, "--help") || Args.Has(args, "-h"))
        {
            PrintHelp();
            return 0;
        }

        try { MSBuildLocator.RegisterDefaults(); } catch { /* already registered */ }

        var cmd = args[0].ToLowerInvariant();
        var rest = args.Skip(1).ToArray();
        return cmd switch
        {
            "serve" => await ServeAsync(),
            "find-symbol" => await FindSymbolAsync(rest),
            "find-references" => await FindReferencesAsync(rest),
            "replace-symbol-body" => await ReplaceSymbolBodyAsync(rest),
            "insert-before-symbol" => await InsertAroundSymbolAsync(rest, before:true),
            "insert-after-symbol" => await InsertAroundSymbolAsync(rest, before:false),
            "rename-symbol" => await RenameSymbolAsync(rest),
            "remove-symbol" => await RemoveSymbolAsync(rest),
            _ => Fail(new { error = "unknown_command", command = cmd })
        };
    }

    private static void PrintHelp()
    {
        var help = new
        {
            commands = new[] { "find-symbol", "find-references", "replace-symbol-body", "insert-before-symbol", "insert-after-symbol", "rename-symbol", "remove-symbol" },
            usage = new
            {
                serve = "serve  # JSON-over-stdin server: {id,cmd,args[]} per line; returns {id,...}",
                findSymbol = "find-symbol --solution <sln>|--project <csproj> --name <name> [--kind <class|struct|interface|enum|method|property|field>] [--relative <file>]",
                findReferences = "find-references --solution <sln>|--project <csproj> --name <name> [--relative <file>]",
                replaceSymbolBody = "replace-symbol-body --solution <sln>|--project <csproj> --relative <file> --name-path <A/B/C> --body-file <path> [--apply true|false]",
                insertBefore = "insert-before-symbol --solution <sln>|--project <csproj> --relative <file> --name-path <A/B/C> --body-file <path> [--apply true|false]",
                insertAfter = "insert-after-symbol --solution <sln>|--project <csproj> --relative <file> --name-path <A/B/C> --body-file <path> [--apply true|false]",
                renameSymbol = "rename-symbol --solution <sln>|--project <csproj> --relative <file> --name-path <A/B/C> --new-name <New> [--apply true|false]",
                removeSymbol = "remove-symbol --solution <sln>|--project <csproj> --relative <file> --name-path <A/B/C> [--apply true|false] [--fail-on-references true|false] [--remove-empty-file true|false]"
            }
        };
        Console.WriteLine(JsonSerializer.Serialize(help, JsonOpts));
    }


    private static int Fail(object payload)
    {
        Console.Error.WriteLine(JsonSerializer.Serialize(payload, JsonOpts));
        return 1;
    }

    private async Task<int> ServeAsync()
    {
        Console.Error.WriteLine("[roslyn-cli] serve mode started (stdin JSON per line)");
        string? line;
        while ((line = await Console.In.ReadLineAsync()) != null)
        {
            try
            {
                var doc = JsonSerializer.Deserialize<ServeRequest>(line);
                if (doc == null || string.IsNullOrWhiteSpace(doc.cmd)) { Console.WriteLine("{\"error\":\"bad_request\"}"); continue; }
                var args = doc.args ?? Array.Empty<string>();
                int code = await ((doc.cmd.ToLowerInvariant()) switch
                {
                    "find-symbol" => FindSymbolAsync(args),
                    "find-references" => FindReferencesAsync(args),
                    "replace-symbol-body" => ReplaceSymbolBodyAsync(args),
                    "insert-before-symbol" => InsertAroundSymbolAsync(args, before:true),
                    "insert-after-symbol" => InsertAroundSymbolAsync(args, before:false),
                    "rename-symbol" => RenameSymbolAsync(args),
                    "remove-symbol" => RemoveSymbolAsync(args),
                    "help" => Task.FromResult(PrintHelpAndOk()),
                    _ => Task.FromResult(Fail(new { error = "unknown_command", command = doc.cmd }))
                });
                // Individual handlers already wrote a JSON payload to stdout.
                // To correlate, we wrap last line with id if provided.
                if (!string.IsNullOrEmpty(doc.id))
                {
                    // Note: For simplicity, we don't reprint the whole payload; we emit an envelope.
                    Console.WriteLine(JsonSerializer.Serialize(new { id = doc.id, ok = (code == 0) }));
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(JsonSerializer.Serialize(new { error = ex.Message }));
            }
        }
        return 0;
    }

    private int PrintHelpAndOk() { PrintHelp(); return 0; }

    private sealed class ServeRequest
    {
        public string? id { get; set; }
        public string cmd { get; set; } = string.Empty;
        public string[]? args { get; set; }
    }
    private async Task<int> RenameSymbolAsync(string[] args)
    {
        try
        {
            var relative = Args.Get(args, "--relative") ?? throw new ArgumentException("--relative is required");
            var namePath = Args.Get(args, "--name-path") ?? throw new ArgumentException("--name-path is required");
            var newName = Args.Get(args, "--new-name") ?? throw new ArgumentException("--new-name is required");
            var apply = (Args.Get(args, "--apply") ?? "false").Equals("true", StringComparison.OrdinalIgnoreCase);

            var (ws, solution, rootDir) = await OpenSolutionOrProjectAsync(args);
            var relNorm = relative.Replace('\\', '/');
            var doc = solution.Projects.Where(p => p.Language == LanguageNames.CSharp)
                .SelectMany(p => p.Documents)
                .FirstOrDefault(d => ToRel(d.FilePath ?? "", rootDir).Equals(relNorm, StringComparison.OrdinalIgnoreCase));
            if (doc is null) throw new FileNotFoundException($"Document not found: {relative}");

            var root = (await doc.GetSyntaxRootAsync())!;
            var model = (await doc.GetSemanticModelAsync())!;
            var segments = namePath.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (segments.Length == 0) throw new ArgumentException("--name-path invalid");

            SyntaxNode cursor = root;
            for (int i = 0; i < segments.Length - 1; i++)
            {
                var seg = segments[i];
                var next = cursor.DescendantNodes().FirstOrDefault(n => n is ClassDeclarationSyntax c && c.Identifier.ValueText == seg
                                                                      || n is StructDeclarationSyntax s && s.Identifier.ValueText == seg
                                                                      || n is InterfaceDeclarationSyntax ii && ii.Identifier.ValueText == seg
                                                                      || n is EnumDeclarationSyntax en && en.Identifier.ValueText == seg);
                if (next is null) throw new InvalidOperationException($"Container type not found: {seg}");
                cursor = next;
            }
            var targetName = segments[^1];
            // Try types first, then members
            SyntaxNode? decl = cursor.DescendantNodes().FirstOrDefault(n => n is ClassDeclarationSyntax c && c.Identifier.ValueText == targetName
                                                                          || n is StructDeclarationSyntax s && s.Identifier.ValueText == targetName
                                                                          || n is InterfaceDeclarationSyntax ii && ii.Identifier.ValueText == targetName
                                                                          || n is EnumDeclarationSyntax en && en.Identifier.ValueText == targetName)
                             ?? cursor.DescendantNodes().FirstOrDefault(n => n is MethodDeclarationSyntax m && m.Identifier.ValueText == targetName
                                                                          || n is PropertyDeclarationSyntax p && p.Identifier.ValueText == targetName
                                                                          || n is FieldDeclarationSyntax f && f.Declaration.Variables.Any(v => v.Identifier.ValueText == targetName));
            if (decl is null)
                throw new InvalidOperationException($"Symbol not found: {targetName}");

            ISymbol? symbol = decl switch
            {
                ClassDeclarationSyntax or StructDeclarationSyntax or InterfaceDeclarationSyntax or EnumDeclarationSyntax => model.GetDeclaredSymbol(decl),
                MethodDeclarationSyntax m => model.GetDeclaredSymbol(m),
                PropertyDeclarationSyntax p => model.GetDeclaredSymbol(p),
                FieldDeclarationSyntax f => model.GetDeclaredSymbol(f.Declaration.Variables.First(v => v.Identifier.ValueText == targetName)),
                _ => null
            };
            if (symbol is null) throw new InvalidOperationException("Failed to resolve symbol");

            var newSolution = await Microsoft.CodeAnalysis.Rename.Renamer.RenameSymbolAsync(solution, symbol, newName, default);

            // Preflight diagnostics: compile changed projects only (best-effort)
            var changedProjIds = new HashSet<ProjectId>(newSolution.GetChanges(solution).GetProjectChanges().Select(pc => pc.ProjectId));
            var errors = new List<object>();
            foreach (var pid in changedProjIds)
            {
                var proj = newSolution.GetProject(pid);
                var comp = await proj!.GetCompilationAsync();
                var diags = comp?.GetDiagnostics().Where(d => d.Severity == DiagnosticSeverity.Error)
                    .Select(d => new
                    {
                        id = d.Id,
                        message = d.GetMessage(),
                        file = d.Location.GetLineSpan().Path,
                        line = d.Location.GetLineSpan().StartLinePosition.Line + 1,
                        column = d.Location.GetLineSpan().StartLinePosition.Character + 1
                    }) ?? Enumerable.Empty<object>();
                errors.AddRange(diags);
            }

            if (errors.Count > 0 && apply)
            {
                Console.WriteLine(JsonSerializer.Serialize(new { success = false, applied = false, errors }, JsonOpts));
                return 0;
            }
            if (!apply)
            {
                Console.WriteLine(JsonSerializer.Serialize(new { success = true, applied = false, errors }, JsonOpts));
                return 0;
            }

            var ok = ws.TryApplyChanges(newSolution);
            Console.WriteLine(JsonSerializer.Serialize(new { success = ok, applied = ok, errors }, JsonOpts));
            return ok ? 0 : 1;
        }
        catch (Exception ex)
        {
            return Fail(new { error = ex.Message, trace = ex.StackTrace });
        }
    }

    private static string ToRel(string fullPath, string root)
    {
        var normFull = fullPath.Replace('\\', '/');
        var normRoot = root.Replace('\\', '/').TrimEnd('/');
        if (normFull.StartsWith(normRoot, StringComparison.OrdinalIgnoreCase))
            return normFull.Substring(normRoot.Length).TrimStart('/');
        return normFull;
    }

    private static (string? sln, string? proj) ParseSolutionOrProject(string[] args)
    {
        var sln = Args.Get(args, "--solution");
        var proj = Args.Get(args, "--project");
        return (sln, proj);
    }

    private static async Task<(MSBuildWorkspace ws, Solution solution, string root)> OpenSolutionOrProjectAsync(string[] args)
    {
        var (sln, proj) = ParseSolutionOrProject(args);
        var ws = MSBuildWorkspace.Create();
        ws.WorkspaceFailed += (_, e) => { /* suppress verbose MSBuild messages */ };

        if (!string.IsNullOrEmpty(sln))
        {
            var solution = await ws.OpenSolutionAsync(Path.GetFullPath(sln!));
            return (ws, solution, Path.GetDirectoryName(Path.GetFullPath(sln!)) ?? Directory.GetCurrentDirectory());
        }
        if (!string.IsNullOrEmpty(proj))
        {
            var project = await ws.OpenProjectAsync(Path.GetFullPath(proj!));
            var sol = project.Solution;
            return (ws, sol, Path.GetDirectoryName(Path.GetFullPath(proj!)) ?? Directory.GetCurrentDirectory());
        }
        throw new ArgumentException("--solution or --project is required");
    }

    private static string GetNamespace(SyntaxNode node)
    {
        var parts = new List<string>();
        for (var cur = node; cur != null; cur = cur.Parent)
        {
            if (cur is NamespaceDeclarationSyntax ns) parts.Add(ns.Name.ToString());
            else if (cur is FileScopedNamespaceDeclarationSyntax fns) parts.Add(fns.Name.ToString());
        }
        parts.Reverse();
        return string.Join('.', parts);
    }

    private static string? GetEnclosingType(SyntaxNode node)
    {
        for (var cur = node; cur != null; cur = cur.Parent)
        {
            switch (cur)
            {
                case ClassDeclarationSyntax c: return c.Identifier.ValueText;
                case StructDeclarationSyntax s: return s.Identifier.ValueText;
                case InterfaceDeclarationSyntax i: return i.Identifier.ValueText;
                case EnumDeclarationSyntax e: return e.Identifier.ValueText;
            }
        }
        return null;
    }

    private static string KindOf(SyntaxNode node) => node switch
    {
        ClassDeclarationSyntax => "class",
        StructDeclarationSyntax => "struct",
        InterfaceDeclarationSyntax => "interface",
        EnumDeclarationSyntax => "enum",
        MethodDeclarationSyntax => "method",
        PropertyDeclarationSyntax => "property",
        FieldDeclarationSyntax => "field",
        _ => node.Kind().ToString()
    };

    private static bool KindMatch(string? filter, string kind)
    {
        if (string.IsNullOrEmpty(filter)) return true;
        return string.Equals(filter, kind, StringComparison.OrdinalIgnoreCase);
    }

    private static string NameOf(SyntaxNode node)
    {
        return node switch
        {
            ClassDeclarationSyntax c => c.Identifier.ValueText,
            StructDeclarationSyntax s => s.Identifier.ValueText,
            InterfaceDeclarationSyntax i => i.Identifier.ValueText,
            EnumDeclarationSyntax e => e.Identifier.ValueText,
            MethodDeclarationSyntax m => m.Identifier.ValueText,
            PropertyDeclarationSyntax p => p.Identifier.ValueText,
            FieldDeclarationSyntax f => f.Declaration.Variables.FirstOrDefault()?.Identifier.ValueText ?? "",
            _ => node.ToString()
        };
    }

    private async Task<int> FindSymbolAsync(string[] args)
    {
        try
        {
            var name = Args.Get(args, "--name") ?? throw new ArgumentException("--name is required");
            var kindFilter = Args.Get(args, "--kind");
            var relativeOnly = Args.Get(args, "--relative");

            var (ws, solution, rootDir) = await OpenSolutionOrProjectAsync(args);
            var list = new List<object>();

            foreach (var proj in solution.Projects)
            {
                if (!string.Equals(proj.Language, LanguageNames.CSharp, StringComparison.Ordinal)) continue;
                foreach (var doc in proj.Documents)
                {
                    if (!string.IsNullOrEmpty(relativeOnly))
                    {
                        var rel = ToRel(doc.FilePath ?? "", rootDir);
                        if (!rel.Equals(relativeOnly.Replace('\\','/'), StringComparison.OrdinalIgnoreCase))
                            continue;
                    }

                    var root = await doc.GetSyntaxRootAsync();
                    if (root is null) continue;

                    foreach (var node in root.DescendantNodes())
                    {
                        if (node is not (ClassDeclarationSyntax or StructDeclarationSyntax or InterfaceDeclarationSyntax or EnumDeclarationSyntax or MethodDeclarationSyntax or PropertyDeclarationSyntax or FieldDeclarationSyntax))
                            continue;
                        var kind = KindOf(node);
                        if (!KindMatch(kindFilter, kind)) continue;
                        var n = NameOf(node);
                        if (n.IndexOf(name, StringComparison.OrdinalIgnoreCase) < 0) continue;

                        var loc = node.GetLocation().GetLineSpan();
                        var file = doc.FilePath ?? "";
                        list.Add(new
                        {
                            path = ToRel(file, rootDir),
                            name = n,
                            kind,
                            line = loc.StartLinePosition.Line + 1,
                            column = loc.StartLinePosition.Character + 1,
                            container = GetEnclosingType(node),
                            ns = GetNamespace(node)
                        });
                    }
                }
            }

            Console.WriteLine(JsonSerializer.Serialize(new { success = true, results = list, total = list.Count }, JsonOpts));
            return 0;
        }
        catch (Exception ex)
        {
            return Fail(new { error = ex.Message, trace = ex.StackTrace });
        }
    }

    private async Task<int> ReplaceSymbolBodyAsync(string[] args)
    {
        try
        {
            var relative = Args.Get(args, "--relative") ?? throw new ArgumentException("--relative is required");
            var namePath = Args.Get(args, "--name-path") ?? throw new ArgumentException("--name-path is required");
            var bodyFile = Args.Get(args, "--body-file") ?? throw new ArgumentException("--body-file is required");
            var apply = (Args.Get(args, "--apply") ?? "false").Equals("true", StringComparison.OrdinalIgnoreCase);

            var (ws, solution, rootDir) = await OpenSolutionOrProjectAsync(args);
            var relNorm = relative.Replace('\\', '/');

            var doc = solution.Projects
                .Where(p => p.Language == LanguageNames.CSharp)
                .SelectMany(p => p.Documents)
                .FirstOrDefault(d => ToRel(d.FilePath ?? "", rootDir).Equals(relNorm, StringComparison.OrdinalIgnoreCase));

            if (doc is null)
                throw new FileNotFoundException($"Document not found: {relative}");

            var root = (await doc.GetSyntaxRootAsync())!;
            var segments = namePath.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (segments.Length == 0) throw new ArgumentException("--name-path invalid");

            // Navigate types
            SyntaxNode cursor = root;
            for (int i = 0; i < segments.Length - 1; i++)
            {
                var seg = segments[i];
                var next = cursor.DescendantNodes().FirstOrDefault(n => n is ClassDeclarationSyntax c && c.Identifier.ValueText == seg
                                                                      || n is StructDeclarationSyntax s && s.Identifier.ValueText == seg
                                                                      || n is InterfaceDeclarationSyntax ii && ii.Identifier.ValueText == seg);
                if (next is null) throw new InvalidOperationException($"Container type not found: {seg}");
                cursor = next;
            }

            var targetName = segments[^1];
            var method = cursor.DescendantNodes().OfType<MethodDeclarationSyntax>().FirstOrDefault(m => m.Identifier.ValueText == targetName);
            if (method is null) throw new InvalidOperationException($"Method not found: {targetName}");

            var bodyText = await File.ReadAllTextAsync(bodyFile, Encoding.UTF8);
            bodyText = bodyText.Trim();
            if (!bodyText.StartsWith("{")) bodyText = "{" + bodyText;
            if (!bodyText.EndsWith("}")) bodyText = bodyText + "}";

            var bodyTree = CSharpSyntaxTree.ParseText(bodyText);
            var bodyRoot = bodyTree.GetRoot();
            var newBlock = bodyRoot.DescendantNodes().OfType<BlockSyntax>().FirstOrDefault()
                           ?? SyntaxFactory.Block();

            var newMethod = method.WithBody(newBlock);
            var newRoot = root.ReplaceNode(method, newMethod);
            var newDoc = doc.WithSyntaxRoot(newRoot);
            var newSolution = newDoc.Project.Solution;

            // Preflight diagnostics
            var proj = newDoc.Project;
            var comp = await proj.GetCompilationAsync();
            var diags = comp?.GetDiagnostics().Where(d => d.Severity == DiagnosticSeverity.Error)
                .Select(d => (object)new
                {
                    id = d.Id,
                    message = d.GetMessage(),
                    file = d.Location.GetLineSpan().Path,
                    line = d.Location.GetLineSpan().StartLinePosition.Line + 1,
                    column = d.Location.GetLineSpan().StartLinePosition.Character + 1
                }).ToList() ?? new List<object>();

            if (diags.Count > 0 && apply)
            {
                // Block apply if errors exist
                Console.WriteLine(JsonSerializer.Serialize(new { success = false, applied = false, errors = diags }, JsonOpts));
                return 0;
            }

            if (!apply)
            {
                Console.WriteLine(JsonSerializer.Serialize(new { success = true, applied = false, errors = diags }, JsonOpts));
                return 0;
            }

            var ok = ws.TryApplyChanges(newSolution);
            Console.WriteLine(JsonSerializer.Serialize(new { success = ok, applied = ok, errors = diags }, JsonOpts));
            return ok ? 0 : 1;
        }
        catch (Exception ex)
        {
            return Fail(new { error = ex.Message, trace = ex.StackTrace });
        }
    }

    private async Task<int> FindReferencesAsync(string[] args)
    {
        try
        {
            var name = Args.Get(args, "--name") ?? throw new ArgumentException("--name is required");
            var relativeOnly = Args.Get(args, "--relative");
            var (ws, solution, rootDir) = await OpenSolutionOrProjectAsync(args);

            var results = new List<object>();
            foreach (var proj in solution.Projects)
            {
                if (proj.Language != LanguageNames.CSharp) continue;
                foreach (var doc in proj.Documents)
                {
                    var rel = ToRel(doc.FilePath ?? "", rootDir);
                    if (!string.IsNullOrEmpty(relativeOnly) && !rel.Equals(relativeOnly.Replace('\\','/'), StringComparison.OrdinalIgnoreCase))
                        continue;
                    var text = await doc.GetTextAsync();
                    var lines = text.Lines;
                    var root = await doc.GetSyntaxRootAsync();
                    if (root is null) continue;
                    var tokens = root.DescendantTokens().Where(t => t.IsKind(SyntaxKind.IdentifierToken) && string.Equals(t.ValueText, name, StringComparison.Ordinal));
                    foreach (var tok in tokens)
                    {
                        var span = tok.GetLocation().GetLineSpan();
                        var lineNum = span.StartLinePosition.Line + 1;
                        // snippet +/- 1 line
                        var start = Math.Max(0, lineNum - 2);
                        var end = Math.Min(lines.Count - 1, lineNum);
                        var snippet = new StringBuilder();
                        for (int i = start; i <= end; i++) snippet.AppendLine(lines[i].ToString());
                        results.Add(new { path = rel, line = lineNum, snippet = snippet.ToString().TrimEnd() });
                    }
                }
            }

            Console.WriteLine(JsonSerializer.Serialize(new { success = true, results, total = results.Count }, JsonOpts));
            return 0;
        }
        catch (Exception ex)
        {
            return Fail(new { error = ex.Message, trace = ex.StackTrace });
        }
    }

    private async Task<int> InsertAroundSymbolAsync(string[] args, bool before)
    {
        try
        {
            var relative = Args.Get(args, "--relative") ?? throw new ArgumentException("--relative is required");
            var namePath = Args.Get(args, "--name-path") ?? throw new ArgumentException("--name-path is required");
            var bodyFile = Args.Get(args, "--body-file") ?? throw new ArgumentException("--body-file is required");
            var apply = (Args.Get(args, "--apply") ?? "false").Equals("true", StringComparison.OrdinalIgnoreCase);

            var (ws, solution, rootDir) = await OpenSolutionOrProjectAsync(args);
            var relNorm = relative.Replace('\\', '/');
            var doc = solution.Projects.Where(p => p.Language == LanguageNames.CSharp)
                .SelectMany(p => p.Documents)
                .FirstOrDefault(d => ToRel(d.FilePath ?? "", rootDir).Equals(relNorm, StringComparison.OrdinalIgnoreCase));
            if (doc is null) throw new FileNotFoundException($"Document not found: {relative}");

            var sourceText = await doc.GetTextAsync();
            var root = (await doc.GetSyntaxRootAsync())!;
            var segments = namePath.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (segments.Length == 0) throw new ArgumentException("--name-path invalid");

            SyntaxNode cursor = root;
            for (int i = 0; i < segments.Length - 1; i++)
            {
                var seg = segments[i];
                var next = cursor.DescendantNodes().FirstOrDefault(n => n is ClassDeclarationSyntax c && c.Identifier.ValueText == seg
                                                                      || n is StructDeclarationSyntax s && s.Identifier.ValueText == seg
                                                                      || n is InterfaceDeclarationSyntax ii && ii.Identifier.ValueText == seg);
                if (next is null) throw new InvalidOperationException($"Container type not found: {seg}");
                cursor = next;
            }
            var targetName = segments[^1];
            var target = cursor.DescendantNodes().FirstOrDefault(n => NameOf(n) == targetName);
            if (target is null) throw new InvalidOperationException($"Symbol not found: {targetName}");

            var insertText = await File.ReadAllTextAsync(bodyFile, Encoding.UTF8);
            if (!insertText.EndsWith("\n")) insertText += "\n";

            var fileText = sourceText.ToString();
            var pos = before ? target.FullSpan.Start : target.FullSpan.End;
            var newText = fileText.Substring(0, pos) + insertText + fileText.Substring(pos);

            // Preflight by compiling updated document
            var newDoc = doc.WithText(Microsoft.CodeAnalysis.Text.SourceText.From(newText, Encoding.UTF8));
            var comp = await newDoc.Project.GetCompilationAsync();
            var diags = comp?.GetDiagnostics().Where(d => d.Severity == DiagnosticSeverity.Error)
                .Select(d => (object)new
                {
                    id = d.Id,
                    message = d.GetMessage(),
                    file = d.Location.GetLineSpan().Path,
                    line = d.Location.GetLineSpan().StartLinePosition.Line + 1,
                    column = d.Location.GetLineSpan().StartLinePosition.Character + 1
                }).ToList() ?? new List<object>();

            if (diags.Count > 0 && apply)
            {
                Console.WriteLine(JsonSerializer.Serialize(new { success = false, applied = false, errors = diags }, JsonOpts));
                return 0;
            }
            if (!apply)
            {
                Console.WriteLine(JsonSerializer.Serialize(new { success = true, applied = false, errors = diags }, JsonOpts));
                return 0;
            }

            var ok = ws.TryApplyChanges(newDoc.Project.Solution);
            Console.WriteLine(JsonSerializer.Serialize(new { success = ok, applied = ok, errors = diags }, JsonOpts));
            return ok ? 0 : 1;
        }
        catch (Exception ex)
        {
            return Fail(new { error = ex.Message, trace = ex.StackTrace });
        }
    }

    private async Task<int> RemoveSymbolAsync(string[] args)
    {
        try
        {
            var relative = Args.Get(args, "--relative") ?? throw new ArgumentException("--relative is required");
            var namePath = Args.Get(args, "--name-path") ?? throw new ArgumentException("--name-path is required");
            var apply = (Args.Get(args, "--apply") ?? "false").Equals("true", StringComparison.OrdinalIgnoreCase);
            var failOnRefs = (Args.Get(args, "--fail-on-references") ?? "true").Equals("true", StringComparison.OrdinalIgnoreCase);
            var removeEmptyFile = (Args.Get(args, "--remove-empty-file") ?? "false").Equals("true", StringComparison.OrdinalIgnoreCase);

            var (ws, solution, rootDir) = await OpenSolutionOrProjectAsync(args);
            var relNorm = relative.Replace('\\', '/');
            var doc = solution.Projects.Where(p => p.Language == LanguageNames.CSharp)
                .SelectMany(p => p.Documents)
                .FirstOrDefault(d => ToRel(d.FilePath ?? "", rootDir).Equals(relNorm, StringComparison.OrdinalIgnoreCase));
            if (doc is null) throw new FileNotFoundException($"Document not found: {relative}");

            var model = (await doc.GetSemanticModelAsync())!;
            var root = (await doc.GetSyntaxRootAsync())!;

            var segments = namePath.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (segments.Length == 0) throw new ArgumentException("--name-path invalid");

            SyntaxNode cursor = root;
            for (int i = 0; i < segments.Length - 1; i++)
            {
                var seg = segments[i];
                var next = cursor.DescendantNodes().FirstOrDefault(n => n is ClassDeclarationSyntax c && c.Identifier.ValueText == seg
                                                                      || n is StructDeclarationSyntax s && s.Identifier.ValueText == seg
                                                                      || n is InterfaceDeclarationSyntax ii && ii.Identifier.ValueText == seg
                                                                      || n is EnumDeclarationSyntax en && en.Identifier.ValueText == seg);
                if (next is null) throw new InvalidOperationException($"Container type not found: {seg}");
                cursor = next;
            }
            var targetName = segments[^1];
            // Prefer exact member/type by name
            SyntaxNode? target = cursor.DescendantNodes().FirstOrDefault(n => n is ClassDeclarationSyntax c && c.Identifier.ValueText == targetName
                                                                            || n is StructDeclarationSyntax s && s.Identifier.ValueText == targetName
                                                                            || n is InterfaceDeclarationSyntax ii && ii.Identifier.ValueText == targetName
                                                                            || n is EnumDeclarationSyntax en && en.Identifier.ValueText == targetName
                                                                            || n is MethodDeclarationSyntax m && m.Identifier.ValueText == targetName
                                                                            || n is PropertyDeclarationSyntax p && p.Identifier.ValueText == targetName
                                                                            || n is FieldDeclarationSyntax f && f.Declaration.Variables.Any(v => v.Identifier.ValueText == targetName));
            if (target is null) throw new InvalidOperationException($"Symbol not found: {targetName}");

            // Bind symbol for reference search
            ISymbol? symbol = target switch
            {
                ClassDeclarationSyntax or StructDeclarationSyntax or InterfaceDeclarationSyntax or EnumDeclarationSyntax => model.GetDeclaredSymbol(target),
                MethodDeclarationSyntax m => model.GetDeclaredSymbol(m),
                PropertyDeclarationSyntax p => model.GetDeclaredSymbol(p),
                FieldDeclarationSyntax f => model.GetDeclaredSymbol(f.Declaration.Variables.First(v => v.Identifier.ValueText == targetName)),
                _ => null
            };
            if (symbol is null) throw new InvalidOperationException("Failed to resolve symbol");

            // Reference preflight
            var references = new List<object>();
            var refResults = await SymbolFinder.FindReferencesAsync(symbol, solution);
            foreach (var rr in refResults)
            {
                foreach (var loc in rr.Locations)
                {
                    if (loc.Location.IsInSource && !loc.IsCandidateLocation && !loc.IsImplicit)
                    {
                        // Exclude the declaration location(s)
                        if (rr.Definition != null && loc.Document.Id == doc.Id)
                        {
                            var span = loc.Location.GetLineSpan();
                            // crude check: allow hits at the declaration line to be skipped
                            // keep simple; real filter is rr.Locations where IsWriteAccess/IsCandidate false
                        }
                        references.Add(new
                        {
                            path = ToRel(loc.Document.FilePath ?? "", rootDir),
                            line = loc.Location.GetLineSpan().StartLinePosition.Line + 1,
                            column = loc.Location.GetLineSpan().StartLinePosition.Character + 1
                        });
                    }
                }
            }
            // Remove declaration locations from reference list
            references = references
                .Where(r =>
                {
                    var p = (string)r.GetType().GetProperty("path")!.GetValue(r)!;
                    var l = (int)r.GetType().GetProperty("line")!.GetValue(r)!;
                    // very lightweight: keep all; consumers will decide. Do not over-filter.
                    return true;
                }).ToList();

            if (failOnRefs && references.Count > 0)
            {
                Console.WriteLine(JsonSerializer.Serialize(new { success = false, applied = false, references }, JsonOpts));
                return 0;
            }

            // Build new syntax root with removal
            SyntaxNode newRoot;
            if (target is FieldDeclarationSyntax fd && fd.Declaration.Variables.Count > 1)
            {
                // Remove only the target variable
                var varToRemove = fd.Declaration.Variables.First(v => v.Identifier.ValueText == targetName);
                var newVars = fd.Declaration.WithVariables(new SeparatedSyntaxList<VariableDeclaratorSyntax>().AddRange(fd.Declaration.Variables.Where(v => v != varToRemove)));
                var newField = fd.WithDeclaration(newVars);
                newRoot = root.ReplaceNode(fd, newField);
            }
            else
            {
                newRoot = root.RemoveNode(target, SyntaxRemoveOptions.KeepNoTrivia);
            }

            var newDoc = doc.WithSyntaxRoot(newRoot);
            var newSolution = newDoc.Project.Solution;

            // Optionally remove file if becomes empty or whitespace
            if (removeEmptyFile)
            {
                var text = (await newDoc.GetTextAsync()).ToString();
                if (string.IsNullOrWhiteSpace(text))
                {
                    newSolution = newSolution.RemoveDocument(newDoc.Id);
                }
            }

            // Preflight compile changed projects
            var changedProjIds = new HashSet<ProjectId>(newSolution.GetChanges(solution).GetProjectChanges().Select(pc => pc.ProjectId));
            var errors = new List<object>();
            foreach (var pid in changedProjIds)
            {
                var proj = newSolution.GetProject(pid);
                var comp = await proj!.GetCompilationAsync();
                var diags = comp?.GetDiagnostics().Where(d => d.Severity == DiagnosticSeverity.Error)
                    .Select(d => (object)new
                    {
                        id = d.Id,
                        message = d.GetMessage(),
                        file = d.Location.GetLineSpan().Path,
                        line = d.Location.GetLineSpan().StartLinePosition.Line + 1,
                        column = d.Location.GetLineSpan().StartLinePosition.Character + 1
                    }) ?? Enumerable.Empty<object>();
                errors.AddRange(diags);
            }

            if ((errors.Count > 0 || (failOnRefs && references.Count > 0)) && apply)
            {
                Console.WriteLine(JsonSerializer.Serialize(new { success = false, applied = false, errors, references }, JsonOpts));
                return 0;
            }
            if (!apply)
            {
                Console.WriteLine(JsonSerializer.Serialize(new { success = true, applied = false, errors, references }, JsonOpts));
                return 0;
            }

            var ok = ws.TryApplyChanges(newSolution);
            Console.WriteLine(JsonSerializer.Serialize(new { success = ok, applied = ok, errors, references }, JsonOpts));
            return ok ? 0 : 1;
        }
        catch (Exception ex)
        {
            return Fail(new { error = ex.Message, trace = ex.StackTrace });
        }
    }
}

static class Args
{
    public static string? Get(string[] args, string key)
    {
        for (int i = 0; i < args.Length; i++)
        {
            if (string.Equals(args[i], key, StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 < args.Length) return args[i + 1];
                return null;
            }
            if (args[i].StartsWith(key + "="))
            {
                return args[i].Substring(key.Length + 1);
            }
        }
        return null;
    }

    public static bool Has(string[] args, string key)
    {
        return args.Any(a => string.Equals(a, key, StringComparison.OrdinalIgnoreCase));
    }
}
