#!/usr/bin/env node
/*
 E2E smoke test for script_* tools via in-process MCP server handlers.
 - Builds roslyn-cli (best-effort)
 - Creates a temporary C# file under Packages/
 - Runs symbol_find / edit_structured (replace/insert) / refactor_rename
*/
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createServer } from '../src/core/server.js';

function log(title, obj) { console.log(`\n=== ${title} ===\n${JSON.stringify(obj, null, 2)}`); }

function tryBuildCli() {
  try {
    if (!fs.existsSync('.tools')) fs.mkdirSync('.tools');
    const rid = process.platform === 'win32' ? 'win-x64' : (process.platform === 'darwin' ? (process.arch === 'arm64' ? 'osx-arm64' : 'osx-x64') : 'linux-x64');
    const out = `.tools/roslyn-cli/${rid}`;
    if (fs.existsSync(path.join(out, process.platform === 'win32' ? 'roslyn-cli.exe' : 'roslyn-cli'))) {
      console.log('[test] roslyn-cli binary already exists');
      return;
    }
    console.log(`[test] building roslyn-cli for ${rid} ...`);
    const sh = process.platform === 'win32' ? 'powershell' : 'bash';
    const args = process.platform === 'win32' ? ['-ExecutionPolicy','Bypass','-File','scripts/bootstrap-roslyn-cli.ps1','-Rid',rid] : ['scripts/bootstrap-roslyn-cli.sh', rid];
    const res = spawnSync(sh, args, { stdio: 'inherit' });
    if (res.status !== 0) console.warn('[test] roslyn-cli build failed; tests may fallback/skip');
  } catch (e) { console.warn('[test] roslyn-cli build error:', e.message); }
}

async function main() {
  tryBuildCli();

  const { server, unityConnection } = await createServer();
  // Prepare test file under Packages
  const projRoot = path.resolve(process.cwd(), 'UnityEditorMCP');
  const rel = 'Packages/unity-editor-mcp/Editor/Handlers/McpEditTarget.cs';
  const abs = path.join(projRoot, rel);
  if (!fs.existsSync(path.dirname(abs))) fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `using System; namespace UnityEditorMCP.Handlers { public class McpEditTarget { public int Foo() { return 1; } } }`);
  console.log('[test] wrote', abs);

  // Helper to exec handler (using server's handlers map)
  const { createHandlers } = await import('../src/handlers/index.js');
  const handlerMap = createHandlers(unityConnection);
  async function call(name, params) {
    const h = handlerMap.get(name);
    if (!h) throw new Error(`handler not found: ${name}`);
    return await h.handle(params || {});
  }

  // 1) symbol_find
  let r = await call('script_symbol_find', { name: 'McpEditTarget', kind: 'class' });
  log('script_symbol_find', r);

  // 2) edit_structured replace_body (preview)
  r = await call('script_edit_structured', {
    operation: 'replace_body', path: rel, symbolName: 'McpEditTarget/Foo', kind: 'method',
    newText: '{ return 2; }', preview: true
  });
  log('script_edit_structured replace_body preview', r);

  // 3) edit_structured replace_body (apply)
  r = await call('script_edit_structured', {
    operation: 'replace_body', path: rel, symbolName: 'McpEditTarget/Foo', kind: 'method',
    newText: '{ return 2; }', preview: false
  });
  log('script_edit_structured replace_body apply', r);

  // 4) insert_after class (preview)
  r = await call('script_edit_structured', {
    operation: 'insert_after', path: rel, symbolName: 'McpEditTarget', kind: 'class',
    newText: '\npublic int Bar() { return 3; }\n', preview: true
  });
  log('script_edit_structured insert_after preview', r);

  // 5) rename method Foo->Foo2 (preview)
  r = await call('script_refactor_rename', {
    relative: rel, namePath: 'McpEditTarget/Foo', newName: 'Foo2', preview: true
  });
  log('script_refactor_rename preview', r);

  console.log('\nAll tests executed.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
