#!/usr/bin/env node
/**
 * primeicons npm package may ship only .svg — download binary fonts for side panel icons.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fontsDir = path.join(root, 'src', 'assets', 'fonts');
const version = '7.0.0';
const baseUrl = `https://unpkg.com/primeicons@${version}/fonts`;

const FILES = ['primeicons.woff2', 'primeicons.woff', 'primeicons.ttf'];

async function download(url, dest) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(dest, buffer);
}

async function main() {
  fs.mkdirSync(fontsDir, { recursive: true });

  for (const file of FILES) {
    const dest = path.join(fontsDir, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
      continue;
    }
    const url = `${baseUrl}/${file}`;
    process.stdout.write(`Downloading ${file}… `);
    await download(url, dest);
    console.log('OK');
  }
}

main().catch((error) => {
  console.error('fetch-primeicons-fonts failed:', error.message);
  process.exit(1);
});
