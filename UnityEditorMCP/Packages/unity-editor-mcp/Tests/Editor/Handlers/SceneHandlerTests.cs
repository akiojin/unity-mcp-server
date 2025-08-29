using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditorMCP.Handlers;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;

namespace UnityEditorMCP.Tests
{
    [TestFixture]
    public class SceneHandlerTests
    {
        private string testSceneFolder = "Assets/TestScenes";

        [SetUp]
        public void Setup()
        {
            // Create test folder if it doesn't exist
            if (!AssetDatabase.IsValidFolder(testSceneFolder))
            {
                AssetDatabase.CreateFolder("Assets", "TestScenes");
            }
        }

        [TearDown]
        public void TearDown()
        {
            // Clean up test scenes
            if (AssetDatabase.IsValidFolder(testSceneFolder))
            {
                AssetDatabase.DeleteAsset(testSceneFolder);
            }
            
            // Remove any test scenes from build settings
            var buildScenes = EditorBuildSettings.scenes.ToList();
            buildScenes.RemoveAll(s => s.path.Contains("TestScene"));
            EditorBuildSettings.scenes = buildScenes.ToArray();
        }

        [Test]
        public void CreateScene_ShouldWorkWithMinimalParameters()
        {
            var parameters = new JObject
            {
                ["sceneName"] = "TestScene"
            };

            var result = SceneHandler.CreateScene(parameters) as dynamic;

            Assert.IsNotNull(result);
            Assert.IsNull(result.error);
            Assert.AreEqual("TestScene", result.sceneName);
            Assert.AreEqual("Assets/Scenes/TestScene.unity", result.path);
            Assert.IsTrue(result.isLoaded);
            
            // Verify scene was created
            Assert.IsTrue(File.Exists((string)result.path));
            
            // Clean up
            AssetDatabase.DeleteAsset((string)result.path);
        }

        [Test]
        public void CreateScene_ShouldWorkWithCustomPath()
        {
            var parameters = new JObject
            {
                ["sceneName"] = "CustomScene",
                ["path"] = testSceneFolder + "/"
            };

            var result = SceneHandler.CreateScene(parameters) as dynamic;

            Assert.IsNotNull(result);
            Assert.IsNull(result.error);
            Assert.AreEqual("CustomScene", result.sceneName);
            Assert.AreEqual(testSceneFolder + "/CustomScene.unity", result.path);
            
            // Verify scene was created
            Assert.IsTrue(File.Exists((string)result.path));
        }

        [Test]
        public void CreateScene_ShouldNotLoadScene_WhenLoadSceneIsFalse()
        {
            var currentScenePath = SceneManager.GetActiveScene().path;
            
            var parameters = new JObject
            {
                ["sceneName"] = "UnloadedScene",
                ["path"] = testSceneFolder + "/",
                ["loadScene"] = false
            };

            var result = SceneHandler.CreateScene(parameters) as dynamic;

            Assert.IsNotNull(result);
            Assert.IsNull(result.error);
            Assert.IsFalse(result.isLoaded);
            
            // Verify current scene didn't change
            Assert.AreEqual(currentScenePath, SceneManager.GetActiveScene().path);
        }

        [Test]
        public void CreateScene_ShouldAddToBuildSettings_WhenRequested()
        {
            var parameters = new JObject
            {
                ["sceneName"] = "BuildScene",
                ["path"] = testSceneFolder + "/",
                ["addToBuildSettings"] = true
            };

            var result = SceneHandler.CreateScene(parameters) as dynamic;

            Assert.IsNotNull(result);
            Assert.IsNull(result.error);
            Assert.IsTrue(result.sceneIndex >= 0);
            
            // Verify scene is in build settings
            var buildScenes = EditorBuildSettings.scenes;
            Assert.IsTrue(buildScenes.Any(s => s.path == (string)result.path));
        }

        [Test]
        public void CreateScene_ShouldFailForEmptySceneName()
        {
            var parameters = new JObject
            {
                ["sceneName"] = ""
            };

            var result = SceneHandler.CreateScene(parameters) as dynamic;

            Assert.IsNotNull(result);
            Assert.IsNotNull(result.error);
            Assert.IsTrue(((string)result.error).Contains("Scene name cannot be empty"));
        }

        [Test]
        public void CreateScene_ShouldFailForInvalidSceneName()
        {
            var parameters = new JObject
            {
                ["sceneName"] = "Invalid/Scene/Name"
            };

            var result = SceneHandler.CreateScene(parameters) as dynamic;

            Assert.IsNotNull(result);
            Assert.IsNotNull(result.error);
            Assert.IsTrue(((string)result.error).Contains("invalid characters"));
        }

        [Test]
        public void CreateScene_ShouldFailForExistingScene()
        {
            // Create a scene first
            var scenePath = testSceneFolder + "/ExistingScene.unity";
            var newScene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
            EditorSceneManager.SaveScene(newScene, scenePath);

            var parameters = new JObject
            {
                ["sceneName"] = "ExistingScene",
                ["path"] = testSceneFolder + "/"
            };

            var result = SceneHandler.CreateScene(parameters) as dynamic;

            Assert.IsNotNull(result);
            Assert.IsNotNull(result.error);
            Assert.IsTrue(((string)result.error).Contains("already exists"));
        }

        [Test]
        public void CreateScene_ShouldFailForInvalidPath()
        {
            var parameters = new JObject
            {
                ["sceneName"] = "TestScene",
                ["path"] = "../InvalidPath/"
            };

            var result = SceneHandler.CreateScene(parameters) as dynamic;

            Assert.IsNotNull(result);
            Assert.IsNotNull(result.error);
            Assert.IsTrue(((string)result.error).Contains("Invalid path"));
        }

        [Test]
        public void CreateScene_ShouldHandleMissingParameters()
        {
            var parameters = new JObject();

            var result = SceneHandler.CreateScene(parameters) as dynamic;

            Assert.IsNotNull(result);
            Assert.IsNotNull(result.error);
            Assert.IsTrue(((string)result.error).Contains("Scene name cannot be empty"));
        }
    }
}