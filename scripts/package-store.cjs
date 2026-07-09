#!/usr/bin/env node
/**
 * Chrome Web Store zip from dist/
 * Cross-platform (macOS / Windows / Linux) — pure Node, no tar/zip/unzip CLI.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const stagingDir = path.join(distDir, '.staging');

const STORE_PATHS = ['manifest.json', 'background', 'content', 'panel', 'shared', 'icons', 'logo'];

function readManifestVersion() {
  const manifest = JSON.parse(fs.readFileSync(path.join(distDir, 'manifest.json'), 'utf8'));
  if (!manifest.version) throw new Error('dist/manifest.json missing version');
  return manifest.version;
}

function removeDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyIntoStaging() {
  removeDir(stagingDir);
  fs.mkdirSync(stagingDir, { recursive: true });

  for (const rel of STORE_PATHS) {
    const src = path.join(distDir, rel);
    const dest = path.join(stagingDir, rel);

    if (!fs.existsSync(src)) {
      throw new Error(`dist/${rel} missing — run npm run build`);
    }

    if (rel === 'panel') {
      fs.mkdirSync(dest, { recursive: true });
      for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (entry.name.endsWith('.map')) continue;
        fs.cpSync(path.join(src, entry.name), path.join(dest, entry.name), { recursive: true });
      }
      continue;
    }

    fs.cpSync(src, dest, { recursive: true });
  }
}

/** Normalize zip entry paths (forward slashes, no leading ./). */
function normalizeZipEntry(name) {
  return name.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
}

function listZipFileEntries(zipPath) {
  const zip = new AdmZip(zipPath);
  return zip
    .getEntries()
    .map((entry) => normalizeZipEntry(entry.entryName))
    .filter((name) => name.length > 0);
}

function assertZipContents(zipPath) {
  const stat = fs.statSync(zipPath);
  if (stat.size < 50_000) {
    throw new Error(`zip too small (${stat.size} bytes) — packaging failed`);
  }

  const entries = listZipFileEntries(zipPath);

  if (!entries.includes('manifest.json')) {
    const misplaced = entries.find((entry) => entry.endsWith('/manifest.json'));
    throw new Error(
      misplaced
        ? `zip has manifest at "${misplaced}" — Chrome Web Store requires manifest.json at zip root`
        : 'zip missing manifest.json at root',
    );
  }

  const badPrefix = entries.find((entry) => entry.startsWith('./'));
  if (badPrefix) {
    throw new Error(`zip entry "${badPrefix}" has ./ prefix — Chrome Web Store may reject the package`);
  }

  if (entries.length < 10) {
    throw new Error(`zip has too few entries (${entries.length})`);
  }

  console.log(`  OK  ${entries.length} entries (manifest.json at root, ${process.platform})`);
}

function createZip(zipPath) {
  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  const zip = new AdmZip();
  // Empty zipPath → files at archive root (manifest.json, not ./manifest.json or staging/manifest.json).
  zip.addLocalFolder(stagingDir, '');
  zip.writeZip(zipPath);

  assertZipContents(zipPath);
}

function main() {
  console.log('=== Chrome Web Store package ===\n');
  execSync('node scripts/check-all.cjs', { cwd: root, stdio: 'inherit' });

  if (!fs.existsSync(distDir)) {
    throw new Error('dist/ missing — run npm run build');
  }

  const version = readManifestVersion();
  console.log(`\n=== Staging v${version} ===`);
  copyIntoStaging();
  console.log('  OK  copied store files');

  const zipName = `grok-automation-extension-v${version}.zip`;
  const zipPath = path.join(root, 'dist', zipName);
  console.log(`\n=== Zip ${zipName} ===`);
  createZip(zipPath);
  removeDir(stagingDir);

  const sizeMb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ ${zipPath} (${sizeMb} MB)`);
}

try {
  main();
} catch (error) {
  console.error(`\n❌ ${error.message}`);
  removeDir(stagingDir);
  process.exit(1);
}
