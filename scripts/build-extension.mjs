#!/usr/bin/env node
/**
 * Build Chrome extension → dist/
 * UI: Vue → dist/panel/  |  Content/background: Vite từ src/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const viteBin = path.join(root, 'node_modules/vite/bin/vite.js');

function rm(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function cp(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function bumpPatchVersion(version) {
  const match = /^([0-9]+)\.([0-9]+)\.([0-9]+)(.*)$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]) + 1;
  return `${major}.${minor}.${patch}${match[4]}`;
}

function bumpProjectVersion() {
  const manifestPath = path.join(root, 'manifest.json');
  const packagePath = path.join(root, 'package.json');

  const manifest = readJson(manifestPath);
  const currentVersion = manifest.version;
  if (!currentVersion) {
    throw new Error('manifest.json is missing "version".');
  }

  const nextVersion = bumpPatchVersion(currentVersion);

  manifest.version = nextVersion;
  manifest.version_name = nextVersion;
  writeJson(manifestPath, manifest);

  const pkg = readJson(packagePath);
  pkg.version = nextVersion;
  writeJson(packagePath, pkg);

  console.log(`\n=== Bump version ${currentVersion} → ${nextVersion} ===`);
}

function viteBuild(target) {
  execSync(`node "${viteBin}" build`, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, VEO_BUILD_TARGET: target },
  });
}

execSync('node scripts/build-i18n.mjs', { cwd: root, stdio: 'inherit' });
execSync('node scripts/fetch-primeicons-fonts.mjs', { cwd: root, stdio: 'inherit' });

rm(distDir);
fs.mkdirSync(distDir, { recursive: true });

console.log('\n=== Vite: panel (Vue UI) ===');
viteBuild('panel');

console.log('=== Vite: content ===');
viteBuild('content');

console.log('=== Vite: upload-hook ===');
viteBuild('upload-hook');

console.log('=== Vite: background ===');
viteBuild('background');

bumpProjectVersion();

cp(path.join(root, 'manifest.json'), path.join(distDir, 'manifest.json'));
cp(path.join(root, 'src/popup/bootstrap.js'), path.join(distDir, 'panel/bootstrap.js'));
cp(path.join(root, 'src/popup/theme-init.js'), path.join(distDir, 'panel/theme-init.js'));
cp(path.join(root, 'icons'), path.join(distDir, 'icons'));
cp(path.join(root, 'logo'), path.join(distDir, 'logo'));
fs.mkdirSync(path.join(distDir, 'shared'), { recursive: true });
cp(path.join(root, 'src/shared/config.js'), path.join(distDir, 'shared/config.js'));

const panelIndex = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Grok Automation</title>
    <link rel="icon" type="image/png" href="../icons/icon-32.png" />
    <script src="theme-init.js"></script>
    <link rel="stylesheet" href="assets/main.css" />
    <style>
      html, body { height: 100%; margin: 0; }
      #app { height: 100%; min-height: 100%; }
      .veo-prompt-textarea { min-height: 14rem; overflow-y: auto !important; resize: vertical !important; }
      .veo-prompt-mode-list { min-height: 11rem; height: 11rem; overflow: auto; resize: vertical; overscroll-behavior: contain; padding-right: 0.25rem; }
      .veo-prompt-queue-list { min-height: 6rem; height: 10rem; overflow: auto; resize: vertical; overscroll-behavior: contain; padding-right: 0.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
      .veo-prompt-queue-num { font-size: 0.65rem; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="bootstrap.js"><\/script>
  </body>
</html>
`;
fs.writeFileSync(path.join(distDir, 'panel', 'index.html'), panelIndex, 'utf8');

console.log('\n✅ dist/ — chrome://extensions → Load unpacked → dist/');
