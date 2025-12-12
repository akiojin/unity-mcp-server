using NUnit.Framework;
using UnityEditor;
using UnityMCPServer.Core;

namespace UnityMCPServer.Tests.Editor
{
    public class UnityMCPServerReloadTests
    {
        [Test]
        public void ConsumeReloadPending_ShouldReturnFalseByDefault()
        {
            EditorPrefs.DeleteKey(UnityMCPServer.ReloadPendingKeyForTests);
            Assert.IsFalse(UnityMCPServer.ConsumeReloadPendingForTests());
        }

        [Test]
        public void ConsumeReloadPending_ShouldReturnTrueAndClear()
        {
            UnityMCPServer.MarkReloadPendingForTests();
            Assert.IsTrue(UnityMCPServer.ConsumeReloadPendingForTests());
            Assert.IsFalse(UnityMCPServer.ConsumeReloadPendingForTests());
        }
    }
}

