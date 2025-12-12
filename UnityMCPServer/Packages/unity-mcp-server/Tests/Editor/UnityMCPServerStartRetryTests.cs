using NUnit.Framework;
using CoreServer = UnityMCPServer.Core.UnityMCPServer;

namespace UnityMCPServer.Tests.Editor
{
    public class UnityMCPServerStartRetryTests
    {
        [Test]
        public void ComputeStartRetryDelay_ShouldIncreaseAndCap()
        {
            Assert.AreEqual(500, CoreServer.ComputeStartRetryDelayMsForTests(1));
            Assert.AreEqual(1000, CoreServer.ComputeStartRetryDelayMsForTests(2));
            Assert.AreEqual(1500, CoreServer.ComputeStartRetryDelayMsForTests(3));
            Assert.AreEqual(2000, CoreServer.ComputeStartRetryDelayMsForTests(4));
            Assert.AreEqual(2000, CoreServer.ComputeStartRetryDelayMsForTests(10));
        }
    }
}
