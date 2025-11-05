// SPDX-License-Identifier: UNLICENSED
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace UnityMCPServer.GuidDb
{
    internal static class GuidDbManager
    {
        private static readonly object _ioLock = new object();

        public static Dictionary<string, LedgerRecord> LoadLedger()
        {
            GuidDbPaths.EnsureDirs();
            var dict = new Dictionary<string, LedgerRecord>();
            var path = GuidDbPaths.LedgerPath();
            if (!File.Exists(path)) return dict;
            foreach (var line in File.ReadAllLines(path))
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                try
                {
                    var rec = JsonLines.FromJson<LedgerRecord>(line);
                    if (!string.IsNullOrEmpty(rec.guid))
                    {
                        dict[rec.guid] = rec;
                    }
                }
                catch { /* ignore malformed lines */ }
            }
            return dict;
        }

        public static void SaveLedger(Dictionary<string, LedgerRecord> dict)
        {
            var sb = new StringBuilder();
            foreach (var rec in dict.Values.OrderBy(r => r.guid))
            {
                sb.AppendLine(JsonLines.ToJson(rec));
            }
            lock (_ioLock)
            {
                JsonLines.AtomicWriteAllText(GuidDbPaths.LedgerPath(), sb.ToString());
            }
        }

        // スナップショット機能は削除（負債解消）

        public static string DetectTypeFromPath(string assetPath)
        {
            if (string.IsNullOrEmpty(assetPath)) return "Other";
            var ext = Path.GetExtension(assetPath)?.ToLowerInvariant();
            switch (ext)
            {
                case ".cs": return "Script";
                case ".prefab": return "Prefab";
                case ".unity": return "Scene";
                case ".mat": return "Material";
                case ".png": case ".jpg": case ".jpeg": case ".tga": case ".psd": return "Texture";
                case ".anim": return "Animation";
                case ".controller": return "AnimatorController";
                default:
                    if (AssetDatabase.IsValidFolder(assetPath)) return "Folder";
                    return "Other";
            }
        }

        private static void EnrichScriptInfo(string assetPath, LedgerRecord rec, Func<string, MonoScript> loader = null)
        {
            if (rec.type != "Script") return;
            try
            {
                loader ??= path => AssetDatabase.LoadAssetAtPath<MonoScript>(path);
                var ms = loader(assetPath);
                var cls = ms != null ? ms.GetClass() : null;
                if (cls != null)
                {
                    rec.assembly_name = cls.Assembly.GetName().Name;
                    rec.@namespace = cls.Namespace ?? string.Empty;
                    rec.class_name = cls.Name;
                }
            }
            catch { /* ignore */ }
        }

        public static void UpsertImported(string assetPath)
        {
            var dict = LoadLedger();
            var now = JsonLines.IsoNowUtc();
            if (UpsertImported(dict, assetPath, now))
            {
                SaveLedger(dict);
            }
        }

        public static void HandleMoved(string fromPath, string toPath)
        {
            if (string.IsNullOrEmpty(toPath)) return;
            UpsertImported(toPath);
        }

        public static void HandleDeleted(string assetPath)
        {
            if (string.IsNullOrEmpty(assetPath)) return;
            if (!assetPath.StartsWith("Assets/")) return;
            var dict = LoadLedger();
            var guid = AssetDatabase.AssetPathToGUID(assetPath);
            LedgerRecord rec = null;
            if (!string.IsNullOrEmpty(guid))
            {
                dict.TryGetValue(guid, out rec);
            }
            // fallback: try find by last known path
            if (rec == null)
            {
                rec = dict.Values.FirstOrDefault(r => string.Equals(r.path_current, assetPath, StringComparison.Ordinal));
                guid = rec?.guid ?? guid;
            }
            if (rec == null || string.IsNullOrEmpty(guid)) return; // nothing to do

            var now = JsonLines.IsoNowUtc();
            rec.alive = false;
            rec.last_seen_at = now;
            dict[guid] = rec;
            SaveLedger(dict);
        }

        [MenuItem("Window/Unity Editor MCP/Guid DB/Full Scan (Assets)")]
        public static void FullScanMenu()
        {
            var scheduled = FullScan(() =>
            {
                Debug.Log("[GuidDB] Full scan completed (menu).");
            });

            if (!scheduled)
            {
                Debug.Log("[GuidDB] Full scan already running.");
            }
        }

        public static bool FullScan(Action onCompleted = null, Action<float> onProgress = null)
        {
            return GuidDbFullScanScheduler.ScheduleFullScan(new GuidDbFullScanOptions
            {
                OnCompleted = onCompleted,
                OnProgress = onProgress
            });
        }

        // 日次スナップショット関連メニューは削除

        internal static bool UpsertImported(Dictionary<string, LedgerRecord> dict, string assetPath, string now, Func<string, string> assetPathToGuid = null, Func<string, bool> isValidFolder = null, Func<string, MonoScript> scriptLoader = null)
        {
            if (dict == null) throw new ArgumentNullException(nameof(dict));
            if (string.IsNullOrEmpty(assetPath)) return false;
            if (!assetPath.StartsWith("Assets/", StringComparison.Ordinal)) return false;

            assetPathToGuid ??= AssetDatabase.AssetPathToGUID;
            isValidFolder ??= AssetDatabase.IsValidFolder;

            if (isValidFolder(assetPath)) return false;

            var guid = assetPathToGuid(assetPath);
            if (string.IsNullOrEmpty(guid)) return false;

            dict.TryGetValue(guid, out var rec);
            if (rec == null)
            {
                rec = new LedgerRecord
                {
                    guid = guid,
                    first_seen_at = now
                };
            }

            rec.path_current = assetPath;
            rec.type = DetectTypeFromPath(assetPath);
            rec.last_seen_at = now;
            rec.alive = true;

            if (rec.type == "Script")
            {
                EnrichScriptInfo(assetPath, rec, scriptLoader);
            }

            dict[guid] = rec;
            return true;
        }
    }
}
