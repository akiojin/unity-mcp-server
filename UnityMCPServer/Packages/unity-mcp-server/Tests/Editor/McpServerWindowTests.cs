using NUnit.Framework;
using UnityEditor;
using UnityEngine;

public class McpServerWindowTests
{
    [Test]
    public void OpenWindow()
    {
        var window = EditorWindow.GetWindow<McpServerWindow>();
        Assert.IsNotNull(window);
        window.Close();
    }

    [Test]
    public void RunSamples_DoNotThrow()
    {
        Assert.DoesNotThrow(() => SampleWorkflows.RunSceneSample());
        Assert.DoesNotThrow(() => SampleWorkflows.RunAddressablesSample());
        var temp = GameObject.Find("MCP_Sample_Temp");
        if (temp != null) Object.DestroyImmediate(temp);
        AssetDatabase.Refresh();
    }
}
