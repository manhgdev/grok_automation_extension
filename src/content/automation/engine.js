import jQuery from 'jquery';
import { FALLBACK_FLOW_CONFIG, getRemoteConfig } from '@shared/config.js';
import { buildDownloadFileStem, extractPromptBodyFromTimedPrompt } from '@/utils/prompts.js';

const $ = jQuery;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const groups = [];
const imageStore = {};
const chunkStore = {};
let activeGroupId = null;

function isGrokPage() {
  return /^https?:\/\/([^/]+\.)?grok\.com(?:\/|$)/i.test(window.location.href);
}

async function loadConfig() {
  try {
    const config = await getRemoteConfig();
    return config?.selectors ? config : FALLBACK_FLOW_CONFIG;
  } catch {
    return FALLBACK_FLOW_CONFIG;
  }
}

function log(level, ...parts) {
  try {
    chrome.runtime.sendMessage({
      type: 'ACTION_LOG',
      data: {
        level,
        message: parts
          .map((part) => (part instanceof Error ? part.message : typeof part === 'string' ? part : JSON.stringify(part)))
          .join(' '),
        timestamp: Date.now(),
      },
    });
  } catch {
    // Extension context can disappear during page reload.
  }
}

function emitProgress(payload, percentage, status = 'running') {
  try {
    chrome.runtime.sendMessage({
      type: 'VIDEO_GENERATION_PROGRESS',
      data: {
        groupId: payload.groupId,
        promptIndex: payload.promptIndex,
        percentage,
        status,
        prompt: payload.prompt,
      },
    });
  } catch {
    // ignored
  }
}

function emitStatus(group) {
  try {
    chrome.runtime.sendMessage({
      type: 'PROMPT_GROUP_STATUS',
      data: {
        id: group.id,
        status: group.status,
        processedCount: group.processedCount,
        totalCount: group.totalCount,
        createdAt: group.createdAt,
        isCancelling: !!group.isCancelling,
        isPaused: !!group.isPaused,
        isActive: activeGroupId === group.id,
        delayRemainingSeconds: group.delayRemainingSeconds,
        delayEndsAt: group.delayEndsAt ?? null,
        delayPromptIndex: group.delayPromptIndex ?? null,
        delayTotalSeconds: group.delayTotalSeconds ?? null,
        delayPauseStartedAt: group.delayPauseStartedAt ?? null,
        promptDelayEndsAt: group.promptDelayEndsAt ?? null,
        pauseReason: group.pauseReason ?? null,
        currentPromptIndex: group.currentPromptIndex,
        results: group.results,
        promptPreviews: group.payloads.map((payload) => String(payload.prompt || '').slice(0, 60)),
        promptIndices: group.payloads.map((payload) => payload.promptIndex),
        retryCountByIndex: { ...group.retryCountByIndex },
        downloadRetryCountByIndex: {},
      },
    });
  } catch {
    // ignored
  }
}

function extendDelayAfterPause(group) {
  if (!group.delayPauseStartedAt || !group.delayEndsAt) return;
  const extend = Date.now() - group.delayPauseStartedAt;
  group.delayEndsAt += extend;
  if (typeof group.delayPromptIndex === 'number') {
    group.promptDelayEndsAt = {
      ...(group.promptDelayEndsAt || {}),
      [group.delayPromptIndex]: group.delayEndsAt,
    };
  }
  group.delayPauseStartedAt = null;
}

async function waitWhilePaused(group) {
  if (!group?.isPaused) return;
  if (group.delayRemainingSeconds > 0 && !group.delayPauseStartedAt) {
    group.delayPauseStartedAt = Date.now();
  }
  group.status = 'paused';
  emitStatus(group);
  while (group.isPaused && !group.isCancelling) {
    await sleep(500);
  }
  extendDelayAfterPause(group);
  if (!group.isCancelling && group.status === 'paused') {
    group.status = 'running';
    emitStatus(group);
  }
}

function selectorParts(selector) {
  if (!selector) return [];
  const parts = [];
  let quote = '';
  let depth = 0;
  let current = '';
  for (const char of String(selector)) {
    if (quote) {
      current += char;
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === '(' || char === '[') depth += 1;
    if (char === ')' || char === ']') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function jq(selector, root = document) {
  if (!selector) return $();
  const chunks = selectorParts(selector);
  if (!chunks.length) return $();
  let result = $();
  for (const chunk of chunks) {
    try {
      result = result.add($(root).find(chunk));
      if (root === document) result = result.add($(chunk).filter((_, el) => document.documentElement.contains(el)));
    } catch {
      // Remote selectors occasionally contain browser-only :has shapes that
      // Sizzle rejects. Keep trying the remaining selector alternatives.
    }
  }
  return result;
}

function isVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
}

function firstVisible(selector, root = document) {
  return jq(selector, root)
    .toArray()
    .find((el) => isVisible(el) && !el.disabled) || null;
}

async function waitForSelector(selector, label, timeoutMs = 30000, root = document) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const el = firstVisible(selector, root);
    if (el) return el;
    await sleep(250);
  }
  throw new Error(`${label || selector} not found`);
}

async function waitForVisible(selector, timeoutMs = 5000, interval = 200) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const el = firstVisible(selector);
    if (el) return $(el);
    await sleep(interval);
  }
  return null;
}

async function clickSelector(selector, label, timeoutMs = 30000, root = document) {
  const el = await waitForSelector(selector, label, timeoutMs, root);
  el.scrollIntoView({ block: 'center', inline: 'center' });
  await sleep(120);
  el.click();
  await sleep(350);
  return el;
}

async function nativeClick(el) {
  if (!el) return;
  const events = ['pointerover', 'mouseover', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
  for (const type of events) {
    el.dispatchEvent(new MouseEvent(type, {
      bubbles: true, cancelable: true, composed: true, view: window, detail: 1,
    }));
  }
  await sleep(300);
}

async function maybeClick(selector, label, timeoutMs = 2500, root = document) {
  try {
    return await clickSelector(selector, label, timeoutMs, root);
  } catch {
    return null;
  }
}

async function maybeNativeClick(selector, label, timeoutMs = 5000) {
  try {
    const el = await waitForSelector(selector, label, timeoutMs);
    await nativeClick(el);
    return el;
  } catch {
    return null;
  }
}

function withToken(template, replacements) {
  let value = template || '';
  for (const [key, replacement] of Object.entries(replacements)) {
    value = value.replaceAll(`{${key}}`, String(replacement));
  }
  return value;
}

function normalizeAspectRatio(value) {
  const raw = String(value || '16:9');
  if (raw === 'square') return '1:1';
  if (raw === 'portrait') return '9:16';
  if (raw === 'landscape') return '16:9';
  return raw;
}

function normalizeVideoLength(value) {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('15')) return '15s';
  if (raw.includes('10')) return '10s';
  return '6s';
}

