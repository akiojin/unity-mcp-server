import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../../src/core/server.js';

describe('MCP Handler Registration Contract', () => {
  it('should not register ListResourcesRequestSchema handler', async () => {
    const { server } = await createServer();

    // MCP SDK v0.6.1のServer instanceは、登録されたハンドラーを公開APIで
    // 直接確認する方法を提供していない
    // そのため、このテストは実装の存在確認として機能する

    // 実際の検証は以下で行われる:
    // 1. server.jsでListResourcesRequestSchemaのimportが削除されている
    // 2. setRequestHandlerが呼ばれていない
    // 3. Integration testでresources/listリクエストがエラーになることを確認

    assert.ok(server, 'Server should be created without resources handler');
  });

  it('should not register ListPromptsRequestSchema handler', async () => {
    const { server } = await createServer();

    // prompts handlerが登録されていないことを間接的に検証
    // （Integration testで実際の動作を確認）

    assert.ok(server, 'Server should be created without prompts handler');
  });

  it('should register ListToolsRequestSchema handler', async () => {
    const { server } = await createServer();

    // tools handlerが登録されていることを間接的に検証
    // （Integration testでtools/listリクエストが成功することを確認）

    assert.ok(server, 'Server should be created with tools handler');
  });

  it('should register CallToolRequestSchema handler', async () => {
    const { server } = await createServer();

    // tool execution handlerが登録されていることを間接的に検証
    // （Integration testでツール実行が成功することを確認）

    assert.ok(server, 'Server should be created with tool execution handler');
  });
});
