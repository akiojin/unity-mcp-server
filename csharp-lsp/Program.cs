using System.Text;

// NOTE: Initial stub for C# LSP server binary.
// This process currently acts as a minimal long-running process so that
// CI can publish a self-contained single-file executable named "server".
// Real LSP initialization (Roslyn-based) will be added subsequently.

Console.Error.WriteLine("[csharp-lsp] stub server started (placeholder)");

// Keep process alive until stdin closes or termination signal arrives.
try
{
    // Read stdin asynchronously to detect pipe close in CI environments.
    var buffer = new char[1];
    while (true)
    {
        var read = await Console.In.ReadAsync(buffer, 0, 1);
        if (read <= 0) break;
        // Ignore content in stub mode.
    }
}
catch
{
    // Ignore all errors and exit gracefully.
}

Console.Error.WriteLine("[csharp-lsp] stub server exiting");

