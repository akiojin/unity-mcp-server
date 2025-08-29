using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using UnityEngine;

namespace UnityEditorMCP.Core.CodeIndex
{
    /// <summary>
    /// Simple JSON-backed store for per-file symbols under Library/UnityMCP/CodeIndex
    /// </summary>
    public static class JsonIndexStore
    {
        private const string Version = "1";
        private static string Root => Path.Combine(ProjectRoot, "Library/UnityMCP/CodeIndex").Replace('\\', '/');
        private static string ProjectRoot => Application.dataPath.Substring(0, Application.dataPath.Length - "/Assets".Length).Replace('\\', '/');

        public static void EnsureRoot()
        {
            Directory.CreateDirectory(Root);
        }

        public static void SaveFileSymbols(FileSymbols fs, DateTime mtime)
        {
            EnsureRoot();
            var meta = new FileMeta { version = Version, mtime = mtime.Ticks, path = fs.path };
            var dir = Path.Combine(Root, "files");
            Directory.CreateDirectory(dir);
            var safeName = fs.path.Replace('/', '_').Replace('\\', '_');
            var metaPath = Path.Combine(dir, safeName + ".meta.json");
            var dataPath = Path.Combine(dir, safeName + ".symbols.json");
            File.WriteAllText(metaPath, JsonConvert.SerializeObject(meta));
            File.WriteAllText(dataPath, JsonConvert.SerializeObject(fs));
        }

        public static (FileSymbols fs, DateTime mtime, bool ok) LoadFileSymbols(string relPath)
        {
            var dir = Path.Combine(Root, "files");
            var safeName = relPath.Replace('/', '_').Replace('\\', '_');
            var metaPath = Path.Combine(dir, safeName + ".meta.json");
            var dataPath = Path.Combine(dir, safeName + ".symbols.json");
            if (!File.Exists(metaPath) || !File.Exists(dataPath)) return (null, DateTime.MinValue, false);
            try
            {
                var meta = JsonConvert.DeserializeObject<FileMeta>(File.ReadAllText(metaPath));
                if (meta == null || meta.version != Version) return (null, DateTime.MinValue, false);
                var fs = JsonConvert.DeserializeObject<FileSymbols>(File.ReadAllText(dataPath));
                return (fs, new DateTime(meta.mtime), true);
            }
            catch
            {
                return (null, DateTime.MinValue, false);
            }
        }

        public static void Invalidate(string relPath)
        {
            var dir = Path.Combine(Root, "files");
            var safeName = relPath.Replace('/', '_').Replace('\\', '_');
            var metaPath = Path.Combine(dir, safeName + ".meta.json");
            var dataPath = Path.Combine(dir, safeName + ".symbols.json");
            if (File.Exists(metaPath)) File.Delete(metaPath);
            if (File.Exists(dataPath)) File.Delete(dataPath);
        }

        public static int CountStored()
        {
            var dir = Path.Combine(Root, "files");
            if (!Directory.Exists(dir)) return 0;
            return Directory.GetFiles(dir, "*.symbols.json").Length;
        }

        class FileMeta { public string version; public long mtime; public string path; }
    }
}

