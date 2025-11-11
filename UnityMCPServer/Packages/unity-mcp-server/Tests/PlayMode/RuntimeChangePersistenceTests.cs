using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace UnityMCPServer.Tests.PlayMode
{
    public class RuntimeChangePersistenceTests
    {
        private const string RuntimeObjectName = "UnityMCPServer_PlayModeTemp";
        private const string EditObjectName = "UnityMCPServer_EditModeSeed";

        [UnityTest]
        public IEnumerator GameObjectSpawnedInPlayMode_IsDestroyedAfterExit()
        {
            yield return new EnterPlayMode();

            var runtimeObject = new GameObject(RuntimeObjectName);
            runtimeObject.AddComponent<MarkerComponent>().value = 99f;

            yield return null; // ensure at least one frame in Play Mode
            Assert.IsNotNull(GameObject.Find(RuntimeObjectName), "Object should exist during Play Mode");

            yield return new ExitPlayMode();
            Assert.IsNull(GameObject.Find(RuntimeObjectName), "Objects created in Play Mode must not leak back to Edit Mode");
        }

        [UnityTest]
        public IEnumerator EditModeObjectRestoresSerializedStateAfterPlayMode()
        {
            // Create a scene object with a known serialized value
            var editModeObject = new GameObject(EditObjectName);
            var marker = editModeObject.AddComponent<MarkerComponent>();
            marker.value = 1f;

            yield return new EnterPlayMode();

            var playInstance = GameObject.Find(EditObjectName);
            Assert.IsNotNull(playInstance, "Edit-mode objects should appear in Play Mode scene");

            var playMarker = playInstance.GetComponent<MarkerComponent>();
            playMarker.value = 42f;
            yield return null; // let the change run at least one frame

            Assert.AreEqual(42f, playMarker.value, "Play Mode change should apply while running");

            yield return new ExitPlayMode();

            var editModeInstance = GameObject.Find(EditObjectName);
            Assert.IsNotNull(editModeInstance, "Original edit-mode object should still exist");
            Assert.AreEqual(1f, editModeInstance.GetComponent<MarkerComponent>().value,
                "Serialized value must remain unchanged after leaving Play Mode");

            Object.DestroyImmediate(editModeObject);
        }

        private class MarkerComponent : MonoBehaviour
        {
            public float value;
        }
    }
}