function normalizeVideoQuality(value) {
  const raw = String(value || '').toLowerCase();
  if (raw === 'no-download') return raw;
  if (raw.includes('1080')) return '1080p';
  if (raw.includes('720')) return '720p';
  if (raw.includes('480')) return '480p';
  return '720p';
}

function normalizeImageModel(value) {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('speed')) return 'speed';
  return 'quality';
}

function resolveImageModel(payload) {
  return normalizeImageModel(payload?.imageModel ?? payload?.model ?? 'quality');
}

const SPEED_LABEL_RE = /speed|tốc\s*độ|toc\s*do|快速|高速/i;
const QUALITY_LABEL_RE = /quality|chất\s*lượng|chat\s*luong|质量|品質|calidad|qualidade/i;
const IMAGE_TAB_RE = /\b(image|hình\s*ảnh|ảnh|图像|图片)\b/i;
const VIDEO_TAB_RE = /^(video|视频)$/i;
const AGENT_TAB_RE = /^(agent|tác\s*tử|代理)$/i;

function imageModelRadiogroup() {
  const groups = jq('div[role="radiogroup"]').toArray().filter((el) => isVisible(el));
  for (const group of groups) {
    const buttons = jq('button', group).toArray().filter((el) => isVisible(el) && !el.disabled);
    if (buttons.length < 2) continue;
    const labels = buttons.map((btn) => (btn.textContent || btn.getAttribute('aria-label') || '').trim());
    if (labels.some((t) => SPEED_LABEL_RE.test(t) || QUALITY_LABEL_RE.test(t))) {
      return buttons;
    }
  }
  return [];
}

function buttonLabel(btn) {
  return `${btn.textContent || ''} ${btn.getAttribute('aria-label') || ''}`.trim();
}

function findImageModelButtonByLabel(wanted) {
  const re = wanted === 'speed' ? SPEED_LABEL_RE : QUALITY_LABEL_RE;

  const inGroup = imageModelRadiogroup().find((btn) => re.test(buttonLabel(btn)));
  if (inGroup) return inGroup;

  return jq('button').toArray().find((btn) => isVisible(btn) && !btn.disabled && re.test(buttonLabel(btn))) || null;
}

async function selectImageModel(payload) {
  const wantSpeed = resolveImageModel(payload) === 'speed';
  if (!wantSpeed) {
    const quality = findImageModelButtonByLabel('quality');
    if (!quality) {
      log('warn', 'Quality tab not found — skip model switch (will not click Speed)');
      return null;
    }
    log('info', 'Image model: quality');
    quality.scrollIntoView({ block: 'center', inline: 'center' });
    await sleep(120);
    quality.click();
    await sleep(350);
    return quality;
  }

  const speed = findImageModelButtonByLabel('speed');
  if (!speed) {
    log('warn', 'Speed tab not found');
    return null;
  }
  log('info', 'Image model: speed');
  speed.scrollIntoView({ block: 'center', inline: 'center' });
  await sleep(120);
  speed.click();
  await sleep(350);
  return speed;
}

function dataUrlToFile(image, index) {
  const base64 = String(image?.base64 || '');
  const match = base64.match(/^data:([^;]+);base64,(.*)$/);
  const mime = match?.[1] || 'image/png';
  const body = match?.[2] || base64;
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const ext = mime.split('/')[1] || 'png';
  return new File([bytes], image?.name || `grok-input-${index + 1}.${ext}`, { type: mime });
}

async function waitForUploadToSettle(selectors) {
  const started = Date.now();
  while (Date.now() - started < 45000) {
    const uploading = firstVisible(selectors.imageUploading);
    const failed = firstVisible(selectors.imageUploadFailed);
    if (failed) {
      await maybeClick(selectors.removeFailedUploadedImage, 'Remove failed upload', 1500);
      throw new Error('Grok image upload failed');
    }
    if (!uploading) return;
    await sleep(500);
  }
  throw new Error('Timed out waiting for Grok image upload');
}

async function uploadImages(payload, selectors) {
  const images = Array.isArray(payload.images) ? payload.images.filter(Boolean) : [];
  if (!images.length) return true;

  for (let index = 0; index < images.length; index += 1) {
    await maybeClick(selectors.plusImageButton, 'Add image', 5000);
    const input = await waitForSelector(selectors.fileInput || 'input[type="file"]', 'File input', 10000);
    const transfer = new DataTransfer();
    transfer.items.add(dataUrlToFile(images[index], index));
    input.files = transfer.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForUploadToSettle(selectors);
  }
  return true;
}

function sanitizePromptFilename(prompt) {
  if (!prompt) return 'video';
  let stem = String(prompt).replace(/\s+/g, '-');
  stem = stem.replace(/[^\p{L}\p{N}-]/gu, '');
  stem = stem.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  if (stem.length > 50) stem = stem.substring(0, 50);
  return stem || 'video';
}

function getPromptText(payload) {
  return extractPromptBodyFromTimedPrompt(payload.prompt) || payload.prompt || '';
}

function promptTextForPayload(payload) {
  if (payload.mode === 'textToImage') return payload.prompt || '';
  return getPromptText(payload);
}

function lastMainArticle(selectors) {
  const articles = jq(selectors.mainArticle).toArray().filter(isVisible);
  return articles.length ? articles[articles.length - 1] : null;
}

