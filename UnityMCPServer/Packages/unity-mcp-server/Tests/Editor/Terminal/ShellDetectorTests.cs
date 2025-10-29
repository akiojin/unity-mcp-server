using NUnit.Framework;
using UnityEngine;
using System.IO;

namespace UnityMCPServer.Editor.Terminal.Tests
{
    [TestFixture]
    public class ShellDetectorTests
    {
        [Test]
        public void ShellDetector_AutoShouldDetectShellBasedOnPlatform()
        {
            // Arrange & Act
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");

            // Assert
            Assert.IsNotNull(shellType);
            Assert.IsNotNull(shellPath);
            Assert.IsNotEmpty(shellType);
            Assert.IsNotEmpty(shellPath);

#if UNITY_EDITOR_WIN
            // Windows: wsl, pwsh, powershell, or cmd
            Assert.That(shellType, Is.EqualTo("wsl").Or.EqualTo("pwsh").Or.EqualTo("powershell").Or.EqualTo("cmd"));
#elif UNITY_EDITOR_OSX
            // macOS: zsh or bash
            Assert.That(shellType, Is.EqualTo("zsh").Or.EqualTo("bash"));
#elif UNITY_EDITOR_LINUX
            // Linux: bash
            Assert.AreEqual("bash", shellType);
#endif
        }

        [Test]
        public void ShellDetector_ShouldDetectBashIfAvailable()
        {
            // Arrange & Act
            try
            {
                var (shellType, shellPath) = ShellDetector.DetectShell("bash");

                // Assert
                Assert.AreEqual("bash", shellType);
                Assert.IsTrue(File.Exists(shellPath), $"Bash shell should exist at: {shellPath}");
            }
            catch (System.Exception ex)
            {
                // Bash may not be available on all platforms
                Assert.That(ex.Message, Does.Contain("bash"));
            }
        }

        [Test]
        public void ShellDetector_ShouldThrowForInvalidShellType()
        {
            // Arrange & Act & Assert
            Assert.Throws<System.Exception>(() =>
            {
                ShellDetector.DetectShell("invalid-shell");
            });
        }

        [Test]
        public void ShellDetector_ShouldReturnValidPathForDetectedShell()
        {
            // Arrange & Act
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");

            // Assert
            Assert.IsTrue(File.Exists(shellPath), $"Detected shell should exist at: {shellPath}");
        }

#if UNITY_EDITOR_WIN
        [Test]
        public void ShellDetector_WindowsShouldPrioritizeWSL()
        {
            // Arrange
            string wslPath = @"C:\Windows\System32\wsl.exe";

            // Act
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");

            // Assert
            if (File.Exists(wslPath))
            {
                Assert.AreEqual("wsl", shellType);
                Assert.AreEqual(wslPath, shellPath);
            }
        }
#endif

#if UNITY_EDITOR_OSX
        [Test]
        public void ShellDetector_MacOSShouldPrioritizeZsh()
        {
            // Arrange
            string zshPath = "/bin/zsh";

            // Act
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");

            // Assert
            if (File.Exists(zshPath))
            {
                Assert.AreEqual("zsh", shellType);
                Assert.AreEqual(zshPath, shellPath);
            }
        }
#endif

        [Test]
        public void ShellDetector_ShouldHandleExplicitShellRequest()
        {
            // Arrange
            var requestedShell = "bash";

            // Act
            try
            {
                var (shellType, shellPath) = ShellDetector.DetectShell(requestedShell);

                // Assert
                Assert.AreEqual(requestedShell, shellType);
                Assert.IsNotEmpty(shellPath);
            }
            catch (System.Exception ex)
            {
                // Shell may not be available
                Assert.That(ex.Message, Does.Contain(requestedShell));
            }
        }
    }
}
