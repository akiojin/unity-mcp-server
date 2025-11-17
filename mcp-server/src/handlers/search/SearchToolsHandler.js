/**
 * Handler for searching available tools by keywords, categories, or tags
 * This meta-tool enables token-efficient tool discovery
 */
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { CATEGORIES, SCOPES } from '../base/categories.js';

export class SearchToolsHandler extends BaseToolHandler {
  constructor(unityConnection, handlersMap) {
    super(
      'search_tools',
      'Search available Unity MCP tools by keywords, categories, or tags. Use this to discover relevant tools before calling them.',
      {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Search query (keywords to match against tool names, descriptions, and metadata)'
          },
          category: {
            type: 'string',
            description: `Filter by category (${Object.values(CATEGORIES).join(', ')})`
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by tags (e.g., ["create", "scene"], ["read", "gameobject"])'
          },
          scope: {
            type: 'string',
            enum: Object.values(SCOPES),
            description: 'Filter by scope: read, write, or execute'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 10, max: 50)',
            minimum: 1,
            maximum: 50
          },
          includeSchemas: {
            type: 'boolean',
            description: 'Include full inputSchema in results (default: false for token efficiency)'
          }
        }
      },
      {
        category: CATEGORIES.SYSTEM,
        scope: SCOPES.READ,
        keywords: ['search', 'discover', 'find', 'tools', 'list'],
        tags: ['meta', 'query', 'discovery']
      }
    );

    this.unityConnection = unityConnection;
    this.handlersMap = handlersMap;
  }

  /**
   * Calculate relevance score for a handler against the search query
   * @param {BaseToolHandler} handler - Handler to score
   * @param {string} query - Search query
   * @param {Array<string>} tags - Tag filters
   * @returns {number} Relevance score (0-100)
   */
  calculateRelevance(handler, query, tags) {
    let score = 0;

    if (!query && (!tags || tags.length === 0)) {
      return 50; // Neutral score for no filters
    }

    const lowerQuery = query ? query.toLowerCase() : '';
    const searchableText = [handler.name, handler.description, ...(handler.metadata.keywords || [])]
      .join(' ')
      .toLowerCase();

    // Exact name match: highest priority
    if (handler.name.toLowerCase() === lowerQuery) {
      score += 100;
    }
    // Name contains query: high priority
    else if (handler.name.toLowerCase().includes(lowerQuery)) {
      score += 50;
    }
    // Description/keywords contain query: medium priority
    else if (searchableText.includes(lowerQuery)) {
      score += 25;
    }

    // Tag matches: bonus points
    if (tags && tags.length > 0) {
      const matchedTags = tags.filter(tag => handler.metadata.tags.includes(tag));
      score += matchedTags.length * 10;
    }

    return Math.min(score, 100);
  }

  async execute(params) {
    const { query = '', category, tags = [], scope, limit = 10, includeSchemas = false } = params;

    // Get all handlers from the map
    const allHandlers = Array.from(this.handlersMap.values());

    // Filter handlers
    let filteredHandlers = allHandlers.filter(handler => {
      // Skip search_tools itself from results
      if (handler.name === 'search_tools') {
        return false;
      }

      // Category filter
      if (category && handler.metadata.category !== category) {
        return false;
      }

      // Scope filter
      if (scope && handler.metadata.scope !== scope) {
        return false;
      }

      // Tag filter (AND logic: all specified tags must match)
      if (tags.length > 0) {
        const hasAllTags = tags.every(tag => handler.metadata.tags.includes(tag));
        if (!hasAllTags) {
          return false;
        }
      }

      // Query filter (if specified)
      if (query) {
        const lowerQuery = query.toLowerCase();
        const searchableText = [
          handler.name,
          handler.description,
          ...(handler.metadata.keywords || [])
        ]
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(lowerQuery)) {
          return false;
        }
      }

      return true;
    });

    // Calculate relevance scores and sort
    const scoredHandlers = filteredHandlers.map(handler => ({
      handler,
      relevance: this.calculateRelevance(handler, query, tags)
    }));

    scoredHandlers.sort((a, b) => b.relevance - a.relevance);

    // Apply limit
    const limitedHandlers = scoredHandlers.slice(0, limit);

    // Format results
    const results = limitedHandlers.map(({ handler, relevance }) => {
      const result = {
        name: handler.name,
        description: handler.description,
        category: handler.metadata.category,
        scope: handler.metadata.scope,
        tags: handler.metadata.tags,
        keywords: handler.metadata.keywords,
        relevance: Math.round(relevance)
      };

      if (includeSchemas) {
        result.inputSchema = handler.inputSchema;
      }

      return result;
    });

    return {
      success: true,
      results,
      totalMatches: filteredHandlers.length,
      returned: results.length,
      query: {
        query,
        category,
        tags,
        scope,
        limit
      }
    };
  }
}
