import { BaseToolHandler } from '../base/BaseToolHandler.js';
import { RoslynCliUtils } from '../roslyn/RoslynCliUtils.js';

export class ScriptRefactorRenameToolHandler extends BaseToolHandler {
    constructor(unityConnection) {
        super(
            'script_refactor_rename',
            'Refactor: rename a symbol across the project using external Roslyn CLI（Unity無通信）。必須: relative, namePath, newName。まずプレビューで診断確認後に適用。',
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
        return await this.roslyn.runCli(args);
    }
}

