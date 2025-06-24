using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEditor;
using Newtonsoft.Json.Linq;

namespace UnityEditorMCP.Handlers
{
    /// <summary>
    /// Handles asset management operations including prefabs, materials, and imports
    /// </summary>
    public static class AssetManagementHandler
    {
        /// <summary>
        /// Creates a new prefab from a GameObject or from scratch
        /// </summary>
        public static object CreatePrefab(JObject parameters)
        {
            try
            {
                // Parse parameters
                string gameObjectPath = parameters["gameObjectPath"]?.ToString();
                string prefabPath = parameters["prefabPath"]?.ToString();
                bool createFromTemplate = parameters["createFromTemplate"]?.ToObject<bool>() ?? false;
                bool overwrite = parameters["overwrite"]?.ToObject<bool>() ?? false;

                // Validate prefab path
                if (string.IsNullOrEmpty(prefabPath))
                {
                    return new { error = "prefabPath is required" };
                }

                if (!prefabPath.StartsWith("Assets/") || !prefabPath.EndsWith(".prefab"))
                {
                    return new { error = "prefabPath must start with Assets/ and end with .prefab" };
                }

                // Check if prefab already exists
                if (AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath) != null && !overwrite)
                {
                    return new { error = $"Prefab already exists at {prefabPath}. Set overwrite to true to replace it." };
                }

                // Ensure directory exists
                string directory = Path.GetDirectoryName(prefabPath);
                if (!AssetDatabase.IsValidFolder(directory))
                {
                    Directory.CreateDirectory(directory);
                    AssetDatabase.Refresh();
                }

                GameObject prefabAsset = null;

                if (createFromTemplate)
                {
                    // Create empty prefab
                    GameObject emptyGO = new GameObject("Empty");
                    prefabAsset = PrefabUtility.SaveAsPrefabAsset(emptyGO, prefabPath);
                    UnityEngine.Object.DestroyImmediate(emptyGO);
                }
                else if (!string.IsNullOrEmpty(gameObjectPath))
                {
                    // Find the GameObject
                    GameObject sourceObject = GameObject.Find(gameObjectPath);
                    if (sourceObject == null)
                    {
                        return new { error = $"GameObject not found at path: {gameObjectPath}" };
                    }

                    // Create prefab from GameObject
                    prefabAsset = PrefabUtility.SaveAsPrefabAssetAndConnect(sourceObject, prefabPath, InteractionMode.UserAction);
                }
                else
                {
                    return new { error = "Either gameObjectPath or createFromTemplate must be specified" };
                }

                if (prefabAsset == null)
                {
                    return new { error = "Failed to create prefab" };
                }

                // Get asset GUID
                string guid = AssetDatabase.AssetPathToGUID(prefabPath);

                return new
                {
                    success = true,
                    prefabPath = prefabPath,
                    guid = guid,
                    message = createFromTemplate ? "Empty prefab created successfully" : "Prefab created successfully"
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[AssetManagementHandler] Error in CreatePrefab: {e.Message}");
                return new { error = $"Failed to create prefab: {e.Message}" };
            }
        }

        /// <summary>
        /// Modifies properties of an existing prefab
        /// </summary>
        public static object ModifyPrefab(JObject parameters)
        {
            try
            {
                // Parse parameters
                string prefabPath = parameters["prefabPath"]?.ToString();
                JObject modifications = parameters["modifications"] as JObject;
                bool applyToInstances = parameters["applyToInstances"]?.ToObject<bool>() ?? true;

                // Validate parameters
                if (string.IsNullOrEmpty(prefabPath))
                {
                    return new { error = "prefabPath is required" };
                }

                if (modifications == null || !modifications.HasValues)
                {
                    return new { error = "modifications object is required and cannot be empty" };
                }

                // Load the prefab
                GameObject prefabAsset = AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath);
                if (prefabAsset == null)
                {
                    return new { error = $"Prefab not found at path: {prefabPath}" };
                }

                // Track modifications
                List<string> modifiedProperties = new List<string>();
                
                // Load prefab contents for editing
                GameObject prefabRoot = PrefabUtility.LoadPrefabContents(prefabPath);
                
                try
                {
                    // Apply modifications
                    foreach (var prop in modifications.Properties())
                    {
                        if (ApplyModificationToGameObject(prefabRoot, prop.Name, prop.Value))
                        {
                            modifiedProperties.Add(prop.Name);
                        }
                    }

                    // Save the modified prefab
                    PrefabUtility.SaveAsPrefabAsset(prefabRoot, prefabPath);
                }
                finally
                {
                    // Unload prefab contents
                    PrefabUtility.UnloadPrefabContents(prefabRoot);
                }

                int affectedInstances = 0;
                
