using System;
using System.Collections.Generic;

namespace UnityMCPServer.AI
{
    public class AgentSession
    {
        public string SessionId { get; }
        public AgentDefinition Agent { get; }
        public string Workspace { get; }
        public string Title { get; }
        public DateTime CreatedAt { get; }
        public DateTime LastActivityAt { get; private set; }
        public bool IsClosed { get; private set; }

        private readonly List<SessionMessage> _messages = new List<SessionMessage>();
        private readonly List<ActionRequest> _actions = new List<ActionRequest>();

        public IReadOnlyList<SessionMessage> Messages => _messages;
        public IReadOnlyList<ActionRequest> Actions => _actions;

        public AgentSession(string sessionId, AgentDefinition agent, string workspace, string title)
        {
            SessionId = sessionId;
            Agent = agent;
            Workspace = workspace;
            Title = title;
            CreatedAt = DateTime.UtcNow;
            LastActivityAt = CreatedAt;
        }

        public void Touch()
        {
            LastActivityAt = DateTime.UtcNow;
        }

        public void Close()
        {
            IsClosed = true;
            Touch();
        }

        public SessionMessage AddMessage(SessionMessage message)
        {
            _messages.Add(message);
            Touch();
            return message;
        }

        public ActionRequest AddAction(ActionRequest action)
        {
            _actions.Add(action);
            Touch();
            return action;
        }

        public ActionRequest FindAction(string actionId)
        {
            return _actions.Find(action => action.ActionId == actionId);
        }
    }

    public sealed class SessionMessage
    {
        public string MessageId { get; }
        public string Sender { get; }
        public string Content { get; }
        public DateTime CreatedAt { get; }
        public bool Collapsed { get; set; }

        public SessionMessage(string messageId, string sender, string content)
        {
            MessageId = messageId;
            Sender = sender;
            Content = content;
            CreatedAt = DateTime.UtcNow;
        }
    }

    public enum ActionRequestStatus
    {
        Pending,
        Approved,
        Executing,
        Succeeded,
        Failed,
        Cancelled
    }

    public sealed class ActionRequest
    {
        public string ActionId { get; }
        public string Type { get; }
        public object Payload { get; }
        public ActionRequestStatus Status { get; private set; }
        public DateTime CreatedAt { get; }
        public DateTime? CompletedAt { get; private set; }

        public ActionRequest(string actionId, string type, object payload)
        {
            ActionId = actionId;
            Type = type;
            Payload = payload;
            Status = ActionRequestStatus.Pending;
            CreatedAt = DateTime.UtcNow;
        }

        public void Transition(ActionRequestStatus status)
        {
            Status = status;
            if (status == ActionRequestStatus.Succeeded || status == ActionRequestStatus.Failed || status == ActionRequestStatus.Cancelled)
            {
                CompletedAt = DateTime.UtcNow;
            }
        }
    }
}
