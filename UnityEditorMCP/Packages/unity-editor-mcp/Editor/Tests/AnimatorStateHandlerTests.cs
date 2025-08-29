using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEditor;
using UnityEditorMCP.Handlers;
using Newtonsoft.Json.Linq;

namespace UnityEditorMCP.Tests
{
    public class AnimatorStateHandlerTests
    {
        private GameObject testGameObject;
        private Animator testAnimator;
        
        [SetUp]
        public void Setup()
        {
            // Create test GameObject with Animator
            testGameObject = new GameObject("TestAnimatorObject");
            testAnimator = testGameObject.AddComponent<Animator>();
        }
        
        [TearDown]
        public void TearDown()
        {
            if (testGameObject != null)
            {
                Object.DestroyImmediate(testGameObject);
            }
        }
        
        [Test]
        public void GetAnimatorState_WithValidGameObject_ReturnsSuccess()
        {
            // Arrange
            var parameters = new JObject
            {
                ["gameObjectName"] = testGameObject.name,
                ["includeParameters"] = true,
                ["includeStates"] = true
            };
            
            // Act
            var result = AnimatorStateHandler.GetAnimatorState(parameters);
            
            // Assert
            Assert.IsNotNull(result);
            Assert.IsInstanceOf<Dictionary<string, object>>(result);
            var dict = (Dictionary<string, object>)result;
            Assert.IsFalse(dict.ContainsKey("error"));
            Assert.AreEqual(testGameObject.name, dict["gameObject"]);
            Assert.AreEqual(testAnimator.enabled, dict["enabled"]);
        }
        
        [Test]
        public void GetAnimatorState_WithInvalidGameObject_ReturnsError()
        {
            // Arrange
            var parameters = new JObject
            {
                ["gameObjectName"] = "NonExistentObject"
            };
            
            // Act
            var result = AnimatorStateHandler.GetAnimatorState(parameters);
            
            // Assert
            Assert.IsNotNull(result);
            var dict = result as Dictionary<string, object> ?? (Dictionary<string, object>)result;
            Assert.IsTrue(dict.ContainsKey("error"));
            Assert.IsTrue(dict["error"].ToString().Contains("GameObject not found"));
        }
        
        [Test]
        public void GetAnimatorState_WithoutGameObjectName_ReturnsError()
        {
            // Arrange
            var parameters = new JObject();
            
            // Act
            var result = AnimatorStateHandler.GetAnimatorState(parameters);
            
            // Assert
            Assert.IsNotNull(result);
            var dict = result as Dictionary<string, object> ?? (Dictionary<string, object>)result;
            Assert.IsTrue(dict.ContainsKey("error"));
            Assert.IsTrue(dict["error"].ToString().Contains("gameObjectName is required"));
        }
        
        [Test]
        public void GetAnimatorRuntimeInfo_NotInPlayMode_ReturnsError()
        {
            // Arrange
            var parameters = new JObject
            {
                ["gameObjectName"] = testGameObject.name
            };
            
            // Act
            var result = AnimatorStateHandler.GetAnimatorRuntimeInfo(parameters);
            
            // Assert
            Assert.IsNotNull(result);
            var dict = result as Dictionary<string, object> ?? (Dictionary<string, object>)result;
            Assert.IsTrue(dict.ContainsKey("error"));
            Assert.IsTrue(dict["error"].ToString().Contains("only available in Play mode"));
        }
        
        [Test]
        public void GetAnimatorState_WithoutAnimatorComponent_ReturnsError()
        {
            // Arrange
            Object.DestroyImmediate(testAnimator);
            var parameters = new JObject
            {
                ["gameObjectName"] = testGameObject.name
            };
            
            // Act
            var result = AnimatorStateHandler.GetAnimatorState(parameters);
            
            // Assert
            Assert.IsNotNull(result);
            var dict = result as Dictionary<string, object> ?? (Dictionary<string, object>)result;
            Assert.IsTrue(dict.ContainsKey("error"));
            Assert.IsTrue(dict["error"].ToString().Contains("Animator component not found"));
        }
    }
}