import { logger } from '../../core/config.js';

function buildContext({ sessionId, agentId, actionId, event }) {
  return {
    component: 'ai-session',
    event,
    sessionId,
    agentId,
    actionId
  };
}

export const aiSessionLogger = {
  info(message, context = {}) {
    logger.info(message, buildContext(context));
  },
  warn(message, context = {}) {
    logger.warn(message, buildContext(context));
  },
  error(message, context = {}) {
    logger.error(message, buildContext(context));
  }
};
