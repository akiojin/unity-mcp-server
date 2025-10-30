using System.Collections.Generic;

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
    }
}
