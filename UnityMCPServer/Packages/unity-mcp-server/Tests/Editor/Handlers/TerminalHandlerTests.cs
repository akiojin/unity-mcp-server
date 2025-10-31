using NUnit.Framework;
using Newtonsoft.Json.Linq;
using System;

namespace UnityMCPServer.Handlers.Tests
{
    [TestFixture]
    public class TerminalHandlerTests
    {
        [TearDown]
        public void TearDown()
        {
            // Cleanup all sessions after each test
            Editor.Terminal.TerminalSessionManager.CloseAllSessions();
        }

        [Test]
        public void TerminalHandler_OpenShouldCreateSession()
        {
            // Arrange
            var parameters = new JObject
            {
                ["workingDirectory"] = "workspace",
                ["shell"] = "auto"
            };

            // Act
            var result = TerminalHandler.Open(parameters);

            // Assert
            Assert.IsNotNull(result);
            var jResult = JObject.FromObject(result);
            Assert.IsNotNull(jResult["sessionId"]);
            Assert.IsNotNull(jResult["shellType"]);
            Assert.IsNotNull(jResult["shellPath"]);
            Assert.IsNotNull(jResult["workingDirectory"]);
        }

        [Test]
        public void TerminalHandler_OpenShouldValidateWorkingDirectory()
        {
            // Arrange
            var parameters = new JObject
            {
                ["workingDirectory"] = "invalid"
            };

            // Act
            var result = TerminalHandler.Open(parameters);

            // Assert
            var jResult = JObject.FromObject(result);
            Assert.IsNotNull(jResult["error"]);
            Assert.That(jResult["error"].ToString(), Does.Contain("Invalid workingDirectory"));
        }

        [Test]
        public void TerminalHandler_ExecuteShouldSendCommand()
        {
            // Arrange - Create session first
            var openParams = new JObject
            {
                ["workingDirectory"] = "workspace",
                ["shell"] = "auto"
            };
            var openResult = TerminalHandler.Open(openParams);
            var sessionId = JObject.FromObject(openResult)["sessionId"].ToString();

            var executeParams = new JObject
            {
                ["sessionId"] = sessionId,
                ["commandText"] = "echo test"
            };

            // Act
            var result = TerminalHandler.Execute(executeParams);

            // Assert
            var jResult = JObject.FromObject(result);
            Assert.IsTrue(jResult["success"].ToObject<bool>());
        }

        [Test]
        public void TerminalHandler_ExecuteShouldReturnErrorForInvalidSession()
        {
            // Arrange
            var parameters = new JObject
            {
                ["sessionId"] = "invalid-session-id",
                ["commandText"] = "echo test"
            };

            // Act
            var result = TerminalHandler.Execute(parameters);

            // Assert
            var jResult = JObject.FromObject(result);
            Assert.IsNotNull(jResult["error"]);
            Assert.That(jResult["error"].ToString(), Does.Contain("not found"));
        }

        [Test]
        public void TerminalHandler_ReadShouldReturnOutput()
        {
            // Arrange - Create session and execute command
            var openParams = new JObject
            {
                ["workingDirectory"] = "workspace",
                ["shell"] = "auto"
            };
            var openResult = TerminalHandler.Open(openParams);
            var sessionId = JObject.FromObject(openResult)["sessionId"].ToString();

            var readParams = new JObject
            {
                ["sessionId"] = sessionId,
                ["maxLines"] = 100
            };

            // Act
            var result = TerminalHandler.Read(readParams);

            // Assert
            var jResult = JObject.FromObject(result);
            Assert.IsNotNull(jResult["lines"]);
            Assert.IsNotNull(jResult["hasMore"]);
            Assert.IsTrue(jResult["lines"] is JArray);
        }

        [Test]
        public void TerminalHandler_ReadShouldReturnErrorForInvalidSession()
        {
            // Arrange
            var parameters = new JObject
            {
                ["sessionId"] = "invalid-session-id"
            };

            // Act
            var result = TerminalHandler.Read(parameters);

            // Assert
            var jResult = JObject.FromObject(result);
            Assert.IsNotNull(jResult["error"]);
        }

        [Test]
        public void TerminalHandler_CloseShouldTerminateSession()
        {
            // Arrange - Create session first
            var openParams = new JObject
            {
                ["workingDirectory"] = "workspace",
                ["shell"] = "auto"
            };
            var openResult = TerminalHandler.Open(openParams);
            var sessionId = JObject.FromObject(openResult)["sessionId"].ToString();

            var closeParams = new JObject
            {
                ["sessionId"] = sessionId
            };

            // Act
            var result = TerminalHandler.Close(closeParams);

            // Assert
            var jResult = JObject.FromObject(result);
            Assert.IsTrue(jResult["success"].ToObject<bool>());

            // Verify session is removed
            var session = Editor.Terminal.TerminalSessionManager.GetSession(sessionId);
            Assert.IsNull(session);
        }

        [Test]
        public void TerminalHandler_CloseShouldHandleNonExistentSession()
        {
            // Arrange
            var parameters = new JObject
            {
                ["sessionId"] = "non-existent-session"
            };

            // Act
            var result = TerminalHandler.Close(parameters);

            // Assert
            var jResult = JObject.FromObject(result);
            // Should succeed (idempotent)
            Assert.IsTrue(jResult["success"].ToObject<bool>());
        }
    }
}
