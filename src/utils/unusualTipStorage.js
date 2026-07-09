import {
  isBeforeUseTipDismissed,
  markBeforeUseTipDismissed,
} from '@shared/beforeUseTipSession.js';

const PENDING_KEY = 'unusualTipPending';
const PAYLOAD_KEY = 'unusualTipPayload';
const LEGACY_SHOWN_KEY = 'unusualTipShown';

async function readLocalStorage(keys) {
  try {
    return await chrome.storage.local.get(keys);
  } catch {
    return {};
  }
}

async function writeLocalStorage(values) {
  try {
    await chrome.storage.local.set(values);
  } catch {
    // ignore
  }
}

export { isBeforeUseTipDismissed, markBeforeUseTipDismissed };

/** @deprecated */
export const isUnusualTipDismissed = isBeforeUseTipDismissed;
/** @deprecated */
export const markUnusualTipDismissed = markBeforeUseTipDismissed;
/** @deprecated */
export const isUnusualTipShown = isBeforeUseTipDismissed;
/** @deprecated */
export const markUnusualTipShown = markBeforeUseTipDismissed;

export async function setUnusualTipPending(payload) {
  if (await isBeforeUseTipDismissed()) return;
  const data = await readLocalStorage([LEGACY_SHOWN_KEY]);
  if (data[LEGACY_SHOWN_KEY]) return;
  await writeLocalStorage({
    [PENDING_KEY]: true,
    [PAYLOAD_KEY]: payload ?? null,
  });
}

export async function hasUnusualTipPending() {
  if (await isBeforeUseTipDismissed()) return false;
  const data = await readLocalStorage([PENDING_KEY]);
  return !!data[PENDING_KEY];
}
