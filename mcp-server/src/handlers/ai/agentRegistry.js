import { config } from '../../core/config.js';

const BUILTIN_AGENTS = [
  {
    id: 'codex',
    provider: 'openai',
    model: 'o4-mini',
    capabilities: ['code', 'shell', 'test'],
    isDefault: true
  },
  {
    id: 'claude',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet',
    capabilities: ['code', 'shell']
  }
];

function normalizeAgent(agent, source) {
  if (!agent || typeof agent !== 'object') {
    return null;
  }

  const { id, provider, capabilities } = agent;
  if (!id || typeof id !== 'string') {
    console.error(`[AI] Invalid agent definition from ${source}: missing id`);
    return null;
  }
  if (!provider || typeof provider !== 'string') {
    console.error(`[AI] Invalid agent definition for ${id}: missing provider`);
    return null;
  }

  const caps = Array.isArray(capabilities) ? capabilities : [];

  return {
    id,
    provider,
    model: agent.model ?? null,
    endpoint: agent.endpoint ?? null,
    capabilities: caps,
    authRef: agent.authRef ?? agent.auth?.tokenEnv ?? null,
    metadata: agent.metadata ?? {},
    isDefault: Boolean(agent.isDefault)
  };
}

function buildRegistry() {
  const registry = new Map();

  for (const builtin of BUILTIN_AGENTS) {
    registry.set(builtin.id, { ...builtin });
  }

  for (const custom of config.aiAgents) {
    const normalized = normalizeAgent(custom, '.unity/config.json');
    if (normalized) {
      registry.set(normalized.id, normalized);
    }
  }

  // Ensure at least one default agent
  if (![...registry.values()].some((agent) => agent.isDefault)) {
    const codex = registry.get('codex');
    if (codex) {
      codex.isDefault = true;
    }
  }

  return registry;
}

const REGISTRY = buildRegistry();

export function listAgents() {
  return [...REGISTRY.values()].map((agent) => ({ ...agent }));
}

export function findAgent(agentId) {
  const agent = REGISTRY.get(agentId);
  return agent ? { ...agent } : null;
}

export function getDefaultAgent() {
  const defaultAgent = [...REGISTRY.values()].find((agent) => agent.isDefault);
  return defaultAgent ? { ...defaultAgent } : null;
}
