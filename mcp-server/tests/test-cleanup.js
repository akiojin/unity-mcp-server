import { spawn } from 'child_process';

// Track all spawned processes
const activeProcesses = new Set();
const activeConnections = new Set();
const activeTimers = new Set();

// Override spawn to track processes
const originalSpawn = spawn;
global.spawn = function(...args) {
  const proc = originalSpawn(...args);
  activeProcesses.add(proc);
  
  proc.on('exit', () => {
    activeProcesses.delete(proc);
  });
  
  return proc;
};

// Track timers
const originalSetTimeout = global.setTimeout;
const originalSetInterval = global.setInterval;

global.setTimeout = function(fn, delay, ...args) {
  const timer = originalSetTimeout(fn, delay, ...args);
  activeTimers.add(timer);
  return timer;
};

global.setInterval = function(fn, delay, ...args) {
  const timer = originalSetInterval(fn, delay, ...args);
  activeTimers.add(timer);
  return timer;
};

// Clear timer tracking on clear
const originalClearTimeout = global.clearTimeout;
const originalClearInterval = global.clearInterval;

global.clearTimeout = function(timer) {
  activeTimers.delete(timer);
  return originalClearTimeout(timer);
};

global.clearInterval = function(timer) {
  activeTimers.delete(timer);
  return originalClearInterval(timer);
};

// Cleanup function
export function cleanupAll() {
  // Kill all processes
  for (const proc of activeProcesses) {
    if (!proc.killed) {
      proc.kill('SIGTERM');
      // Give it time to exit gracefully
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      }, 1000);
    }
  }
  
  // Clear all timers
  for (const timer of activeTimers) {
    clearTimeout(timer);
    clearInterval(timer);
  }
  
  // Close all connections
  for (const conn of activeConnections) {
    if (conn && typeof conn.destroy === 'function') {
      conn.destroy();
    }
  }
  
  activeProcesses.clear();
  activeTimers.clear();
  activeConnections.clear();
}

// Register cleanup on process exit
process.on('exit', cleanupAll);
process.on('SIGINT', () => {
  cleanupAll();
  process.exit(1);
});
process.on('SIGTERM', () => {
  cleanupAll();
  process.exit(1);
});

export function trackConnection(conn) {
  activeConnections.add(conn);
  return conn;
}

export function untrackConnection(conn) {
  activeConnections.delete(conn);
}