import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { LspRpcClient } from '../../lsp/LspRpcClient.js';

const MAX_INSTRUCTIONS = 10;
const MAX_DIFF_CHARS = 80;
const PREVIEW_MAX = 1000;

const normalizeSlashes = (p) => p.replace(/\\/g, '/');

export class ScriptEditSnippetToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'script_edit_snippet',
      'Perform small, multi-instruction edits (delete/replace/insert) on C# snippets without rewriting entire methods. Use for removing guard clauses, tweaking conditions, or inserting short statements. Required params: path (Assets/ or Packages/ C# file) and instructions (≤10). Each instruction must include an anchor (type=text) and stay within 80 characters of change. Preview mode validates without writing files; apply mode validates via the bundled LSP (Roslyn-backed) diagnostics before saving.',
      {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Project-relative C# path starting with Assets/ or Packages/ (e.g., Assets/Scripts/Foo.cs).'
          },
          preview: {
            type: 'boolean',
            description: 'If true, run validation and return preview text without writing to disk. Default=false.'
          },
          instructions: {
            type: 'array',
            minItems: 1,
            maxItems: MAX_INSTRUCTIONS,
            description: 'Ordered list of snippet edits to apply (≤10).',
            items: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: ['delete', 'replace', 'insert'],
                  description: 'Edit type.'
                },
                anchor: {
                  type: 'object',
                  description: 'Positioning info. Currently supports type=text with exact target snippet.',
                  properties: {
                    type: { type: 'string', enum: ['text'], default: 'text' },
                    target: { type: 'string', description: 'Exact snippet to locate (including whitespace).' },
                    position: {
                      type: 'string',
                      enum: ['before', 'after'],
                      description: 'For insert operations, whether to insert before or after the anchor text (default=after).'
                    }
                  },
                  required: ['type', 'target']
                },
                newText: {
                  type: 'string',
                  description: 'Replacement or insertion text. Required for replace/insert.'
                }
              },
              required: ['operation', 'anchor']
            }
          }
        },
        required: ['path', 'instructions']
      }
    );
    this.projectInfo = new ProjectInfoProvider(unityConnection);
    this.lsp = null;
  }

  validate(params) {
    super.validate(params);
    const { path: filePath, instructions } = params;
    if (!filePath || String(filePath).trim() === '') {
      throw new Error('path cannot be empty');
    }
    if (!Array.isArray(instructions) || instructions.length === 0) {
      throw new Error('instructions must be a non-empty array');
    }
    if (instructions.length > MAX_INSTRUCTIONS) {
      throw new Error(`instruction limit exceeded (max ${MAX_INSTRUCTIONS})`);
    }
    for (let i = 0; i < instructions.length; i++) {
      const instr = instructions[i] ?? {};
      const op = instr.operation;
      if (!['delete', 'replace', 'insert'].includes(op)) {
        throw new Error(`Unsupported operation at instructions[${i}]: ${op}`);
      }
      const anchor = instr.anchor || {};
      if ((anchor.type || 'text') !== 'text') {
        throw new Error(`Unsupported anchor.type at instructions[${i}]: ${anchor.type}`);
      }
      const target = anchor.target;
      if (!target || typeof target !== 'string') {
        throw new Error(`anchor.target must be a non-empty string at instructions[${i}]`);
      }
      if ((op === 'replace' || op === 'insert') && (instr.newText ?? '') === '') {
        throw new Error(`newText is required for ${op} operation at instructions[${i}]`);
      }
    }
  }

  async execute(params) {
    const info = await this.projectInfo.get();
    const { relative, absolute } = this.#resolvePaths(info, params.path);
    const preview = params.preview === true;
    const instructions = params.instructions;

    let original;
    try {
      original = await fs.readFile(absolute, 'utf8');
    } catch (e) {
      if (e && e.code === 'ENOENT') {
        throw new Error(`file not found: ${relative}`);
      }
      throw e;
    }

    let working = original;
    const results = [];
    for (let i = 0; i < instructions.length; i++) {
      const instr = instructions[i];
      const { updatedText, result } = this.#applyInstruction(working, instr, i);
      working = updatedText;
      results.push(result);
    }

    if (working === original) {
      return this.#buildResponse({ preview, results, original, updated: working });
    }

    const diagnostics = await this.#validateWithLsp(info, relative, working);
    const hasErrors = diagnostics.some(d => this.#severityIsError(d.severity));
    if (hasErrors) {
      const first = diagnostics.find(d => this.#severityIsError(d.severity));
      const msg = first?.message || 'syntax error';
      throw new Error(`syntax_error: ${msg}`);
    }

    if (!preview) {
      await fs.writeFile(absolute, working, 'utf8');
    }

    return this.#buildResponse({ preview, results, original, updated: working, diagnostics });
  }

  #resolvePaths(info, rawPath) {
    const normalized = normalizeSlashes(String(rawPath));
    const idxAssets = normalized.indexOf('Assets/');
    const idxPackages = normalized.indexOf('Packages/');
    const idx = (idxAssets >= 0 && idxPackages >= 0)
      ? Math.min(idxAssets, idxPackages)
      : (idxAssets >= 0 ? idxAssets : idxPackages);
    const relative = idx >= 0 ? normalized.substring(idx) : normalized;

    if (!relative.startsWith('Assets/') && !relative.startsWith('Packages/')) {
      throw new Error('path must start with Assets/ or Packages/');
    }

    const projectRoot = info.projectRoot;
    const absolute = path.join(projectRoot, relative.replace(/\//g, path.sep));
    return { relative, absolute };
  }

  #applyInstruction(text, instruction, index) {
    const anchor = instruction.anchor;
    const target = anchor.target;
    const occurrences = [];
    let pos = text.indexOf(target);
    while (pos !== -1) {
      occurrences.push(pos);
      pos = text.indexOf(target, pos + 1);
    }
    if (occurrences.length === 0) {
      throw new Error(`anchor_not_found: instructions[${index}]`);
    }
    if (occurrences.length > 1) {
      throw new Error(`anchor_not_unique: instructions[${index}] matches ${occurrences.length} locations`);
    }
    const start = occurrences[0];
    const end = start + target.length;

    let replacement = '';
    if (instruction.operation === 'delete') {
      replacement = '';
    } else if (instruction.operation === 'replace') {
      replacement = instruction.newText;
    } else if (instruction.operation === 'insert') {
      const position = (instruction.anchor.position || 'after').toLowerCase();
      if (position === 'before') {
        return this.#replaceRange(text, start, start, instruction.newText, target, index);
      }
      if (position !== 'after') {
        throw new Error(`Unsupported anchor.position "${instruction.anchor.position}" at instructions[${index}]`);
      }
      return this.#replaceRange(text, end, end, instruction.newText, target, index);
    }
    return this.#replaceRange(text, start, end, replacement, target, index);
  }

  #replaceRange(text, start, end, newText, anchorTarget, index) {
    const before = text.slice(0, start);
    const current = text.slice(start, end);
    const after = text.slice(end);
    const replacement = newText ?? '';
    const diffMagnitude = Math.max(current.length, replacement.length);
    if (diffMagnitude > MAX_DIFF_CHARS) {
      throw new Error(`diff exceeds ${MAX_DIFF_CHARS} characters at instructions[${index}]`);
    }
    const updated = before + replacement + after;
    return {
      updatedText: updated,
      result: {
        index,
        status: 'applied',
        reason: 'anchor_matched',
        beforeSnippet: this.#clipSnippet(current.length ? current : anchorTarget),
        afterSnippet: this.#clipSnippet(replacement),
        charactersChanged: diffMagnitude
      }
    };
  }

  async #validateWithLsp(info, relative, updatedText) {
    if (!this.lsp) {
      this.lsp = new LspRpcClient(info.projectRoot);
    }
    return await this.lsp.validateText(relative, updatedText);
  }

  #buildResponse({ preview, results, original, updated, diagnostics = [] }) {
    const out = {
      success: true,
      applied: !preview,
      results,
      diagnostics,
      beforeHash: this.#hash(original),
      afterHash: this.#hash(updated)
    };
    if (preview) {
      out.preview = this.#clipPreview(updated);
    }
    return out;
  }

  #clipPreview(text) {
    if (typeof text !== 'string') return '';
    if (text.length <= PREVIEW_MAX) return text;
    return text.slice(0, PREVIEW_MAX) + '…';
  }

  #clipSnippet(s) {
    if (!s) return '';
    return s.length > 120 ? (s.slice(0, 117) + '…') : s;
  }

  #hash(content) {
    return crypto.createHash('sha256').update(content ?? '', 'utf8').digest('hex');
  }

  #severityIsError(severity) {
    if (severity === null || severity === undefined) return false;
    if (typeof severity === 'number') {
      // 1 = Error in LSP DiagnosticSeverity enum
      return severity === 1;
    }
    const s = String(severity).toLowerCase();
    return s === 'error' || s === '2';
  }
}
