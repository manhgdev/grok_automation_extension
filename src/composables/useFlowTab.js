import { ref, onMounted, onUnmounted } from 'vue';
import { isFlowPageUrl } from '@shared/config.js';
import { sendRuntimeMessage } from '@/chrome/messaging.js';

export function useFlowTab() {
  const isFlowPageActive = ref(false);
  const isChecking = ref(false);
  let pollTimer = null;
  let lastActive = null;

  async function checkCurrentPage() {
    try {
      const active = await sendRuntimeMessage({ type: 'IS_FLOW_PAGE_ACTIVE' });
      const value = !!active?.active;
      if (lastActive !== value) {
        isFlowPageActive.value = value;
        lastActive = value;
      }
      return value;
    } catch {
      if (lastActive !== false) {
        isFlowPageActive.value = false;
        lastActive = false;
      }
      return false;
    }
  }

  async function navigateToFlowTab(url) {
    try {
      if (!chrome?.tabs) {
        window.open(url, '_blank', 'noopener');
        return;
      }

      const tabs = await chrome.tabs.query({});
      const flowTab = tabs.find((tab) => tab.url && isFlowPageUrl(tab.url));

      if (flowTab?.id) {
        await chrome.tabs.update(flowTab.id, { active: true, url });
        if (flowTab.windowId) await chrome.windows.update(flowTab.windowId, { focused: true });
        setTimeout(checkCurrentPage, 800);
        setTimeout(checkCurrentPage, 2000);
      } else {
        await chrome.tabs.create({ url });
        setTimeout(checkCurrentPage, 800);
        setTimeout(checkCurrentPage, 2000);
      }
    } catch {
      window.open(url, '_blank', 'noopener');
    }
  }

  function onFlowPageChanged(message) {
    if (message?.type !== 'FLOW_PAGE_CHANGED') return;
    const value = !!message.active;
    if (lastActive !== value) {
      isFlowPageActive.value = value;
      lastActive = value;
    }
  }

  function startPolling(intervalMs = 800) {
    isChecking.value = true;
    checkCurrentPage().finally(() => {
      isChecking.value = false;
    });
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(onFlowPageChanged);
    }
    if (chrome?.tabs) {
      pollTimer = setInterval(checkCurrentPage, intervalMs);
    }
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.removeListener(onFlowPageChanged);
    }
  }

  onUnmounted(stopPolling);

  return {
    isFlowPageActive,
    isChecking,
    checkCurrentPage,
    navigateToFlowTab,
    startPolling,
    stopPolling,
  };
}