                // Apply to instances if requested
                if (applyToInstances)
                {
                    GameObject[] allObjects = UnityEngine.Object.FindObjectsOfType<GameObject>();
                    foreach (var obj in allObjects)
                    {
                        if (PrefabUtility.GetCorrespondingObjectFromSource(obj) == prefabAsset ||
                            PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(obj) == prefabPath)
                        {
                            PrefabUtility.RevertPrefabInstance(obj, InteractionMode.AutomatedAction);
                            affectedInstances++;
                        }
                    }
                }

                return new
                {
                    success = true,
                    prefabPath = prefabPath,
                    modifiedProperties = modifiedProperties.ToArray(),
                    affectedInstances = affectedInstances,
                    message = applyToInstances ? 
                        "Prefab modified successfully" : 
                        "Prefab modified without updating instances"
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[AssetManagementHandler] Error in ModifyPrefab: {e.Message}");
                return new { error = $"Failed to modify prefab: {e.Message}" };
            }
        }

        /// <summary>
        /// Instantiates a prefab in the scene
        /// </summary>
        public static object InstantiatePrefab(JObject parameters)
        {
            try
            {
                // Parse parameters
                string prefabPath = parameters["prefabPath"]?.ToString();
                var position = ParseVector3(parameters["position"]) ?? Vector3.zero;
                var rotation = ParseVector3(parameters["rotation"]) ?? Vector3.zero;
                string parentPath = parameters["parent"]?.ToString();
                string name = parameters["name"]?.ToString();

                // Validate prefab path
                if (string.IsNullOrEmpty(prefabPath))
                {
                    return new { error = "prefabPath is required" };
                }

                // Load the prefab
                GameObject prefabAsset = AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath);
                if (prefabAsset == null)
                {
                    return new { error = $"Prefab not found at path: {prefabPath}" };
                }

                // Find parent if specified
                GameObject parent = null;
                if (!string.IsNullOrEmpty(parentPath))
                {
                    parent = GameObject.Find(parentPath);
                    if (parent == null)
                    {
                        return new { error = $"Parent GameObject not found at path: {parentPath}" };
                    }
                }

                // Instantiate the prefab
                GameObject instance = PrefabUtility.InstantiatePrefab(prefabAsset) as GameObject;
                if (instance == null)
                {
                    return new { error = "Failed to instantiate prefab" };
                }

                // Set transform
                instance.transform.position = position;
                instance.transform.rotation = Quaternion.Euler(rotation);
                
                // Set parent
                if (parent != null)
                {
                    instance.transform.SetParent(parent.transform, true);
                }

                // Set name if provided
                if (!string.IsNullOrEmpty(name))
                {
                    instance.name = name;
                }

                // Register undo
                Undo.RegisterCreatedObjectUndo(instance, "Instantiate Prefab");

                // Get the path to the created object
                string gameObjectPath = GetGameObjectPath(instance);

                return new
                {
                    success = true,
                    gameObjectPath = gameObjectPath,
                    prefabPath = prefabPath,
                    position = new { x = position.x, y = position.y, z = position.z },
                    rotation = new { x = rotation.x, y = rotation.y, z = rotation.z },
                    parent = parentPath,
                    name = instance.name,
                    message = "Prefab instantiated successfully"
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[AssetManagementHandler] Error in InstantiatePrefab: {e.Message}");
                return new { error = $"Failed to instantiate prefab: {e.Message}" };
            }
        }

