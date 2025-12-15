#!/usr/bin/env node
/**
 * Unity MCP Server - Single Entry Point
 *
 * This file uses ONLY dynamic imports to ensure:
 * 1. Early stderr output before any module loading
 * 2. Global exception handlers are registered first
 * 3. Module load failures are caught and reported
 *
 * ESM static imports are hoisted, so we use dynamic import() to
 * ensure our error handlers are set up before loading any modules.
 */

// Synchronous stderr write - this MUST appear before any module loading
process.stderr.write('[unity-mcp-server] Starting...\n');

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

// Parse command line arguments (no static imports required)
const args = process.argv.slice(2);
const command = args[0] && !args[0].startsWith('--') ? args[0] : null;
const rest = command ? args.slice(1) : args;

let httpEnabled;
let httpPort;
let stdioEnabled = true;
let telemetryEnabled;

for (let i = 0; i < rest.length; i++) {
  const arg = rest[i];
  switch (arg) {
    case '--http':
      httpEnabled = true;
      if (rest[i + 1] && !rest[i + 1].startsWith('--')) {
        httpPort = parseInt(rest[i + 1], 10);
        i++;
      }
      break;
    case '--no-http':
      httpEnabled = false;
      break;
    case '--stdio':
      stdioEnabled = true;
      break;
    case '--no-stdio':
      stdioEnabled = false;
      break;
    case '--telemetry':
      telemetryEnabled = true;
      break;
    case '--no-telemetry':
      telemetryEnabled = false;
      break;
    default:
      break;
  }
}

// Main entry point - all imports are dynamic
async function main() {
  try {
    if (command === 'list-instances') {
      const { listInstances } = await import('../src/cli/commands/listInstances.js');
      const portsArg = rest.find(a => a.startsWith('--ports='));
      const ports = portsArg
        ? portsArg
            .replace('--ports=', '')
            .split(',')
            .map(p => Number(p))
        : [];
      const hostArg = rest.find(a => a.startsWith('--host='));
      const host = hostArg ? hostArg.replace('--host=', '') : 'localhost';
      const json = rest.includes('--json');
      const list = await listInstances({ ports, host });
      if (json) {
        console.log(JSON.stringify(list, null, 2));
      } else {
        for (const e of list) {
          console.log(`${e.active ? '*' : ' '} ${e.id} ${e.status}`);
        }
      }
      return;
    }

    if (command === 'set-active') {
      const { setActive } = await import('../src/cli/commands/setActive.js');
      const id = rest[0];
      if (!id) {
        console.error('Usage: unity-mcp-server set-active <host:port>');
        process.exit(1);
      }
      try {
        const result = await setActive({ id });
        console.log(JSON.stringify(result, null, 2));
      } catch (e) {
        console.error(e.message);
        process.exit(1);
      }
      return;
    }

    // Start MCP server (dynamic import)
    const { startServer } = await import('../src/core/server.js');
    const http = {};
    if (httpEnabled !== undefined) http.enabled = httpEnabled;
    if (httpPort !== undefined) http.port = httpPort;

    await startServer({
      http: Object.keys(http).length > 0 ? http : undefined,
      telemetry: telemetryEnabled === undefined ? undefined : { enabled: telemetryEnabled },
      stdioEnabled
    });
  } catch (err) {
    process.stderr.write(`[unity-mcp-server] Startup failed: ${err.message}\n`);
    process.stderr.write(`${err.stack}\n`);
    process.exit(1);
  }
}

main();
