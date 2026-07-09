/**
 * Tip trước khi dùng:
 * - Đóng/mở side panel: vẫn ẩn (dismiss gắn boot counter trong local).
 * - Thoát Chrome hẳn: onStartup hoặc cờ đóng hết cửa sổ → tăng boot counter → tip hiện lại.
 */
export const BOOT_COUNTER_KEY = 'grokBrowserBootCounter';
export const DISMISS_BOOT_COUNTER_KEY = 'grokTipDismissedBootCounter';
export const ALL_WINDOWS_CLOSED_KEY = 'grokAllChromeWindowsClosed';

async function readLocal(keys) {
  try {
    return await chrome.storage.local.get(keys);
  } catch {
    return {};
  }
}

async function writeLocal(values) {
  try {
    await chrome.storage.local.set(values);
  } catch {
    // ignore
  }
}

async function getBootCounter() {
  const data = await readLocal(BOOT_COUNTER_KEY);
  if (typeof data[BOOT_COUNTER_KEY] === 'number') return data[BOOT_COUNTER_KEY];
  await writeLocal({ [BOOT_COUNTER_KEY]: 1 });
  return 1;
}

/** Gọi khi Chrome khởi động lại (onStartup). */
export async function beginNewBrowserSession() {
  const data = await readLocal(BOOT_COUNTER_KEY);
  const next = (typeof data[BOOT_COUNTER_KEY] === 'number' ? data[BOOT_COUNTER_KEY] : 0) + 1;
  await writeLocal({ [BOOT_COUNTER_KEY]: next });
}

/** Gọi từ background khi đóng hết cửa sổ Chrome (normal). */
export async function markAllChromeWindowsClosed() {
  await writeLocal({ [ALL_WINDOWS_CLOSED_KEY]: true });
}

/** Khi mở panel sau khi đã thoát Chrome (fallback nếu onStartup không chạy). */
export async function syncBrowserSessionIfNeeded() {
  const data = await readLocal(ALL_WINDOWS_CLOSED_KEY);
  if (!data[ALL_WINDOWS_CLOSED_KEY]) return;
  await writeLocal({ [ALL_WINDOWS_CLOSED_KEY]: false });
  await beginNewBrowserSession();
}

export async function isBeforeUseTipDismissed() {
  await syncBrowserSessionIfNeeded();
  const bootCounter = await getBootCounter();
  const data = await readLocal(DISMISS_BOOT_COUNTER_KEY);
  return data[DISMISS_BOOT_COUNTER_KEY] === bootCounter;
}

export async function markBeforeUseTipDismissed() {
  await syncBrowserSessionIfNeeded();
  const bootCounter = await getBootCounter();
  await writeLocal({ [DISMISS_BOOT_COUNTER_KEY]: bootCounter });
}
