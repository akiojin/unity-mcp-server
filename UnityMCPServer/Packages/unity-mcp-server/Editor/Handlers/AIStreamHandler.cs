using System;
using UnityEditor;
using UnityEngine;
using UnityMCPServer.AI;

namespace UnityMCPServer.Handlers
{
    public sealed class AIStreamHandler
    {
        private readonly StreamingBuffer _buffer = new StreamingBuffer();

        public void HandleStreamChunk(string sessionId, string actionId, string chunk, bool isFinal)
        {
            _buffer.Enqueue(new StreamChunk(sessionId, actionId, chunk, isFinal));
        }

        public StreamingBuffer Buffer => _buffer;
    }
}
