// SPDX-License-Identifier: UNLICENSED
using System;
using System.IO;
using UnityEditor;
using UnityEngine;
// snapshots 機能削除に伴い不要

namespace UnityEditorMCP.GuidDb
{
    [InitializeOnLoad]
    internal static class GuidDbBootstrap
    {
        private const string LastFullScanKey = "UnityEditorMCP.GuidDb.LastFullScanUtc";
        // スナップショット関連キーは削除

        static GuidDbBootstrap()
        {
            // Delay actual work to let editor settle
            EditorApplication.delayCall += () =>
            {
                try
                {
                    EnsureDbLayout();
                    // スナップショットは廃止
                    EnsureInitialFullScanIfNeeded();
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[GuidDB] Bootstrap error: {ex}");
                }
            };
        }

        private static void EnsureDbLayout()
        {
            GuidDbPaths.EnsureDirs();
        }

        // 日次スナップショット処理は削除

        private static void EnsureInitialFullScanIfNeeded()
        {
            try
            {
                var ledgerPath = GuidDbPaths.LedgerPath();
                var needScan = !File.Exists(ledgerPath) || new FileInfo(ledgerPath).Length == 0;

                // Only do a session-first scan if needed and not done in the last 12 hours
                var lastScanStr = EditorPrefs.GetString(LastFullScanKey, string.Empty);
                var now = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(lastScanStr) && DateTime.TryParse(lastScanStr, out var lastScan))
                {
                    if ((now - lastScan).TotalHours < 12 && !needScan)
                    {
                        return;
                    }
                }

                // Run scan deferred to keep UI responsive
                EditorApplication.delayCall += () =>
                {
                    GuidDbManager.FullScan();
                    EditorPrefs.SetString(LastFullScanKey, now.ToString("o"));
                    Debug.Log("[GuidDB] Initial/Periodic full scan executed.");
                };
            }
            catch (Exception ex)
            {
                Debug.LogError($"[GuidDB] EnsureInitialFullScanIfNeeded error: {ex}");
            }
        }

        // スナップショットのクリーンアップは削除
    }
}
