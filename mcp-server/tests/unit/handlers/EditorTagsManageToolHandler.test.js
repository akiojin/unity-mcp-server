import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EditorTagsManageToolHandler } from '../../../src/handlers/editor/EditorTagsManageToolHandler.js';

// Mock Unity connection
class MockUnityConnection {
  constructor() {
    this.connected = true;
    this.mockResponses = new Map();
  }

  isConnected() {
    return this.connected;
  }

  async connect() {
    this.connected = true;
  }

  setMockResponse(command, response) {
    this.mockResponses.set(command, response);
  }

  async sendCommand(command, params) {
    const response = this.mockResponses.get(command);
    if (response) {
      return typeof response === 'function' ? response(params) : response;
    }
    throw new Error(`No mock response for command: ${command}`);
  }
}

describe('EditorTagsManageToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = new MockUnityConnection();
    handler = new EditorTagsManageToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      assert.equal(handler.name, 'editor_tags_manage');
      assert.equal(handler.description, 'Manage Unity project tags (add, remove, list)');
      assert.ok(handler.inputSchema);
      assert.equal(handler.inputSchema.type, 'object');
    });

    it('should define action parameter', () => {
      const actionProperty = handler.inputSchema.properties.action;
      assert.ok(actionProperty);
      assert.equal(actionProperty.type, 'string');
      assert.ok(actionProperty.enum.includes('add'));
      assert.ok(actionProperty.enum.includes('remove'));
      assert.ok(actionProperty.enum.includes('get'));
    });

    it('should define tagName parameter', () => {
      const tagNameProperty = handler.inputSchema.properties.tagName;
      assert.ok(tagNameProperty);
      assert.equal(tagNameProperty.type, 'string');
    });
  });

  describe('validate', () => {
    it('should pass with valid get action', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'get' });
      });
    });

    it('should pass with valid add action and tag name', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'add', tagName: 'Enemy' });
      });
    });

    it('should pass with valid remove action and tag name', () => {
      assert.doesNotThrow(() => {
        handler.validate({ action: 'remove', tagName: 'Enemy' });
      });
    });

    it('should fail with missing action', () => {
      assert.throws(
        () => {
          handler.validate({});
        },
        { message: /action is required/ }
      );
    });

    it('should fail with invalid action', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'invalid' });
        },
        { message: /action must be one of/ }
      );
    });

    it('should fail with add action but missing tag name', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'add' });
        },
        { message: /tagName is required for add action/ }
      );
    });

    it('should fail with remove action but missing tag name', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'remove' });
        },
        { message: /tagName is required for remove action/ }
      );
    });

    it('should fail with empty tag name', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'add', tagName: '' });
        },
        { message: /tagName cannot be empty/ }
      );
    });

    it('should fail with invalid tag name characters', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'add', tagName: 'Invalid Tag!' });
        },
        { message: /tagName contains invalid characters/ }
      );
    });

    it('should fail with reserved tag name', () => {
      assert.throws(
        () => {
          handler.validate({ action: 'add', tagName: 'Untagged' });
        },
        { message: /tagName is reserved/ }
      );
    });
  });

  describe('execute', () => {
    describe('get action', () => {
      it('should get all tags', async () => {
        const mockTags = ['Untagged', 'Respawn', 'Finish', 'Player', 'Enemy', 'Environment'];
        mockConnection.setMockResponse('manage_tags', {
          success: true,
          action: 'get',
          tags: mockTags,
          count: mockTags.length
        });

        const result = await handler.execute({ action: 'get' });

        assert.equal(result.success, true);
        assert.equal(result.action, 'get');
        assert.equal(result.tags.length, 6);
        assert.ok(result.tags.includes('Player'));
        assert.ok(result.tags.includes('Enemy'));
        assert.equal(result.count, 6);
      });

      it('should connect if not connected', async () => {
        mockConnection.connected = false;
        mockConnection.setMockResponse('manage_tags', {
          success: true,
          action: 'get',
          tags: ['Untagged'],
          count: 1
        });

        const result = await handler.execute({ action: 'get' });

        assert.equal(result.success, true);
        assert.equal(mockConnection.connected, true);
      });
    });

    describe('add action', () => {
      it('should add new tag', async () => {
        mockConnection.setMockResponse('manage_tags', {
          success: true,
          action: 'add',
          tagName: 'NewTag',
          message: 'Tag "NewTag" added successfully',
          tagsCount: 7
        });

        const result = await handler.execute({ action: 'add', tagName: 'NewTag' });

        assert.equal(result.success, true);
        assert.equal(result.action, 'add');
        assert.equal(result.tagName, 'NewTag');
        assert.equal(result.message, 'Tag "NewTag" added successfully');
        assert.equal(result.tagsCount, 7);
      });

      it('should handle duplicate tag error', async () => {
        mockConnection.setMockResponse('manage_tags', {
          error: 'Tag "Player" already exists'
        });

        await assert.rejects(
          async () => await handler.execute({ action: 'add', tagName: 'Player' }),
          { message: 'Tag "Player" already exists' }
        );
      });
    });

    describe('remove action', () => {
      it('should remove existing tag', async () => {
        mockConnection.setMockResponse('manage_tags', {
          success: true,
          action: 'remove',
          tagName: 'OldTag',
          message: 'Tag "OldTag" removed successfully',
          tagsCount: 5
        });

        const result = await handler.execute({ action: 'remove', tagName: 'OldTag' });

        assert.equal(result.success, true);
        assert.equal(result.action, 'remove');
        assert.equal(result.tagName, 'OldTag');
        assert.equal(result.message, 'Tag "OldTag" removed successfully');
        assert.equal(result.tagsCount, 5);
      });

      it('should handle non-existent tag error', async () => {
        mockConnection.setMockResponse('manage_tags', {
          error: 'Tag "NonExistent" does not exist'
        });

        await assert.rejects(
          async () => await handler.execute({ action: 'remove', tagName: 'NonExistent' }),
          { message: 'Tag "NonExistent" does not exist' }
        );
      });

      it('should handle reserved tag removal error', async () => {
        mockConnection.setMockResponse('manage_tags', {
          error: 'Cannot remove reserved tag "Untagged"'
        });

        await assert.rejects(
          async () => await handler.execute({ action: 'remove', tagName: 'Untagged' }),
          { message: 'Cannot remove reserved tag "Untagged"' }
        );
      });
    });

    it('should handle Unity connection errors', async () => {
      mockConnection.setMockResponse('manage_tags', {
        error: 'Unity connection failed'
      });

      await assert.rejects(async () => await handler.execute({ action: 'get' }), {
        message: 'Unity connection failed'
      });
    });
  });

  describe('getExamples', () => {
    it('should return usage examples', () => {
      const examples = handler.getExamples();

      assert.ok(examples.getTags);
      assert.ok(examples.addTag);
      assert.ok(examples.removeTag);

      assert.equal(examples.getTags.params.action, 'get');
      assert.equal(examples.addTag.params.action, 'add');
      assert.equal(examples.removeTag.params.action, 'remove');
    });
  });
});
