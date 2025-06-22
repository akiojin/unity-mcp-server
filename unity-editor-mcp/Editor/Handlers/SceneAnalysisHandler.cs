using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using UnityEngine;
using UnityEditor;
using Newtonsoft.Json.Linq;

namespace UnityEditorMCP.Handlers
{
    /// <summary>
    /// Handles Scene Analysis operations - deep inspection of GameObjects and components
    /// </summary>
    public static class SceneAnalysisHandler
    {
        /// <summary>
        /// Gets detailed information about a specific GameObject
        /// </summary>
        public static object GetGameObjectDetails(JObject parameters)
        {
            try
            {
                // Get parameters
                var gameObjectName = parameters["gameObjectName"]?.ToString();
                var path = parameters["path"]?.ToString();
                var includeChildren = parameters["includeChildren"]?.ToObject<bool>() ?? false;
                var includeComponents = parameters["includeComponents"]?.ToObject<bool>() ?? true;
                var includeMaterials = parameters["includeMaterials"]?.ToObject<bool>() ?? false;
                var maxDepth = parameters["maxDepth"]?.ToObject<int>() ?? 3;

                // Validate input
                if (string.IsNullOrEmpty(gameObjectName) && string.IsNullOrEmpty(path))
                {
                    return new { error = "Either gameObjectName or path must be provided" };
                }

                // Find the GameObject
                GameObject targetObject = null;
                
                if (!string.IsNullOrEmpty(path))
                {
                    targetObject = GameObject.Find(path);
                }
                else if (!string.IsNullOrEmpty(gameObjectName))
                {
                    // Try to find by name
                    targetObject = GameObject.Find(gameObjectName);
                    
                    // If not found in active objects, search all
                    if (targetObject == null)
                    {
                        var allObjects = Resources.FindObjectsOfTypeAll<GameObject>();
                        targetObject = allObjects.FirstOrDefault(go => go.name == gameObjectName);
                    }
                }

                if (targetObject == null)
                {
                    var identifier = !string.IsNullOrEmpty(path) ? path : gameObjectName;
                    return new { error = $"GameObject not found: {identifier}" };
                }

                // Build the result
                var result = new Dictionary<string, object>();
                result["name"] = targetObject.name;
                result["path"] = GetGameObjectPath(targetObject);
                result["isActive"] = targetObject.activeSelf;
                result["isStatic"] = targetObject.isStatic;
                result["tag"] = targetObject.tag;
                result["layer"] = LayerMask.LayerToName(targetObject.layer);

                // Transform information
                var transform = targetObject.transform;
                result["transform"] = new
                {
                    position = SerializeVector3(transform.localPosition),
                    rotation = SerializeVector3(transform.localEulerAngles),
                    scale = SerializeVector3(transform.localScale),
                    worldPosition = SerializeVector3(transform.position)
                };

                // Components
                if (includeComponents)
                {
                    var components = new List<object>();
                    foreach (var component in targetObject.GetComponents<Component>())
                    {
                        if (component == null) continue;
                        
                        var componentData = SerializeComponent(component, includeMaterials);
                        if (componentData != null)
                        {
                            components.Add(componentData);
                        }
                    }
                    result["components"] = components;
                }

                // Children
                if (includeChildren && maxDepth > 0)
                {
                    var children = new List<object>();
                    foreach (Transform child in transform)
                    {
                        var childData = GetChildDetails(child.gameObject, maxDepth - 1, includeComponents, includeMaterials);
                        children.Add(childData);
                    }
                    result["children"] = children;
                }

                // Prefab information
                var prefabInfo = new Dictionary<string, object>();
                var prefabAssetType = PrefabUtility.GetPrefabAssetType(targetObject);
                var prefabInstanceStatus = PrefabUtility.GetPrefabInstanceStatus(targetObject);
                
                prefabInfo["isPrefab"] = prefabAssetType != PrefabAssetType.NotAPrefab;
                prefabInfo["isInstance"] = prefabInstanceStatus == PrefabInstanceStatus.Connected;
                
                if (prefabInfo["isPrefab"].Equals(true))
                {
                    var prefabAsset = PrefabUtility.GetCorrespondingObjectFromSource(targetObject);
                    if (prefabAsset != null)
                    {
                        prefabInfo["prefabPath"] = AssetDatabase.GetAssetPath(prefabAsset);
                    }
                }
                
                result["prefabInfo"] = prefabInfo;

                // Generate summary
                var componentCount = includeComponents ? ((List<object>)result["components"]).Count : 0;
                var childCount = includeChildren ? transform.childCount : 0;
                var summary = $"GameObject \"{targetObject.name}\"";
                
                if (componentCount > 0)
                {
                    summary += $" with {componentCount} component{(componentCount != 1 ? "s" : "")}";
                }
                
                if (childCount > 0)
                {
                    summary += $" and {childCount} child{(childCount != 1 ? "ren" : "")}";
                }
                
                summary += $" at {result["path"]}";
                result["summary"] = summary;

                return result;
            }
            catch (Exception ex)
            {
                return new { error = $"Failed to get GameObject details: {ex.Message}" };
            }
        }

