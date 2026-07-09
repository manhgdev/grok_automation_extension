import {
  getRemoteConfig,
  FALLBACK_FLOW_CONFIG,
  isFlowPageUrl,
  SETTINGS_STORAGE_KEY,
  RESET_SETTINGS,
  migrateSettings,
  FLOW_INPUT_CONFIG,
  UI_CONFIG,
} from '@shared/config.js';
import { beginNewBrowserSession, markAllChromeWindowsClosed } from '@shared/beforeUseTipSession.js';

let panelPopupWindowId = null;

chrome.runtime.onStartup.addListener(() => {
  void beginNewBrowserSession();
});

chrome.windows.onRemoved.addListener((windowId) => {
  void chrome.windows.getAll({ windowTypes: ['normal'] }).then((windows) => {
    if (windows.length === 0) void markAllChromeWindowsClosed();
  });
  if (windowId === panelPopupWindowId) panelPopupWindowId = null;
});

async function getTabUrl(tab) {
  if (!tab) return '';
  if (tab.url) return tab.url;
  if (!tab.id) return '';
  try {
    return (await chrome.tabs.get(tab.id)).url || '';
  } catch {
    return '';
  }
}

async function detectFlowPageOnTab(tab) {
  if (!tab) return false;

  const url = await getTabUrl(tab);
  if (isFlowPageUrl(url)) return true;

  if (tab.id) {
    try {
      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { type: 'CHECK_GROK_PAGE' }, (res) => {
          void chrome.runtime.lastError;
          resolve(res);
        });
      });
      if (response?.isGrokPage || response?.isFlowPage) return true;
    } catch {
      // content script still loading
    }
  }

  return false;
}

async function getActiveBrowserTab() {
  const inWindow = await chrome.tabs.query({ active: true, currentWindow: true });
  if (inWindow[0]?.id) return inWindow[0];
  const focused = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return focused[0] ?? null;
}

/** True only when the focused browser tab is a Flow page (not a background Flow tab). */
async function isActiveTabOnFlowPage() {
  const active = await getActiveBrowserTab();
  if (!active?.id) return false;
  return detectFlowPageOnTab(active);
}

async function findFlowTab() {
  const active = await getActiveBrowserTab();
  if (active?.id && (await detectFlowPageOnTab(active))) return active;

  const tabs = await chrome.tabs.query({ url: ['*://grok.com/*', '*://*.grok.com/*'] });
  for (const tab of tabs) {
    if (tab?.id && (await detectFlowPageOnTab(tab))) return tab;
  }

  return null;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pingContentScript(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'CHECK_GROK_PAGE' }, () => {
      void chrome.runtime.lastError;
      resolve(!chrome.runtime.lastError);
    });
  });
}

async function ensureContentScript(tabId) {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (await pingContentScript(tabId)) return true;

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content.js'],
      });
    } catch {
      // may already be injected
    }

    await delay(400 + attempt * 300);
    if (await pingContentScript(tabId)) return true;
  }

  return false;
}

async function sendMessageToTab(tabId, payload) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, payload, (response) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message || 'Failed to reach Grok tab'));
      else resolve(response);
    });
  });
}

async function dispatchToFlowTab(payload) {
  const tab = await findFlowTab();
  if (!tab?.id) {
    throw new Error(
      'Switch to a Grok tab (grok.com) in this window and try again.',
    );
  }

  if (!(await ensureContentScript(tab.id))) {
    throw new Error('Cannot connect to Grok page. Refresh the Grok tab and try again.');
  }

  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await sendMessageToTab(tab.id, payload);
    } catch (error) {
      lastError = error;
      await delay(400);
      await ensureContentScript(tab.id);
    }
  }

  throw lastError ?? new Error('Failed to reach Grok tab');
}

function safeRuntimeSend(message) {
  try {
    chrome.runtime.sendMessage(message, () => {
      void chrome.runtime.lastError;
    });
  } catch {
    // ignore
  }
}

/** Side panel calls runtime.connect({ name: 'side-panel' }) on load — must have a listener. */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'side-panel') return;
  port.onDisconnect.addListener(() => {});
});

