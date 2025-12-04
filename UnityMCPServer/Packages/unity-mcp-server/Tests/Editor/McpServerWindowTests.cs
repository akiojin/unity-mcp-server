using NUnit.Framework;
using UnityEditor;

public class McpServerWindowTests
{
    [Test]
    public void OpenWindow()
    {
        var window = EditorWindow.GetWindow<McpServerWindow>();
        Assert.IsNotNull(window);
        window.Close();
    }
}
