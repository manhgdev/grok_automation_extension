import { ref } from 'vue';
import { i18n } from '@/i18n/index.js';
import { usePanelToast } from './usePanelToast.js';
import { sendRuntimeMessage } from '@/chrome/messaging.js';

async function resolveFlowTabId() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active?.id && active.url?.includes('grok.com')) return active.id;

  try {
    const response = await sendRuntimeMessage({ type: 'GET_FLOW_TAB_ID' });
    if (response?.tabId) return response.tabId;
  } catch {
    // fall through
  }

  const tabs = await chrome.tabs.query({ url: ['*://grok.com/*', '*://*.grok.com/*'] });
  const flowTab = tabs.find((tab) => /grok\.com/i.test(tab.url || '')) ?? tabs[0];
  return flowTab?.id ?? null;
}

export function useClearCache() {
  const t = (key, ...args) => i18n.global.t(key, ...args);
  const toast = usePanelToast();
  const isClearing = ref(false);

  async function clearFlowCache() {
    if (isClearing.value) return;

    const tabId = await resolveFlowTabId();
    if (!tabId) {
      toast.add({
        severity: 'warn',
        summary: t('common.clearCache'),
        detail: t('common.errors.clearCacheNeedGrokTab'),
        life: 6000,
      });
      return;
    }

    isClearing.value = true;
    try {
      const response = await sendRuntimeMessage({ type: 'CS', tabId });
      if (!response?.success) throw new Error(response?.error ?? 'Clear cache failed');
      const reloadTabId = response.tabId ?? tabId;
      await chrome.tabs.reload(reloadTabId);
      toast.add({
        severity: 'success',
        summary: t('common.clearCache'),
        detail: t('common.clearCacheSuccess'),
        life: 4000,
      });
    } catch (err) {
      toast.add({
        severity: 'error',
        summary: t('common.errors.clearCacheFailed'),
        detail: err?.message,
        life: 8000,
      });
    } finally {
      isClearing.value = false;
    }
  }

  return { isClearing, clearFlowCache };
}
