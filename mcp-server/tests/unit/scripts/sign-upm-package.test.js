import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  sanitizePackageName,
  findAttestationPath,
  buildUnityUpmPackArgs,
  parseArgs
} from '../../../../scripts/upm/sign-upm-package.mjs';

describe('scripts/upm/sign-upm-package.mjs', () => {
  describe('sanitizePackageName', () => {
    it('removes npm scope and replaces / with -', () => {
      assert.strictEqual(sanitizePackageName('@scope/pkg'), 'scope-pkg');
    });

    it('keeps non-scoped package names', () => {
      assert.strictEqual(
        sanitizePackageName('com.akiojin.unity-mcp-server'),
        'com.akiojin.unity-mcp-server'
      );
    });
  });

  describe('findAttestationPath', () => {
    it('detects attestation file under package/ prefix', () => {
      const tarList = [
        'package/package.json',
        'package/.attestation.p7m',
        'package/README.md'
      ].join('\n');
      assert.strictEqual(findAttestationPath(tarList), 'package/.attestation.p7m');
    });

    it('detects attestation file at root', () => {
      const tarList = ['package.json', '.attestation.p7m', 'README.md'].join('\n');
      assert.strictEqual(findAttestationPath(tarList), '.attestation.p7m');
    });

    it('returns null when missing', () => {
      assert.strictEqual(findAttestationPath('package/package.json\nREADME.md\n'), null);
    });
  });

  describe('buildUnityUpmPackArgs', () => {
    it('builds Unity -upmPack args', () => {
      const args = buildUnityUpmPackArgs({
        packageFolder: '/abs/pkg',
        outputTgz: '/abs/out.tgz',
        orgId: '1234567'
      });
      assert.deepStrictEqual(args, [
        '-batchmode',
        '-nographics',
        '-quit',
        '-upmPack',
        '/abs/pkg',
        '/abs/out.tgz',
        '-cloudOrganization',
        '1234567',
        '-logfile',
        '-'
      ]);
    });
  });

  describe('parseArgs', () => {
    it('parses defaults', () => {
      const opts = parseArgs([]);
      assert.strictEqual(opts.packagePath, 'UnityMCPServer/Packages/unity-mcp-server');
      assert.strictEqual(opts.outDir, 'dist/upm');
      assert.strictEqual(opts.outTgz, null);
      assert.strictEqual(opts.dryRun, false);
      assert.strictEqual(opts.skipVerify, false);
    });

    it('parses known flags', () => {
      const opts = parseArgs([
        '--package-path',
        'P',
        '--out-dir',
        'O',
        '--out-tgz',
        'T.tgz',
        '--org-id',
        'ORG',
        '--unity-path',
        '/Unity',
        '--tag',
        'v1.2.3',
        '--dry-run',
        '--json',
        '--skip-verify',
        '--verbose'
      ]);
      assert.deepStrictEqual(opts, {
        packagePath: 'P',
        outDir: 'O',
        outTgz: 'T.tgz',
        orgId: 'ORG',
        unityPath: '/Unity',
        tag: 'v1.2.3',
        dryRun: true,
        json: true,
        skipVerify: true,
        verbose: true
      });
    });

    it('throws on unknown option', () => {
      assert.throws(() => parseArgs(['--nope']), /Unknown option/);
    });
  });
});
