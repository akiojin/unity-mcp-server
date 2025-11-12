export function extractEditorState(payload) {
  if (!isObjectLike(payload)) {
    return null;
  }

  const queue = [payload];
  const seen = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!isObjectLike(current) || seen.has(current)) {
      continue;
    }

    seen.add(current);

    if (typeof current.isPlaying === 'boolean') {
      return current;
    }

    if (Array.isArray(current)) {
      for (const value of current) {
        if (isObjectLike(value)) {
          queue.push(value);
        }
      }
      continue;
    }

    for (const value of Object.values(current)) {
      if (isObjectLike(value)) {
        queue.push(value);
      }
    }
  }

  return null;
}

function isObjectLike(value) {
  return typeof value === 'object' && value !== null;
}
