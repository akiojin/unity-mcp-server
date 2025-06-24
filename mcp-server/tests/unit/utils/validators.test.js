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

describe('validators', () => {
  describe('validateVector3', () => {
    it('should accept valid Vector3 object', () => {
      assert.doesNotThrow(() => {
        validateVector3({ x: 1, y: 2, z: 3 }, 'position');
      });
    });

    it('should accept partial Vector3 object', () => {
      assert.doesNotThrow(() => {
        validateVector3({ x: 1 }, 'position');
        validateVector3({ y: 2 }, 'position');
        validateVector3({ z: 3 }, 'position');
        validateVector3({ x: 1, y: 2 }, 'position');
      });
    });

    it('should accept null/undefined', () => {
      assert.doesNotThrow(() => {
        validateVector3(null, 'position');
        validateVector3(undefined, 'position');
      });
    });

    it('should reject non-object values', () => {
      assert.doesNotThrow(() => {
        validateVector3('string', 'position');
        validateVector3(123, 'position');
        validateVector3(true, 'position');
      });
    });

    it('should reject invalid properties', () => {
      assert.throws(
        () => validateVector3({ x: 1, y: 2, z: 3, w: 4 }, 'position'),
        /position must only contain x, y, z properties/
      );
    });

    it('should reject non-number values', () => {
      assert.throws(
        () => validateVector3({ x: '1', y: 2, z: 3 }, 'position'),
        /position\.x must be a number/
      );

      assert.throws(
        () => validateVector3({ x: 1, y: 'invalid', z: 3 }, 'position'),
        /position\.y must be a number/
      );

      assert.throws(
        () => validateVector3({ x: 1, y: 2, z: null }, 'position'),
        /position\.z must be a number/
      );
    });
  });

  describe('validateRange', () => {
    it('should accept values within range', () => {
      assert.doesNotThrow(() => {
        validateRange(5, 0, 10, 'value');
        validateRange(0, 0, 10, 'value');
        validateRange(10, 0, 10, 'value');
      });
    });

    it('should reject values below minimum', () => {
      assert.throws(
        () => validateRange(-1, 0, 10, 'value'),
        /value must be between 0 and 10/
      );
    });

    it('should reject values above maximum', () => {
      assert.throws(
        () => validateRange(11, 0, 10, 'value'),
        /value must be between 0 and 10/
      );
    });

    it('should reject non-number values', () => {
      assert.throws(
        () => validateRange('5', 0, 10, 'value'),
        /value must be a number/
      );

      assert.throws(
        () => validateRange(null, 0, 10, 'value'),
        /value must be a number/
      );
    });
  });

  describe('validateNonEmptyString', () => {
    it('should accept non-empty strings', () => {
      assert.doesNotThrow(() => {
        validateNonEmptyString('hello', 'name');
        validateNonEmptyString(' world ', 'name');
      });
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

      assert.throws(
        () => validateNonEmptyString(undefined, 'name'),
        /name must be a string/
      );
    });

    it('should reject empty or whitespace-only strings', () => {
      assert.throws(
        () => validateNonEmptyString('', 'name'),
        /name cannot be empty/
      );

      assert.throws(
        () => validateNonEmptyString('   ', 'name'),
        /name cannot be empty/
      );

      assert.throws(
        () => validateNonEmptyString('\t\n', 'name'),
        /name cannot be empty/
      );
    });
  });

  describe('validateBoolean', () => {
    it('should accept boolean values', () => {
      assert.doesNotThrow(() => {
        validateBoolean(true, 'flag');
        validateBoolean(false, 'flag');
      });
    });

    it('should reject non-boolean values', () => {
      assert.throws(
        () => validateBoolean('true', 'flag'),
        /flag must be a boolean/
      );

      assert.throws(
        () => validateBoolean(1, 'flag'),
        /flag must be a boolean/
      );

      assert.throws(
        () => validateBoolean(0, 'flag'),
        /flag must be a boolean/
      );

      assert.throws(
        () => validateBoolean(null, 'flag'),
        /flag must be a boolean/
      );

      assert.throws(
        () => validateBoolean(undefined, 'flag'),
        /flag must be a boolean/
      );
    });
  });

  describe('validateLayer', () => {
    it('should accept valid layer indices', () => {
      assert.doesNotThrow(() => {
        validateLayer(0);
        validateLayer(15);
        validateLayer(31);
      });
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

      assert.throws(
        () => validateLayer('5'),
        /layer must be a number/
      );
    });
  });

  describe('validateGameObjectPath', () => {
    it('should accept valid GameObject paths', () => {
      assert.doesNotThrow(() => {
        validateGameObjectPath('/GameObject');
        validateGameObjectPath('/Parent/Child');
        validateGameObjectPath('/Root/Level1/Level2/Object');
      });
    });

    it('should reject paths not starting with slash', () => {
      assert.throws(
        () => validateGameObjectPath('GameObject'),
        /GameObject path must start with \//
      );

      assert.throws(
        () => validateGameObjectPath('Parent/Child'),
        /GameObject path must start with \//
      );
    });

    it('should reject empty paths', () => {
      assert.throws(
        () => validateGameObjectPath(''),
        /path cannot be empty/
      );

      assert.throws(
        () => validateGameObjectPath('   '),
        /path cannot be empty/
      );
    });

    it('should reject non-string paths', () => {
      assert.throws(
        () => validateGameObjectPath(null),
        /path must be a string/
      );

      assert.throws(
        () => validateGameObjectPath(123),
        /path must be a string/
      );
    });
  });
});