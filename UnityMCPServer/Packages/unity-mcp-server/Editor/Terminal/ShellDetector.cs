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
