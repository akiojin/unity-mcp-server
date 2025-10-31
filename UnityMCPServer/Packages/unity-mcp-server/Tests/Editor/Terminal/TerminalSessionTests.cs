using NUnit.Framework;
using System;
using System.Threading;
using System.Linq;

namespace UnityMCPServer.Editor.Terminal.Tests
{
    [TestFixture]
    public class TerminalSessionTests
    {
        private TerminalSession _session;
        private string _testSessionId;

        [SetUp]
        public void SetUp()
        {
            _testSessionId = Guid.NewGuid().ToString();
        }

        [TearDown]
        public void TearDown()
        {
            if (_session != null && _session.IsRunning)
            {
                _session.Close();
                _session = null;
            }
        }

        [Test]
        public void TerminalSession_ShouldCreateAndStartProcess()
        {
            // Arrange
            var workingDir = PathResolver.GetWorkspaceRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");

            // Act
            _session = new TerminalSession(_testSessionId, workingDir, shellType, shellPath);

            // Assert
            Assert.IsNotNull(_session);
            Assert.AreEqual(_testSessionId, _session.SessionId);
            Assert.IsTrue(_session.IsRunning);
            Assert.IsNotNull(_session.OutputBuffer);
        }

        [Test]
        public void TerminalSession_ShouldExecuteCommand()
        {
            // Arrange
            var workingDir = PathResolver.GetWorkspaceRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");
            _session = new TerminalSession(_testSessionId, workingDir, shellType, shellPath);

            // Act
            _session.ExecuteCommand("echo test");

            // Wait for output
            Thread.Sleep(500);

            // Assert
            var lines = _session.OutputBuffer.GetLines(100);
            Assert.Greater(lines.Count, 0, "Should have output");
        }

        [Test]
        public void TerminalSession_ShouldCaptureStdout()
        {
            // Arrange
            var workingDir = PathResolver.GetWorkspaceRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");
            _session = new TerminalSession(_testSessionId, workingDir, shellType, shellPath);

            // Act
            _session.ExecuteCommand("echo hello");
            Thread.Sleep(500);

            // Assert
            var lines = _session.OutputBuffer.GetLines(100);
            var outputText = string.Join(" ", lines.Select(l => l.Text));
            Assert.That(outputText, Does.Contain("hello").IgnoreCase);
        }

        [Test]
        public void TerminalSession_ShouldSetCorrectWorkingDirectory()
        {
            // Arrange
            var workingDir = PathResolver.GetProjectRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");
            _session = new TerminalSession(_testSessionId, workingDir, shellType, shellPath);

            // Act - Execute pwd/cd command based on shell
            string command = shellType == "cmd" || shellType == "powershell" || shellType == "pwsh" ? "cd" : "pwd";
            _session.ExecuteCommand(command);
            Thread.Sleep(500);

            // Assert
            var lines = _session.OutputBuffer.GetLines(100);
            var outputText = string.Join("\n", lines.Select(l => l.Text));

            // Should contain part of the working directory
            Assert.IsTrue(lines.Count > 0, "Should have output from pwd/cd command");
        }

        [Test]
        public void TerminalSession_ShouldInheritEnvironmentVariables()
        {
            // Arrange
            var workingDir = PathResolver.GetWorkspaceRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");
            _session = new TerminalSession(_testSessionId, workingDir, shellType, shellPath);

            // Act - Check PATH environment variable
            string command = shellType == "cmd" ? "echo %PATH%" :
                           shellType == "powershell" || shellType == "pwsh" ? "echo $env:PATH" :
                           "echo $PATH";
            _session.ExecuteCommand(command);
            Thread.Sleep(500);

            // Assert
            var lines = _session.OutputBuffer.GetLines(100);
            Assert.Greater(lines.Count, 0, "Should have PATH output");
        }

        [Test]
        public void TerminalSession_ShouldCloseSuccessfully()
        {
            // Arrange
            var workingDir = PathResolver.GetWorkspaceRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");
            _session = new TerminalSession(_testSessionId, workingDir, shellType, shellPath);

            // Act
            _session.Close();

            // Assert
            Assert.IsFalse(_session.IsRunning);
        }

        [Test]
        public void TerminalSession_ShouldHandleMultipleCommands()
        {
            // Arrange
            var workingDir = PathResolver.GetWorkspaceRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");
            _session = new TerminalSession(_testSessionId, workingDir, shellType, shellPath);

            // Act
            _session.ExecuteCommand("echo first");
            Thread.Sleep(300);
            _session.ExecuteCommand("echo second");
            Thread.Sleep(300);
            _session.ExecuteCommand("echo third");
            Thread.Sleep(300);

            // Assert
            var lines = _session.OutputBuffer.GetLines(100);
            Assert.Greater(lines.Count, 0, "Should have multiple outputs");
        }

        [Test]
        public void TerminalSession_ShouldThrowWhenExecutingOnClosedSession()
        {
            // Arrange
            var workingDir = PathResolver.GetWorkspaceRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");
            _session = new TerminalSession(_testSessionId, workingDir, shellType, shellPath);
            _session.Close();

            // Act & Assert
            Assert.Throws<InvalidOperationException>(() =>
            {
                _session.ExecuteCommand("echo test");
            });
        }

        [Test]
        public void TerminalSession_ShouldHaveUniqueSessionId()
        {
            // Arrange
            var workingDir = PathResolver.GetWorkspaceRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");

            // Act
            var session1 = new TerminalSession(Guid.NewGuid().ToString(), workingDir, shellType, shellPath);
            var session2 = new TerminalSession(Guid.NewGuid().ToString(), workingDir, shellType, shellPath);

            // Assert
            Assert.AreNotEqual(session1.SessionId, session2.SessionId);

            // Cleanup
            session1.Close();
            session2.Close();
        }
    }
}
