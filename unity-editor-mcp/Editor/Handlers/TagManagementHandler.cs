using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;
using Newtonsoft.Json.Linq;
#if !UNITY_6000_0_OR_NEWER
using UnityEditorInternal;
#endif

namespace UnityEditorMCP.Handlers
{
    /// <summary>
    /// Handles Unity tag management operations
    /// </summary>
    public static class TagManagementHandler
    {
        // Reserved Unity tags that cannot be removed
        private static readonly HashSet<string> RESERVED_TAGS = new HashSet<string>
        {
            "Untagged", "Respawn", "Finish", "EditorOnly", "MainCamera", "Player", "GameController"
        };

        /// <summary>
        /// Handle tag management operations (add, remove, get)
        /// </summary>
        public static object HandleCommand(string action, JObject parameters)
        {
            try
            {
                switch (action.ToLower())
                {
                    case "get":
                        return GetTags();
                    case "add":
                        var tagNameToAdd = parameters["tagName"]?.ToString();
                        return AddTag(tagNameToAdd);
                    case "remove":
                        var tagNameToRemove = parameters["tagName"]?.ToString();
                        return RemoveTag(tagNameToRemove);
                    default:
                        return new { error = $"Unknown action: {action}" };
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"[TagManagementHandler] Error handling {action}: {e.Message}");
                return new { error = e.Message };
            }
        }

        /// <summary>
        /// Get all available tags in the project
        /// </summary>
        public static object GetTags()
        {
            try
            {
                #if UNITY_6000_0_OR_NEWER
                var tags = UnityEngine.GameObject.FindGameObjectsWithTag("").Select(x => x.tag).Distinct().ToList();
                // In Unity 6, we need to use a different approach to get all tags
                // This is a placeholder - Unity 6 may provide a new API for this
                #else
                var tags = InternalEditorUtility.tags.ToList();
                #endif
                
                return new
                {
                    success = true,
                    action = "get",
                    tags = tags,
                    count = tags.Count
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[TagManagementHandler] Error getting tags: {e.Message}");
                return new { error = $"Failed to get tags: {e.Message}" };
            }
        }

        /// <summary>
        /// Add a new tag to the project
        /// </summary>
        public static object AddTag(string tagName)
        {
            try
            {
                if (string.IsNullOrEmpty(tagName))
                {
                    return new { error = "Tag name cannot be null or empty" };
                }

                // Validate tag name
                if (!IsValidTagName(tagName))
                {
                    return new { error = "Tag name contains invalid characters. Only letters, numbers, and underscores are allowed" };
                }

                // Check if tag already exists
                #if UNITY_6000_0_OR_NEWER
                var currentTags = UnityEngine.GameObject.FindGameObjectsWithTag("").Select(x => x.tag).Distinct().ToList();
                #else
                var currentTags = InternalEditorUtility.tags.ToList();
                #endif
                if (currentTags.Contains(tagName))
                {
                    return new { error = $"Tag \"{tagName}\" already exists" };
                }

                // Check for reserved tag names
                if (RESERVED_TAGS.Contains(tagName))
                {
                    return new { error = $"Tag \"{tagName}\" is reserved and cannot be added" };
                }

                // Add the tag using SerializedObject approach
                var tagManager = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/TagManager.asset")[0]);
                var tagsProp = tagManager.FindProperty("tags");
                
                tagsProp.InsertArrayElementAtIndex(tagsProp.arraySize);
                tagsProp.GetArrayElementAtIndex(tagsProp.arraySize - 1).stringValue = tagName;
                tagManager.ApplyModifiedProperties();

                // Force refresh of the tags
                AssetDatabase.Refresh();

                return new
                {
                    success = true,
                    action = "add",
                    tagName = tagName,
                    message = $"Tag \"{tagName}\" added successfully",
                    #if UNITY_6000_0_OR_NEWER
                    tagsCount = UnityEngine.GameObject.FindGameObjectsWithTag("").Select(x => x.tag).Distinct().Count()
                    #else
                    tagsCount = InternalEditorUtility.tags.Length
                    #endif
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[TagManagementHandler] Error adding tag '{tagName}': {e.Message}");
                return new { error = $"Failed to add tag: {e.Message}" };
            }
        }

