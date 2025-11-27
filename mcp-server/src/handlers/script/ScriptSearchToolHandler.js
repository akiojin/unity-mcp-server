import fs from 'fs/promises';
import path from 'path';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { logger, config } from '../../core/config.js';

export class ScriptSearchToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'script_search',
      'Search C# by substring/regex/glob with pagination and snippet context. PRIORITY: Use to locate symbols/files; avoid full contents. Use returnMode="snippets" (or "metadata") with small snippetContext (1–2). Narrow aggressively via include globs under Assets/** or Packages/** and semantic filters (namespace/container/identifier). Do NOT prefix repository folders.',
      {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description:
              'Pattern to search (required unless patternType="glob"). For glob mode, use include/exclude.'
          },
          patternType: {
            type: 'string',
            enum: ['substring', 'regex', 'glob'],
            description: 'Pattern matching strategy: substring (default), regex, or glob-only scan.'
          },
          flags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Regex flags (e.g., ["i","m","s","u"]). Ignored for substring/glob.'
          },
          scope: {
            type: 'string',
            enum: ['assets', 'packages', 'embedded', 'all'],
            description:
              'Search scope: assets (Assets/, default), packages (Packages/), embedded, or all.'
          },
          include: {
            type: 'string',
            description:
              'Include glob pattern (project-relative, default: **/*.cs). Examples: Assets/**/*.cs or Packages/unity-mcp-server/**/*.cs.'
          },
          exclude: {
            type: 'string',
            description: 'Exclude glob pattern (e.g., **/Tests/**).'
          },
          pageSize: {
            type: 'number',
            description: 'Maximum results per page for pagination.'
          },
          maxMatchesPerFile: {
            type: 'number',
            description: 'Cap matches returned per file.'
          },
          snippetContext: {
            type: 'number',
            description: 'Number of context lines around each match.'
          },
          maxBytes: {
            type: 'number',
            description: 'Maximum response size (bytes) to keep outputs LLM‑friendly.'
          },
          returnMode: {
            type: 'string',
            enum: ['metadata', 'snippets', 'full'],
            description: 'Result detail: metadata (fast), snippets (recommended), or full.'
          },
          detail: {
            type: 'string',
            enum: ['compact', 'metadata', 'snippets', 'full'],
            description: 'Alias of returnMode. `compact` maps to `snippets`.'
          },
          startAfter: {
            type: 'string',
            description: 'Opaque cursor for pagination (use value from previous page).'
          },
          maxFileSizeKB: {
            type: 'number',
            description: 'Skip files larger than this (KB).'
          },
          codeOnly: {
            type: 'boolean',
            description: 'If true, exclude comments/whitespace to reduce noise (default: true).'
          },
          container: {
            type: 'string',
            description: 'Semantic filter: container (e.g., class name).'
          },
          namespace: {
            type: 'string',
            description: 'Semantic filter: namespace.'
          },
          identifier: {
            type: 'string',
            description: 'Semantic filter: identifier (e.g., method or field name).'
          }
        },
        required: []
      }
    );
    this.unityConnection = unityConnection;
    this.projectInfo = new ProjectInfoProvider(unityConnection);
    this.configDefaultDetail = (config?.search?.defaultDetail || 'compact').toLowerCase();
    this.configSearchEngine = (config?.search?.engine || 'naive').toLowerCase();
  }

  validate(params) {
    super.validate(params);

    const { pattern, patternType } = params;

    // Pattern is required for non-glob pattern types
    if (patternType !== 'glob' && !pattern) {
      throw new Error('pattern is required for substring and regex search');
    }
  }

  async execute(params) {
    try {
      const info = await this.projectInfo.get();
      const {
        pattern,
        patternType = 'substring',
        flags = [],
        scope = 'all',
        include = '**/*.cs',
        exclude,
        pageSize = 20,
        maxMatchesPerFile = 5,
        snippetContext = 2,
        maxBytes = 1024 * 64,
        returnMode,
        detail,
        startAfter,
        maxFileSizeKB = 1024,
        codeOnly = true
      } = params;

      // Resolve detail/returnMode default and mapping
      let effectiveDetail = (detail || '').toLowerCase();
      if (!effectiveDetail && !returnMode) {
        effectiveDetail = this.configDefaultDetail || 'compact';
      }
      const normalizedReturnMode = (() => {
        const d = (effectiveDetail || '').toLowerCase();
        if (d === 'compact') return 'snippets';
        if (d === 'metadata' || d === 'snippets' || d === 'full') return d;
        return returnMode || 'snippets';
      })();

      // Resolve search roots
      const roots = [];
      if (scope === 'assets' || scope === 'all') roots.push(info.assetsPath);
      if (scope === 'packages' || scope === 'embedded' || scope === 'all')
        roots.push(info.packagesPath);

      const includeRx = globToRegExp(include);
      const excludeRx = exclude ? globToRegExp(exclude) : null;
      // Engine selection (future: treesitter). Currently fallback to naive.
      if (this.configSearchEngine === 'treesitter') {
        logger.debug('[script_search] tree-sitter engine requested; falling back to naive matcher');
      }
      const matcher = buildMatcher(patternType, pattern, flags);

      const results = [];
      const pathTable = [];
      const pathId = new Map();
      let bytes = 0;
      let afterFound = !startAfter;

      for await (const file of walk(roots)) {
        // Pagination cursor: skip until we see startAfter
        const rel = toRel(file, info.projectRoot);
        if (!afterFound) {
          if (rel === startAfter) afterFound = true;
          else continue;
        }
        // Filters
        if (!includeRx.test(rel)) continue;
        if (excludeRx && excludeRx.test(rel)) continue;
        if (!rel.toLowerCase().endsWith('.cs')) continue;

        // Size guard
        const st = await fs.stat(file).catch(() => null);
        if (!st || st.size > maxFileSizeKB * 1024) continue;

        // Read content
        const text = await fs.readFile(file, 'utf8');
        const lines = text.split('\n');
        const filtered = codeOnly ? stripComments(lines) : lines;

        let matches = 0;
        const matchedLines = [];
        for (let i = 0; i < filtered.length; i++) {
          if (matches >= maxMatchesPerFile) break;
          const line = filtered[i];
          if (matcher(line)) {
            matches++;
            matchedLines.push(i + 1);
          }
        }
        if (matches === 0) continue;

        const id = pathId.has(rel)
          ? pathId.get(rel)
          : (pathTable.push(rel) - 1, pathTable.length - 1);
        pathId.set(rel, id);

        const lineRanges = toRanges(matchedLines);
        const item = { fileId: id, lineRanges };

        if (normalizedReturnMode === 'snippets') {
          // Build minimal snippets around first few matches
          const snippets = [];
          for (const ln of matchedLines.slice(0, maxMatchesPerFile)) {
            const s = Math.max(1, ln - snippetContext);
            const e = Math.min(lines.length, ln + snippetContext);
            snippets.push({ line: ln, snippet: lines.slice(s - 1, e).join('\n') });
          }
          item.snippets = snippets;
        }

        const json = JSON.stringify(item);
        bytes += Buffer.byteLength(json, 'utf8');
        results.push(item);

        if (results.length >= pageSize || bytes >= maxBytes) break;
      }

      return {
        success: true,
        total: results.length,
        pathTable,
        results,
        cursor:
          results.length && results.length >= pageSize ? pathTable[pathTable.length - 1] : null
      };
    } catch (e) {
      logger.error(`[script_search] failed: ${e.message}`);
      return { error: e.message };
    }
  }
}

