/** Chrome runtime helpers — tên rõ, dùng trong composables. */

export function sendRuntimeMessage(payload) {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      reject(new Error('Chrome extension API not available'));
      return;
    }
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(response);
    });
  });
}

export async function dispatchToFlowTab(payload) {
  const response = await sendRuntimeMessage({ type: 'DISPATCH_TO_FLOW_TAB', payload });
  if (response?.success === false) {
    throw new Error(response.error || 'Failed to reach Flow tab');
  }
  return response;
}

export async function isFlowTabActive() {
  try {
    const response = await sendRuntimeMessage({ type: 'IS_FLOW_PAGE_ACTIVE' });
    return !!response?.active;
  } catch {
    return false;
  }
}