        /// <summary>
        /// Creates a new material with specified shader and properties
        /// </summary>
        public static object CreateMaterial(JObject parameters)
        {
            try
            {
                // Parse parameters
                string materialPath = parameters["materialPath"]?.ToString();
                string shader = parameters["shader"]?.ToString() ?? "Standard";
                JObject properties = parameters["properties"] as JObject;
                string copyFrom = parameters["copyFrom"]?.ToString();
                bool overwrite = parameters["overwrite"]?.ToObject<bool>() ?? false;

                // Validate material path
                if (string.IsNullOrEmpty(materialPath))
                {
                    return new { error = "materialPath is required" };
                }

                if (!materialPath.StartsWith("Assets/") || !materialPath.EndsWith(".mat"))
                {
                    return new { error = "materialPath must start with Assets/ and end with .mat" };
                }

                // Check if material already exists
                if (AssetDatabase.LoadAssetAtPath<Material>(materialPath) != null && !overwrite)
                {
                    return new { error = $"Material already exists at {materialPath}. Set overwrite to true to replace it." };
                }

                // Ensure directory exists
                string directory = Path.GetDirectoryName(materialPath);
                if (!AssetDatabase.IsValidFolder(directory))
                {
                    Directory.CreateDirectory(directory);
                    AssetDatabase.Refresh();
                }

                Material material = null;
                List<string> propertiesSet = new List<string>();

                if (!string.IsNullOrEmpty(copyFrom))
                {
                    // Copy from existing material
                    Material sourceMaterial = AssetDatabase.LoadAssetAtPath<Material>(copyFrom);
                    if (sourceMaterial == null)
                    {
                        return new { error = $"Source material not found at: {copyFrom}" };
                    }

                    material = new Material(sourceMaterial);
                }
                else
                {
                    // Find shader
                    Shader shaderAsset = Shader.Find(shader);
                    if (shaderAsset == null)
                    {
                        return new { error = $"Shader not found: {shader}" };
                    }

                    material = new Material(shaderAsset);
                }

                // Apply properties if provided
                if (properties != null && properties.HasValues)
                {
                    foreach (var prop in properties.Properties())
                    {
                        if (ApplyMaterialProperty(material, prop.Name, prop.Value))
                        {
                            propertiesSet.Add(prop.Name);
                        }
                    }
                }

                // Save the material
                AssetDatabase.CreateAsset(material, materialPath);
                AssetDatabase.SaveAssets();

                // Get asset GUID
                string guid = AssetDatabase.AssetPathToGUID(materialPath);

                return new
                {
                    success = true,
                    materialPath = materialPath,
                    shader = material.shader.name,
                    guid = guid,
                    propertiesSet = propertiesSet.ToArray(),
                    copiedFrom = copyFrom,
                    message = !string.IsNullOrEmpty(copyFrom) ? 
                        "Material created from copy successfully" : 
                        "Material created successfully"
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[AssetManagementHandler] Error in CreateMaterial: {e.Message}");
                return new { error = $"Failed to create material: {e.Message}" };
            }
        }

        /// <summary>
        /// Modifies properties of an existing material
        /// </summary>
        public static object ModifyMaterial(JObject parameters)
        {
            try
            {
                // Parse parameters
                string materialPath = parameters["materialPath"]?.ToString();
                JObject properties = parameters["properties"] as JObject;
                string shader = parameters["shader"]?.ToString();

                // Validate material path
                if (string.IsNullOrEmpty(materialPath))
                {
                    return new { error = "materialPath is required" };
                }

                if (!materialPath.StartsWith("Assets/") || !materialPath.EndsWith(".mat"))
                {
                    return new { error = "materialPath must start with Assets/ and end with .mat" };
                }

                // Validate properties
                if (properties == null || !properties.HasValues)
                {
                    return new { error = "properties object is required and cannot be empty" };
                }

                // Load the material
                Material material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
                if (material == null)
                {
                    return new { error = $"Material not found at path: {materialPath}" };
                }

                List<string> propertiesModified = new List<string>();
                bool shaderChanged = false;
                string previousShader = material.shader.name;

                // Change shader if specified
                if (!string.IsNullOrEmpty(shader))
                {
                    Shader newShader = Shader.Find(shader);
                    if (newShader == null)
                    {
                        return new { error = $"Shader not found: {shader}" };
                    }

                    if (material.shader != newShader)
                    {
                        material.shader = newShader;
                        shaderChanged = true;
                    }
                }

                // Apply property modifications
                foreach (var prop in properties.Properties())
                {
                    if (ApplyMaterialProperty(material, prop.Name, prop.Value))
                    {
                        propertiesModified.Add(prop.Name);
                    }
                }

                // Mark as dirty to ensure changes are saved
                EditorUtility.SetDirty(material);
                AssetDatabase.SaveAssets();

                return new
                {
                    success = true,
                    materialPath = materialPath,
                    propertiesModified = propertiesModified.ToArray(),
                    shaderChanged = shaderChanged,
                    previousShader = shaderChanged ? previousShader : null,
                    newShader = shaderChanged ? shader : null,
                    message = "Material modified successfully"
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[AssetManagementHandler] Error in ModifyMaterial: {e.Message}");
                return new { error = $"Failed to modify material: {e.Message}" };
            }
        }

        #region Helper Methods