// --- helpers ---
function globToRegExp(glob) {
  // Very small subset: **/* and * and ? handling
  const esc = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '§§')
    .replace(/\*/g, '[^/]*')
    .replace(/§§/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp('^' + esc + '$');
}

function buildMatcher(type, pattern, flags) {
  if (type === 'regex') {
    const fl = Array.isArray(flags) ? flags.join('') : '';
    const rx = new RegExp(pattern, fl);
    return s => rx.test(s);
  }
  if (type === 'glob') {
    // glob-only scan: no content matcher, treat every file as match
    return () => true;
  }
  // substring
  const p = pattern || '';
  return s => p && s.includes(p);
}

async function* walk(roots) {
  for (const r of roots) {
    yield* walkDir(r);
  }
}

async function* walkDir(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkDir(p);
    } else if (e.isFile()) {
      yield p.replace(/\\/g, '/');
    }
  }
}

function toRel(abs, projectRoot) {
  const n = abs.replace(/\\/g, '/');
  const base = projectRoot.replace(/\\/g, '/');
  return n.startsWith(base) ? n.substring(base.length + 1) : n;
}

function toRanges(lines) {
  if (!lines.length) return '';
  const out = [];
  let s = lines[0],
    prev = lines[0];
  for (let i = 1; i < lines.length; i++) {
    const v = lines[i];
    if (v === prev + 1) {
      prev = v;
      continue;
    }
    out.push(s === prev ? `${s}` : `${s}-${prev}`);
    s = prev = v;
  }
  out.push(s === prev ? `${s}` : `${s}-${prev}`);
  return out.join(',');
}

function stripComments(lines) {
  // naive removal of // line comments and /* */ blocks
  const out = [];
  let inBlock = false;
  for (const line of lines) {
    let s = line;
    if (inBlock) {
      const end = s.indexOf('*/');
      if (end >= 0) {
        s = s.slice(end + 2);
        inBlock = false;
      } else {
        out.push('');
        continue;
      }
    }
    let i = 0;
    let res = '';
    while (i < s.length) {
      if (s.startsWith('/*', i)) {
        inBlock = true;
        const end = s.indexOf('*/', i + 2);
        if (end >= 0) {
          i = end + 2;
          inBlock = false;
          continue;
        } else break;
      }
      if (s.startsWith('//', i)) {
        break;
      }
      res += s[i++];
    }
    out.push(res);
  }
  return out;
}
