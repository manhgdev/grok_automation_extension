#!/usr/bin/env node
/** Live Grok DOM probe via copied Chrome profile + CDP. */
import { chromium } from 'playwright';
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SRC = join(homedir(), 'Library/Application Support/Google/Chrome');
const DST = '/tmp/grok-chrome-inspect-profile';
const PORT = 9224;
const OUT = new URL('../grok-nav-probe.json', import.meta.url);

function syncProfile() {
  if (!existsSync(SRC)) throw new Error(`Chrome profile not found: ${SRC}`);
  rmSync(DST, { recursive: true, force: true });
  mkdirSync(DST, { recursive: true });
  execSync(
    `rsync -a "${SRC}/" "${DST}/" --exclude SingletonLock --exclude SingletonSocket --exclude RunningChromeVersion --exclude chrome_shutdown_ms.txt`,
    { stdio: 'inherit' },
  );
}

function launchChrome() {
  const proc = spawn(CHROME, [
    `--user-data-dir=${DST}`,
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://grok.com/imagine',
  ], { detached: true, stdio: 'ignore' });
  proc.unref();
  return proc.pid;
}

async function waitCdp() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('CDP not ready');
}

const inspectFn = () => {
  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  };
  const txt = (el) => (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 100);
  const tablists = [...document.querySelectorAll('[role=tablist]')].filter(vis);
  const tabs = [];
  for (const list of tablists) {
    for (const el of list.querySelectorAll('[role=tab], button, a')) {
      if (!vis(el)) continue;
      tabs.push({
        tag: el.tagName,
        href: el.getAttribute('href'),
        text: txt(el),
        selected: el.getAttribute('aria-selected'),
        pressed: el.getAttribute('aria-pressed'),
        state: el.getAttribute('data-state'),
      });
    }
  }
  const links = [...document.querySelectorAll('a[href]')].filter(vis).map((a) => ({
    href: a.getAttribute('href'),
    text: txt(a),
  })).filter((x) => /imagine|agent/i.test(`${x.href} ${x.text}`));
  return { url: location.href, tablists: tablists.length, tabs, links };
};

let chromePid;
try {
  console.log('Syncing Chrome profile...');
  syncProfile();
  console.log('Launching Chrome with CDP...');
  chromePid = launchChrome();
  await waitCdp();

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
  const page = browser.contexts()[0]?.pages()[0] || await browser.contexts()[0].newPage();
  await page.goto('https://grok.com/imagine', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);

  const onImagine = await page.evaluate(inspectFn);
  const agentTab = onImagine.tabs.find((t) => /agent/i.test(t.text) || (t.href || '').includes('/agent'));
  let afterAgent = null;
  if (agentTab) {
    await page.evaluate((t) => {
      const vis = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const match = [...document.querySelectorAll('a,button,[role=tab]')].find((el) => {
        if (!vis(el)) return false;
        const text = (el.textContent || '').trim();
        const href = el.getAttribute('href') || '';
        return (t.text && text === t.text) || (t.href && href === t.href);
      });
      match?.click();
    }, agentTab);
    await page.waitForTimeout(3000);
    afterAgent = await page.evaluate(inspectFn);
  }

  const result = { onImagine, agentTab, afterAgent };
  await import('node:fs/promises').then((fs) => fs.writeFile(OUT, JSON.stringify(result, null, 2)));
  console.log('Wrote', OUT.pathname);
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
} finally {
  if (chromePid) {
    try { process.kill(chromePid); } catch { /* ignore */ }
    try { execSync(`pkill -f "remote-debugging-port=${PORT}"`); } catch { /* ignore */ }
  }
}