function sanitizeFileStem(text) {
  return String(text || 'grok-output')
    .replace(/\s\|\s*[\s\S]*$/, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'grok-output';
}

function downloadFileStem(prompt, options) {
  return buildDownloadFileStem(prompt, options) || `${String(options?.promptIndex || 1).padStart(3, '0')}_${sanitizeFileStem(prompt)}`;
}

function setEditorValue(editor, text) {
  editor.focus();
  editor.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
  awaitSleep(100);
  if ('value' in editor) {
    editor.value = text;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  editor.textContent = text;
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

function awaitSleep(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // busy wait for sync context
  }
}

async function fillPromptExecCommand(payload, selectors) {
  let promptSelector = selectors.promptContentEditable;
  if (jq(selectors.promptDropUiTextarea).length) {
    promptSelector = selectors.promptDropUiTextarea;
  }

  const $editor = await waitForVisible(promptSelector, 10000, 250);
  const editor = $editor?.get(0) || firstVisible(promptSelector) ||
    firstVisible(selectors.promptTextarea) ||
    firstVisible("form div[contenteditable='true'], textarea, div[role='textbox']");

  if (!editor) throw new Error('Could not find Grok prompt input');

  await clickSelector(promptSelector, 'Prompt input', 5000).catch(() => {
    editor.focus();
  });

  editor.focus();
  await sleep(500);
  document.execCommand('selectAll', false);
  await sleep(300);
  document.execCommand('delete', false);
  await sleep(300);

  if ('value' in editor) {
    editor.value = '';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const promptText = promptTextForPayload(payload);

  if (payload.outputPreviousPrompt?.nextPromptEditImage) {
    document.execCommand('selectAll', false);
    document.execCommand('delete', false);
  }

  if (editor instanceof HTMLTextAreaElement) {
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    document.execCommand('insertText', false, promptText);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    editor.focus();
    document.execCommand('insertText', false, promptText);
  }

  log('info', `Filled prompt: ${String(promptText).substring(0, 50)}...`);

  await waitForSelector(selectors.submitButton, 'Submit button', 5000);
  editor.focus();
  editor.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, ctrlKey: true, metaKey: true,
  }));
  editor.dispatchEvent(new KeyboardEvent('keydown', {
    bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13,
  }));

  return editor;
}

function promptWaitSelector(selectors) {
  return `${selectors.promptContentEditable || ''}, ${selectors.promptDropUiTextarea || ''}, ${selectors.promptTextarea || ''}`;
}

function isOnImagineRoot() {
  const url = window.location.href;
  return url.includes('/imagine') && !url.includes('/imagine/') && !url.includes('saved');
}

function isOnAgentPage() {
  if (window.location.href.includes('/imagine/agent')) return true;
  const tab = findImagineModeTab('agent');
  return tab?.getAttribute('aria-checked') === 'true';
}

function isOnVideoPage() {
  const tab = findImagineModeTab('video');
  return tab?.getAttribute('aria-checked') === 'true';
}

function isOnImagePage() {
  if (isOnAgentPage()) return false;
  const tab = findImagineModeTab('image');
  return tab?.getAttribute('aria-checked') === 'true';
}

function resolveImagineModeTab(mode) {
  if (mode === 'agentAutomation') return 'agent';
  if (mode?.includes('ToVideo')) return 'video';
  if (mode?.includes('ToImage')) return 'image';
  return null;
}

function imagineModeRadiogroup() {
  const groups = jq('[role="radiogroup"]').toArray().filter(isVisible);
  for (const group of groups) {
    const buttons = jq('button[role="radio"], button', group).toArray().filter((el) => isVisible(el) && !el.disabled);
    if (buttons.length < 3) continue;
    const labels = buttons.map((btn) => buttonLabel(btn));
    if (labels.some((t) => AGENT_TAB_RE.test(t)) && labels.some((t) => IMAGE_TAB_RE.test(t))) {
      return buttons;
    }
  }
  return [];
}

function imagineModeTabCandidates() {
  const grouped = imagineModeRadiogroup();
  if (grouped.length) return grouped;
  return jq('button[role="radio"], a[href="/imagine/agent"], a[href="/imagine"], button, [role="tab"]')
    .toArray()
    .filter((el) => isVisible(el) && !el.disabled);
}

function findImagineModeTab(mode) {
  const re = mode === 'agent' ? AGENT_TAB_RE : mode === 'video' ? VIDEO_TAB_RE : IMAGE_TAB_RE;
  const inGroup = imagineModeRadiogroup().find((btn) => re.test(buttonLabel(btn)));
  if (inGroup) return inGroup;
  return imagineModeTabCandidates().find((el) => re.test(buttonLabel(el))) || null;
}

function isImagineModeTabActive(tab) {
  if (!tab) return false;
  if (tab.getAttribute('aria-checked') === 'true') return true;
  return tab.getAttribute('aria-selected') === 'true'
    || tab.getAttribute('aria-pressed') === 'true'
    || tab.getAttribute('data-state') === 'active';
}

async function selectImagineModeTab(mode, selectors) {
  if (mode === 'agent' && isOnAgentPage()) return true;
  if (mode === 'video' && isOnVideoPage()) return true;
  if (mode === 'image' && isOnImagePage()) return true;

  let tab = findImagineModeTab(mode);
  if (!tab && mode === 'agent') {
    tab = firstVisible('a[href="/imagine/agent"], a[href*="/imagine/agent"]');
  }
  if (!tab && mode === 'agent' && selectors?.agentModeButton) {
    tab = firstVisible(selectors.agentModeButton);
  }
  if (!tab && mode === 'video' && selectors?.videoModeButton) {
    tab = firstVisible(selectors.videoModeButton);
  }
  if (!tab && mode === 'image' && selectors?.imageModeButton) {
    tab = firstVisible(selectors.imageModeButton);
  }
  if (!tab) {
    log('warn', `Imagine ${mode} tab not found`);
    return false;
  }

  log('info', `Imagine tab: ${mode}`);
  tab.scrollIntoView({ block: 'center', inline: 'center' });
  await sleep(120);
  tab.click();
  await sleep(500);
  return true;
}

