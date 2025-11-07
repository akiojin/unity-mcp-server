import { BaseToolHandler } from '../base/BaseToolHandler.js'

const VALUE_TYPE_ENUM = [
  'auto',
  'bool',
  'int',
  'long',
  'float',
  'double',
  'string',
  'color',
  'vector2',
  'vector3',
  'vector4',
  'vector2Int',
  'vector3Int',
  'quaternion',
  'rect',
  'rectInt',
  'bounds',
  'boundsInt',
  'enum',
  'objectReference',
  'array',
  'json',
  'null'
]

function resolveScope(params) {
  const hasSceneTarget =
    typeof params.gameObjectPath === 'string' && params.gameObjectPath.length > 0
  const hasPrefabTarget =
    typeof params.prefabAssetPath === 'string' && params.prefabAssetPath.length > 0
  const rawScope = params.scope ?? 'auto'

  if (rawScope === 'auto') {
    if (hasPrefabTarget && !hasSceneTarget) {
      return 'prefabAsset'
    }
    return hasSceneTarget ? 'scene' : 'auto'
  }

  return rawScope
}

function normalizeFieldPath(fieldPath) {
  if (!fieldPath || typeof fieldPath !== 'string') {
    return fieldPath
  }

  let needsNormalization = false
  for (let i = 0; i < fieldPath.length; i += 1) {
    if (fieldPath[i] === '[') {
      needsNormalization = true
      break
    }
  }

  if (!needsNormalization) {
    return fieldPath
  }

  let result = ''
  let i = 0

  while (i < fieldPath.length) {
    const char = fieldPath[i]
    if (char === '[') {
      let indexBuffer = ''
      i += 1
      while (i < fieldPath.length && fieldPath[i] !== ']') {
        indexBuffer += fieldPath[i]
        i += 1
      }
      // Skip closing bracket
      if (i < fieldPath.length && fieldPath[i] === ']') {
        i += 1
      }

      if (indexBuffer.length > 0) {
        result += `.Array.data[${indexBuffer}]`
      } else {
        result += '.Array.data[0]'
      }
    } else {
      result += char
      i += 1
    }
  }

  return result
}

