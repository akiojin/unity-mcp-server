import { BaseToolHandler } from '../base/BaseToolHandler.js';

/**
 * Handler for creating C# scripts in Unity
 */
export class CreateScriptToolHandler extends BaseToolHandler {
  constructor(unityConnection) {
    super(
      'create_script',
      'Create a new C# script in Unity project',
      {
        type: 'object',
        properties: {
          scriptName: {
            type: 'string',
            description: 'Name of the script (without .cs extension)'
          },
          scriptType: {
            type: 'string',
            enum: ['MonoBehaviour', 'ScriptableObject', 'Editor', 'StaticClass', 'Interface'],
            default: 'MonoBehaviour',
            description: 'Type of script to create'
          },
          path: {
            type: 'string',
            default: 'Assets/Scripts/',
            description: 'Directory path where script will be created'
          },
          namespace: {
            type: 'string',
            default: '',
            description: 'Namespace for the script'
          }
        },
        required: ['scriptName']
      }
    );
    
    this.unityConnection = unityConnection;
  }

  /**
   * Validates the input parameters
   * @param {Object} params - The input parameters
   * @throws {Error} If validation fails
   */
  validate(params) {
    const { scriptName, scriptType, path, namespace } = params;

    // Validate script name
    if (!scriptName || scriptName.trim() === '') {
      throw new Error('scriptName cannot be empty');
    }

    // Validate C# class name format
    const classNameRegex = /^[A-Za-z_][A-Za-z0-9_]*$/;
    if (!classNameRegex.test(scriptName)) {
      throw new Error('scriptName must be a valid C# class name (alphanumeric and underscore only, cannot start with number)');
    }

    // Validate script type
    if (scriptType && !['MonoBehaviour', 'ScriptableObject', 'Editor', 'StaticClass', 'Interface'].includes(scriptType)) {
      throw new Error('scriptType must be one of: MonoBehaviour, ScriptableObject, Editor, StaticClass, Interface');
    }

    // Validate path
    if (path && !path.startsWith('Assets/')) {
      throw new Error('path must start with Assets/');
    }

    // Validate namespace
    if (namespace && namespace.trim() !== '') {
      const namespaceRegex = /^[A-Za-z_][A-Za-z0-9_.]*$/;
      if (!namespaceRegex.test(namespace)) {
        throw new Error('namespace must be a valid C# namespace (alphanumeric, underscore, and dots only)');
      }
    }
  }

  /**
   * Executes the script creation
   * @param {Object} params - The input parameters
   * @returns {Promise<Object>} The result of the script creation
   */
  async execute(params) {
    const {
      scriptName,
      scriptType = 'MonoBehaviour',
      path = 'Assets/Scripts/',
      namespace = ''
    } = params;

    // Ensure connection to Unity
    if (!this.unityConnection.isConnected()) {
      await this.unityConnection.connect();
    }

    // Generate script content
    const scriptContent = this.generateScriptContent(scriptName, scriptType, namespace);
    
    // Prepare command parameters
    const commandParams = {
      scriptName,
      scriptType,
      path: path.endsWith('/') ? path : path + '/',
      fileName: `${scriptName}.cs`,
      namespace,
      scriptContent
    };

    // Send command to Unity
    const response = await this.unityConnection.sendCommand('create_script', commandParams);

    // Handle Unity response
    if (response.success === false) {
      throw new Error(response.error || 'Failed to create script');
    }

    return {
      scriptPath: response.scriptPath,
      message: response.message || 'Script created successfully'
    };
  }

  /**
   * Generates the C# script content based on type
   * @param {string} scriptName - Name of the script
   * @param {string} scriptType - Type of script
   * @param {string} namespace - Namespace for the script
   * @returns {string} Generated script content
   */
  generateScriptContent(scriptName, scriptType, namespace) {
    const templates = {
      MonoBehaviour: this.generateMonoBehaviourTemplate,
      ScriptableObject: this.generateScriptableObjectTemplate,
      Editor: this.generateEditorTemplate,
      StaticClass: this.generateStaticClassTemplate,
      Interface: this.generateInterfaceTemplate
    };

    const generateTemplate = templates[scriptType];
    if (!generateTemplate) {
      throw new Error(`Unknown script type: ${scriptType}`);
    }

    return generateTemplate.call(this, scriptName, namespace);
  }

  /**
   * Generates MonoBehaviour script template
   */
  generateMonoBehaviourTemplate(scriptName, namespace) {
    const usings = 'using UnityEngine;';
    const classDeclaration = `public class ${scriptName} : MonoBehaviour`;
    const classBody = `{
    // Start is called before the first frame update
    void Start()
    {
        
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}`;

    return this.wrapInNamespace(usings, classDeclaration, classBody, namespace);
  }

  /**
   * Generates ScriptableObject script template
   */
  generateScriptableObjectTemplate(scriptName, namespace) {
    const usings = 'using UnityEngine;';
    const classDeclaration = `[CreateAssetMenu(fileName = "New ${scriptName}", menuName = "${scriptName}")]\npublic class ${scriptName} : ScriptableObject`;
    const classBody = `{
    // Add your ScriptableObject properties here
}`;

    return this.wrapInNamespace(usings, classDeclaration, classBody, namespace);
  }

  /**
   * Generates Editor script template
   */
  generateEditorTemplate(scriptName, namespace) {
    const usings = 'using UnityEngine;\nusing UnityEditor;';
    const targetClass = scriptName.replace('Editor', '');
    const classDeclaration = `[CustomEditor(typeof(${targetClass}))]\npublic class ${scriptName} : Editor`;
    const classBody = `{
    public override void OnInspectorGUI()
    {
        DrawDefaultInspector();
        
        // Add custom inspector GUI here
    }
}`;

    return this.wrapInNamespace(usings, classDeclaration, classBody, namespace);
  }

  /**
   * Generates static class template
   */
  generateStaticClassTemplate(scriptName, namespace) {
    const usings = 'using UnityEngine;';
    const classDeclaration = `public static class ${scriptName}`;
    const classBody = `{
    // Add your static methods and properties here
}`;

    return this.wrapInNamespace(usings, classDeclaration, classBody, namespace);
  }

  /**
   * Generates interface template
   */
  generateInterfaceTemplate(scriptName, namespace) {
    const usings = '';
    const classDeclaration = `public interface ${scriptName}`;
    const classBody = `{
    // Define your interface methods here
}`;

    return this.wrapInNamespace(usings, classDeclaration, classBody, namespace);
  }

  /**
   * Wraps content in namespace if provided
   */
  wrapInNamespace(usings, classDeclaration, classBody, namespace) {
    if (namespace && namespace.trim() !== '') {
      return `${usings}

namespace ${namespace}
{
    ${classDeclaration}
    ${classBody}
}`;
    } else {
      return `${usings}

${classDeclaration}
${classBody}`;
    }
  }
}