function spaNavigate(path) {
  const next = new URL(path, window.location.origin);
  const target = `${next.pathname}${next.search}${next.hash}`;
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` === target) return;
  window.history.pushState({}, '', target);
  window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
}

async function waitForAgentPage(promptWait, timeoutMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (isOnAgentPage() && firstVisible(promptWait)) return;
    await sleep(250);
  }
  throw new Error('Grok Agent tab not reached');
}

function inspectGrokNavigation() {
  const vis = (el) => isVisible(el);
  const links = jq('a[href]').toArray().filter(vis).map((a) => ({
    href: a.getAttribute('href'),
    text: buttonLabel(a).slice(0, 80),
  })).filter((x) => /imagine|agent/i.test(`${x.href} ${x.text}`));
  const tabs = imagineModeTabCandidates().map((b) => ({
    tag: b.tagName,
    href: b.getAttribute('href'),
    text: buttonLabel(b).slice(0, 80),
    selected: b.getAttribute('aria-selected'),
    pressed: b.getAttribute('aria-pressed'),
    state: b.getAttribute('data-state'),
  }));
  return { url: window.location.href, isAgent: isOnAgentPage(), isVideo: isOnVideoPage(), isImage: isOnImagePage(), links, tabs };
}

async function maybeProbeGrokNav() {
  if (!new URLSearchParams(location.search).has('grok_probe')) return;
  const data = inspectGrokNavigation();
  const json = JSON.stringify(data, null, 2);
  log('info', 'Grok nav probe', json);
  try {
    await navigator.clipboard.writeText(json);
  } catch {
    // ponytail: clipboard may need user gesture; logs still have payload
  }
}

async function clickNavLink(selector, label) {
  if (!selector || !firstVisible(selector)) return false;
  await clickSelector(selector, label, 10000);
  return true;
}

async function ensureImaginePage(selectors, mode) {
  const promptWait = promptWaitSelector(selectors);
  const wantTab = resolveImagineModeTab(mode);

  if (!window.location.href.includes('/imagine') || window.location.href.includes('saved')) {
    await clickNavLink(selectors.imagineLink, 'Imagine link');
    await sleep(500);
  }

  if (wantTab === 'agent') {
    if (!isOnAgentPage()) {
      let switched = await selectImagineModeTab('agent', selectors);
      if (!switched) switched = await clickNavLink(selectors.agentLink, 'Agent link');
      if (!switched && !isOnAgentPage()) spaNavigate('/imagine/agent');
    }
    await waitForAgentPage(promptWait);
    return;
  }

  if (wantTab === 'video' && !isOnVideoPage()) {
    await selectImagineModeTab('video', selectors);
  } else if (wantTab === 'image' && !isOnImagePage()) {
    await selectImagineModeTab('image', selectors);
  } else if (!wantTab && isOnAgentPage()) {
    await selectImagineModeTab('image', selectors);
  }

  await waitForSelector(promptWait, 'Grok Imagine page', 60000);
}

async function clickAndRetry(selector, label, maxRetries = 5, timeoutMs = 3000) {
  for (let i = 0; i < maxRetries; i++) {
    const el = await maybeClick(selector, label, timeoutMs);
    if (el) return el;
    await sleep(500);
  }
  return null;
}

async function isElementVisible(selector) {
  const el = firstVisible(selector);
  return !!el;
}

async function handleComparisonImage(selectors) {
  const img = firstVisible(selectors.comparisonImage);
  if (img) {
    log('info', 'Found comparison image, ignoring...');
    await maybeClick(selectors.ignoreComparisonImageButton, 'Ignore comparison image', 3000);
  }
}

function videoDurationFromOption(videoOption) {
  return String(videoOption || '').split('-concat')[0].trim();
}

function findVideoRadioButton(label) {
  const want = String(label).toLowerCase();
  return jq('button[role="radio"]').toArray().find((el) => {
    if (!isVisible(el) || el.disabled) return false;
    return buttonLabel(el).toLowerCase() === want;
  }) || null;
}

async function clickVideoRadio(label) {
  const btn = findVideoRadioButton(label);
  if (!btn) {
    log('warn', `Video radio "${label}" not found`);
    return false;
  }
  if (btn.getAttribute('aria-checked') === 'true') return true;
  btn.scrollIntoView({ block: 'center', inline: 'center' });
  await sleep(120);
  btn.click();
  await sleep(350);
  return true;
}

async function selectVideoDuration(videoOption) {
  const duration = videoDurationFromOption(videoOption);
  if (!duration) return;
  log('info', `Video duration: ${duration}`);
  await clickVideoRadio(duration);
}

async function selectVideoQualitySetting(payload) {
  const quality = payload.autoDownloadResourceQuality;
  if (!quality || quality === 'no-download') return;
  const label = quality === '720p' || quality === '1080p' ? '720p' : '480p';
  log('info', `Video quality: ${label}`);
  await clickVideoRadio(label);
}

async function configureVideo(payload, selectors) {
  const isContinuation = !!payload.outputPreviousPrompt;

  if (!isContinuation) {
    if (!isOnVideoPage()) await selectImagineModeTab('video', selectors);

    if (await isElementVisible(selectors.aspectRatioButton)) {
      await maybeNativeClick(selectors.aspectRatioButton, 'Aspect ratio menu', 5000);
      const aspectRatio = normalizeAspectRatio(payload.aspectRatio);
      const byLabel = withToken(selectors.aspectRatioTemplate, { aspectRatio });
      const byMenu = withToken(selectors.aspectRatioTemplateV3, { aspectRatio });
      const found = await waitForVisible(`${byLabel}, ${byMenu}`, 3000);
      if (found) await maybeClick(`${byLabel}, ${byMenu}`, `Aspect ratio ${aspectRatio}`, 5000);
      else log('warn', `Could not find aspect ratio option: ${aspectRatio}`);
    }

    log('info', `Video option: ${payload.videoOption || '(default)'}`);
    await selectVideoDuration(payload.videoOption);
    await selectVideoQualitySetting(payload);

    // ponytail: selector fallbacks if label radios move
    const videoOption = String(payload.videoOption || '');
    if (videoOption.includes('6s') && !findVideoRadioButton('6s') && await isElementVisible(selectors.videoLength6sItem)) {
      await maybeClick(selectors.videoLength6sItem, '6s video length option', 4000);
    } else if (videoOption.includes('10s') && !findVideoRadioButton('10s') && await isElementVisible(selectors.videoLength10sItem)) {
      await maybeClick(selectors.videoLength10sItem, '10s video length option', 4000);
    } else if (videoOption.includes('15s') && !findVideoRadioButton('15s') && await isElementVisible(selectors.videoLength15sItem)) {
      await maybeClick(selectors.videoLength15sItem, '15s video length option', 4000);
    }
  }

  if (payload.images?.length) {
    for (let index = 0; index < payload.images.length; index += 1) {
      log('info', `Uploading image ${index + 1}/${payload.images.length}...`);
      await uploadImages({ ...payload, images: [payload.images[index]] }, selectors);
    }
  } else if (payload.mode === 'imageToVideo' || payload.mode === 'componentsToVideo') {
    log('warn', 'No images provided for ImageToVideo/ComponentsToVideo mode');
  }
}

async function configureImage(payload, selectors) {
  const isContinuation = !!payload.outputPreviousPrompt;

  if (!isContinuation) {
    if (!isOnImagePage()) await selectImagineModeTab('image', selectors);
    if (payload.mode === 'textToImage' || resolveImageModel(payload) !== 'speed') {
      await selectImageModel({ ...payload, imageModel: 'quality' });
    } else {
      await selectImageModel(payload);
    }

    if (jq(selectors.numberOfImagesOutputButton).toArray().some(isVisible)) {
      await clickSelector(selectors.numberOfImagesOutputButton, 'Select Number of Images', 4000);

      let countOption = '4';
      if (payload.outputCount > 8) countOption = '12';
      else if (payload.outputCount > 4) countOption = '8';

      const template = withToken(selectors.numberOfImagesOutputTemplate, { numberOfImages: countOption });
      log('info', `Looking for number of images: ${countOption}`);
      const found = await waitForVisible(template, 3000);
      if (found) await clickSelector(template, `Number of images option: ${countOption}`, 4000);
      else log('warn', `Could not find number of images option: ${countOption}`);
    }

    if (jq(selectors.aspectRatioButton).toArray().some(isVisible)) {
      await clickSelector(selectors.aspectRatioButton, 'Select Aspect Ratio Mode', 5000);
      const aspectRatio = normalizeAspectRatio(payload.aspectRatio);
      const menu = withToken(selectors.aspectRatioTemplateV3, { aspectRatio });
      log('info', `Looking for aspect ratio: ${aspectRatio}`);
      const found = await waitForVisible(menu, 3000);
      if (found) await clickSelector(menu, `Aspect ratio option: ${aspectRatio}`, 5000);
      else log('warn', `Could not find aspect ratio option: ${aspectRatio}`);
    }
  }

  if (payload.images?.length) {
    for (let index = 0; index < payload.images.length; index += 1) {
      log('info', `Uploading image ${index + 1}/${payload.images.length}...`);
      try {
        await uploadImages({ ...payload, images: [payload.images[index]] }, selectors);
        log('info', `Image ${index + 1} uploaded successfully`);
      } catch (error) {
        log('warn', `Failed to upload image ${index + 1}, but continuing...`, error);
      }
    }
  } else if (payload.mode === 'imageToImage') {
    log('warn', 'No images provided for ImageToImage mode');
  }
}


function articleRoot(selectors) {
  return firstVisible(selectors.mainArticle) || document;
}

function getPercentageFromPage(selectors) {
  const button = firstVisible(selectors.generateVideoButton);
  if (button) {
    const text = button.textContent || '';
    const match = text.match(/(\d{1,3})\s*%/);
    if (match) return Math.min(99, Number(match[1]));
  }

  const svg = firstVisible(selectors.percentageSvg);
  if (svg) {
    const dasharray = svg.getAttribute('stroke-dasharray') || '';
    const dashoffset = svg.getAttribute('stroke-dashoffset') || '';
    const total = parseFloat(dasharray.split(' ')[0]);
    const offset = parseFloat(dashoffset);
    if (!isNaN(total) && !isNaN(offset) && total > 0) {
      return Math.max(0, Math.min(99, Math.round(100 * (1 - offset / total))));
    }
  }

  const span = firstVisible(selectors.percentageSpan);
  if (span) {
    const match = span.textContent?.trim().match(/(\d{1,3})\s*%/);
    if (match) return Math.min(99, Number(match[1]));
  }

  return null;
}

async function waitForGeneration(payload, selectors, group) {
  const wantsImage = payload.mode?.includes('ToImage');
  const goal = wantsImage ? Math.max(1, Number(payload.outputCount) || 1) : 1;
  const started = Date.now();
  const timeoutMs = 15 * 60 * 1000;
  // ponytail: reference không chờ stable 5–10s sau khi video/img đã có src — chỉ T2I (waitForTextToImageResources) giữ 10s

  while (Date.now() - started < timeoutMs) {
    if (group?.isCancelling) throw new Error('Cancelled');
    await waitWhilePaused(group);

    const root = articleRoot(selectors);
    let media;

    if (wantsImage) {
      const selector =
        payload.mode === 'imageToImage' || payload.outputPreviousPrompt?.nextPromptEditImage
          ? `${selectors.imageToImageResultGrid || 'div.grid'} img`
          : selectors.generatedImageItem || 'div[role="listitem"] img';
      media = jq(selector, root)
        .toArray()
        .filter((el) => {
          const src = el.currentSrc || el.src || el.getAttribute('src');
          return src && !src.startsWith('data:image/svg') && isVisible(el);
        });
      if (!media.length) {
        media = jq('img[src]', root).toArray().filter((el) => {
          const src = el.currentSrc || el.src || el.getAttribute('src');
          return src && isVisible(el);
        });
      }
    } else {
      media = jq('video[src], video source[src]', root)
        .toArray()
        .map((el) => (el.tagName?.toLowerCase() === 'source' ? el.parentElement : el))
        .filter(Boolean)
        .filter((el) => {
          const src = el.currentSrc || el.src || el.getAttribute('src');
          return src && isVisible(el);
        });
    }

    if (media.length >= goal) {
      return media.slice(0, goal);
    }

    const progress = getPercentageFromPage(selectors);
    if (progress != null) emitProgress(payload, progress);

    await sleep(2000);
  }

  throw new Error('Timed out waiting for Grok output');
}

async function setDownloadFolder(payload, mediaCount) {
  const prompt = getPromptText(payload);
  const stem = downloadFileStem(prompt, {
    promptIndex: payload.promptIndex || 1,
    variantCount: mediaCount,
  });
  const prefix = `${stem}_`;
  await chrome.runtime.sendMessage({
    type: 'SET_FOLDER_NAME',
    folderName: payload.folderName || '',
    prefix,
    autoChangeFileName: payload.autoChangeFileName !== false,
  });
}

async function clickNativeDownload(selectors, payload) {
  await maybeClick(selectors.moreOptionsButton, 'More options', 5000, articleRoot(selectors));
  const downloadBtn = await waitForSelector(selectors.downloadButton, 'Download button', 10000);
  await nativeClick(downloadBtn);
}

async function downloadByUrl(media, payload) {
  const prompt = getPromptText(payload);
  const baseStem = downloadFileStem(prompt, {
    promptIndex: payload.promptIndex || 1,
    variantCount: media.length,
  });

  for (let index = 0; index < media.length; index += 1) {
    const url = await mediaToDownloadUrl(media[index]);
    if (!url) continue;
    const ext = extensionForMedia(media[index], url);
    const suffix = media.length > 1 ? `-${String(index + 1).padStart(2, '0')}` : '';
    const response = await chrome.runtime.sendMessage({
      type: 'DOWNLOAD_RESOURCE',
      url,
      filename: `${baseStem}${suffix}.${ext}`,
      folder: payload.folderName || '',
      autoChangeFileName: payload.autoChangeFileName !== false,
    });
    if (response?.success === false) throw new Error(response.error || 'Download failed');
    await sleep(500);
  }
}

function getMediaUrl(el) {
  if (!el) return '';
  if (el.tagName?.toLowerCase() === 'video') {
    return el.currentSrc || el.src || $(el).find('source[src]').attr('src') || '';
  }
  return el.currentSrc || el.src || el.getAttribute('src') || '';
}

async function mediaToDownloadUrl(el) {
  const src = getMediaUrl(el);
  if (!src) return null;
  if (!src.startsWith('blob:')) return src;

  try {
    const response = await fetch(src);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Failed to read blob media'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function extensionForMedia(el, url) {
  if (el.tagName?.toLowerCase() === 'video' || /\.(mp4|webm)(?:[?#]|$)/i.test(url)) return 'mp4';
  const match = url.match(/\.([a-z0-9]{3,4})(?:[?#]|$)/i);
  return match?.[1]?.toLowerCase() || 'jpg';
}

function normalizeSelectors(configSelectors) {
  return {
    ...FALLBACK_FLOW_CONFIG.selectors,
    ...(configSelectors || {}),
  };
}

async function handleUpscale(selectors, payload) {
  const quality = normalizeVideoQuality(payload.autoDownloadResourceQuality);
  if (quality !== '1080p' && !quality.includes('upscale')) return false;

  const hdBtn = firstVisible(selectors.hdButton);
  if (hdBtn) {
    log('info', 'HD button already available, skipping upscale');
    return true;
  }

  await maybeClick(selectors.moreOptionsButton, 'More options', 5000, articleRoot(selectors));
  const upscaleItem = await maybeClick(selectors.upscaleMenuItem, 'Upscale menu item', 3000);
  if (!upscaleItem) return false;

  await sleep(1000);
  if (quality === '1080p') {
    await maybeClick(selectors.upscale1080pOption, '1080p option', 3000);
  } else {
    await maybeClick(selectors.upscale720pOption, '720p upscale option', 3000);
  }

  log('info', 'Upscale initiated, waiting for HD button...');
  for (let i = 0; i < 30; i++) {
    if (firstVisible(selectors.hdButton)) {
      log('info', 'Upscale complete (HD button found)');
      return true;
    }
    await sleep(2000);
  }
  return false;
}

async function downloadResult(media, payload, selectors) {
  const quality = normalizeVideoQuality(payload.autoDownloadResourceQuality);
  if (quality === 'no-download') return;

  const wantsImage = payload.mode?.includes('ToImage');
  const requested = Math.max(1, Number(payload.outputCount) || media.length || 1);
  const selected = media.slice(0, wantsImage ? requested : 1);

  if (wantsImage) {
    if (payload.mode === 'imageToImage' || payload.outputPreviousPrompt?.nextPromptEditImage) {
      await maybeClick(selectors.moreOptionsButton, 'More options', 5000, articleRoot(selectors));
      const downloadBtn = await waitForSelector(selectors.downloadButton, 'Download button', 10000);
      await nativeClick(downloadBtn);
      return;
    }
    await downloadByUrl(selected, payload);
    return;
  }

  await handleUpscale(selectors, payload);

  try {
    await setDownloadFolder(payload, selected.length);
    await clickNativeDownload(selectors, payload);
  } catch {
    await downloadByUrl(selected, payload);
  }
}

async function waitForTextToImageResources(payload, selectors, isCancelled, group) {
  const goal = Math.max(1, Number(payload.outputCount) || 1);
  const stableMs = 10000;
  const mediaCache = new Map();
  let clickedGenerate = false;

  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (isCancelled?.()) throw new Error('Cancelled');
    await waitWhilePaused(group);

    const article = lastMainArticle(selectors);
    if (article) {
      if (!clickedGenerate && firstVisible(selectors.generateVideoButton, article)) {
        clickedGenerate = true;
        await maybeClick(selectors.generateVideoButton, 'Generate video button', 5000, article);
      }

      const now = Date.now();
      const images = jq(selectors.generatedImageItem, article).toArray();
      for (const img of images) {
        const src = img.currentSrc || img.src || img.getAttribute('src');
        if (!src) continue;
        const cached = mediaCache.get(img);
        if (!cached || cached.src !== src) {
          mediaCache.set(img, { src, firstSeen: now });
        }
      }

      const ready = images.filter((img) => {
        const src = img.currentSrc || img.src || img.getAttribute('src');
        if (!src) return false;
        const cached = mediaCache.get(img);
        return cached && now - cached.firstSeen >= stableMs;
      });

      if (ready.length >= goal && ready[0]?.src) {
        log('info', `Found ${ready.length} resource(s) (Goal: ${goal})`);
        emitProgress(payload, 100, 'completed');
        return ready.slice(0, goal);
      }

      if (!payload.outputPreviousPrompt?.nextPromptEditImage) {
        const pct = Math.min(Math.round((ready.length / goal) * 100), 99);
        emitProgress(payload, pct, 'generating');
        log('info', `Found ${ready.length}/${goal} images. Waiting...`);
      }
    } else {
      log('info', `Attempt ${attempt + 1} - Searching for resource...`);
    }

    await sleep(2000);
  }

  throw new Error('Could not find any resource elements with src after waiting');
}

async function downloadTextToImageResources(media, payload, selectors, isCancelled) {
  const quality = String(payload.autoDownloadResourceQuality || '').toLowerCase();
  if (quality === 'no-download') {
    log('info', `Skipping download for prompt ${payload.promptIndex} (no-download)`);
    return;
  }

  await handleComparisonImage(selectors);

  const indexLabel = String(payload.promptIndex || 1).padStart(3, '0');
  const stem = sanitizePromptFilename(payload.prompt);
  const folder = String(payload.folderName || '').trim();

  await chrome.runtime.sendMessage({
    type: 'SET_FOLDER_NAME',
    folderName: folder,
    prefix: `${indexLabel}_${stem}_`,
    autoChangeFileName: payload.autoChangeFileName !== false,
  });

  if (jq(selectors.moreOptionsButton).length) {
    await maybeClick(selectors.moreOptionsButton, 'Open more options button', 5000, lastMainArticle(selectors) || document);
  }

  log('info', `Starting to download ${media.length} image(s) for prompt ${payload.promptIndex}...`);

  for (let index = 0; index < media.length; index += 1) {
    if (isCancelled?.()) throw new Error('Cancelled');

    const src = getMediaUrl(media[index]);
    if (!src) {
      log('warn', `Resource ${index + 1} has no src, skipping...`);
      continue;
    }

    const autoName = payload.autoChangeFileName !== false;
    let filename;
    let downloadFolder = folder;

    if (autoName) {
      filename = `${indexLabel}_${stem}.jpg`;
    } else {
      try {
        filename = new URL(src, window.location.href).pathname.split('/').pop() || `${indexLabel}_resource_${index + 1}.jpg`;
      } catch {
        filename = `${indexLabel}_resource_${index + 1}.jpg`;
      }
      downloadFolder = '';
    }

    const response = await chrome.runtime.sendMessage({
      type: 'DOWNLOAD_RESOURCE',
      url: src,
      filename,
      folder: downloadFolder,
      autoChangeFileName: autoName,
    }).catch((error) => ({ success: false, error: error.message || String(error) }));

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to initiate download');
    }

    log('info', `Resource ${payload.promptIndex} downloaded: ${filename}`);
    await sleep(500);
  }
}

async function runTextToImagePayload(payload, config, group) {
  const selectors = normalizeSelectors(config.selectors);
  const steps = [
    { name: 'Redirect to Imagine', status: 'pending' },
    { name: 'Configure image', status: 'pending' },
    { name: 'Fill Prompt', status: 'pending' },
    { name: 'Check & Download Resource', status: 'pending' },
  ];
  const isCancelled = () => group.isCancelling;

  steps[0].status = 'running';
  if (!payload.outputPreviousPrompt?.nextPromptEditImage) {
    await ensureImaginePage(selectors, payload.mode);
  }
  steps[0].status = 'completed';

  if (isCancelled()) throw new Error('Cancelled');

  steps[1].status = 'running';
  await handleComparisonImage(selectors);
  await configureImage(payload, selectors);
  steps[1].status = 'completed';

  if (isCancelled()) throw new Error('Cancelled');

  steps[2].status = 'running';
  await fillPromptExecCommand(payload, selectors);
  steps[2].status = 'completed';

  log('info', 'Waiting for generation to start...');
  await sleep(5000);

  if (isCancelled()) throw new Error('Cancelled');

  steps[3].status = 'running';
  const media = await waitForTextToImageResources(payload, selectors, isCancelled, group);
  await downloadTextToImageResources(media, payload, selectors, isCancelled);
  steps[3].status = 'completed';

  return { success: true, steps };
}

async function runPayload(payload, config, group) {
  if (payload.mode === 'textToImage') {
    return runTextToImagePayload(payload, config, group);
  }

  const selectors = normalizeSelectors(config.selectors);
  const wantsImage = payload.mode?.includes('ToImage');
  const wantsVideo = payload.mode?.includes('ToVideo');
  const steps = [
    { name: 'Redirect to Imagine', status: 'pending' },
    { name: 'Configure', status: 'pending' },
    { name: 'Fill Prompt', status: 'pending' },
    { name: 'Wait for Result', status: 'pending' },
    { name: 'Download', status: 'pending' },
  ];

  steps[0].status = 'running';
  // Small zoom like old extension
  const zoomFactor = (payload.mode === 'agentAutomation' || wantsImage) ? 0.67 : 1.0;
  try {
    await chrome.runtime.sendMessage({ type: 'SET_ZOOM', zoomFactor });
    await sleep(600);
  } catch (e) {}

  await ensureImaginePage(selectors, payload.mode);
  steps[0].status = 'completed';

  if (group.isCancelling) throw new Error('Cancelled');

  steps[1].status = 'running';
  await handleComparisonImage(selectors);
  if (payload.mode !== 'agentAutomation') {
    if (wantsVideo) await configureVideo(payload, selectors);
    else if (wantsImage) await configureImage(payload, selectors);
  }
  steps[1].status = 'completed';

  if (group.isCancelling) throw new Error('Cancelled');

  steps[2].status = 'running';
  await fillPromptExecCommand(payload, selectors);
  steps[2].status = 'completed';
  emitProgress(payload, 10);

  if (group.isCancelling) throw new Error('Cancelled');

  steps[3].status = 'running';
  const media = await waitForGeneration(payload, selectors, group);
  emitProgress(payload, 100, 'completed');
  steps[3].status = 'completed';

  steps[4].status = 'running';
  await downloadResult(media, payload, selectors);
  steps[4].status = 'completed';

  return { success: true, steps };
}

async function runGroup(group) {
  const config = await loadConfig();
  activeGroupId = group.id;
  group.status = 'running';
  emitStatus(group);

  for (let index = 0; index < group.payloads.length; index += 1) {
    if (group.isCancelling) break;
    await waitWhilePaused(group);
    if (group.isCancelling) break;

    if (index > 0) {
      const min = group.promptDelaySecondsMin || 0;
      const max = group.promptDelaySecondsMax || 0;
      if (min > 0 && max > 0) {
        const delay = Math.round((min >= max ? min : min + Math.random() * (max - min)) * 1000);
        let end = Date.now() + delay;
        group.delayEndsAt = end;
        group.delayPromptIndex = index;
        group.delayTotalSeconds = Math.ceil(delay / 1000);
        group.promptDelayEndsAt = { ...(group.promptDelayEndsAt || {}), [index]: end };
        while (Date.now() < end) {
          if (group.isCancelling) break;
          await waitWhilePaused(group);
          if (group.delayEndsAt > end) end = group.delayEndsAt;
          if (group.isCancelling) break;
          group.delayRemainingSeconds = Math.max(0, Math.ceil((end - Date.now()) / 1000));
          emitStatus(group);
          await sleep(1000);
        }
        group.delayRemainingSeconds = 0;
        group.delayEndsAt = null;
        group.delayPromptIndex = null;
        group.delayTotalSeconds = null;
      }
    }

    const payload = { ...group.payloads[index], groupId: group.id };
    const promptIndex = payload.promptIndex || index + 1;
    const retryLimit = payload.maxRetries ?? 1;
    let attempt = 0;
    let result = null;

    group.currentPromptIndex = index;
    emitStatus(group);

    while (attempt <= retryLimit && !group.isCancelling) {
      try {
        result = await runPayload(payload, config, group);
        break;
      } catch (error) {
        result = { success: false, error: error.message || String(error) };
        group.retryCountByIndex[index] = attempt + 1;
        log('error', `Prompt ${promptIndex} failed`, error);
        attempt += 1;
        if (attempt <= retryLimit) await sleep(1500);
      }
    }

    group.results.push({
      index,
      promptIndex,
      success: !!result?.success,
      downloadComplete: true,
      steps: result?.steps,
      error: result?.success ? undefined : result?.error || 'Unknown error',
      cancelled: !!group.isCancelling,
    });
    group.processedCount += 1;
    group.currentPromptIndex = undefined;
    emitStatus(group);
  }

  group.status = group.isCancelling ? 'cancelled' : group.results.every((item) => item.success) ? 'completed' : 'error';
  activeGroupId = null;
  emitStatus(group);
}

function enqueueGroup(message) {
  const payloads = (message.payloads || []).map((payload) => {
    if (payload.imageIds?.length) {
      return {
        ...payload,
        images: payload.imageIds.map((id) => imageStore[id]).filter(Boolean),
      };
    }
    return payload;
  });

  const group = {
    id: message.groupId || `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payloads,
    concurrentPrompts: 1,
    promptDelaySecondsMin: message.promptDelaySecondsMin || 0,
    promptDelaySecondsMax: message.promptDelaySecondsMax || 0,
    status: 'queued',
    createdAt: Date.now(),
    processedCount: 0,
    totalCount: payloads.length,
    isCancelling: false,
    isPaused: false,
    results: [],
    retryCountByIndex: {},
  };

  groups.push(group);
  emitStatus(group);
  return group.id;
}