        /// <summary>
        /// Serializes a component with its properties
        /// </summary>
        private static Dictionary<string, object> SerializeComponent(Component component, bool includeMaterials)
        {
            if (component == null) return null;

            var componentData = new Dictionary<string, object>();
            componentData["type"] = component.GetType().Name;

            // Check if component can be enabled/disabled
            var behaviour = component as Behaviour;
            if (behaviour != null)
            {
                componentData["enabled"] = behaviour.enabled;
            }
            else
            {
                var renderer = component as Renderer;
                if (renderer != null)
                {
                    componentData["enabled"] = renderer.enabled;
                }
                else
                {
                    componentData["enabled"] = true;
                }
            }

            // Get properties
            var properties = new Dictionary<string, object>();
            
            // Handle specific component types
            switch (component)
            {
                case Transform t:
                    properties["position"] = SerializeVector3(t.localPosition);
                    properties["rotation"] = SerializeVector3(t.localEulerAngles);
                    properties["scale"] = SerializeVector3(t.localScale);
                    break;
                    
                case MeshRenderer mr:
                    properties["shadowCastingMode"] = mr.shadowCastingMode.ToString();
                    properties["receiveShadows"] = mr.receiveShadows;
                    if (includeMaterials && mr.sharedMaterials != null)
                    {
                        properties["materials"] = mr.sharedMaterials
                            .Where(m => m != null)
                            .Select(m => m.name)
                            .ToArray();
                    }
                    break;
                    
                case Light light:
                    properties["type"] = light.type.ToString();
                    properties["color"] = SerializeColor(light.color);
                    properties["intensity"] = light.intensity;
                    properties["range"] = light.range;
                    properties["shadows"] = light.shadows.ToString();
                    break;
                    
                case Camera cam:
                    properties["fieldOfView"] = cam.fieldOfView;
                    properties["nearClipPlane"] = cam.nearClipPlane;
                    properties["farClipPlane"] = cam.farClipPlane;
                    properties["depth"] = cam.depth;
                    properties["clearFlags"] = cam.clearFlags.ToString();
                    break;
                    
                case Collider col:
                    properties["isTrigger"] = col.isTrigger;
                    if (col is BoxCollider box)
                    {
                        properties["center"] = SerializeVector3(box.center);
                        properties["size"] = SerializeVector3(box.size);
                    }
                    else if (col is SphereCollider sphere)
                    {
                        properties["center"] = SerializeVector3(sphere.center);
                        properties["radius"] = sphere.radius;
                    }
                    else if (col is CapsuleCollider capsule)
                    {
                        properties["center"] = SerializeVector3(capsule.center);
                        properties["radius"] = capsule.radius;
                        properties["height"] = capsule.height;
                        properties["direction"] = capsule.direction;
                    }
                    break;
                    
                case Rigidbody rb:
                    properties["mass"] = rb.mass;
                    properties["drag"] = rb.drag;
                    properties["angularDrag"] = rb.angularDrag;
                    properties["useGravity"] = rb.useGravity;
                    properties["isKinematic"] = rb.isKinematic;
                    break;
                    
                default:
                    // For other components, try to get some basic properties
                    var type = component.GetType();
                    var publicProperties = type.GetProperties(BindingFlags.Public | BindingFlags.Instance);
                    
                    foreach (var prop in publicProperties.Take(10)) // Limit to prevent too much data
                    {
                        try
                        {
                            if (prop.CanRead && IsSerializableType(prop.PropertyType))
                            {
                                var value = prop.GetValue(component);
                                if (value != null)
                                {
                                    properties[prop.Name] = SerializeValue(value);
                                }
                            }
                        }
                        catch
                        {
                            // Skip properties that throw exceptions
                        }
                    }
                    break;
            }

            if (properties.Count > 0)
            {
                componentData["properties"] = properties;
            }

            return componentData;
        }