function inferValueType(value) {
  if (value === null) {
    return 'null'
  }

  const valueType = typeof value
  switch (valueType) {
    case 'boolean':
      return 'bool'
    case 'number':
      return Number.isInteger(value) ? 'int' : 'float'
    case 'string':
      return 'string'
    case 'object':
      if (Array.isArray(value)) {
        return 'array'
      }

      if (['r', 'g', 'b'].every(key => Object.prototype.hasOwnProperty.call(value, key))) {
        return Object.prototype.hasOwnProperty.call(value, 'a') ? 'color' : 'vector3'
      }

      if (['x', 'y', 'z', 'w'].every(key => Object.prototype.hasOwnProperty.call(value, key))) {
        return 'vector4'
      }

      if (['x', 'y', 'z'].every(key => Object.prototype.hasOwnProperty.call(value, key))) {
        return 'vector3'
      }

      if (['x', 'y'].every(key => Object.prototype.hasOwnProperty.call(value, key))) {
        return 'vector2'
      }

      return 'json'
    default:
      return 'auto'
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

export class ComponentFieldSetToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'component_field_set',
      'Update a serialized field on a component (scene hierarchy, prefab stage, or prefab asset).',
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          scope: {
            type: 'string',
            enum: ['auto', 'scene', 'prefabStage', 'prefabAsset'],
            description:
              'Explicit scope for the operation. Use auto (default) to detect automatically.'
          },
          gameObjectPath: {
            type: 'string',
            description:
              'Absolute path to the target GameObject (e.g., "/Player/Weapon"). Required unless prefabAssetPath is provided.'
          },
          prefabAssetPath: {
            type: 'string',
            description: 'Asset path to the prefab to edit (e.g., "Assets/Prefabs/Enemy.prefab").'
          },
          prefabObjectPath: {
            type: 'string',
            description:
              'Path to the object inside the prefab asset (defaults to the prefab root when omitted).'
          },
          componentType: {
            type: 'string',
            description: 'Component type to edit (short name or fully qualified name).'
          },
          componentIndex: {
            type: 'integer',
            minimum: 0,
            description:
              'Component index when multiple components of the same type are present. Default: 0.'
          },
          fieldPath: {
            type: 'string',
            description:
              'Serialized field path to update. Supports dot and bracket notation (e.g., "settings.speed", "items[0].damage").'
          },
          value: {
            description:
              'New value for the field. Accepts JSON scalars, objects, or arrays depending on the target type.'
          },
          valueType: {
            type: 'string',
            enum: VALUE_TYPE_ENUM,
            description: 'Type hint for the value. Defaults to auto detection.'
          },
          enumValue: {
            type: 'string',
            description:
              'Enum member name when setting enum fields (optional when value is already a string).'
          },
          objectReference: {
            type: 'object',
            additionalProperties: false,
            properties: {
              assetPath: {
                type: 'string',
                description: 'AssetDatabase path to load as an object reference.'
              },
              guid: {
                type: 'string',
                description: 'GUID of the asset to reference.'
              }
            },
            description:
              'Explicit object reference payload. Provide assetPath or guid when setting object references.'
          },
          runtime: {
            type: 'boolean',
            description: 'Allow updates while Unity is in Play Mode (default: false).'
          },
          dryRun: {
            type: 'boolean',
            description: 'Validate target resolution and preview the change without applying it.'
          },
          applyPrefabChanges: {
            type: 'boolean',
            description:
              'When editing prefab assets, save the modified prefab asset. Defaults to true.'
          },
          createUndo: {
            type: 'boolean',
            description: 'Record an undo entry when modifying scene objects. Defaults to true.'
          },
          markSceneDirty: {
            type: 'boolean',
            description:
              'Mark the owning scene dirty when modifying scene objects. Defaults to true.'
          }
        },
        required: ['componentType', 'fieldPath']
      }
    )

    this.unityConnection = unityConnection
  }

  validate(params) {
    super.validate(params)

    const scope = resolveScope(params)
    const hasSceneTarget =
      typeof params.gameObjectPath === 'string' && params.gameObjectPath.length > 0
    const hasPrefabTarget =
      typeof params.prefabAssetPath === 'string' && params.prefabAssetPath.length > 0

    if (!hasSceneTarget && !hasPrefabTarget) {
      throw new Error('Either gameObjectPath or prefabAssetPath must be provided')
    }

    if (scope === 'prefabAsset' && !hasPrefabTarget) {
      throw new Error('prefabAssetPath is required when scope is set to prefabAsset')
    }

    if (scope !== 'prefabAsset' && !hasSceneTarget && !params.dryRun) {
      throw new Error('gameObjectPath is required when editing scene or prefab stage objects')
    }

    if (!params.dryRun && !Object.prototype.hasOwnProperty.call(params, 'value')) {
      throw new Error('value is required unless dryRun is true')
    }

    if (params.componentIndex !== undefined && !Number.isInteger(params.componentIndex)) {
      throw new Error('componentIndex must be an integer when provided')
    }

    if (params.objectReference !== undefined) {
      if (!isPlainObject(params.objectReference)) {
        throw new Error('objectReference must be an object when provided')
      }

      const { assetPath, guid } = params.objectReference
      if (!assetPath && !guid) {
        throw new Error('objectReference requires assetPath or guid')
      }
    }

    if (params.runtime !== undefined && typeof params.runtime !== 'boolean') {
      throw new Error('runtime must be a boolean when provided')
    }
  }

  buildCommandParams(params) {
    const command = {}

    command.scope = resolveScope(params)

    if (typeof params.gameObjectPath === 'string') {
      command.gameObjectPath = params.gameObjectPath
    }

    if (typeof params.prefabAssetPath === 'string') {
      command.prefabAssetPath = params.prefabAssetPath
    }

    if (typeof params.prefabObjectPath === 'string') {
      command.prefabObjectPath = params.prefabObjectPath
    }

    command.componentType = params.componentType
    command.fieldPath = params.fieldPath

    const normalizedPath = normalizeFieldPath(params.fieldPath)
    if (normalizedPath && normalizedPath !== params.fieldPath) {
      command.serializedPropertyPath = normalizedPath
    }

    if (Object.prototype.hasOwnProperty.call(params, 'componentIndex')) {
      command.componentIndex = params.componentIndex
    }

    if (Object.prototype.hasOwnProperty.call(params, 'value')) {
      command.value = params.value
    }

    if (params.valueType) {
      command.valueType = params.valueType
    } else if (Object.prototype.hasOwnProperty.call(params, 'value')) {
      command.valueType = inferValueType(params.value)
    } else {
      command.valueType = 'auto'
    }

    if (typeof params.enumValue === 'string') {
      command.enumValue = params.enumValue
    }

    if (params.objectReference) {
      command.objectReference = params.objectReference
    }

    if (params.runtime !== undefined) {
      command.runtime = Boolean(params.runtime)
    }

    command.dryRun = Boolean(params.dryRun)

    if (params.applyPrefabChanges !== undefined) {
      command.applyPrefabChanges = Boolean(params.applyPrefabChanges)
    }

    if (params.createUndo !== undefined) {
      command.createUndo = Boolean(params.createUndo)
    }

    if (params.markSceneDirty !== undefined) {
      command.markSceneDirty = Boolean(params.markSceneDirty)
    }

    return command
  }

  async execute(params) {
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect()
    }

    const commandParams = this.buildCommandParams(params)
    const response = await this.unityConnection.sendCommand('set_component_field', commandParams)

    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response from Unity')
    }

    if (response.error) {
      throw new Error(response.error)
    }

    return response
  }

  getExamples() {
    return {
      updatePrivateField: {
        description: 'Update a private [SerializeField] float on a scene object.',
        params: {
          gameObjectPath: '/Player/Weapon',
          componentType: 'WeaponController',
          fieldPath: '_damageMultiplier',
          value: 1.35,
          valueType: 'float'
        }
      },
      updatePrefabStruct: {
        description: 'Modify a nested struct value inside a prefab asset.',
        params: {
          scope: 'prefabAsset',
          prefabAssetPath: 'Assets/Prefabs/Enemy.prefab',
          prefabObjectPath: '/EnemyBoss',
          componentType: 'EnemyAIController',
          fieldPath: 'behaviorSettings.alert.radius',
          value: 12.5,
          valueType: 'float'
        }
      },
      updateArrayElement: {
        description: 'Set the second material slot on a renderer prefab instance.',
        params: {
          gameObjectPath: '/Environment/Bridge',
          componentType: 'MeshRenderer',
          componentIndex: 0,
          fieldPath: 'm_Materials[1]',
          valueType: 'objectReference',
          objectReference: {
            assetPath: 'Assets/Materials/BridgeAccent.mat'
          }
        }
      }
    }
  }
}