        /// <summary>
        /// Remove an existing tag from the project
        /// </summary>
        public static object RemoveTag(string tagName)
        {
            try
            {
                if (string.IsNullOrEmpty(tagName))
                {
                    return new { error = "Tag name cannot be null or empty" };
                }

                // Check for reserved tag names
                if (RESERVED_TAGS.Contains(tagName))
                {
                    return new { error = $"Cannot remove reserved tag \"{tagName}\"" };
                }

                // Check if tag exists
                #if UNITY_6000_0_OR_NEWER
                var currentTags = UnityEngine.GameObject.FindGameObjectsWithTag("").Select(x => x.tag).Distinct().ToList();
                #else
                var currentTags = InternalEditorUtility.tags.ToList();
                #endif
                if (!currentTags.Contains(tagName))
                {
                    return new { error = $"Tag \"{tagName}\" does not exist" };
                }

                // Check if any GameObjects are using this tag
                var gameObjectsWithTag = GameObject.FindGameObjectsWithTag(tagName);
                if (gameObjectsWithTag.Length > 0)
                {
                    Debug.LogWarning($"[TagManagementHandler] Removing tag '{tagName}' while {gameObjectsWithTag.Length} GameObjects are still using it");
                }

                // Remove the tag using SerializedObject approach
                var tagManager = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/TagManager.asset")[0]);
                var tagsProp = tagManager.FindProperty("tags");
                
                for (int i = 0; i < tagsProp.arraySize; i++)
                {
                    if (tagsProp.GetArrayElementAtIndex(i).stringValue == tagName)
                    {
                        tagsProp.DeleteArrayElementAtIndex(i);
                        break;
                    }
                }
                tagManager.ApplyModifiedProperties();

                // Force refresh of the tags
                AssetDatabase.Refresh();

                return new
                {
                    success = true,
                    action = "remove",
                    tagName = tagName,
                    message = $"Tag \"{tagName}\" removed successfully",
                    #if UNITY_6000_0_OR_NEWER
                    tagsCount = UnityEngine.GameObject.FindGameObjectsWithTag("").Select(x => x.tag).Distinct().Count()
                    #else
                    tagsCount = InternalEditorUtility.tags.Length
                    #endif,
                    gameObjectsAffected = gameObjectsWithTag.Length
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[TagManagementHandler] Error removing tag '{tagName}': {e.Message}");
                return new { error = $"Failed to remove tag: {e.Message}" };
            }
        }

        /// <summary>
        /// Validate if a tag name contains only valid characters
        /// </summary>
        private static bool IsValidTagName(string tagName)
        {
            if (string.IsNullOrEmpty(tagName))
                return false;

            // Unity tag names should only contain letters, numbers, and underscores
            foreach (char c in tagName)
            {
                if (!char.IsLetterOrDigit(c) && c != '_')
                {
                    return false;
                }
            }

            return true;
        }

        /// <summary>
        /// Get tag usage statistics
        /// </summary>
        public static object GetTagUsage()
        {
            try
            {
                var tags = InternalEditorUtility.tags.ToList();
                var tagUsage = new Dictionary<string, int>();

                foreach (var tag in tags)
                {
                    var gameObjectsWithTag = GameObject.FindGameObjectsWithTag(tag);
                    tagUsage[tag] = gameObjectsWithTag.Length;
                }

                return new
                {
                    success = true,
                    tagUsage = tagUsage,
                    totalTags = tags.Count,
                    totalUsages = tagUsage.Values.Sum()
                };
            }
            catch (Exception e)
            {
                Debug.LogError($"[TagManagementHandler] Error getting tag usage: {e.Message}");
                return new { error = $"Failed to get tag usage: {e.Message}" };
            }
        }
    }
}