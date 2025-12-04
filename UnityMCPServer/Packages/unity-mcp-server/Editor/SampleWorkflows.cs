using System.Linq;
using UnityEditor;
using UnityEngine;
#if UNITY_ADDRESSABLES
using UnityEditor.AddressableAssets;
using UnityEditor.AddressableAssets.Settings;
#endif

public static class SampleWorkflows
{
    private const string TempRootName = "MCP_Sample_Temp";

    public static void RunSceneSample()
    {
        var existing = GameObject.Find(TempRootName);
        if (existing != null) Object.DestroyImmediate(existing);

        var root = new GameObject(TempRootName);
        var cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
        cube.transform.SetParent(root.transform);
        cube.transform.position = new Vector3(0, 0.5f, 0);
        Debug.Log("[MCP Sample] Created demo cube under MCP_Sample_Temp");
    }

    public static void RunAddressablesSample()
    {
#if UNITY_ADDRESSABLES
        var settings = AddressableAssetSettingsDefaultObject.GetSettings(false);
        if (settings == null)
        {
            Debug.LogWarning("[MCP Sample] Addressables settings not found");
            return;
        }
        var group = settings.groups.FirstOrDefault(g => g != null && g.name == "MCP_Sample_Temp")
                   ?? settings.CreateGroup("MCP_Sample_Temp", false, false, false, null);

        var tempGO = new GameObject("MCP_Addressable_Sample");
        var path = "Assets/MCP_Addressable_Sample.prefab";
        PrefabUtility.SaveAsPrefabAsset(tempGO, path);
        var entry = settings.CreateOrMoveEntry(AssetDatabase.AssetPathToGUID(path), group);
        entry.address = "mcp/sample";
        AssetDatabase.SaveAssets();
        Debug.Log("[MCP Sample] Registered Addressable entry mcp/sample in MCP_Sample_Temp group");
#else
        Debug.LogWarning("[MCP Sample] Addressables package not enabled; sample skipped");
#endif
    }
}