function cancelGroup(groupId) {
  const group = groups.find((item) => item.id === groupId);
  if (!group) return { success: false, error: 'Prompt group not found' };
  group.isCancelling = true;
  if (group.status === 'queued') group.status = 'cancelled';
  emitStatus(group);
  return { success: true, cancelling: true };
}

function pauseGroup(groupId) {
  const group = groups.find((item) => item.id === groupId);
  if (!group) return { success: false, error: 'Prompt group not found' };
  if (group.status !== 'running') {
    return { success: false, error: 'Group is not running' };
  }
  group.isPaused = true;
  group.status = 'paused';
  if (group.delayRemainingSeconds > 0 && !group.delayPauseStartedAt) {
    group.delayPauseStartedAt = Date.now();
  }
  emitStatus(group);
  return { success: true, paused: true };
}

function resumeGroup(message) {
  const group = groups.find((item) => item.id === message.groupId);
  if (!group) return { success: false, error: 'Prompt group not found' };
  if (message.payloads?.length) group.payloads = message.payloads;
  if (message.promptDelaySecondsMin != null) {
    group.promptDelaySecondsMin = message.promptDelaySecondsMin;
  }
  if (message.promptDelaySecondsMax != null) {
    group.promptDelaySecondsMax = message.promptDelaySecondsMax;
  }
  group.isCancelling = false;
  group.isPaused = false;
  group.pauseReason = null;
  extendDelayAfterPause(group);
  group.status = activeGroupId === group.id ? 'running' : 'queued';
  emitStatus(group);
  return { success: true, resumed: true, groupId: group.id };
}

