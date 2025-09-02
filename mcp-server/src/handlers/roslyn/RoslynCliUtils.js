import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { ProjectInfoProvider } from '../../core/projectInfo.js';
import { logger } from '../../core/config.js';

export class RoslynCliUtils {
  constructor(unityConnection) {
    this.unityConnection = unityConnection;
    this.projectInfo = new ProjectInfoProvider(unityConnection);
  }

  async getCliPath() {
    const envPath = process.env.ROSLYN_CLI;
    if (envPath && fs.existsSync(envPath)) return envPath;

    const rid = this._detectRid();
    const local = path.resolve(process.cwd(), '.tools', 'roslyn-cli', rid, process.platform === 'win32' ? 'roslyn-cli.exe' : 'roslyn-cli');
    if (fs.existsSync(local)) return local;
    throw new Error('roslyn-cli binary not found. Run scripts/bootstrap-roslyn-cli.(sh|ps1) to build self-contained binaries.');
  }

  _detectRid() {
    if (process.platform === 'win32') return 'win-x64';
    if (process.platform === 'darwin') return process.arch === 'arm64' ? 'osx-arm64' : 'osx-x64';
    return 'linux-x64';
  }

  async getSolutionOrProjectArgs() {
    const info = await this.projectInfo.get();
    const root = info.projectRoot;
    // Prefer .sln under project root
    const sln = this._findFirst(root, '.sln');
    if (sln) return ['--solution', sln];
    const csproj = this._findFirst(root, '.csproj');
    if (csproj) return ['--project', csproj];
    throw new Error(`No .sln or .csproj found under ${root}`);
  }

  _findFirst(dir, ext) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isFile() && e.name.toLowerCase().endsWith(ext)) return path.resolve(dir, e.name);
      }
      // shallow search (depth 2)
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const sub = path.join(dir, e.name);
        const subEntries = fs.readdirSync(sub, { withFileTypes: true });
        for (const s of subEntries) {
          if (s.isFile() && s.name.toLowerCase().endsWith(ext)) return path.resolve(sub, s.name);
        }
      }
    } catch {}
    return null;
  }

  async runCli(args, input = null) {
    const bin = await this.getCliPath();
    logger.debug(`[roslyn-cli] ${bin} ${args.join(' ')}`);
    return new Promise((resolve, reject) => {
      const proc = spawn(bin, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      proc.stdout.on('data', d => out += d.toString());
      proc.stderr.on('data', d => err += d.toString());
      proc.on('error', reject);
      proc.on('close', code => {
        if (code !== 0 && !out) {
          return reject(new Error(err || `roslyn-cli exited with code ${code}`));
        }
        try {
          const json = JSON.parse(out);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse roslyn-cli output: ${e.message}. Raw: ${out}\nStderr: ${err}`));
        }
      });
      if (input) proc.stdin.end(input);
      else proc.stdin.end();
    });
  }
}

