using System;
using System.Text.RegularExpressions;

namespace UnityMCPServer.Editor.Terminal
{
    /// <summary>
    /// Converts Windows paths to WSL2 paths
    /// Implements path conversion strategy from research.md
    /// </summary>
    public static class WSLPathConverter
    {
        /// <summary>
        /// Converts Windows path to WSL2 path
        /// Example: C:\Users\username\project → /mnt/c/Users/username/project
        /// </summary>
        /// <param name="windowsPath">Windows path (e.g., C:\Users\...)</param>
        /// <returns>WSL2 path (e.g., /mnt/c/Users/...)</returns>
        /// <exception cref="ArgumentException">Thrown for UNC paths or invalid paths</exception>
        public static string ToWSLPath(string windowsPath)
        {
            if (windowsPath == null)
                return null;

            if (windowsPath == "")
                return "";

            // Check for UNC path (\\server\share)
            if (windowsPath.StartsWith(@"\\") || windowsPath.StartsWith("//"))
            {
                throw new ArgumentException("UNC paths (\\\\server\\share) are not supported by WSL2");
            }

            // Check for drive letter (e.g., C:)
            var driveMatch = Regex.Match(windowsPath, @"^([A-Za-z]):[\\/]");
            if (!driveMatch.Success)
            {
                throw new ArgumentException($"Invalid Windows path: {windowsPath}. Expected format: C:\\path\\to\\file");
            }

            // Extract drive letter and convert to lowercase
            var driveLetter = driveMatch.Groups[1].Value.ToLower();

            // Remove drive letter and colon
            var pathWithoutDrive = windowsPath.Substring(2);

            // Replace backslashes with forward slashes
            pathWithoutDrive = pathWithoutDrive.Replace('\\', '/');

            // Construct WSL path: /mnt/{drive}/{path}
            var wslPath = $"/mnt/{driveLetter}{pathWithoutDrive}";

            return wslPath;
        }

        /// <summary>
        /// Checks if a path is a Windows path (has drive letter)
        /// </summary>
        /// <param name="path">Path to check</param>
        /// <returns>True if Windows path</returns>
        public static bool IsWindowsPath(string path)
        {
            if (string.IsNullOrEmpty(path))
                return false;

            return Regex.IsMatch(path, @"^[A-Za-z]:[\\/]");
        }
    }
}
