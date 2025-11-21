#!/usr/bin/env node

/**
 * Sync Unity Package version with mcp-server version
 * Called by release-please via extra-files or manual invocation
 *
 * Usage: node sync-unity-package-version.js <version>
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get version from command line argument
const version = process.argv[2];

if (!version) {
  console.error('Error: Version argument is required');
  console.error('Usage: node sync-unity-package-version.js <version>');
  process.exit(1);
}

// Resolve Unity Package path (mcp-server and UnityMCPServer are siblings)
const unityPackageJsonPath = path.join(
  __dirname,
  '../../UnityMCPServer/Packages/unity-mcp-server/package.json'
);

try {
  // Read Unity package.json
  const packageJsonContent = fs.readFileSync(unityPackageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonContent);

  // Update version
  packageJson.version = version;

  // Write back with 2-space indentation and trailing newline
  const updatedContent = JSON.stringify(packageJson, null, 2) + '\n';
  fs.writeFileSync(unityPackageJsonPath, updatedContent, 'utf8');

  console.log(`Unity Package version synced to ${version}`);
  process.exit(0);
} catch (error) {
  console.error(`Error: Failed to sync Unity Package version`);
  console.error(error.message);
  process.exit(1);
}