        /// <summary>
        /// Gets child GameObject details recursively
        /// </summary>
        private static Dictionary<string, object> GetChildDetails(GameObject child, int remainingDepth, bool includeComponents, bool includeMaterials)
        {
            var childData = new Dictionary<string, object>();
            childData["name"] = child.name;
            childData["path"] = GetGameObjectPath(child);
            childData["isActive"] = child.activeSelf;

            if (includeComponents)
            {
                var components = new List<object>();
                foreach (var component in child.GetComponents<Component>())
                {
                    if (component == null) continue;
                    var componentData = new Dictionary<string, object>
                    {
                        ["type"] = component.GetType().Name
                    };
                    components.Add(componentData);
                }
                childData["components"] = components;
            }

            if (remainingDepth > 0 && child.transform.childCount > 0)
            {
                var children = new List<object>();
                foreach (Transform grandchild in child.transform)
                {
                    var grandchildData = GetChildDetails(grandchild.gameObject, remainingDepth - 1, includeComponents, includeMaterials);
                    children.Add(grandchildData);
                }
                childData["children"] = children;
            }

            return childData;
        }

        /// <summary>
        /// Gets the full path of a GameObject
        /// </summary>
        private static string GetGameObjectPath(GameObject obj)
        {
            var path = "/" + obj.name;
            var parent = obj.transform.parent;
            
            while (parent != null)
            {
                path = "/" + parent.name + path;
                parent = parent.parent;
            }
            
            return path;
        }

        /// <summary>
        /// Checks if a type can be serialized
        /// </summary>
        private static bool IsSerializableType(Type type)
        {
            return type.IsPrimitive || 
                   type == typeof(string) || 
                   type == typeof(Vector3) || 
                   type == typeof(Vector2) || 
                   type == typeof(Color) ||
                   type == typeof(Quaternion) ||
                   type.IsEnum;
        }

        /// <summary>
        /// Serializes a value to a JSON-friendly format
        /// </summary>
        private static object SerializeValue(object value)
        {
            switch (value)
            {
                case Vector3 v:
                    return SerializeVector3(v);
                case Vector2 v:
                    return new { x = v.x, y = v.y };
                case Color c:
                    return SerializeColor(c);
                case Quaternion q:
                    return new { x = q.x, y = q.y, z = q.z, w = q.w };
                case Enum e:
                    return e.ToString();
                default:
                    return value;
            }
        }

        /// <summary>
        /// Serializes a Vector3
        /// </summary>
        private static Dictionary<string, float> SerializeVector3(Vector3 vector)
        {
            return new Dictionary<string, float>
            {
                ["x"] = vector.x,
                ["y"] = vector.y,
                ["z"] = vector.z
            };
        }

        /// <summary>
        /// Serializes a Color
        /// </summary>
        private static Dictionary<string, float> SerializeColor(Color color)
        {
            return new Dictionary<string, float>
            {
                ["r"] = color.r,
                ["g"] = color.g,
                ["b"] = color.b,
                ["a"] = color.a
            };
        }
    }
}