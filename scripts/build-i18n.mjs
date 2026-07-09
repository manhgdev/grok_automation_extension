#!/usr/bin/env node
/** messages.source.js + locale-overlays.js → messages.json */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { LOCALE_MESSAGE_SOURCES } = await import(
  pathToFileURL(path.join(root, 'src/i18n/messages.source.js')).href
);
const { decodeAllLocales } = await import(
  pathToFileURL(path.join(root, 'src/i18n/decodeMessages.js')).href
);
const { applyLocaleOverlays, mergeLocaleOverlays } = await import(
  pathToFileURL(path.join(root, 'src/i18n/mergeOverlays.js')).href
);
const { default: overlays, videoPopupOverlay, tipBeforeUseOverlay } = await import(
  pathToFileURL(path.join(root, 'src/i18n/locale-overlays.js')).href
);

const messages = decodeAllLocales(LOCALE_MESSAGE_SOURCES);
applyLocaleOverlays(messages, overlays);
for (const locale of Object.keys(messages)) {
  mergeLocaleOverlays(messages[locale], videoPopupOverlay(locale), { overwrite: true });
  mergeLocaleOverlays(messages[locale], tipBeforeUseOverlay(locale), { overwrite: true });
}

for (const locale of ['en', 'vi']) {
  const duration = messages[locale]?.common?.durationOptions;
  if (!duration?.['15s'] || !duration?.['15sConcat']) {
    throw new Error(`build-i18n: missing 15s strings for locale "${locale}"`);
  }
  if (!messages[locale]?.common?.videoModeControl?.tip?.includes('15s')) {
    throw new Error(`build-i18n: stale video tip for locale "${locale}"`);
  }
  if (!messages[locale]?.tipBeforeUseModal?.planSuperLite) {
    throw new Error(`build-i18n: missing tipBeforeUseModal for locale "${locale}"`);
  }
}

const outPath = path.join(root, 'src/i18n/messages.json');
fs.writeFileSync(outPath, JSON.stringify(messages), 'utf8');
console.log(`Wrote ${outPath} (${Object.keys(messages).length} locales)`);
