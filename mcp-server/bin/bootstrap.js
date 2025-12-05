#!/usr/bin/env node
/**
 * Bootstrap wrapper for unity-mcp-server
 *
 * This wrapper ensures:
 * 1. Early stderr output before any module loading
 * 2. Global exception handlers are registered first
 * 3. Module load failures are caught and reported
 *
 * ESM static imports are hoisted, so we use dynamic import() to
 * ensure our error handlers are set up before loading the main module.
 */

// Synchronous stderr write - this MUST appear before any module loading
process.stderr.write('[unity-mcp-server] Bootstrap starting...\n');

// Global exception handlers - catch any unhandled errors
process.on('uncaughtException', err => {
  process.stderr.write(`[unity-mcp-server] FATAL: Uncaught exception: ${err.message}\n`);
  process.stderr.write(`${err.stack}\n`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : '';
  process.stderr.write(`[unity-mcp-server] FATAL: Unhandled rejection: ${msg}\n`);
  if (stack) process.stderr.write(`${stack}\n`);
  process.exit(1);
});

// Dynamic import to load the main module AFTER error handlers are set up
// This allows us to catch module load failures
import('./unity-mcp-server').catch(err => {
  process.stderr.write(`[unity-mcp-server] FATAL: Module load failed: ${err.message}\n`);
  process.stderr.write(`${err.stack}\n`);
  process.exit(1);
});
