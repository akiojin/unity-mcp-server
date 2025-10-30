using System;
using System.IO;
using UnityEngine;

namespace UnityMCPServer.Editor.Terminal
{
    /// <summary>
    /// Detects available shells based on OS platform
    /// Implements shell detection strategy from research.md
    /// </summary>
    public static class ShellDetector
    {
        /// <summary>
        /// Detects shell type and path
        /// </summary>
        /// <param name="requestedShell">Requested shell type or "auto" for detection</param>
        /// <returns>Tuple of (shellType, shellPath)</returns>
        public static (string shellType, string shellPath) DetectShell(string requestedShell = "auto")
        {
            if (requestedShell != "auto")
            {
                return FindShellPath(requestedShell);
            }

#if UNITY_EDITOR_WIN
            return DetectWindowsShell();
#elif UNITY_EDITOR_OSX
            return DetectMacOSShell();
#elif UNITY_EDITOR_LINUX
            return DetectLinuxShell();
#else
            throw new System.PlatformNotSupportedException("Unsupported platform for terminal");
#endif
        }

        private static (string shellType, string shellPath) DetectWindowsShell()
        {
            // Check if we're running inside WSL (not Windows calling WSL)
            if (IsRunningInsideWSL())
            {
                Debug.Log("[ShellDetector] Detected WSL environment, using bash instead of wsl.exe");
                // We're inside WSL, so use bash directly
                if (File.Exists("/bin/bash"))
                    return ("bash", "/bin/bash");
                if (File.Exists("/usr/bin/bash"))
                    return ("bash", "/usr/bin/bash");
            }

            // Priority: WSL2 → PowerShell Core → Windows PowerShell → cmd
            if (File.Exists(@"C:\Windows\System32\wsl.exe"))
                return ("wsl", @"C:\Windows\System32\wsl.exe");

            if (File.Exists(@"C:\Program Files\PowerShell\7\pwsh.exe"))
                return ("pwsh", @"C:\Program Files\PowerShell\7\pwsh.exe");

            if (File.Exists(@"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"))
                return ("powershell", @"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe");

            if (File.Exists(@"C:\Windows\System32\cmd.exe"))
                return ("cmd", @"C:\Windows\System32\cmd.exe");

            throw new Exception("No shell found on Windows. Please install WSL2, PowerShell, or use cmd.exe");
        }

        /// <summary>
        /// Checks if we're running inside WSL environment
        /// </summary>
        private static bool IsRunningInsideWSL()
        {
            try
            {
                Debug.Log("[ShellDetector] Checking if running inside WSL...");

                // Check for /proc/version containing "Microsoft" or "WSL"
                if (File.Exists("/proc/version"))
                {
                    string version = File.ReadAllText("/proc/version");
                    Debug.Log($"[ShellDetector] /proc/version exists: {version}");
                    if (version.Contains("Microsoft") || version.Contains("WSL"))
                    {
                        Debug.Log("[ShellDetector] Found Microsoft/WSL in /proc/version");
                        return true;
                    }
                }
                else
                {
                    Debug.Log("[ShellDetector] /proc/version does not exist");
                }

                // Check for WSL_DISTRO_NAME environment variable
                string wslDistro = Environment.GetEnvironmentVariable("WSL_DISTRO_NAME");
                Debug.Log($"[ShellDetector] WSL_DISTRO_NAME environment variable: '{wslDistro}'");
                if (!string.IsNullOrEmpty(wslDistro))
                {
                    Debug.Log("[ShellDetector] Found WSL_DISTRO_NAME");
                    return true;
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[ShellDetector] Error checking WSL environment: {ex.Message}");
            }

            Debug.Log("[ShellDetector] Not running inside WSL");
            return false;
        }

        private static (string shellType, string shellPath) DetectMacOSShell()
        {
            // Priority: Zsh → Bash
            if (File.Exists("/bin/zsh"))
                return ("zsh", "/bin/zsh");

            if (File.Exists("/bin/bash"))
                return ("bash", "/bin/bash");

            throw new Exception("No shell found on macOS. Please install zsh or bash");
        }

        private static (string shellType, string shellPath) DetectLinuxShell()
        {
            // Priority: Bash
            if (File.Exists("/bin/bash"))
                return ("bash", "/bin/bash");

            if (File.Exists("/usr/bin/bash"))
                return ("bash", "/usr/bin/bash");

            throw new Exception("No shell found on Linux. Please install bash");
        }

        private static (string shellType, string shellPath) FindShellPath(string shellType)
        {
            switch (shellType.ToLower())
            {
                case "wsl":
#if UNITY_EDITOR_WIN
                    if (File.Exists(@"C:\Windows\System32\wsl.exe"))
                        return ("wsl", @"C:\Windows\System32\wsl.exe");
#endif
                    throw new Exception($"WSL not found. WSL is only available on Windows.");

                case "bash":
                    if (File.Exists("/bin/bash"))
                        return ("bash", "/bin/bash");
                    if (File.Exists("/usr/bin/bash"))
                        return ("bash", "/usr/bin/bash");
                    throw new Exception("bash not found at /bin/bash or /usr/bin/bash");

                case "zsh":
                    if (File.Exists("/bin/zsh"))
                        return ("zsh", "/bin/zsh");
                    throw new Exception("zsh not found at /bin/zsh");

                case "pwsh":
#if UNITY_EDITOR_WIN
                    if (File.Exists(@"C:\Program Files\PowerShell\7\pwsh.exe"))
                        return ("pwsh", @"C:\Program Files\PowerShell\7\pwsh.exe");
#endif
                    throw new Exception("PowerShell Core (pwsh) not found. Please install PowerShell 7+");

                case "powershell":
#if UNITY_EDITOR_WIN
                    if (File.Exists(@"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"))
                        return ("powershell", @"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe");
#endif
                    throw new Exception("Windows PowerShell not found. powershell is only available on Windows.");

                case "cmd":
#if UNITY_EDITOR_WIN
                    if (File.Exists(@"C:\Windows\System32\cmd.exe"))
                        return ("cmd", @"C:\Windows\System32\cmd.exe");
#endif
                    throw new Exception("cmd.exe not found. cmd is only available on Windows.");

                default:
                    throw new Exception($"Unknown shell type: {shellType}. Supported: auto, wsl, bash, zsh, pwsh, powershell, cmd");
            }
        }
    }
}
