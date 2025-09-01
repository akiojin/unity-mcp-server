// SPDX-License-Identifier: UNLICENSED
// GUID DB Models and helpers
using System;
using System.IO;
using System.Text;
using UnityEngine;

namespace UnityEditorMCP.GuidDb
{
    [Serializable]
    public class LedgerRecord
    {
        public string guid;
        public string path_current;
        public string type; // Script, Prefab, Scene, Folder, Texture, Material, Other
        public string assembly_name; // scripts only
        public string @namespace;    // scripts only
        public string class_name;    // scripts only
        public string first_seen_at; // ISO8601 UTC
        public string last_seen_at;  // ISO8601 UTC
        public bool alive;           // true if asset currently exists
    }

    [Serializable]
    public class SnapshotRecord
    {
        public string guid;
        public string path;
        public string seen_at;    // ISO8601 UTC
        public string change_type; // create, move, delete, modify
        public string meta_hash;  // SHA256 of .meta if available
    }

    internal static class GuidDbPaths
    {
        public static string ProjectRoot()
        {
            // Application.dataPath ends with "/Assets"
            var dataPath = Application.dataPath;
            var root = Directory.GetParent(dataPath)?.FullName ?? dataPath;
            return root.Replace("\\", "/");
        }

        public static string DbRoot()
        {
            return Path.Combine(ProjectRoot(), ".unity", "guid-db").Replace("\\", "/");
        }

        public static string LedgerPath()
        {
            return Path.Combine(DbRoot(), "ledger.ndjson").Replace("\\", "/");
        }

        public static string SnapshotsDir()
        {
            return Path.Combine(DbRoot(), "snapshots").Replace("\\", "/");
        }

        public static string TodaySnapshotPath()
        {
            var fname = DateTime.UtcNow.ToString("yyyy-MM-dd") + ".ndjson";
            return Path.Combine(SnapshotsDir(), fname).Replace("\\", "/");
        }

        public static void EnsureDirs()
        {
            Directory.CreateDirectory(DbRoot());
            Directory.CreateDirectory(SnapshotsDir());
        }
    }

    internal static class JsonLines
    {
        public static string ToJson(object obj)
        {
            return JsonUtility.ToJson(obj);
        }

        public static T FromJson<T>(string json)
        {
            return JsonUtility.FromJson<T>(json);
        }

        public static string IsoNowUtc()
        {
            return DateTime.UtcNow.ToString("o");
        }

        public static string Sha256File(string path)
        {
            try
            {
                if (!File.Exists(path)) return null;
                using (var sha = System.Security.Cryptography.SHA256.Create())
                using (var fs = File.OpenRead(path))
                {
                    var hash = sha.ComputeHash(fs);
                    var sb = new StringBuilder(hash.Length * 2);
                    foreach (var b in hash) sb.Append(b.ToString("x2"));
                    return sb.ToString();
                }
            }
            catch { return null; }
        }

        public static void AtomicWriteAllText(string path, string content)
        {
            var dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
            var tmp = path + ".tmp";
            File.WriteAllText(tmp, content, new UTF8Encoding(false));
            if (File.Exists(path))
            {
                try { File.Replace(tmp, path, null); }
                catch
                {
                    try { if (File.Exists(path)) File.Delete(path); } catch {}
                    File.Move(tmp, path);
                }
            }
            else
            {
                File.Move(tmp, path);
            }
        }

        public static void AppendLine(string path, string line)
        {
            var dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
            using (var sw = new StreamWriter(path, append: true, encoding: new UTF8Encoding(false)))
            {
                sw.WriteLine(line);
            }
        }
}
}
