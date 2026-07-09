#!/usr/bin/env node
/**
 * Probe Grok Imagine tabs from the logged-in Chrome session (via extension).
 *
 * 1. Reload extension from dist/
 * 2. Open grok.com/imagine in Chrome
 * 3. Run: node scripts/inspect-grok-ui.mjs
 *
 * If AppleScript JS is enabled (View → Developer → Allow JavaScript from Apple Events),
 * this also dumps live DOM from the active Grok tab.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../dist/manifest.json', import.meta.url), 'utf8'));
const extId = process.env.GROK_EXT_ID;

function appleScript(js) {
  const escaped = js.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return execSync(
    `osascript -e 'tell application "Google Chrome" to execute active tab of window 1 javascript "${escaped}"'`,
    { encoding: 'utf8' },
  ).trim();
}

function grokTabUrl() {
  const out = execSync(
    `osascript -e 'tell application "Google Chrome" to get URL of every tab of every window'`,
    { encoding: 'utf8' },
  );
  return out.split(',').map((u) => u.trim()).find((u) => u.includes('grok.com'));
}

const tabUrl = grokTabUrl();
console.log('Grok tab:', tabUrl || '(none open)');

if (!extId) {
  console.log('\nSet GROK_EXT_ID to your extension id (chrome://extensions) to query via content script.');
  console.log('Example: GROK_EXT_ID=abcdef... node scripts/inspect-grok-ui.mjs');
} else {
  console.log('Extension:', manifest.name, manifest.version);
}

try {
  const dump = appleScript(`JSON.stringify((function(){
    const vis=(el)=>{if(!el)return false;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'};
    const txt=(el)=>(el.textContent||el.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ').slice(0,80);
    return {
      url:location.href,
      tabs:[...document.querySelectorAll('button,[role=tab]')].filter(vis).map(b=>({text:txt(b),selected:b.getAttribute('aria-selected'),pressed:b.getAttribute('aria-pressed')})).filter(x=>/agent|image|video|ảnh/i.test(x.text)),
      links:[...document.querySelectorAll('a[href]')].filter(vis).map(a=>({href:a.getAttribute('href'),text:txt(a)})).filter(x=>/imagine|agent/i.test((x.href||'')+' '+x.text))
    };
  })())`);
  console.log('\nLive DOM:', JSON.stringify(JSON.parse(dump), null, 2));
} catch (err) {
  console.log('\nAppleScript DOM probe skipped:', err.message?.split('\n')[0]);
  console.log('Enable: Chrome → View → Developer → Allow JavaScript from Apple Events');
}
