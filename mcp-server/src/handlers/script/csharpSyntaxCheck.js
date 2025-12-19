/**
 * Lightweight C# syntax pre-check to detect obvious errors before LSP processing.
 * This helps fail fast instead of waiting for 60s LSP timeout on malformed files.
 */

/**
 * Check for balanced braces, brackets, and parentheses.
 * @param {string} content - C# source code
 * @returns {{ valid: boolean, error?: string, details?: object }}
 */
export function checkBraceBalance(content) {
  const stack = [];
  const pairs = { '{': '}', '[': ']', '(': ')' };
  const openings = new Set(Object.keys(pairs));
  const closings = new Set(Object.values(pairs));

  let inString = false;
  let inChar = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let lineNumber = 1;
  let columnNumber = 1;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];
    const prev = content[i - 1];

    // Track line numbers
    if (ch === '\n') {
      lineNumber++;
      columnNumber = 1;
      inSingleLineComment = false;
      continue;
    }
    columnNumber++;

    // Skip comments
    if (!inString && !inChar) {
      if (inMultiLineComment) {
        if (ch === '*' && next === '/') {
          inMultiLineComment = false;
          i++;
          columnNumber++;
        }
        continue;
      }
      if (inSingleLineComment) {
        continue;
      }
      if (ch === '/' && next === '/') {
        inSingleLineComment = true;
        continue;
      }
      if (ch === '/' && next === '*') {
        inMultiLineComment = true;
        i++;
        columnNumber++;
        continue;
      }
    }

    // Handle strings (skip escaped quotes)
    if (!inChar && !inSingleLineComment && !inMultiLineComment) {
      if (ch === '"' && prev !== '\\') {
        // Check for verbatim string @""
        if (!inString && prev === '@') {
          // Verbatim string - skip until unescaped closing "
          i++;
          while (i < content.length) {
            if (content[i] === '"') {
              if (content[i + 1] === '"') {
                i++; // escaped quote in verbatim
              } else {
                break;
              }
            }
            if (content[i] === '\n') {
              lineNumber++;
              columnNumber = 0;
            }
            i++;
            columnNumber++;
          }
          continue;
        }
        inString = !inString;
        continue;
      }
    }

    // Handle char literals
    if (!inString && !inSingleLineComment && !inMultiLineComment) {
      if (ch === "'" && prev !== '\\') {
        inChar = !inChar;
        continue;
      }
    }

    // Skip if inside string or char
    if (inString || inChar) continue;

    // Track braces
    if (openings.has(ch)) {
      stack.push({ char: ch, line: lineNumber, column: columnNumber });
    } else if (closings.has(ch)) {
      if (stack.length === 0) {
        return {
          valid: false,
          error: `Unexpected closing '${ch}' at line ${lineNumber}, column ${columnNumber}`,
          details: { line: lineNumber, column: columnNumber, char: ch }
        };
      }
      const top = stack.pop();
      if (pairs[top.char] !== ch) {
        return {
          valid: false,
          error: `Mismatched '${top.char}' (line ${top.line}) and '${ch}' (line ${lineNumber})`,
          details: {
            opening: { char: top.char, line: top.line, column: top.column },
            closing: { char: ch, line: lineNumber, column: columnNumber }
          }
        };
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack.map(s => `'${s.char}' at line ${s.line}`).join(', ');
    return {
      valid: false,
      error: `Unclosed brackets: ${unclosed}`,
      details: { unclosed: stack }
    };
  }

  return { valid: true };
}

/**
 * Perform lightweight pre-validation on C# source code.
 * Returns early with actionable error if basic syntax is broken.
 *
 * @param {string} content - C# source code
 * @param {string} [filePath] - Optional file path for error messages
 * @returns {{ valid: boolean, error?: string, recoveryHint?: string }}
 */
export function preSyntaxCheck(content, filePath = 'file') {
  // Check 1: Brace balance
  const braceResult = checkBraceBalance(content);
  if (!braceResult.valid) {
    return {
      valid: false,
      error: `Syntax error in ${filePath}: ${braceResult.error}`,
      recoveryHint:
        'The file has unbalanced braces/brackets. ' +
        'Use Bash tool with "cat > file << EOF" to rewrite the file, ' +
        'or fix manually in Unity Editor.'
    };
  }

  // Check 2: Basic structure validation (namespace/class/method patterns)
  // Lightweight check - just ensure there's at least one class/struct/interface
  const hasTypeDeclaration = /\b(class|struct|interface|enum|record)\s+\w+/.test(content);
  if (!hasTypeDeclaration && content.trim().length > 100) {
    // File has content but no type declaration - likely corrupted
    return {
      valid: false,
      error: `No type declaration found in ${filePath}`,
      recoveryHint:
        'The file appears to be missing class/struct/interface declarations. ' +
        'This may indicate file corruption. Check the file content.'
    };
  }

  return { valid: true };
}
