using UnityEditor;

public static class McpServerMenu
{
    [MenuItem("MCP Server/Start", false, 1)]
    public static void StartWindow()
    {
        McpServerWindow.ShowWindow();
    }
}
