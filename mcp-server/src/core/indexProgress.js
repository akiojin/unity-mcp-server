export function buildProgress({ phase, processed = 0, total = 0, rate = 0 } = {}) {
  const safePhase = phase && String(phase).trim() ? String(phase) : 'index';
  return {
    phase: safePhase,
    processed: Number.isFinite(processed) ? processed : 0,
    total: Number.isFinite(total) ? total : 0,
    rate: Number.isFinite(rate) ? rate : 0
  };
}
