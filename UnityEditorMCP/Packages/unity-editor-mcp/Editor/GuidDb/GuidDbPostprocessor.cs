// SPDX-License-Identifier: UNLICENSED
using UnityEditor;

namespace UnityEditorMCP.GuidDb
{
    public class GuidDbPostprocessor : AssetPostprocessor
    {
        static void OnPostprocessAllAssets(
            string[] importedAssets,
            string[] deletedAssets,
            string[] movedAssets,
            string[] movedFromAssetPaths)
        {
            if (importedAssets != null)
            {
                foreach (var p in importedAssets)
                {
                    GuidDbManager.UpsertImported(p);
                }
            }

            if (movedAssets != null && movedFromAssetPaths != null)
            {
                int count = System.Math.Min(movedAssets.Length, movedFromAssetPaths.Length);
                for (int i = 0; i < count; i++)
                {
                    GuidDbManager.HandleMoved(movedFromAssetPaths[i], movedAssets[i]);
                }
            }

            if (deletedAssets != null)
            {
                foreach (var p in deletedAssets)
                {
                    GuidDbManager.HandleDeleted(p);
                }
            }
        }
    }
}
