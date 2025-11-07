/* eslint-disable no-useless-escape */
// Lightweight C# symbol extractor for Node-side fallback (not Roslyn-accurate)
export function parseFileSymbols(relPath, text) {
  const lines = text.split('\n');
  const result = { path: relPath, symbols: [] };
  const nsRx = /^\s*namespace\s+([A-Za-z0-9_.]+)/;
  const typeRx = /^\s*(?:public|internal|protected|private|abstract|sealed|static|partial|new|readonly|\s)*\s*(class|struct|interface|enum)\s+([A-Za-z0-9_]+)/;
  const methodRx = /^\s*(?:public|internal|protected|private|static|virtual|override|async|sealed|extern|unsafe|new|readonly|\s)+[A-Za-z0-9_<>,\[\]\?\(\)\.:\s]+\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:\{|=>|;)/;
  const propRx = /^\s*(?:public|internal|protected|private|static|virtual|override|sealed|new|readonly|\s)+[A-Za-z0-9_<>,\[\]\?\.:\s]+\s+([A-Za-z0-9_]+)\s*\{/;

  const nsStack = [];
  const typeStack = [];
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nsM = line.match(nsRx);
    if (nsM) nsStack.push({ name: nsM[1], line: i + 1 });

    const tM = line.match(typeRx);
    if (tM) {
      const kind = tM[1];
      const name = tM[2];
      typeStack.push({ kind, name, startLine: i + 1, braceDepthAtStart: braceDepth });
      result.symbols.push({
        name,
        kind,
        namespace: nsStack.map(n => n.name).join('.'),
        container: typeStack.length > 1 ? typeStack[typeStack.length - 2].name : null,
        startLine: i + 1,
        endLine: 0,
        startColumn: 1,
        endColumn: 1,
      });
    }

    const mM = line.match(methodRx);
    if (mM) {
      const name = mM[1];
      result.symbols.push({
        name,
        kind: 'method',
        namespace: nsStack.map(n => n.name).join('.'),
        container: typeStack.length ? typeStack[typeStack.length - 1].name : null,
        startLine: i + 1,
        endLine: i + 1,
        startColumn: 1,
        endColumn: 1,
      });
    }

    const pM = line.match(propRx);
    if (pM) {
      const name = pM[1];
      result.symbols.push({
        name,
        kind: 'property',
        namespace: nsStack.map(n => n.name).join('.'),
        container: typeStack.length ? typeStack[typeStack.length - 1].name : null,
        startLine: i + 1,
        endLine: i + 1,
        startColumn: 1,
        endColumn: 1,
      });
    }

    // brace accounting
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;
    }
    // close types whose body ended
    while (typeStack.length && braceDepth < typeStack[typeStack.length - 1].braceDepthAtStart) {
      const closed = typeStack.pop();
      // set endLine for the last matching symbol
      for (let j = result.symbols.length - 1; j >= 0; j--) {
        const s = result.symbols[j];
        if (s.kind === closed.kind && s.name === closed.name && s.endLine === 0) { s.endLine = i + 1; break; }
      }
    }
  }
  const last = Math.max(1, lines.length);
  for (const s of result.symbols) {
    if (!s.endLine) s.endLine = last;
    if (!s.endColumn) s.endColumn = 1;
  }
  return result;
}
