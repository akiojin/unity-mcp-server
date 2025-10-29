using System;
using System.IO;
using UnityEngine;

namespace UnityMCPServer.Editor.Terminal
{
    /// <summary>
    /// Resolves workspace root and project root paths
    /// </summary>
    public static class PathResolver
    {
        /// <summary>
        /// Gets the workspace root directory
        /// Reads from .unity/config.json or falls back to detecting repository root
        /// </summary>
        /// <returns>Absolute path to workspace root</returns>
        public static string GetWorkspaceRoot()
        {
            // Try to read from .unity/config.json
            var projectRoot = GetProjectRoot();
            var configPath = Path.Combine(projectRoot, "..", ".unity", "config.json");

            if (File.Exists(configPath))
            {
                try
                {
                    var json = File.ReadAllText(configPath);
                    var config = JsonUtility.FromJson<UnityConfig>(json);

                    if (!string.IsNullOrEmpty(config?.project?.root))
                    {
                        // config.project.root is relative to .unity directory
                        var unityDir = Path.GetDirectoryName(configPath);
                        var workspaceRoot = Path.GetFullPath(Path.Combine(unityDir, ".."));
                        return workspaceRoot;
                    }
                }
                catch (Exception ex)
                {
                    Debug.LogWarning($"Failed to read .unity/config.json: {ex.Message}. Falling back to repository detection.");
                }
            }

            // Fallback: detect repository root by looking for .git directory
            var currentDir = projectRoot;
            while (!string.IsNullOrEmpty(currentDir))
            {
                if (Directory.Exists(Path.Combine(currentDir, ".git")))
                {
                    return currentDir;
                }

                var parent = Directory.GetParent(currentDir);
                if (parent == null)
                    break;

                currentDir = parent.FullName;
            }

            // Final fallback: use project root
            return projectRoot;
        }

        /// <summary>
        /// Gets the Unity project root directory (contains Assets/)
        /// </summary>
        /// <returns>Absolute path to Unity project root</returns>
        public static string GetProjectRoot()
        {
            return Path.GetFullPath(Application.dataPath + "/..");
        }

        /// <summary>
        /// Resolves working directory based on type
        /// </summary>
        /// <param name="workingDirectoryType">"workspace" or "project"</param>
        /// <returns>Absolute path to working directory</returns>
        /// <exception cref="ArgumentException">Thrown for invalid type</exception>
        public static string ResolveWorkingDirectory(string workingDirectoryType)
        {
            switch (workingDirectoryType.ToLower())
            {
                case "workspace":
                    return GetWorkspaceRoot();

                case "project":
                    return GetProjectRoot();

                default:
                    throw new ArgumentException($"Invalid workingDirectory type: {workingDirectoryType}. Expected 'workspace' or 'project'");
            }
        }

        [Serializable]
        private class UnityConfig
        {
            public ProjectConfig project;
        }

        [Serializable]
        private class ProjectConfig
        {
            public string root;
        }
    }
}
