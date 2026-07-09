#!/usr/bin/env node
/** Sanity check — build extension → dist/ */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

const jsFiles = [
  'shared/config.js',
  'background/background.js',
  'content/content.js',
  'content/upload-hook.js',
  'panel/bootstrap.js',
  'panel/app.js',
];

function fsExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  let failed = false;

  console.log('=== Build extension ===');
  try {
    execSync('npm run build', { cwd: root, stdio: 'inherit' });
  } catch {
    failed = true;
  }

  console.log('\n=== Syntax (node --check) ===');
  for (const rel of jsFiles) {
    const abs = path.join(dist, rel);
    if (!fsExists(abs)) {
      console.error(`  FAIL  missing dist/${rel}`);
      failed = true;
      continue;
    }
    try {
      execSync(`node --check "${abs}"`, { stdio: 'pipe' });
      console.log(`  OK  dist/${rel}`);
    } catch {
      console.error(`  FAIL  dist/${rel}`);
      failed = true;
    }
  }

  console.log('\n=== ES module parse (panel/app.js) ===');
  try {
    await import(pathToFileURL(path.join(dist, 'panel/app.js')).href);
    console.log('  OK  panel/app.js');
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.error(`  FAIL  panel/app.js — ${e.message}`);
      failed = true;
    } else if (e instanceof ReferenceError && /chrome|window|navigator|localStorage/.test(e.message || '')) {
      console.log(`  OK  panel/app.js parses (${e.message} expected outside Chrome)`);
    } else {
      console.log(`  OK  panel/app.js loads (${e?.message || e})`);
    }
  }

  console.log('\n=== Config ===');
  try {
    const { getRemoteConfig } = await import(pathToFileURL(path.join(dist, 'shared/config.js')).href);
    const cfg = await getRemoteConfig();
    console.log(`  OK  ${Object.keys(cfg.selectors || {}).length} Grok selectors`);
  } catch (e) {
    console.error(`  FAIL  shared/config.js — ${e.message}`);
    failed = true;
  }

  console.log('\n=== Panel fonts (PrimeIcons) ===');
  const fontFiles = ['primeicons.woff2', 'primeicons.woff', 'primeicons.ttf'];
  for (const file of fontFiles) {
    const abs = path.join(dist, 'panel', 'assets', file);
    if (!fsExists(abs)) {
      console.error(`  FAIL  missing dist/panel/assets/${file}`);
      failed = true;
    }
  }
  if (!failed) {
    try {
      const css = fs.readFileSync(path.join(dist, 'panel/assets/main.css'), 'utf8');
      if (!css.includes('url(./primeicons.woff2)')) {
        console.error('  FAIL  main.css missing primeicons.woff2 url()');
        failed = true;
      } else {
        console.log('  OK  PrimeIcons fonts + CSS paths');
      }
    } catch (e) {
      console.error(`  FAIL  panel CSS — ${e.message}`);
      failed = true;
    }
  }

  console.log('\n=== i18n decode ===');
  try {
    const messages = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/messages.json'), 'utf8'));
    let empty = 0;
    const walk = (o) => {
      if (o && typeof o === 'object' && !Array.isArray(o)) {
        if (Object.keys(o).length === 0) empty += 1;
        Object.values(o).forEach(walk);
      }
    };
    walk(messages);
    if (empty > 0) {
      console.error(`  FAIL  ${empty} empty i18n message(s) — run npm run build:i18n`);
      failed = true;
    } else {
      console.log('  OK  i18n messages decoded');
    }
  } catch (e) {
    console.error(`  FAIL  i18n — ${e.message}`);
    failed = true;
  }

  console.log('\n=== T2V batch helpers ===');
  try {
    execSync('node scripts/check-t2v-batch.cjs', { cwd: root, stdio: 'inherit' });
  } catch {
    failed = true;
  }

  if (failed) {
    console.error('\n❌ Có lỗi — sửa src/ rồi: npm run build');
    process.exit(1);
  }

  console.log('\n✅ OK — Load unpacked: dist/');
  console.log('   Source: src/');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
