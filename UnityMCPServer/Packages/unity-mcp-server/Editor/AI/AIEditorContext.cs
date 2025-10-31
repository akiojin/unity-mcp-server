using System.Collections.Generic;
using System.Linq;

namespace UnityMCPServer.AI
{
    public static class AIEditorContext
    {
        private static readonly AgentSessionManager _sessionManager;
        private static readonly AIStreamHandler _streamHandler;
        private static readonly IReadOnlyList<AgentDefinition> _agents;

        static AIEditorContext()
        {
            _sessionManager = new AgentSessionManager();
            _streamHandler = new AIStreamHandler();
            _agents = AgentDefinitionLoader.LoadAll();
        }

        public static AgentSessionManager SessionManager => _sessionManager;
        public static AIStreamHandler StreamHandler => _streamHandler;
        public static IReadOnlyList<AgentDefinition> Agents => _agents;

        public static AgentDefinition GetDefaultAgent()
        {
            return _agents.Count > 0 ? (_agents.FirstOrDefault(a => a.IsDefault) ?? _agents[0]) : null;
        }

        public static AgentDefinition FindAgent(string id)
        {
            if (string.IsNullOrEmpty(id))
            {
                return null;
            }

            foreach (var agent in _agents)
            {
                if (agent.Id.Equals(id, StringComparison.OrdinalIgnoreCase))
                {
                    return agent;
                }
            }

            return null;
        }
    }
}