function notifyFlowPageState() {
  isActiveTabOnFlowPage()
    .then((active) => {
      safeRuntimeSend({ type: 'FLOW_PAGE_CHANGED', active });
    })
    .catch(() => {});
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    notifyFlowPageState();
  }
});

chrome.tabs.onActivated.addListener(() => {
  notifyFlowPageState();
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    notifyFlowPageState();
  }
});

const PANEL_RELAY_TYPES = new Set([
  'PROMPT_GROUP_STATUS',
  'ACTION_LOG',
  'VIDEO_GENERATION_PROGRESS',
  'CONTENT_SCRIPT_RESET',
  'MODEL_QUOTA_SWITCH',
  'UNUSUAL_ACTIVITY',
  'UNUSUAL_ACTIVITY_FIRST',
  'CONTENT_BLOCK_PROMPT',
]);

function relayToPanel(message) {
  if (!PANEL_RELAY_TYPES.has(message.type)) return;
  safeRuntimeSend(message);
}

function persistUnusualTipPending(message) {
  if (message?.type !== 'UNUSUAL_ACTIVITY_FIRST') return;
  chrome.storage.local
    .get(['unusualTipShown'])
    .then((data) => {
      if (data.unusualTipShown) return;
      return chrome.storage.local.set({
        unusualTipPending: true,
        unusualTipPayload: message.data ?? null,
      });
    })
    .catch(() => {});
}

let downloadFolder = '';
let downloadPrefix = '';
const downloadPrefixQueue = [];
let autoRenameDownloads = true;

function pushDownloadPrefix(prefix) {
  const trimmed = String(prefix || '').trim();
  downloadPrefix = trimmed;
  if (trimmed) downloadPrefixQueue.push(trimmed);
}

function takeDownloadPrefix() {
  return downloadPrefixQueue.length ? downloadPrefixQueue.shift() : downloadPrefix;
}

const pendingDownloadNames = new Map();
const recentDownloadUrls = new Map();
const RECENT_DOWNLOAD_TTL_MS = 3 * 60 * 1000;
let removeDownloadListenerTimer = null;

function recentDownloadKey(url, targetPath) {
  return `${url}\0${targetPath ?? ''}`;
}

function shouldSkipRecentDownload(url, targetPath) {
  const key = recentDownloadKey(url, targetPath);
  const at = recentDownloadUrls.get(key);
  if (!at) return false;
  if (Date.now() - at > RECENT_DOWNLOAD_TTL_MS) {
    recentDownloadUrls.delete(key);
    return false;
  }
  return true;
}

function markRecentDownload(url, targetPath) {
  recentDownloadUrls.set(recentDownloadKey(url, targetPath), Date.now());
  if (recentDownloadUrls.size > 500) {
    const now = Date.now();
    for (const [key, at] of recentDownloadUrls) {
      if (now - at > RECENT_DOWNLOAD_TTL_MS) recentDownloadUrls.delete(key);
    }
  }
}

