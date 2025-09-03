// SPDX-License-Identifier: UNLICENSED
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace UnityEditorMCP.GuidDb
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

        public static void AppendSnapshot(SnapshotRecord rec)
        {
            if (!GuidDbConfig.SnapshotsEnabled()) return;
            lock (_ioLock)
            {
                JsonLines.AppendLine(GuidDbPaths.TodaySnapshotPath(), JsonLines.ToJson(rec));
            }
        }

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

        private static void EnrichScriptInfo(string assetPath, LedgerRecord rec)
        {
            if (rec.type != "Script") return;
            try
            {
                var ms = AssetDatabase.LoadAssetAtPath<MonoScript>(assetPath);
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
            if (string.IsNullOrEmpty(assetPath)) return;
            if (!assetPath.StartsWith("Assets/")) return;
            var guid = AssetDatabase.AssetPathToGUID(assetPath);
            if (string.IsNullOrEmpty(guid)) return;

            var dict = LoadLedger();
            var now = JsonLines.IsoNowUtc();
            dict.TryGetValue(guid, out var rec);
            var change = new SnapshotRecord
            {
                guid = guid,
                path = assetPath,
                seen_at = now,
                change_type = rec == null ? "create" : (rec.path_current != assetPath ? "move" : "modify"),
                meta_hash = JsonLines.Sha256File(Path.Combine(GuidDbPaths.ProjectRoot(), assetPath) + ".meta")
            };

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
            EnrichScriptInfo(assetPath, rec);

            dict[guid] = rec;
            SaveLedger(dict);
            AppendSnapshot(change);
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
            AppendSnapshot(new SnapshotRecord
            {
                guid = guid,
                path = assetPath,
                seen_at = now,
                change_type = "delete",
                meta_hash = null
            });
        }

        [MenuItem("Window/Unity Editor MCP/Guid DB/Full Scan (Assets)")]
        public static void FullScan()
        {
            try
            {
                var all = AssetDatabase.GetAllAssetPaths();
                foreach (var p in all)
                {
                    if (!p.StartsWith("Assets/")) continue;
                    if (AssetDatabase.IsValidFolder(p)) continue;
                    UpsertImported(p);
                }
                Debug.Log("[GuidDB] Full scan completed.");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[GuidDB] Full scan error: {ex}");
            }
        }

        [MenuItem("Window/Unity Editor MCP/Guid DB/Create Daily Snapshot File")]
        public static void EnsureDailySnapshotFile()
        {
            if (!GuidDbConfig.SnapshotsEnabled())
            {
                Debug.Log("[GuidDB] Snapshots are disabled by configuration.");
                return;
            }
            try
            {
                GuidDbPaths.EnsureDirs();
                var path = GuidDbPaths.TodaySnapshotPath();
                if (!File.Exists(path)) JsonLines.AppendLine(path, "");
                Debug.Log($"[GuidDB] Snapshot ready: {path}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[GuidDB] Snapshot create error: {ex}");
            }
        }
    }
}