        private static bool ApplyMaterialProperty(Material material, string propertyName, JToken value)
        {
            try
            {
                // Check if property exists
                if (!material.HasProperty(propertyName))
                {
                    Debug.LogWarning($"Material does not have property: {propertyName}");
                    return false;
                }

                // Get property type and apply value
                int propId = Shader.PropertyToID(propertyName);
                
                // Try to determine property type by value
                if (value.Type == JTokenType.Array)
                {
                    var array = value as JArray;
                    if (array != null)
                    {
                        if (array.Count == 4)
                        {
                            // Color property
                            material.SetColor(propId, new Color(
                                array[0].ToObject<float>(),
                                array[1].ToObject<float>(),
                                array[2].ToObject<float>(),
                                array[3].ToObject<float>()
                            ));
                            return true;
                        }
                        else if (array.Count == 3)
                        {
                            // Vector3 property
                            material.SetVector(propId, new Vector4(
                                array[0].ToObject<float>(),
                                array[1].ToObject<float>(),
                                array[2].ToObject<float>(),
                                0
                            ));
                            return true;
                        }
                        else if (array.Count == 2)
                        {
                            // Vector2 property
                            material.SetVector(propId, new Vector4(
                                array[0].ToObject<float>(),
                                array[1].ToObject<float>(),
                                0, 0
                            ));
                            return true;
                        }
                    }
                }
                else if (value.Type == JTokenType.Float || value.Type == JTokenType.Integer)
                {
                    // Float property
                    material.SetFloat(propId, value.ToObject<float>());
                    return true;
                }
                else if (value.Type == JTokenType.String)
                {
                    // Could be a texture reference
                    string texturePath = value.ToString();
                    if (texturePath.StartsWith("Assets/"))
                    {
                        Texture texture = AssetDatabase.LoadAssetAtPath<Texture>(texturePath);
                        if (texture != null)
                        {
                            material.SetTexture(propId, texture);
                            return true;
                        }
                    }
                }
                else if (value.Type == JTokenType.Boolean)
                {
                    // Boolean as float (0 or 1)
                    material.SetFloat(propId, value.ToObject<bool>() ? 1f : 0f);
                    return true;
                }

                return false;
            }
            catch (Exception e)
            {
                Debug.LogWarning($"Failed to set material property {propertyName}: {e.Message}");
                return false;
            }
        }

        private static Vector3? ParseVector3(JToken token)
        {
            if (token == null) return null;
            
            try
            {
                float x = token["x"]?.ToObject<float>() ?? 0f;
                float y = token["y"]?.ToObject<float>() ?? 0f;
                float z = token["z"]?.ToObject<float>() ?? 0f;
                return new Vector3(x, y, z);
            }
            catch
            {
                return null;
            }
        }

        private static bool ApplyModificationToGameObject(GameObject target, string propertyName, JToken value)
        {
            try
            {
                switch (propertyName.ToLower())
                {
                    case "name":
                        target.name = value.ToString();
                        return true;

                    case "tag":
                        target.tag = value.ToString();
                        return true;

                    case "layer":
                        int layer = value.ToObject<int>();
                        if (layer >= 0 && layer < 32)
                        {
                            target.layer = layer;
                            return true;
                        }
                        break;

                    case "active":
                    case "isactive":
                        target.SetActive(value.ToObject<bool>());
                        return true;

                    case "transform":
                        var transformData = value as JObject;
                        if (transformData != null)
                        {
                            if (transformData["position"] != null)
                            {
                                var pos = ParseVector3(transformData["position"]);
                                if (pos.HasValue) target.transform.localPosition = pos.Value;
                            }
                            if (transformData["rotation"] != null)
                            {
                                var rot = ParseVector3(transformData["rotation"]);
                                if (rot.HasValue) target.transform.localRotation = Quaternion.Euler(rot.Value);
                            }
                            if (transformData["scale"] != null)
                            {
                                var scale = ParseVector3(transformData["scale"]);
                                if (scale.HasValue) target.transform.localScale = scale.Value;
                            }
                            return true;
                        }
                        break;

                    case "components":
                        var componentsData = value as JObject;
                        if (componentsData != null)
                        {
                            foreach (var comp in componentsData.Properties())
                            {
                                ApplyComponentModification(target, comp.Name, comp.Value as JObject);
                            }
                            return true;
                        }
                        break;
                }

                return false;
            }
            catch
            {
                return false;
            }
        }

        private static void ApplyComponentModification(GameObject target, string componentType, JObject properties)
        {
            if (properties == null) return;

            var component = target.GetComponent(componentType);
            if (component == null) return;

            var type = component.GetType();
            
            foreach (var prop in properties.Properties())
            {
                try
                {
                    var field = type.GetField(prop.Name);
                    if (field != null && field.IsPublic)
                    {
                        field.SetValue(component, prop.Value.ToObject(field.FieldType));
                        continue;
                    }

                    var property = type.GetProperty(prop.Name);
                    if (property != null && property.CanWrite)
                    {
                        property.SetValue(component, prop.Value.ToObject(property.PropertyType));
                    }
                }
                catch (Exception e)
                {
                    Debug.LogWarning($"Failed to set {prop.Name} on {componentType}: {e.Message}");
                }
            }
        }

        private static string GetGameObjectPath(GameObject obj)
        {
            string path = "/" + obj.name;
            Transform parent = obj.transform.parent;
            
            while (parent != null)
            {
                path = "/" + parent.name + path;
                parent = parent.parent;
            }
            
            return path;
        }

        #endregion
    }
}