function sanitizeDownloadSegment(segment) {
  return String(segment || '')
    .replace(/\s\|\s*[\s\S]*$/, '')
    .replace(/:/g, '.')
    .replace(/[<>"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeDownloadPath(path) {
  return String(path || '')
    .split(/[/\\]+/)
    .map(sanitizeDownloadSegment)
    .filter(Boolean)
    .join('/');
}

const debuggerAttachedTabs = new Set();

chrome.tabs.onRemoved.addListener((tabId) => {
  debuggerAttachedTabs.delete(tabId);
});

if (chrome.debugger?.onDetach) {
  chrome.debugger.onDetach.addListener((source) => {
    if (source.tabId !== undefined) {
      debuggerAttachedTabs.delete(source.tabId);
    }
  });
}

function onDownloadDeterminingFilename(item, suggest) {
  const isGrokUrl =
    item.url.includes('grok.com') ||
    item.url.includes('x.ai') ||
    item.url.startsWith('data:image/');
  const fromThisExtension = !item.byExtensionId || item.byExtensionId === chrome.runtime.id;

  if (!isGrokUrl || !fromThisExtension) return;

  const isVideo = /\.(mp4)$/i.test(item.filename || item.url);
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg|jfif)$/i.test(item.filename || item.url);

  if (!isVideo && !isImage) return;
  if (!autoRenameDownloads) return;

  if (pendingDownloadNames.has(item.url)) {
    suggest({
      filename: sanitizeDownloadPath(pendingDownloadNames.get(item.url)),
      conflictAction: 'uniquify',
    });
    pendingDownloadNames.delete(item.url);
    return;
  }

  const originalName = item.filename;
  const baseName = originalName.split('/').pop() || originalName;
  const extMatch = baseName.match(/(\.[^./\\]+)$/i);
  const ext = extMatch ? extMatch[1] : isVideo ? '.mp4' : '.jpg';

  const suggestFilename = (filename) => {
    suggest({
      filename: sanitizeDownloadPath(filename),
      conflictAction: 'uniquify',
    });
  };

  const prefix = takeDownloadPrefix();
  if (prefix) {
    suggestFilename(`${downloadFolder}${prefix}${ext}`);
    return;
  }

  suggestFilename(`${downloadFolder}${downloadPrefix}${baseName}`);
}

/** Manifest sets side_panel.default_path — only persist click-to-open behavior. */
function enableSidePanelOnActionClick() {
  if (!chrome.sidePanel?.setPanelBehavior) return;

  const openOnClick = UI_CONFIG.panelPresentation === 'sidePanel';
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: openOnClick }).catch((err) => {
    console.error('[Grok] setPanelBehavior failed:', err);
  });
}

async function openPanelPopupWindow() {
  const width = Math.max(400, Number(UI_CONFIG.panelWindowWidth) || 640);
  const height = Math.max(500, Number(UI_CONFIG.panelWindowHeight) || 920);
  const panelUrl = chrome.runtime.getURL('panel/index.html');

  if (panelPopupWindowId != null) {
    try {
      await chrome.windows.get(panelPopupWindowId);
      await chrome.windows.update(panelPopupWindowId, { focused: true, drawAttention: true });
      return;
    } catch {
      panelPopupWindowId = null;
    }
  }

  const created = await chrome.windows.create({
    url: panelUrl,
    type: 'popup',
    width,
    height,
    focused: true,
  });
  panelPopupWindowId = created?.id ?? null;
}

function openSidePanelForTab(tab) {
  if (!chrome.sidePanel?.open || !tab) return;

  const target =
    tab.windowId !== undefined
      ? { windowId: tab.windowId }
      : tab.id !== undefined
        ? { tabId: tab.id }
        : null;
  if (!target) return;

  chrome.sidePanel.open(target).catch((err) => {
    console.error('[Grok] sidePanel.open failed:', err);
  });
}

async function reloadFlowTabs() {
  try {
    const tabs = (await chrome.tabs.query({ url: ['*://grok.com/*', '*://*.grok.com/*'] })).filter(
      (tab) => tab.url && tab.url.includes('grok.com'),
    );

    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        await chrome.tabs.reload(tab.id);
      } catch {
        // tab may have closed
      }
    }
  } catch {
    // ignore query errors
  }
}

function scheduleDownloadListenerRemoval() {
  if (removeDownloadListenerTimer) {
    clearTimeout(removeDownloadListenerTimer);
  }

  removeDownloadListenerTimer = setTimeout(() => {
    removeDownloadListenerTimer = null;
    if (chrome.downloads.onDeterminingFilename.hasListener(onDownloadDeterminingFilename)) {
      chrome.downloads.onDeterminingFilename.removeListener(onDownloadDeterminingFilename);
    }
  }, 5 * 60 * 1000);
}

async function attachDebugger(tabId) {
  const target = { tabId };

  if (!debuggerAttachedTabs.has(tabId)) {
    await chrome.debugger.attach(target, '1.3');
    debuggerAttachedTabs.add(tabId);
  }
}

async function detachDebugger(tabId) {
  if (!debuggerAttachedTabs.has(tabId)) return;
  try {
    await chrome.debugger.detach({ tabId });
  } catch {
    // ignore
  }
  debuggerAttachedTabs.delete(tabId);
}

