using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace UnityMCPServer.AI
{
    public static class AgentDefinitionLoader
    {
        private static readonly List<AgentDefinition> Cache;

        static AgentDefinitionLoader()
        {
            Cache = LoadInternal();
        }

        public static IReadOnlyList<AgentDefinition> LoadAll()
        {
            return Cache;
        }

        public static AgentDefinition FindById(string id)
        {
            return Cache.FirstOrDefault(agent => agent.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
        }

        public static AgentDefinition GetDefault()
        {
            return Cache.FirstOrDefault(agent => agent.IsDefault) ?? Cache.FirstOrDefault();
        }

        private static List<AgentDefinition> LoadInternal()
        {
            var agents = new List<AgentDefinition>();

            void AddBuiltin(string id, string provider, string model, params string[] capabilities)
            {
                agents.Add(new AgentDefinition(
                    id,
                    provider,
                    model,
                    endpoint: null,
                    capabilities: capabilities,
                    isDefault: id == "codex",
                    authRef: null,
                    metadata: new Dictionary<string, object>()
                ));
            }

            AddBuiltin("codex", "openai", "o4-mini", "code", "shell", "test");
            AddBuiltin("claude", "anthropic", "claude-3-5-sonnet", "code", "shell");

            foreach (var custom in LoadCustomAgents())
            {
                agents.RemoveAll(agent => agent.Id.Equals(custom.Id, StringComparison.OrdinalIgnoreCase));
                agents.Add(custom);
            }

            if (!agents.Any(agent => agent.IsDefault))
            {
                var codex = agents.FirstOrDefault(agent => agent.Id == "codex");
                if (codex != null)
                {
                    agents.Remove(codex);
                    agents.Add(new AgentDefinition(
                        codex.Id,
                        codex.Provider,
                        codex.Model,
                        codex.Endpoint,
                        codex.Capabilities,
                        isDefault: true,
                        codex.AuthRef,
                        codex.Metadata));
                }
            }

            return agents;
        }

        private static IEnumerable<AgentDefinition> LoadCustomAgents()
        {
            var configPath = ResolveConfigPath();
            if (string.IsNullOrEmpty(configPath) || !File.Exists(configPath))
            {
                yield break;
            }

            try
            {
                var json = JObject.Parse(File.ReadAllText(configPath));
                var agentsToken = json.SelectToken("aiAgents");
                if (agentsToken is JArray array)
                {
                    foreach (var token in array)
                    {
                        var id = token.Value<string>("id");
                        var provider = token.Value<string>("provider");
                        if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(provider))
                        {
                            Debug.LogWarning($"[AI] Invalid aiAgents entry in {configPath}: missing id/provider");
                            continue;
                        }

                        var capabilities = token["capabilities"]?.Values<string>()?.ToArray() ?? Array.Empty<string>();
                        var metadata = token["metadata"] is JObject metaObj
                            ? metaObj.Properties().ToDictionary(p => p.Name, p => (object)p.Value.ToString())
                            : new Dictionary<string, object>();

                        yield return new AgentDefinition(
                            id,
                            provider,
                            token.Value<string>("model"),
                            token.Value<string>("endpoint"),
                            capabilities,
                            token.Value<bool?>("isDefault") ?? false,
                            token.Value<string>("authRef") ?? token.SelectToken("auth.tokenEnv")?.ToString(),
                            metadata);
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[AI] Failed to parse aiAgents from {configPath}: {ex.Message}");
            }
        }

        private static string ResolveConfigPath()
        {
            try
            {
                string explicitPath = Environment.GetEnvironmentVariable("UNITY_MCP_CONFIG");
                if (!string.IsNullOrEmpty(explicitPath) && File.Exists(explicitPath))
                {
                    return explicitPath;
                }

                var projectRoot = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
                var projectConfig = Path.Combine(projectRoot, ".unity", "config.json");
                if (File.Exists(projectConfig))
                {
                    return projectConfig;
                }

                var ancestor = FindAncestorConfig(projectRoot, 3);
                if (!string.IsNullOrEmpty(ancestor))
                {
                    return ancestor;
                }

                var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                var userConfig = string.IsNullOrEmpty(home) ? null : Path.Combine(home, ".unity", "config.json");
                if (!string.IsNullOrEmpty(userConfig) && File.Exists(userConfig))
                {
                    return userConfig;
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[AI] Failed to resolve .unity/config.json: {ex.Message}");
            }

            return null;
        }

        private static string FindAncestorConfig(string startDirectory, int levels)
        {
            try
            {
                var current = new DirectoryInfo(startDirectory);
                for (int i = 0; i < levels && current != null; i++)
                {
                    var candidate = Path.Combine(current.FullName, ".unity", "config.json");
                    if (File.Exists(candidate))
                    {
                        return candidate;
                    }
                    current = current.Parent;
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[AI] Ancestor config search failed: {ex.Message}");
            }

            return null;
        }
    }
}
