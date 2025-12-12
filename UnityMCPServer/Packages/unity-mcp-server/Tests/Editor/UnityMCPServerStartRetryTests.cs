using NUnit.Framework;
using UnityMCPServer.Core;

namespace UnityMCPServer.Tests.Editor
{
    public class UnityMCPServerStartRetryTests
    {
        [Test]
        public void ComputeStartRetryDelay_ShouldIncreaseAndCap()
        {
            Assert.AreEqual(500, UnityMCPServer.ComputeStartRetryDelayMsForTests(1));
            Assert.AreEqual(1000, UnityMCPServer.ComputeStartRetryDelayMsForTests(2));
            Assert.AreEqual(1500, UnityMCPServer.ComputeStartRetryDelayMsForTests(3));
            Assert.AreEqual(2000, UnityMCPServer.ComputeStartRetryDelayMsForTests(4));
            Assert.AreEqual(2000, UnityMCPServer.ComputeStartRetryDelayMsForTests(10));
        }
    }
}

