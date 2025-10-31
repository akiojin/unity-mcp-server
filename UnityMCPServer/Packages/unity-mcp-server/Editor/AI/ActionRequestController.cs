namespace UnityMCPServer.AI
{
    public sealed class ActionRequestController
    {
        private readonly AgentSessionManager _manager;

        public ActionRequestController(AgentSessionManager manager)
        {
            _manager = manager;
        }

        public bool Approve(string sessionId, string actionId)
        {
            return _manager.UpdateActionStatus(sessionId, actionId, ActionRequestStatus.Approved);
        }

        public bool Reject(string sessionId, string actionId)
        {
            return _manager.UpdateActionStatus(sessionId, actionId, ActionRequestStatus.Cancelled);
        }
    }
}
