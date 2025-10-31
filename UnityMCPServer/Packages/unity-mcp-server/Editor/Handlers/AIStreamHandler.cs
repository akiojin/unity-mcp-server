using System;
using UnityEditor;
using UnityEngine;
using UnityMCPServer.AI;

namespace UnityMCPServer.Handlers
{
    public sealed class AIStreamHandler
    {
        private readonly StreamingBuffer _buffer = new StreamingBuffer();

        public event Action<StreamChunk> ChunkReceived;

        public void HandleStreamChunk(string sessionId, string actionId, string chunk, bool isFinal)
        {
            var model = new StreamChunk(sessionId, actionId, chunk, isFinal);
            _buffer.Enqueue(model);
            ChunkReceived?.Invoke(model);
        }

        public StreamingBuffer Buffer => _buffer;
    }
}
