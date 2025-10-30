export class AiStreamDispatcher {
  constructor(unityConnection) {
    this.unityConnection = unityConnection;
  }

  pushChunk({ sessionId, actionId = null, chunk, isFinal }) {
    if (!this.unityConnection || typeof this.unityConnection.sendNotification !== 'function') {
      throw new Error('UNITY_CONNECTION_UNAVAILABLE');
    }

    this.unityConnection.sendNotification('ai_stream_chunk', {
      sessionId,
      actionId,
      chunk,
      isFinal
    });
  }
}
