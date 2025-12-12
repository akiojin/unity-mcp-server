using System.Linq;
using NUnit.Framework;
using UnityMCPServer.Core;

namespace UnityMCPServer.Tests.Editor
{
    public class UnityMCPServerSuggestedPortsTests
    {
        [Test]
        public void SuggestAlternativePorts_ShouldReturnNextThreePorts()
        {
            var ports = UnityMCPServer.SuggestAlternativePortsForTests(6400);
            Assert.AreEqual(3, ports.Length);
            CollectionAssert.AreEqual(new[] { 6401, 6402, 6403 }, ports);
        }

        [Test]
        public void SuggestAlternativePorts_ShouldCapAtMaxPort()
        {
            var ports = UnityMCPServer.SuggestAlternativePortsForTests(65534);
            Assert.IsTrue(ports.All(p => p <= 65535));
            Assert.IsTrue(ports.Length >= 1);
        }
    }
}

