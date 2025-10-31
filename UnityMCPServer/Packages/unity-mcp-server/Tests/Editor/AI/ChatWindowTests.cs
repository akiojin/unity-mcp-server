using NUnit.Framework;
using UnityMCPServer.AI;

namespace UnityMCPServer.Tests.AI
{
    public class ChatWindowTests
    {
        [Test]
        public void StreamingChunks_AreDequeuedInOrder()
        {
            var buffer = new StreamingBuffer();
            buffer.Enqueue(new StreamChunk("s1", null, "a", false));
            buffer.Enqueue(new StreamChunk("s1", null, "b", false));
            buffer.Enqueue(new StreamChunk("s1", null, "c", true));

            var frame = buffer.Dequeue(2);
            Assert.AreEqual(2, frame.Count);
            Assert.AreEqual("a", frame[0].Text);
            Assert.AreEqual("b", frame[1].Text);

            var remainder = buffer.Dequeue(2);
            Assert.AreEqual(1, remainder.Count);
            Assert.AreEqual("c", remainder[0].Text);
            Assert.IsFalse(buffer.HasPending);
        }
    }
}
