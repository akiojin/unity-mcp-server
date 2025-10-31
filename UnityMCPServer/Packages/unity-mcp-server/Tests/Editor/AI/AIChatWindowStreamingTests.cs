using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityMCPServer.AI;

namespace UnityMCPServer.Tests.AI
{
    public class AIChatWindowStreamingTests
    {
        [Test]
        public void StreamingBuffer_ProcessesBurstTrafficInBatches()
        {
            const string sessionId = "session-stream";
            const int chunkCount = 512;
            const int batchSize = 32;

            var buffer = new StreamingBuffer();

            for (int i = 0; i < chunkCount; i++)
            {
                var chunk = new StreamChunk(
                    sessionId,
                    actionId: null,
                    text: i.ToString(),
                    isFinal: i == chunkCount - 1);
                buffer.Enqueue(chunk);
            }

            var processed = new List<StreamChunk>(chunkCount);
            int safetyCounter = 0;

            while (buffer.HasPending)
            {
                var frameBatch = buffer.Dequeue(batchSize);
                Assert.LessOrEqual(frameBatch.Count, batchSize, "Batch should respect frame budget");
                Assert.Greater(frameBatch.Count, 0, "Dequeue should yield work while buffer has pending items");

                processed.AddRange(frameBatch);
                safetyCounter++;
                Assert.LessOrEqual(safetyCounter, chunkCount, "Unexpected loop iterations while draining buffer");
            }

            Assert.AreEqual(chunkCount, processed.Count, "All chunks should be delivered");
            Assert.IsFalse(buffer.HasPending, "Buffer should be empty after draining");

            for (int i = 0; i < chunkCount; i++)
            {
                Assert.AreEqual(i.ToString(), processed[i].Text, "Chunks should preserve ordering");
            }

            Assert.IsTrue(processed.Last().IsFinal, "Final chunk should carry completion flag");
        }
    }
}

