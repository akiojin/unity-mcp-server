import { logger, config } from './config.js';

export class IndexWatcher {
  constructor(unityConnection) {
    this.unityConnection = unityConnection;
    this.timer = null;
    this.running = false;
  }

  start() {
    if (!config.indexing?.watch) return;
    if (this.timer) return;
    const interval = Math.max(2000, Number(config.indexing.intervalMs || 15000));
    logger.info(`[index] watcher enabled (interval=${interval}ms)`);
    this.timer = setInterval(() => this.tick(), interval);
    // Initial kick
    this.tick();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const { BuildCodeIndexToolHandler } = await import('../handlers/script/BuildCodeIndexToolHandler.js');
      const handler = new BuildCodeIndexToolHandler(this.unityConnection);
      const params = {
        concurrency: config.indexing.concurrency || 8,
        retry: config.indexing.retry || 2,
        reportEvery: config.indexing.reportEvery || 500,
      };
      const res = await handler.handle(params);
      const ok = res?.result?.success;
      if (ok) {
        logger.info(`[index] updated=${res.result.updatedFiles || 0} removed=${res.result.removedFiles || 0} total=${res.result.totalIndexedSymbols || 0}`);
      } else if (res?.result?.error) {
        logger.warn(`[index] update failed: ${res.result.error}`);
      }
    } catch (e) {
      logger.warn(`[index] update exception: ${e.message}`);
    } finally {
      this.running = false;
    }
  }
}

