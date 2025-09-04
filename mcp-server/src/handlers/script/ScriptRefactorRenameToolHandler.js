import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from '../roslyn/RoslynCliUtils.js';

export class ScriptRefactorRenameToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_refactor_rename',
            'Refactor: rename a symbol across the project using external Roslyn CLI (no Unity comms). Required: relative, namePath, newName. Start with preview for diagnostics, then apply. Responses are summarized for LLMs: errors up to 30 items, message up to 200 chars, and preview/diff fields trimmed to 1000 chars.',
            {
                type: 'object',
                properties: {
                    relative: { type: 'string', description: 'Project-relative file path (Assets/ or Packages/)' },
                    namePath: { type: 'string', description: 'Symbol path like Class/Method' },
                    newName: { type: 'string', description: 'New name' },
                    preview: { type: 'boolean', default: true }
                },
                required: ['relative', 'namePath', 'newName']
            }
        );
        this.roslyn = new RoslynCliUtils(unityConnection);
    }

    validate(params) {
        super.validate(params);
        const { relative, namePath, newName } = params;
        if (!relative || !namePath || !newName) throw new Error('relative, namePath, newName are required');
    }

    async execute(params) {
        const { relative, namePath, newName, preview = true } = params;
        const args = ['rename-symbol'];
        args.push(...(await this.roslyn.getSolutionOrProjectArgs()));
        args.push('--relative', String(relative).replace(/\\\\/g, '/'));
        args.push('--name-path', String(namePath));
        args.push('--new-name', String(newName));
        if (!preview) args.push('--apply', 'true');
        const res = await this.roslyn.runCli(args);
        return this._summarizeResult(res);
    }

    _summarizeResult(res) {
        if (!res || typeof res !== 'object') return res;
        const MAX_ERRORS = 30;
        const MAX_MSG_LEN = 200;
        const MAX_TEXT_LEN = 1000;
        const out = {};
        if ('id' in res) out.id = res.id;
        if ('success' in res) out.success = !!res.success;
        if ('applied' in res) out.applied = !!res.applied;
        if (Array.isArray(res.errors)) {
            const trimmed = res.errors.slice(0, MAX_ERRORS).map(e => {
                const o = {};
                if (e && typeof e === 'object') {
                    if ('id' in e) o.id = e.id;
                    if ('message' in e) o.message = String(e.message).slice(0, MAX_MSG_LEN);
                    if ('file' in e) o.file = String(e.file).slice(0, 260);
                    if ('line' in e) o.line = e.line;
                    if ('column' in e) o.column = e.column;
                } else { o.message = String(e).slice(0, MAX_MSG_LEN); }
                return o;
            });
            out.errorCount = res.errors.length;
            out.errors = trimmed;
        }
        for (const k of ['preview','diff','text','content']) {
            if (typeof res[k] === 'string' && res[k].length > 0) {
                out[k] = res[k].slice(0, MAX_TEXT_LEN);
                if (res[k].length > MAX_TEXT_LEN) out[`${k}Truncated`] = true;
            }
        }
        for (const k of ['operation','path','relative','symbolName']) {
            if (res[k] !== undefined) out[k] = res[k];
        }
        return Object.keys(out).length ? out : res;
    }
}
