#!/usr/bin/env node
// npm version フック: mcp-server/package.json の version を roslyn-cli の Directory.Build.props へ同期
import fs from 'fs';
import path from 'path';

const root = path.resolve(path.join(process.cwd(), '..'));
const pkgPath = path.resolve(process.cwd(), 'package.json');
const propsPath = path.resolve(root, 'roslyn-cli', 'Directory.Build.props');

function die(msg) { console.error(msg); process.exit(1); }

try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const v = pkg.version;
  if (!v) die('version not found in package.json');

  let xml = '';
  if (fs.existsSync(propsPath)) xml = fs.readFileSync(propsPath, 'utf8');
  else xml = '<Project><PropertyGroup></PropertyGroup></Project>';

  const re = /<Version>[^<]*<\/Version>|<AssemblyVersion>[^<]*<\/AssemblyVersion>|<FileVersion>[^<]*<\/FileVersion>|<AssemblyInformationalVersion>[^<]*<\/AssemblyInformationalVersion>/g;
  const updated = xml
    .replace(/<Version>[^<]*<\/Version>/, `<Version>${v}<\/Version>`)
    .replace(/<AssemblyVersion>[^<]*<\/AssemblyVersion>/, `<AssemblyVersion>${v}.0<\/AssemblyVersion>`)
    .replace(/<FileVersion>[^<]*<\/FileVersion>/, `<FileVersion>${v}.0<\/FileVersion>`)
    .replace(/<AssemblyInformationalVersion>[^<]*<\/AssemblyInformationalVersion>/, `<AssemblyInformationalVersion>${v}<\/AssemblyInformationalVersion>`);

  fs.writeFileSync(propsPath, updated, 'utf8');
  // コミット対象に追加（npm version による自動コミットに含めるため）
  try { require('child_process').spawnSync('git', ['add', propsPath], { stdio: 'inherit' }); } catch {}
  console.log(`[sync] roslyn-cli version synced to ${v}`);
} catch (e) {
  die(`sync failed: ${e.message}`);
}