async function runWithDebugger(tabId, fn) {
  await attachDebugger(tabId);
  try {
    return await fn();
  } finally {
    if (FLOW_INPUT_CONFIG.cdpTransient) {
      await detachDebugger(tabId);
    }
  }
}

function jitterCdpPoint(x, y) {
  const spread = FLOW_INPUT_CONFIG.cdpClickJitter ?? 0;
  if (!spread) return { x, y };
  return {
    x: Math.round(x + (Math.random() - 0.5) * spread),
    y: Math.round(y + (Math.random() - 0.5) * spread),
  };
}

async function clearSiteStorage(tabId) {
  const sensitivePrefixes = [
    '__Secure',
    'SID',
    'SSID',
    'HSID',
    'APISID',
    'SAPISID',
    'LSID',
    'NID',
    '1P_JAR',
  ];

  const cookies = (await chrome.cookies.getAll({ domain: 'grok.com' })).filter(
    (cookie) => !sensitivePrefixes.some((prefix) => cookie.name.startsWith(prefix)),
  );

  await Promise.all(
    cookies.map((cookie) =>
      chrome.cookies.remove({
        url: `https://${cookie.domain.replace(/^\./, '')}${cookie.path}`,
        name: cookie.name,
      }),
    ),
  );

  if (!tabId) return;

  try {
    await attachDebugger(tabId);
    await chrome.debugger.sendCommand({ tabId }, 'Storage.clearDataForOrigin', {
      origin: 'https://grok.com',
      storageTypes: 'local_storage,session_storage,indexeddb,cache_storage,service_workers',
    });
  } finally {
    if (debuggerAttachedTabs.has(tabId)) {
      try {
        await chrome.debugger.detach({ tabId });
      } catch {
        // ignore detach errors
      }
      debuggerAttachedTabs.delete(tabId);
    }
  }
}

async function enableNetwork(tabId) {
  const target = { tabId };
  await chrome.debugger.sendCommand(target, 'Network.enable', {});
  await chrome.debugger.sendCommand(target, 'Network.setCacheDisabled', {
    cacheDisabled: true,
  });
}

enableSidePanelOnActionClick();
notifyFlowPageState();

chrome.runtime.onInstalled.addListener(async (details) => {
  enableSidePanelOnActionClick();
  if (details.reason === 'install') {
    await reloadFlowTabs();
  }
});

chrome.runtime.onStartup.addListener(() => {
  enableSidePanelOnActionClick();
});

