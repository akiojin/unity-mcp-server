import { WriteGate } from './writeGate.js';
import { logger } from './config.js';

export class WriteQueue {
  constructor(unityConnection, { debounceMs = 1200, maxEdits = 100 } = {}) {
    this.unity = unityConnection;
    this.gate = new WriteGate(unityConnection);
    this.debounceMs = debounceMs;
    this.maxEdits = maxEdits;
    this.pending = [];
    this.timer = null;
    this.flushing = false;
  }

  enqueuePatch(params) {
    const edits = Array.isArray(params?.edits) ? params.edits : [];
    if (edits.length === 0) {
      return { status: 'error', error: 'edits array is required' };
    }
    // Merge edits
    for (const e of edits) {
      if (!e?.path) return { status: 'error', error: 'edits[*].path is required' };
      this.pending.push({
        path: e.path,
        startLine: Math.max(1, e.startLine || 1),
        endLine: Math.max(e.startLine || 1, e.endLine || e.startLine || 1),
        newText: e.newText ?? ''
      });
    }
    if (this.pending.length >= this.maxEdits) {
      void this.flushSoon(0);
    } else {
      void this.flushSoon(this.debounceMs);
    }
    return { status: 'queued', queued: this.pending.length, debounceMs: this.debounceMs };
  }

  async flushSoon(delay) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flushNow().catch(err => logger.error('[WriteQueue] flush error:', err.message)), delay);
  }

  async flushNow() {
    if (this.flushing) return;
    if (this.pending.length === 0) return;
    this.flushing = true;
    const edits = this.pending.splice(0, this.pending.length);
    try {
      logger.info(`[WriteQueue] Flushing ${edits.length} edits`);
      const res = await this.gate.sendWithGate('script_edit_patch', { edits, preview: false }, { preview: false });
      return res;
    } finally {
      this.flushing = false;
    }
  }
}

