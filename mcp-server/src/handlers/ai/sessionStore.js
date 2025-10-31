import { randomUUID } from 'node:crypto';

const sessions = new Map();

export function createSession({ sessionId = randomUUID(), agentId, workspace = 'workspace', title = null }) {
  const session = {
    sessionId,
    agentId,
    workspace,
    title: title ?? `AI Session (${agentId})`,
    status: 'open',
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    messages: [],
    actions: []
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId) {
  return sessions.get(sessionId) ?? null;
}

export function touchSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivityAt = new Date().toISOString();
  }
  return session;
}

export function addMessage(sessionId, { sender, content }) {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }
  const message = {
    messageId: randomUUID(),
    sender,
    content,
    createdAt: new Date().toISOString()
  };
  session.messages.push(message);
  touchSession(sessionId);
  return message;
}

export function addAction(sessionId, { type, payload }) {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }
  const action = {
    actionId: randomUUID(),
    type,
    payload,
    status: 'pending',
    requestedBy: 'agent',
    createdAt: new Date().toISOString()
  };
  session.actions.push(action);
  touchSession(sessionId);
  return action;
}

export function updateActionStatus(sessionId, actionId, status) {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }
  const action = session.actions.find((item) => item.actionId === actionId);
  if (!action) {
    return null;
  }
  action.status = status;
  action.updatedAt = new Date().toISOString();
  touchSession(sessionId);
  return action;
}

export function closeSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    session.status = 'closed';
    session.closedAt = new Date().toISOString();
    sessions.delete(sessionId);
  }
  return session;
}

export function resetSessions() {
  sessions.clear();
}