chrome.action.onClicked.addListener((tab) => {
  if (UI_CONFIG.panelPresentation === 'popup') {
    void openPanelPopupWindow().catch((err) => {
      console.error('[Grok] openPanelPopupWindow failed:', err);
    });
    return;
  }
  openSidePanelForTab(tab);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.tab && PANEL_RELAY_TYPES.has(message.type)) {
    persistUnusualTipPending(message);
    relayToPanel(message);
  }

  switch (message.type) {
    case 'IS_FLOW_PAGE_ACTIVE':
      isActiveTabOnFlowPage()
        .then((active) => sendResponse({ active }))
        .catch(() => sendResponse({ active: false }));
      return true;

    case 'GET_FLOW_TAB_ID':
      findFlowTab()
        .then((tab) => sendResponse({ tabId: tab?.id ?? null }))
        .catch(() => sendResponse({ tabId: null }));
      return true;

    case 'DISPATCH_TO_FLOW_TAB':
      dispatchToFlowTab(message.payload)
        .then((result) => sendResponse(result ?? { success: true }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      return true;

    case 'GET_REMOTE_CONFIG':
      getRemoteConfig().then(sendResponse).catch(() => sendResponse(FALLBACK_FLOW_CONFIG));
      return true;

    case 'RESET_FLOW_SETTINGS':
      (async () => {
        try {
          const settings = migrateSettings({ ...RESET_SETTINGS });
          await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: settings });
          sendResponse({ success: true, settings });
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();
      return true;

    case 'SET_ZOOM': {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ success: false, error: 'Tab ID not found' });
        break;
      }
      chrome.tabs.setZoom(tabId, message.zoomFactor);
      sendResponse({ success: true });
      break;
    }

    case 'DOWNLOAD_RESOURCE':
    case 'DOWNLOAD_VIDEO': {
      const { url, filename, folder, autoChangeFileName } = message;

      if (autoChangeFileName !== false) {
        const fullPath = folder ? `${folder}/${filename}` : filename;
        const safePath = sanitizeDownloadPath(fullPath);

        if (shouldSkipRecentDownload(url, safePath)) {
          sendResponse({ success: true, downloadId: null, skipped: true });
          break;
        }

        pendingDownloadNames.set(url, safePath);

        chrome.downloads.download({ url, filename: safePath, saveAs: false }, (downloadId) => {
          const error = chrome.runtime?.lastError;
          if (!error && downloadId) markRecentDownload(url, safePath);
          sendResponse(
            !error && downloadId
              ? { success: true, downloadId }
              : { success: false, error: error?.message || 'Failed to start download' },
          );
        });
      } else {
        if (shouldSkipRecentDownload(url, '')) {
          sendResponse({ success: true, downloadId: null, skipped: true });
          break;
        }

        chrome.downloads.download({ url, saveAs: false }, (downloadId) => {
          const error = chrome.runtime?.lastError;
          if (!error && downloadId) markRecentDownload(url, '');
          sendResponse(
            !error && downloadId
              ? { success: true, downloadId }
              : { success: false, error: error?.message || 'Failed to start download' },
          );
        });
      }

      return true;
    }

    case 'DOWNLOAD_TEXT_BLOB': {
      const { content, filename, folder } = message;
      const safeName = sanitizeDownloadSegment(filename || 'error.txt');
      const fullPath = folder?.trim()
        ? sanitizeDownloadPath(`${folder.trim()}/${safeName}`)
        : sanitizeDownloadSegment(safeName);
      const text = String(content ?? '');
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      chrome.downloads.download({ url, filename: fullPath, saveAs: false }, (downloadId) => {
        const error = chrome.runtime?.lastError;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        sendResponse(
          !error && downloadId
            ? { success: true, downloadId, filename: fullPath }
            : { success: false, error: error?.message || 'Failed to download text file' },
        );
      });
      return true;
    }

    case 'SET_FOLDER_NAME': {
      const { folderName, prefix, autoChangeFileName } = message;

      if (typeof folderName === 'string') {
        downloadFolder = folderName.trim() ? `${folderName.trim()}/` : '';
      }

      if (typeof prefix === 'string') {
        pushDownloadPrefix(prefix);
      }

      if (typeof autoChangeFileName === 'boolean') {
        autoRenameDownloads = autoChangeFileName;
      }

      if (autoRenameDownloads) {
        if (removeDownloadListenerTimer) {
          clearTimeout(removeDownloadListenerTimer);
          removeDownloadListenerTimer = null;
        }

        if (!chrome.downloads.onDeterminingFilename.hasListener(onDownloadDeterminingFilename)) {
          chrome.downloads.onDeterminingFilename.addListener(onDownloadDeterminingFilename);
        }
      } else {
        if (removeDownloadListenerTimer) {
          clearTimeout(removeDownloadListenerTimer);
          removeDownloadListenerTimer = null;
        }

        if (chrome.downloads.onDeterminingFilename.hasListener(onDownloadDeterminingFilename)) {
          chrome.downloads.onDeterminingFilename.removeListener(onDownloadDeterminingFilename);
        }
      }

      sendResponse({ success: true });
      break;
    }

    case 'PROMPT_GROUP_STATUS': {
      const status = message.data?.status;
      if (status === 'completed' || status === 'cancelled' || status === 'error') {
        scheduleDownloadListenerRemoval();
      }
      break;
    }

    case 'CS':
      (async () => {
        try {
          let tabId = message.tabId ?? sender.tab?.id;
          if (!tabId) {
            const tab = await findFlowTab();
            tabId = tab?.id;
          }
          if (!tabId) {
            sendResponse({ success: false, error: 'No Grok tab found' });
            return;
          }
          await clearSiteStorage(tabId);
          sendResponse({ success: true, tabId });
        } catch (error) {
          sendResponse({ success: false, error: String(error) });
        }
      })();
      return true;

    case 'CA': {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ success: false, error: 'No tab ID' });
        break;
      }

      (async () => {
        try {
          await attachDebugger(tabId);
          sendResponse({ success: true });
          if (FLOW_INPUT_CONFIG.cdpTransient) {
            await detachDebugger(tabId);
          }
        } catch (error) {
          const messageText = error instanceof Error ? error.message : String(error);
          if (!messageText.includes('already attached')) {
            sendResponse({ success: false, error: messageText });
            return;
          }
          debuggerAttachedTabs.add(tabId);
          sendResponse({ success: true });
          if (FLOW_INPUT_CONFIG.cdpTransient) {
            await detachDebugger(tabId);
          }
        }
      })();
      return true;
    }

    case 'CD': {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ success: false, error: 'No tab ID' });
        break;
      }

      (async () => {
        const target = { tabId };
        try {
          if (debuggerAttachedTabs.has(tabId)) {
            await chrome.debugger.detach(target);
            debuggerAttachedTabs.delete(tabId);
          }
          sendResponse({ success: true });
        } catch (error) {
          debuggerAttachedTabs.delete(tabId);
          sendResponse({ success: false, error: String(error) });
        }
      })();
      return true;
    }

    case 'CIT': {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ success: false, error: 'No tab ID' });
        break;
      }

      (async () => {
        try {
          await runWithDebugger(tabId, async () => {
            await chrome.debugger.sendCommand({ tabId }, 'Input.insertText', { text: message.text });
          });
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: String(error) });
        }
      })();
      return true;
    }

    case 'CK': {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ success: false, error: 'No tab ID' });
        break;
      }

      (async () => {
        try {
          await runWithDebugger(tabId, async () => {
            const keyEvent = {
              key: message.key,
              code: message.code,
              windowsVirtualKeyCode: message.keyCode,
              nativeVirtualKeyCode: message.keyCode,
            };

            if (message.text !== undefined) {
              keyEvent.text = message.text;
              keyEvent.unmodifiedText = message.text;
            }

            if (message.modifiers !== undefined) {
              keyEvent.modifiers = message.modifiers;
            }

            if (message.keyType) {
              await chrome.debugger.sendCommand(
                { tabId },
                'Input.dispatchKeyEvent',
                { type: message.keyType, ...keyEvent },
              );
            } else {
              await chrome.debugger.sendCommand(
                { tabId },
                'Input.dispatchKeyEvent',
                { type: 'keyDown', ...keyEvent },
              );
              await chrome.debugger.sendCommand(
                { tabId },
                'Input.dispatchKeyEvent',
                { type: 'keyUp', ...keyEvent },
              );
            }
          });
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: String(error) });
        }
      })();
      return true;
    }

    case 'CH': {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ success: false, error: 'No tab ID' });
        break;
      }

      (async () => {
        try {
          const { x, y } = jitterCdpPoint(message.x, message.y);
          await runWithDebugger(tabId, async () => {
            await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
              type: 'mouseMoved',
              x,
              y,
              button: 'none',
              modifiers: 0,
            });
          });
          sendResponse({ success: true });
        } catch (error) {
          const messageText = error instanceof Error ? error.message : String(error);
          sendResponse({ success: false, error: messageText });
        }
      })();
      return true;
    }

    case 'CC': {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ success: false, error: 'No tab ID' });
        break;
      }

      (async () => {
        const target = { tabId };
        const { x, y } = jitterCdpPoint(message.x, message.y);

        const click = async () => {
          await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            x,
            y,
            button: 'none',
            modifiers: 0,
          });
          await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x,
            y,
            button: 'left',
            buttons: 1,
            clickCount: 1,
            modifiers: 0,
          });
          await chrome.debugger.sendCommand(target, 'Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x,
            y,
            button: 'left',
            buttons: 0,
            clickCount: 1,
            modifiers: 0,
          });
        };

        try {
          await runWithDebugger(tabId, click);
          sendResponse({ success: true });
        } catch (error) {
          const messageText = error instanceof Error ? error.message : String(error);
          sendResponse({ success: false, error: messageText });
        }
      })();
      return true;
    }

    default:
      return false;
  }

  return false;
});
