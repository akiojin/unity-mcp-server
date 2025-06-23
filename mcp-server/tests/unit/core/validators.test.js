import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateVector3,
  validateRange,
  validateNonEmptyString,
  validateBoolean,
  validateLayer,
  validateGameObjectPath
} from '../../../src/utils/validators.js';

describe('Validators', () => {
  describe('validateVector3', () => {
    it('should accept valid Vector3 objects', () => {
      assert.doesNotThrow(() => validateVector3({ x: 1, y: 2, z: 3 }, 'position'));
      assert.doesNotThrow(() => validateVector3({ x: 0, y: 0, z: 0 }, 'position'));
      assert.doesNotThrow(() => validateVector3({ x: -1.5, y: 2.5, z: 3.5 }, 'position'));
    });

    it('should accept null or undefined', () => {
      assert.doesNotThrow(() => validateVector3(null, 'position'));
      assert.doesNotThrow(() => validateVector3(undefined, 'position'));
    });

    it('should reject objects with invalid properties', () => {
      assert.throws(
        () => validateVector3({ x: 1, y: 2, z: 3, w: 4 }, 'position'),
        /position must only contain x, y, z properties/
      );
    });

    it('should reject objects with non-numeric values', () => {
      assert.throws(
        () => validateVector3({ x: '1', y: 2, z: 3 }, 'position'),
        /position\.x must be a number/
      );
    });
  });

  describe('validateRange', () => {
    it('should accept values within range', () => {
      assert.doesNotThrow(() => validateRange(5, 0, 10, 'value'));
      assert.doesNotThrow(() => validateRange(0, 0, 10, 'value'));
      assert.doesNotThrow(() => validateRange(10, 0, 10, 'value'));
    });

    it('should reject non-numeric values', () => {
      assert.throws(
        () => validateRange('5', 0, 10, 'value'),
        /value must be a number/
      );
    });

    it('should reject values outside range', () => {
      assert.throws(
        () => validateRange(-1, 0, 10, 'value'),
        /value must be between 0 and 10/
      );
      assert.throws(
        () => validateRange(11, 0, 10, 'value'),
        /value must be between 0 and 10/
      );
    });
  });

  describe('validateNonEmptyString', () => {
    it('should accept non-empty strings', () => {
      assert.doesNotThrow(() => validateNonEmptyString('test', 'name'));
      assert.doesNotThrow(() => validateNonEmptyString('  test  ', 'name'));
    });

    it('should reject non-string values', () => {
      assert.throws(
        () => validateNonEmptyString(123, 'name'),
        /name must be a string/
      );
      assert.throws(
        () => validateNonEmptyString(null, 'name'),
        /name must be a string/
      );
    });

    it('should reject empty strings', () => {
      assert.throws(
        () => validateNonEmptyString('', 'name'),
        /name cannot be empty/
      );
      assert.throws(
        () => validateNonEmptyString('   ', 'name'),
        /name cannot be empty/
      );
    });
  });

  describe('validateBoolean', () => {
    it('should accept boolean values', () => {
      assert.doesNotThrow(() => validateBoolean(true, 'flag'));
      assert.doesNotThrow(() => validateBoolean(false, 'flag'));
    });

    it('should reject non-boolean values', () => {
      assert.throws(
        () => validateBoolean(1, 'flag'),
        /flag must be a boolean/
      );
      assert.throws(
        () => validateBoolean('true', 'flag'),
        /flag must be a boolean/
      );
    });
  });

  describe('validateLayer', () => {
    it('should accept valid layer indices', () => {
      assert.doesNotThrow(() => validateLayer(0));
      assert.doesNotThrow(() => validateLayer(15));
      assert.doesNotThrow(() => validateLayer(31));
    });

    it('should reject invalid layer indices', () => {
      assert.throws(
        () => validateLayer(-1),
        /layer must be between 0 and 31/
      );
      assert.throws(
        () => validateLayer(32),
        /layer must be between 0 and 31/
      );
    });
  });

  describe('validateGameObjectPath', () => {
    it('should accept valid GameObject paths', () => {
      assert.doesNotThrow(() => validateGameObjectPath('/GameObject'));
      assert.doesNotThrow(() => validateGameObjectPath('/Parent/Child'));
      assert.doesNotThrow(() => validateGameObjectPath('/'));
    });

    it('should reject paths not starting with /', () => {
      assert.throws(
        () => validateGameObjectPath('GameObject'),
        /GameObject path must start with \//
      );
    });

    it('should reject empty paths', () => {
      assert.throws(
        () => validateGameObjectPath(''),
        /path cannot be empty/
      );
    });
  });
});