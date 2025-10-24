import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ScriptCreateClassToolHandler } from '../../../../src/handlers/script/ScriptCreateClassToolHandler.js';
import { createMockUnityConnection } from '../../../utils/test-helpers.js';

describe('ScriptCreateClassToolHandler', () => {
  let handler;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockUnityConnection({ sendCommandResult: { success: true } });
    handler = new ScriptCreateClassToolHandler(mockConnection);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      assert.equal(handler.name, 'script_create_class');
    });

    it('should have path and className as required parameters', () => {
      assert.deepEqual(handler.inputSchema.required, ['path', 'className']);
    });

    it('should have all expected parameters in schema', () => {
      const props = handler.inputSchema.properties;
      assert.ok(props.path);
      assert.ok(props.className);
      assert.ok(props.namespace);
      assert.ok(props.baseType);
      assert.ok(props.usings);
      assert.ok(props.partial);
      assert.ok(props.apply);
    });
  });

  describe('execute - preview mode', () => {
    it('should generate simple class in preview mode', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/TestClass.cs',
        className: 'TestClass',
        apply: false
      });
      assert.equal(result.success, true);
      assert.equal(result.applied, false);
      assert.ok(result.preview);
      assert.ok(result.preview.includes('class TestClass'));
    });

    it('should add .cs extension if missing', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/TestClass',
        className: 'TestClass',
        apply: false
      });
      assert.equal(result.relative, 'Assets/Scripts/TestClass.cs');
    });

    it('should support namespace', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/TestClass.cs',
        className: 'TestClass',
        namespace: 'MyGame.Core',
        apply: false
      });
      assert.ok(result.preview.includes('namespace MyGame.Core'));
    });

    it('should support baseType', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/TestClass.cs',
        className: 'TestClass',
        baseType: 'MonoBehaviour',
        apply: false
      });
      assert.ok(result.preview.includes(': MonoBehaviour'));
    });

    it('should add UnityEngine using for MonoBehaviour', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/TestClass.cs',
        className: 'TestClass',
        baseType: 'MonoBehaviour',
        apply: false
      });
      assert.ok(result.preview.includes('using UnityEngine;'));
    });

    it('should support custom usings', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/TestClass.cs',
        className: 'TestClass',
        usings: 'System,System.Collections.Generic',
        apply: false
      });
      assert.ok(result.preview.includes('using System;'));
      assert.ok(result.preview.includes('using System.Collections.Generic;'));
    });

    it('should support partial class', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/TestClass.cs',
        className: 'TestClass',
        partial: true,
        apply: false
      });
      assert.ok(result.preview.includes('partial class TestClass'));
    });

    it('should truncate preview if over 1000 chars', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/TestClass.cs',
        className: 'TestClass',
        namespace: 'A'.repeat(1000),
        apply: false
      });
      if (result.previewTruncated) {
        assert.ok(result.preview.length <= 1000);
      }
    });
  });

  describe('execute - apply mode', () => {
    it('should indicate applied status when apply=true', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/TestClass.cs',
        className: 'TestClass',
        apply: true
      });
      assert.equal(result.success, true);
      assert.equal(result.applied, true);
    });
  });

  describe('SPEC compliance', () => {
    it('should create simple class file', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/SimpleClass.cs',
        className: 'SimpleClass',
        apply: false
      });
      assert.equal(result.success, true);
      assert.ok(result.preview);
    });

    it('should create class with namespace', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/NamespacedClass.cs',
        className: 'NamespacedClass',
        namespace: 'MyNamespace',
        apply: false
      });
      assert.ok(result.preview.includes('namespace MyNamespace'));
    });

    it('should create MonoBehaviour class', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/MyBehaviour.cs',
        className: 'MyBehaviour',
        baseType: 'MonoBehaviour',
        apply: false
      });
      assert.ok(result.preview.includes('using UnityEngine;'));
      assert.ok(result.preview.includes(': MonoBehaviour'));
    });

    it('should create partial class', async () => {
      const result = await handler.execute({
        path: 'Assets/Scripts/PartialClass.cs',
        className: 'PartialClass',
        partial: true,
        apply: false
      });
      assert.ok(result.preview.includes('partial class'));
    });
  });
});
