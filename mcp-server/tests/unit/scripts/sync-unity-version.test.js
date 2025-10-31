import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('sync-unity-package-version.js', () => {
  const SCRIPT_PATH = path.join(__dirname, '../../../scripts/sync-unity-package-version.js');
  const UNITY_PACKAGE_PATH = path.join(
    __dirname,
    '../../../../UnityMCPServer/Packages/unity-mcp-server/package.json'
  );

  let originalArgv;
  let originalPackageJson;
  let readFileSyncMock;
  let writeFileSyncMock;

  beforeEach(() => {
    originalArgv = process.argv;

    // バックアップを取得（実ファイルが存在する場合）
    if (fs.existsSync(UNITY_PACKAGE_PATH)) {
      originalPackageJson = fs.readFileSync(UNITY_PACKAGE_PATH, 'utf8');
    }
  });

  afterEach(() => {
    process.argv = originalArgv;

    // 実ファイルが変更されていたら復元
    if (originalPackageJson && fs.existsSync(UNITY_PACKAGE_PATH)) {
      fs.writeFileSync(UNITY_PACKAGE_PATH, originalPackageJson, 'utf8');
    }
  });

  it('should update Unity Package version when valid version is provided', async () => {
    const testVersion = '2.99.99';

    // コマンドライン引数をモック
    process.argv = ['node', SCRIPT_PATH, testVersion];

    // スクリプトが存在しない場合は警告
    if (!fs.existsSync(SCRIPT_PATH)) {
      console.warn(`Script not found: ${SCRIPT_PATH} (expected in RED phase)`);
      assert.fail('Script should exist');
    }

    // スクリプト実行
    const { execSync } = await import('node:child_process');
    const output = execSync(`node ${SCRIPT_PATH} ${testVersion}`, {
      encoding: 'utf8',
      cwd: path.join(__dirname, '../../..')
    });

    // Unity package.json読み込み
    const packageJson = JSON.parse(fs.readFileSync(UNITY_PACKAGE_PATH, 'utf8'));

    // バージョンが更新されていることを確認
    assert.strictEqual(packageJson.version, testVersion, 'Version should be updated');

    // 出力メッセージ確認
    assert.ok(output.includes(testVersion), 'Output should include version number');
  });

  it('should exit with error when version argument is missing', async () => {
    // バージョン引数なし
    process.argv = ['node', SCRIPT_PATH];

    if (!fs.existsSync(SCRIPT_PATH)) {
      console.warn(`Script not found: ${SCRIPT_PATH} (expected in RED phase)`);
      assert.fail('Script should exist');
    }

    const { execSync } = await import('node:child_process');

    try {
      execSync(`node ${SCRIPT_PATH}`, {
        encoding: 'utf8',
        cwd: path.join(__dirname, '../../..')
      });
      assert.fail('Should have thrown an error');
    } catch (error) {
      // エラーコードが1（異常終了）であることを確認
      assert.ok(error.status !== 0, 'Should exit with non-zero status');
      assert.ok(
        error.stderr.includes('Version argument') || error.stdout.includes('Version argument'),
        'Error message should mention version argument'
      );
    }
  });

  it('should preserve package.json formatting with 2-space indentation', async () => {
    const testVersion = '3.0.0';

    // コマンドライン引数をモック
    process.argv = ['node', SCRIPT_PATH, testVersion];

    if (!fs.existsSync(SCRIPT_PATH)) {
      console.warn(`Script not found: ${SCRIPT_PATH} (expected in RED phase)`);
      assert.fail('Script should exist');
    }

    // スクリプト実行
    const { execSync } = await import('node:child_process');
    execSync(`node ${SCRIPT_PATH} ${testVersion}`, {
      encoding: 'utf8',
      cwd: path.join(__dirname, '../../..')
    });

    // ファイル内容を文字列として読み込み
    const fileContent = fs.readFileSync(UNITY_PACKAGE_PATH, 'utf8');

    // インデントが2スペースであることを確認
    const lines = fileContent.split('\n');
    const indentedLine = lines.find(line => line.startsWith('  ') && !line.startsWith('    '));
    assert.ok(indentedLine, 'Should have 2-space indentation');

    // 末尾に改行があることを確認
    assert.ok(fileContent.endsWith('\n'), 'Should end with newline');
  });

  it('should handle Unity package.json with existing version field', async () => {
    const testVersion = '4.5.6';

    // 現在のバージョンを取得
    const currentPackageJson = JSON.parse(fs.readFileSync(UNITY_PACKAGE_PATH, 'utf8'));
    const oldVersion = currentPackageJson.version;

    assert.ok(oldVersion, 'Unity package.json should have existing version field');

    // スクリプト実行
    process.argv = ['node', SCRIPT_PATH, testVersion];

    if (!fs.existsSync(SCRIPT_PATH)) {
      console.warn(`Script not found: ${SCRIPT_PATH} (expected in RED phase)`);
      assert.fail('Script should exist');
    }

    const { execSync } = await import('node:child_process');
    execSync(`node ${SCRIPT_PATH} ${testVersion}`, {
      encoding: 'utf8',
      cwd: path.join(__dirname, '../../..')
    });

    // 更新後のバージョンを確認
    const updatedPackageJson = JSON.parse(fs.readFileSync(UNITY_PACKAGE_PATH, 'utf8'));
    assert.strictEqual(updatedPackageJson.version, testVersion, 'Version should be updated from old value');
    assert.notStrictEqual(updatedPackageJson.version, oldVersion, 'Version should be different from old value');
  });
});