function storeImage(message, sendResponse) {
  if (!message.id || !message.data) {
    sendResponse({ success: false, error: 'Missing image ID or data' });
    return;
  }
  imageStore[message.id] = message.data;
  sendResponse({ success: true });
}

function storeImageChunk(message, sendResponse) {
  const { id, chunk, chunkIndex, totalChunks } = message;
  const key = `img-${id}`;
  chunkStore[key] ||= { chunks: Array(totalChunks).fill(''), totalChunks };
  chunkStore[key].chunks[chunkIndex] = chunk;
  const receivedCount = chunkStore[key].chunks.filter(Boolean).length;
  if (receivedCount !== totalChunks) {
    sendResponse({ success: true, chunkReceived: true, receivedCount, totalChunks });
    return;
  }

  try {
    imageStore[id] = JSON.parse(chunkStore[key].chunks.join(''));
    delete chunkStore[key];
    sendResponse({ success: true });
  } catch {
    sendResponse({ success: false, error: 'Failed to parse image chunks' });
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'PREPARE_IMAGE':
      storeImage(message, sendResponse);
      return true;
    case 'PREPARE_IMAGE_CHUNK':
      storeImageChunk(message, sendResponse);
      return true;
    case 'AUTO_FILL_GROK':
      sendResponse({ success: true, groupId: enqueueGroup(message) });
      return true;
    case 'DOWNLOAD_ONLY_GROK':
      sendResponse({ success: false, error: 'Download-only is not available for Grok history yet.' });
      return true;
    case 'CANCEL_PROMPT_GROUP':
      sendResponse(cancelGroup(message.groupId));
      return true;
    case 'PAUSE_PROMPT_GROUP':
      sendResponse(pauseGroup(message.groupId));
      return true;
    case 'RESUME_PROMPT_GROUP':
      sendResponse(resumeGroup(message));
      return true;
    case 'SYNC_PROMPT_QUEUE':
      groups.forEach(emitStatus);
      sendResponse({ success: true, count: groups.length });
      return true;
    case 'SCAN_CHARACTERS':
      sendResponse({ characters: [] });
      return true;
    case 'CHECK_GROK_PAGE':
    case 'CHECK_FLOW_PAGE':
      sendResponse({ isGrokPage: isGrokPage(), isFlowPage: isGrokPage() });
      return true;
    case 'INSPECT_GROK_NAV':
      sendResponse(inspectGrokNavigation());
      return true;
    default:
      return false;
  }
});

try {
  chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_RESET' }).catch(() => {});
  chrome.runtime.sendMessage({ type: 'SET_ZOOM', zoomFactor: 1 }).catch(() => {});
  void maybeProbeGrokNav();
} catch {
  // ignored
}

(async function queueLoop() {
  for (;;) {
    const group = groups.find((item) => item.status === 'queued');
    if (!group) {
      await sleep(1000);
      continue;
    }
    try {
      await runGroup(group);
    } catch (error) {
      group.status = 'error';
      group.results.push({
        index: group.currentPromptIndex ?? 0,
        promptIndex: (group.currentPromptIndex ?? 0) + 1,
        success: false,
        downloadComplete: true,
        error: error.message || String(error),
      });
      emitStatus(group);
    } finally {
      const index = groups.indexOf(group);
      if (index >= 0) groups.splice(index, 1);
    }
  }
})();