using NUnit.Framework;
using UnityMCPServer.AI;

namespace UnityMCPServer.Tests.AI
{
    public class AgentSessionTests
    {
        private AgentDefinition _agent;
        private AgentSessionManager _manager;

        [SetUp]
        public void SetUp()
        {
            _agent = AgentDefinitionLoader.GetDefault();
            _manager = new AgentSessionManager();
        }

        [Test]
        public void CreateSession_SetsInitialState()
        {
            var session = _manager.CreateSession(_agent, "workspace");

            Assert.IsNotNull(session);
            Assert.AreEqual(_agent.Id, session.Agent.Id);
            Assert.AreEqual("workspace", session.Workspace);
            Assert.IsFalse(session.IsClosed);
            Assert.AreEqual(0, session.Messages.Count);
        }

        [Test]
        public void CloseSession_RemovesFromManager()
        {
            var session = _manager.CreateSession(_agent, "project");
            var sessionId = session.SessionId;

            var closed = _manager.CloseSession(sessionId);

            Assert.IsTrue(closed);
            Assert.IsFalse(_manager.TryGetSession(sessionId, out _));
        }
    }
}
