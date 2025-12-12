using NUnit.Framework;
using UnityEditor;
using CoreServer = UnityMCPServer.Core.UnityMCPServer;

namespace UnityMCPServer.Tests.Editor
{
    public class UnityMCPServerReloadTests
    {
        [Test]
        public void ConsumeReloadPending_ShouldReturnFalseByDefault()
        {
            EditorPrefs.DeleteKey(CoreServer.ReloadPendingKeyForTests);
            Assert.IsFalse(CoreServer.ConsumeReloadPendingForTests());
        }

        [Test]
        public void ConsumeReloadPending_ShouldReturnTrueAndClear()
        {
            CoreServer.MarkReloadPendingForTests();
            Assert.IsTrue(CoreServer.ConsumeReloadPendingForTests());
            Assert.IsFalse(CoreServer.ConsumeReloadPendingForTests());
        }
    }
}
