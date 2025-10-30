using NUnit.Framework;
using UnityMCPServer.AI;

namespace UnityMCPServer.Tests.AI
{
    public class ActionRequestTests
    {
        private AgentSessionManager _manager;
        private AgentDefinition _agent;
        private AgentSession _session;

        [SetUp]
        public void SetUp()
        {
            _manager = new AgentSessionManager();
            _agent = AgentDefinitionLoader.GetDefault();
            _session = _manager.CreateSession(_agent, "workspace");
        }

        [Test]
        public void ApproveAction_TransitionsToExecuting()
        {
            var action = _manager.QueueAction(_session.SessionId, "shell_command", new { command = "echo" });
            Assert.IsNotNull(action);

            var updated = _manager.UpdateActionStatus(_session.SessionId, action.ActionId, ActionRequestStatus.Approved);

            Assert.IsTrue(updated);
            Assert.AreEqual(ActionRequestStatus.Approved, action.Status);
        }

        [Test]
        public void RejectAction_CancelsPendingRequest()
        {
            var action = _manager.QueueAction(_session.SessionId, "test_run", new { script = "PlayMode" });

            var updated = _manager.UpdateActionStatus(_session.SessionId, action.ActionId, ActionRequestStatus.Cancelled);

            Assert.IsTrue(updated);
            Assert.AreEqual(ActionRequestStatus.Cancelled, action.Status);
        }
    }
}
