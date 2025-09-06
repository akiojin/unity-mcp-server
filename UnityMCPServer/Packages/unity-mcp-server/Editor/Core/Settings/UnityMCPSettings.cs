using System;
using System.IO;
using Newtonsoft.Json;
using UnityEngine;

namespace UnityMCPServer.Core.Settings
{
    /// <summary>
    /// Lightweight settings loader for Unity MCP. Reads ProjectSettings/UnityMCPSettings.json if present,
    /// otherwise falls back to safe defaults. Settings are small and VCS-friendly; indexes live under Library/.
    /// </summary>
    public class UnityMCPSettings
    {
        public TokenBudgetSettings tokenBudget = new TokenBudgetSettings();
        public SearchDefaults searchDefaults = new SearchDefaults();
        public WritePolicy writePolicy = new WritePolicy();
        public string storePath = DefaultStorePath;

        public const string SettingsPath = "ProjectSettings/UnityMCPSettings.json";
        public const string DefaultStorePath = "Library/UnityMCP/CodeIndex";

        public static UnityMCPSettings Load()
        {
            try
            {
                if (File.Exists(SettingsPath))
                {
                    var json = File.ReadAllText(SettingsPath);
                    var s = JsonConvert.DeserializeObject<UnityMCPSettings>(json);
                    if (s != null)
                    {
                        if (string.IsNullOrEmpty(s.storePath)) s.storePath = DefaultStorePath;
                        return s;
                    }
                }
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[UnityMCPSettings] Failed to load settings, using defaults. {e.Message}");
            }
            return new UnityMCPSettings();
        }

        [Serializable]
        public class TokenBudgetSettings
        {
            public int maxBytes = 32768; // default ~32KB cap per response
            public string returnMode = "metadata"; // metadata | snippets | full
            public int snippetContext = 2; // lines before/after
        }

        [Serializable]
        public class SearchDefaults
        {
            public string patternType = "substring"; // substring | regex | glob
            public string[] flags = Array.Empty<string>(); // regex flags
            public int maxResults = 200;
            public int maxMatchesPerFile = 3;
        }

        [Serializable]
        public class WritePolicy
        {
            public bool allowAssets = true;
            public bool allowEmbeddedPackages = true;
            // Embedded/Assets での新規 .cs 作成も許可（自己修復/拡張のため）
            public bool allowNewFiles = true;
            public string[] allowedExtensions = new[] { ".cs" };
        }
    }
}
