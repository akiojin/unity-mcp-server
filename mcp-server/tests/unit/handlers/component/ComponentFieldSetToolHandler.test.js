import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { ComponentFieldSetToolHandler } from '../../../../src/handlers/component/ComponentFieldSetToolHandler.js'

class MockUnityConnection {
  constructor() {
    this.connected = true
    this.sendCommand = mock.fn(async () => ({
      success: true,
      appliedValue: 10
    }))
  }

  isConnected() {
    return this.connected
  }

  async connect() {
    this.connected = true
  }
}

describe('ComponentFieldSetToolHandler', () => {
  let handler
  let mockConnection

  beforeEach(() => {
    mockConnection = new MockUnityConnection()
    handler = new ComponentFieldSetToolHandler(mockConnection)
  })

  afterEach(() => {
    mock.restoreAll()
  })

  it('should initialize with correct definition', () => {
    assert.equal(handler.name, 'component_field_set')
    assert.ok(handler.description.includes('serialized field'))
    assert.deepEqual(handler.inputSchema.required, ['componentType', 'fieldPath'])
  })

  describe('validate', () => {
    it('should require a target path', () => {
      assert.throws(
        () =>
          handler.validate({
            componentType: 'Light',
            fieldPath: '_intensity',
            value: 2.0
          }),
        /Either gameObjectPath or prefabAssetPath must be provided/
      )
    })

    it('should require value unless dryRun', () => {
      assert.throws(
        () =>
          handler.validate({
            gameObjectPath: '/Light',
            componentType: 'Light',
            fieldPath: '_intensity'
          }),
        /value is required/
      )

      assert.doesNotThrow(() =>
        handler.validate({
          gameObjectPath: '/Light',
          componentType: 'Light',
          fieldPath: '_intensity',
          dryRun: true
        })
      )
    })

    it('should validate objectReference payloads', () => {
      assert.throws(
        () =>
          handler.validate({
            gameObjectPath: '/Light',
            componentType: 'Light',
            fieldPath: '_intensity',
            value: 1,
            objectReference: {}
          }),
        /objectReference requires assetPath or guid/
      )

      assert.doesNotThrow(() =>
        handler.validate({
          gameObjectPath: '/Light',
          componentType: 'Light',
          fieldPath: '_intensity',
          value: 1,
          objectReference: { assetPath: 'Assets/Materials/Test.mat' }
        })
      )
    })
  })

  describe('execute', () => {
    it('should send command with normalized field path and defaults', async () => {
      const params = {
        gameObjectPath: '/Player/Gun',
        componentType: 'GunController',
        fieldPath: 'settings.burstDelays[1]',
        value: 0.35
      }

      const result = await handler.execute(params)

      assert.equal(result.success, true)
      assert.equal(mockConnection.sendCommand.mock.calls.length, 1)

      const [commandName, commandArgs] = mockConnection.sendCommand.mock.calls[0].arguments
      assert.equal(commandName, 'set_component_field')
      assert.equal(commandArgs.scope, 'scene')
      assert.equal(commandArgs.componentType, 'GunController')
      assert.equal(commandArgs.fieldPath, 'settings.burstDelays[1]')
      assert.equal(commandArgs.serializedPropertyPath, 'settings.burstDelays.Array.data[1]')
      assert.equal(commandArgs.valueType, 'float')
    })

    it('should pass through explicit valueType and prefab scope', async () => {
      const params = {
        scope: 'prefabAsset',
        prefabAssetPath: 'Assets/Prefabs/Enemy.prefab',
        prefabObjectPath: '/Enemy',
        componentType: 'EnemyAI',
        componentIndex: 1,
        fieldPath: 'm_Speed',
        value: 5,
        valueType: 'int',
        applyPrefabChanges: false
      }

      await handler.execute(params)

      assert.equal(mockConnection.sendCommand.mock.calls.length, 1)
      const [, commandArgs] = mockConnection.sendCommand.mock.calls[0].arguments
      assert.equal(commandArgs.scope, 'prefabAsset')
      assert.equal(commandArgs.prefabAssetPath, 'Assets/Prefabs/Enemy.prefab')
      assert.equal(commandArgs.prefabObjectPath, '/Enemy')
      assert.equal(commandArgs.componentIndex, 1)
      assert.equal(commandArgs.valueType, 'int')
      assert.equal(commandArgs.applyPrefabChanges, false)
    })

    it('should include runtime flag when provided', async () => {
      const params = {
        gameObjectPath: '/Runtime/Object',
        componentType: 'TestComponent',
        fieldPath: '_value',
        value: 10,
        runtime: true
      }

      await handler.execute(params)

      const [, commandArgs] = mockConnection.sendCommand.mock.calls[0].arguments
      assert.equal(commandArgs.runtime, true)
    })

    it('should throw when Unity responds with error', async () => {
      mockConnection.sendCommand.mock.mockImplementation(async () => ({
        error: 'Failed to set field'
      }))

      await assert.rejects(
        handler.execute({
          gameObjectPath: '/Player',
          componentType: 'PlayerController',
          fieldPath: '_speed',
          value: 7
        }),
        /Failed to set field/
      )
    })
  })
})
