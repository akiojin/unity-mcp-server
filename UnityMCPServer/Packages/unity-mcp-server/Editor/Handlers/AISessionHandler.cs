using System;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityMCPServer.AI;

namespace UnityMCPServer.Handlers
{
    public static class AISessionHandler
    {
        public static object Open(JObject parameters)
        {
            var agentId = parameters["agentId"]?.ToString();
            var sessionId = parameters["sessionId"]?.ToString();
            var workspace = parameters["workspace"]?.ToString() ?? "workspace";
            var title = parameters["title"]?.ToString();

            var agent = string.IsNullOrEmpty(agentId)
                ? AIEditorContext.GetDefaultAgent()
                : AIEditorContext.FindAgent(agentId);

            if (agent == null)
            {
                return new { error = $"AGENT_NOT_FOUND: Agent '{agentId}' is not registered" };
            }

            var manager = AIEditorContext.SessionManager;
            var session = manager.CreateSession(agent, workspace, title, sessionId);

            AIChatWindow.EnsureOpen();
            AIChatWindow.FocusSession(session.SessionId);

            return new
            {
                sessionId = session.SessionId,
                windowId = session.SessionId,
                agent = new
                {
                    id = agent.Id,
                    provider = agent.Provider,
                    capabilities = agent.Capabilities
                }
            };
        }

        public static object Message(JObject parameters)
        {
            var sessionId = parameters["sessionId"]?.ToString();
            var message = parameters["message"]?.ToString();

            if (string.IsNullOrEmpty(sessionId))
            {
                return new { error = "sessionId parameter is required" };
            }

            if (string.IsNullOrWhiteSpace(message))
            {
                return new { error = "VALIDATION_ERROR: message cannot be empty" };
            }

            var sessionManager = AIEditorContext.SessionManager;
            var msg = sessionManager.AddUserMessage(sessionId, message.Trim());
            if (msg == null)
            {
                return new { error = $"SESSION_NOT_FOUND: Session '{sessionId}' does not exist" };
            }

            AIChatWindow.FocusSession(sessionId);

            return new
            {
                messageId = msg.MessageId,
                queued = true
            };
        }

        public static object Execute(JObject parameters)
        {
            var sessionId = parameters["sessionId"]?.ToString();
            var actionToken = parameters["action"] as JObject;

            if (string.IsNullOrEmpty(sessionId))
            {
                return new { error = "sessionId parameter is required" };
            }

            if (actionToken == null)
            {
                return new { error = "action parameter is required" };
            }

            var type = actionToken.Value<string>("type");
            var payload = actionToken["payload"];

            var sessionManager = AIEditorContext.SessionManager;
            var action = sessionManager.QueueAction(sessionId, type, payload);
            if (action == null)
            {
                return new { error = $"SESSION_NOT_FOUND: Session '{sessionId}' does not exist" };
            }

            return new
            {
                actionId = action.ActionId,
                status = action.Status.ToString().ToLowerInvariant()
            };
        }

        public static object Close(JObject parameters)
        {
            var sessionId = parameters["sessionId"]?.ToString();
            if (string.IsNullOrEmpty(sessionId))
            {
                return new { error = "sessionId parameter is required" };
            }

            var closed = AIEditorContext.SessionManager.CloseSession(sessionId);
            if (!closed)
            {
                return new { error = $"SESSION_NOT_FOUND: Session '{sessionId}' does not exist" };
            }

            return new { sessionId, closed = true };
        }

        public static object StreamChunk(JObject parameters)
        {
            var sessionId = parameters["sessionId"]?.ToString();
            var chunk = parameters["chunk"]?.ToString();
            var actionId = parameters["actionId"]?.ToString();
            var isFinal = parameters.Value<bool?>("isFinal") ?? false;

            if (string.IsNullOrEmpty(sessionId) || chunk == null)
            {
                return new { error = "sessionId and chunk are required" };
            }

            AIEditorContext.StreamHandler.HandleStreamChunk(sessionId, actionId, chunk, isFinal);

            return new { acknowledged = true };
        }
    }
}
