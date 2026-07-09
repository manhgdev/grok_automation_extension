#!/usr/bin/env node
/** manifest.json version → package.json */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifestPath = path.join(root, 'manifest.json');
const packagePath = path.join(root, 'package.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function main() {
  const manifest = readJson(manifestPath);
  const version = manifest.version;
  if (!version) throw new Error('manifest.json is missing "version".');

  let changed = false;

  if (manifest.version_name !== version) {
    manifest.version_name = version;
    writeJson(manifestPath, manifest);
    changed = true;
    console.log(`  synced version_name → ${version}`);
  }

  const pkg = readJson(packagePath);
  if (pkg.version !== version) {
    pkg.version = version;
    writeJson(packagePath, pkg);
    changed = true;
    console.log(`  synced package.json → ${version}`);
  }

  if (!changed) console.log(`  version OK (${version})`);
}

try {
  main();
} catch (error) {
  console.error(`sync-version failed: ${error.message}`);
  process.exit(1);
}
