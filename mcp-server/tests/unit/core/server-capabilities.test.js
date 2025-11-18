import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Server Capabilities Declaration (Unit)', () => {
  it('should declare capabilities with tools only in server.js', () => {
    // server.jsファイルの内容を読み取る
    const serverPath = join(__dirname, '../../../src/core/server.js');
    const serverContent = readFileSync(serverPath, 'utf-8');

    // capabilities宣言に`tools`が含まれることを確認
    assert.match(
      serverContent,
      /capabilities:\s*\{[^}]*tools:/m,
      'capabilities should include tools'
    );

    // capabilities宣言に`listChanged: true`が含まれることを確認
    assert.match(
      serverContent,
      /tools:\s*\{\s*listChanged:\s*true\s*\}/m,
      'tools should have listChanged: true'
    );

    // capabilities宣言に`resources: {}`が含まれないことを確認（現状は含まれている→REDフェーズ）
    // このテストは実装修正後にGREENになる
    const resourcesMatch = serverContent.match(/resources:\s*\{\s*\}/m);
    assert.strictEqual(
      resourcesMatch,
      null,
      'capabilities should NOT include empty resources object (this will fail until implementation)'
    );

    // capabilities宣言に`prompts: {}`が含まれないことを確認（現状は含まれている→REDフェーズ）
    const promptsMatch = serverContent.match(/prompts:\s*\{\s*\}/m);
    assert.strictEqual(
      promptsMatch,
      null,
      'capabilities should NOT include empty prompts object (this will fail until implementation)'
    );
  });

  it('should not import ListResourcesRequestSchema in server.js', () => {
    const serverPath = join(__dirname, '../../../src/core/server.js');
    const serverContent = readFileSync(serverPath, 'utf-8');

    // ListResourcesRequestSchemaのimportが削除されていることを確認（実装後）
    const importMatch = serverContent.match(/ListResourcesRequestSchema/);
    assert.strictEqual(
      importMatch,
      null,
      'server.js should NOT import ListResourcesRequestSchema (this will fail until implementation)'
    );
  });

  it('should not import ListPromptsRequestSchema in server.js', () => {
    const serverPath = join(__dirname, '../../../src/core/server.js');
    const serverContent = readFileSync(serverPath, 'utf-8');

    // ListPromptsRequestSchemaのimportが削除されていることを確認（実装後）
    const importMatch = serverContent.match(/ListPromptsRequestSchema/);
    assert.strictEqual(
      importMatch,
      null,
      'server.js should NOT import ListPromptsRequestSchema (this will fail until implementation)'
    );
  });

  it('should not register ListResourcesRequestSchema handler in server.js', () => {
    const serverPath = join(__dirname, '../../../src/core/server.js');
    const serverContent = readFileSync(serverPath, 'utf-8');

    // ListResourcesRequestSchemaハンドラーが削除されていることを確認（実装後）
    const handlerMatch = serverContent.match(/setRequestHandler\(ListResourcesRequestSchema/);
    assert.strictEqual(
      handlerMatch,
      null,
      'server.js should NOT register ListResourcesRequestSchema handler (this will fail until implementation)'
    );
  });

  it('should not register ListPromptsRequestSchema handler in server.js', () => {
    const serverPath = join(__dirname, '../../../src/core/server.js');
    const serverContent = readFileSync(serverPath, 'utf-8');

    // ListPromptsRequestSchemaハンドラーが削除されていることを確認（実装後）
    const handlerMatch = serverContent.match(/setRequestHandler\(ListPromptsRequestSchema/);
    assert.strictEqual(
      handlerMatch,
      null,
      'server.js should NOT register ListPromptsRequestSchema handler (this will fail until implementation)'
    );
  });
});
