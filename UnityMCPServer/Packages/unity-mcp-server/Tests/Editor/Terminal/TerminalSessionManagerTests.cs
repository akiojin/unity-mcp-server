using NUnit.Framework;
using System;
using System.Linq;

namespace UnityMCPServer.Editor.Terminal.Tests
{
    [TestFixture]
    public class TerminalSessionManagerTests
    {
        [TearDown]
        public void TearDown()
        {
            // Cleanup all sessions after each test
            TerminalSessionManager.CloseAllSessions();
        }

        [Test]
        public void TerminalSessionManager_ShouldCreateSession()
        {
            // Arrange
            var sessionId = Guid.NewGuid().ToString();
            var workingDir = PathResolver.GetWorkspaceRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");

            // Act
            var session = TerminalSessionManager.CreateSession(sessionId, workingDir, shellType, shellPath);

            // Assert
            Assert.IsNotNull(session);
            Assert.AreEqual(sessionId, session.SessionId);
            Assert.IsTrue(session.IsRunning);
        }

        [Test]
        public void TerminalSessionManager_ShouldGetSession()
        {
            // Arrange
            var sessionId = Guid.NewGuid().ToString();
            var workingDir = PathResolver.GetWorkspaceRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");
            TerminalSessionManager.CreateSession(sessionId, workingDir, shellType, shellPath);

            // Act
            var session = TerminalSessionManager.GetSession(sessionId);

            // Assert
            Assert.IsNotNull(session);
            Assert.AreEqual(sessionId, session.SessionId);
        }

        [Test]
        public void TerminalSessionManager_ShouldReturnNullForNonExistentSession()
        {
            // Arrange
            var sessionId = "non-existent-session-id";

            // Act
            var session = TerminalSessionManager.GetSession(sessionId);

            // Assert
            Assert.IsNull(session);
        }

        [Test]
        public void TerminalSessionManager_ShouldCloseSession()
        {
            // Arrange
            var sessionId = Guid.NewGuid().ToString();
            var workingDir = PathResolver.GetWorkspaceRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");
            TerminalSessionManager.CreateSession(sessionId, workingDir, shellType, shellPath);

            // Act
            TerminalSessionManager.CloseSession(sessionId);

            // Assert
            var session = TerminalSessionManager.GetSession(sessionId);
            Assert.IsNull(session, "Session should be removed after close");
        }

        [Test]
        public void TerminalSessionManager_ShouldGetAllSessions()
        {
            // Arrange
            var sessionId1 = Guid.NewGuid().ToString();
            var sessionId2 = Guid.NewGuid().ToString();
            var workingDir = PathResolver.GetWorkspaceRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");

            TerminalSessionManager.CreateSession(sessionId1, workingDir, shellType, shellPath);
            TerminalSessionManager.CreateSession(sessionId2, workingDir, shellType, shellPath);

            // Act
            var sessions = TerminalSessionManager.GetAllSessions();

            // Assert
            Assert.AreEqual(2, sessions.Count);
            Assert.IsTrue(sessions.Any(s => s.SessionId == sessionId1));
            Assert.IsTrue(sessions.Any(s => s.SessionId == sessionId2));
        }

        [Test]
        public void TerminalSessionManager_ShouldCloseAllSessions()
        {
            // Arrange
            var sessionId1 = Guid.NewGuid().ToString();
            var sessionId2 = Guid.NewGuid().ToString();
            var workingDir = PathResolver.GetWorkspaceRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");

            TerminalSessionManager.CreateSession(sessionId1, workingDir, shellType, shellPath);
            TerminalSessionManager.CreateSession(sessionId2, workingDir, shellType, shellPath);

            // Act
            TerminalSessionManager.CloseAllSessions();

            // Assert
            var sessions = TerminalSessionManager.GetAllSessions();
            Assert.AreEqual(0, sessions.Count);
        }

        [Test]
        public void TerminalSessionManager_ShouldThrowForDuplicateSessionId()
        {
            // Arrange
            var sessionId = Guid.NewGuid().ToString();
            var workingDir = PathResolver.GetWorkspaceRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");
            TerminalSessionManager.CreateSession(sessionId, workingDir, shellType, shellPath);

            // Act & Assert
            Assert.Throws<InvalidOperationException>(() =>
            {
                TerminalSessionManager.CreateSession(sessionId, workingDir, shellType, shellPath);
            });
        }

        [Test]
        public void TerminalSessionManager_ShouldHandleClosingNonExistentSession()
        {
            // Arrange
            var sessionId = "non-existent-session-id";

            // Act & Assert
            // Should not throw
            Assert.DoesNotThrow(() =>
            {
                TerminalSessionManager.CloseSession(sessionId);
            });
        }

        [Test]
        public void TerminalSessionManager_ShouldManageMultipleSessions()
        {
            // Arrange
            var workingDir = PathResolver.GetWorkspaceRoot();
            var (shellType, shellPath) = ShellDetector.DetectShell("auto");

            // Act
            var session1 = TerminalSessionManager.CreateSession(Guid.NewGuid().ToString(), workingDir, shellType, shellPath);
            var session2 = TerminalSessionManager.CreateSession(Guid.NewGuid().ToString(), workingDir, shellType, shellPath);
            var session3 = TerminalSessionManager.CreateSession(Guid.NewGuid().ToString(), workingDir, shellType, shellPath);

            // Assert
            var sessions = TerminalSessionManager.GetAllSessions();
            Assert.AreEqual(3, sessions.Count);

            // All sessions should be independent
            Assert.AreNotEqual(session1.SessionId, session2.SessionId);
            Assert.AreNotEqual(session2.SessionId, session3.SessionId);
            Assert.AreNotEqual(session1.SessionId, session3.SessionId);
        }
    }
}
