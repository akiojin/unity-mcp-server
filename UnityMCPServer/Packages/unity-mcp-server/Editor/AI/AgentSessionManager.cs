using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace UnityMCPServer.AI
{
    public sealed class AgentSessionManager
    {
        private readonly Dictionary<string, AgentSession> _sessions = new Dictionary<string, AgentSession>();

        public AgentSession CreateSession(AgentDefinition agent, string workspace, string title = null, string sessionId = null)
        {
            var id = string.IsNullOrEmpty(sessionId) ? Guid.NewGuid().ToString("N") : sessionId;
            var session = new AgentSession(id, agent, workspace, title ?? $"AI Session ({agent.Id})");
            _sessions[id] = session;
            return session;
        }

        public bool TryGetSession(string sessionId, out AgentSession session)
        {
            return _sessions.TryGetValue(sessionId, out session);
        }

        public SessionMessage AddUserMessage(string sessionId, string content)
        {
            if (!TryGetSession(sessionId, out var session))
            {
                return null;
            }

            var message = new SessionMessage(Guid.NewGuid().ToString("N"), "user", content);
            return session.AddMessage(message);
        }

        public SessionMessage AddAgentMessage(string sessionId, string content)
        {
            if (!TryGetSession(sessionId, out var session))
            {
                return null;
            }

            var message = new SessionMessage(Guid.NewGuid().ToString("N"), "agent", content);
            return session.AddMessage(message);
        }

        public ActionRequest QueueAction(string sessionId, string type, object payload)
        {
            if (!TryGetSession(sessionId, out var session))
            {
                return null;
            }

            var action = new ActionRequest(Guid.NewGuid().ToString("N"), type, payload);
            return session.AddAction(action);
        }

        public bool UpdateActionStatus(string sessionId, string actionId, ActionRequestStatus status)
        {
            if (!TryGetSession(sessionId, out var session))
            {
                return false;
            }

            var action = session.FindAction(actionId);
            if (action == null)
            {
                return false;
            }

            action.Transition(status);
            session.Touch();
            return true;
        }

        public bool CloseSession(string sessionId)
        {
            if (!TryGetSession(sessionId, out var session))
            {
                return false;
            }

            session.Close();
            _sessions.Remove(sessionId);
            return true;
        }

        public IReadOnlyList<AgentSession> ListSessions()
        {
            return _sessions.Values.ToList();
        }
    }
}
