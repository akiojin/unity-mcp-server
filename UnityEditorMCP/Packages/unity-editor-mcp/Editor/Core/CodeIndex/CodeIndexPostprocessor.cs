using System.Linq;
using UnityEditor;
using UnityEngine;

namespace UnityEditorMCP.Core.CodeIndex
{
    /// <summary>
    /// Invalidate per-file caches when .cs files change.
    /// </summary>
    public class CodeIndexPostprocessor : AssetPostprocessor
    {
        static void OnPostprocessAllAssets(string[] importedAssets, string[] deletedAssets, string[] movedAssets, string[] movedFromAssetPaths)
        {
            foreach (var p in importedAssets.Concat(deletedAssets).Concat(movedAssets).Concat(movedFromAssetPaths))
            {
                if (string.IsNullOrEmpty(p)) continue;
                if (!p.EndsWith(".cs")) continue;
                var rel = p.Replace('\\', '/');
                JsonIndexStore.Invalidate(rel);
            }
        }
    }
}

