using System.Collections.Generic;

namespace UnityMCPServer.AI
{
    public sealed class StreamingBuffer
    {
        private readonly Queue<StreamChunk> _chunks = new Queue<StreamChunk>();

        public void Enqueue(StreamChunk chunk)
        {
            _chunks.Enqueue(chunk);
        }

        public IReadOnlyList<StreamChunk> Dequeue(int maxItems)
        {
            var results = new List<StreamChunk>(maxItems);
            for (int i = 0; i < maxItems && _chunks.Count > 0; i++)
            {
                results.Add(_chunks.Dequeue());
            }
            return results;
        }

        public bool HasPending => _chunks.Count > 0;
    }

    public readonly struct StreamChunk
    {
        public readonly string SessionId;
        public readonly string ActionId;
        public readonly string Text;
        public readonly bool IsFinal;

        public StreamChunk(string sessionId, string actionId, string text, bool isFinal)
        {
            SessionId = sessionId;
            ActionId = actionId;
            Text = text;
            IsFinal = isFinal;
        }
    }
}
