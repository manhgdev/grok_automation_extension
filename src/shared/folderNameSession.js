/** Mỗi lần mở panel: gán thư mục base-001, base-002… (bỏ qua số đã có). */

export const FOLDER_SEQUENCE_STORAGE_KEY = 'grokFolderSequence';
const FOLDER_INDEX_DIGITS = 3;

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function formatFolderIndex(index, digits = FOLDER_INDEX_DIGITS) {
  return String(Math.max(1, index)).padStart(digits, '0');
}

export function stripAutoFolderSuffix(name, digits = FOLDER_INDEX_DIGITS) {
  return String(name || '').replace(new RegExp(`-\\d{${digits}}$`), '');
}

export function buildFolderName(base, index) {
  return `${base}-${formatFolderIndex(index)}`;
}

export function parseFolderIndex(base, folderName) {
  const match = String(folderName || '').match(new RegExp(`^${escapeRegex(base)}-(\\d{${FOLDER_INDEX_DIGITS}})$`));
  if (!match) return 0;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function ensureFolderNameBase(settings, fallback = 'grok-folder') {
  const base = settings.folderNameBase?.trim();
  if (base) {
    settings.folderNameBase = base;
    return settings.folderNameBase;
  }
  const derived = stripAutoFolderSuffix(settings.folderName).trim() || fallback;
  settings.folderNameBase = derived;
  return derived;
}

async function readFolderSequence() {
  try {
    const data = await chrome.storage.local.get(FOLDER_SEQUENCE_STORAGE_KEY);
    const raw = data[FOLDER_SEQUENCE_STORAGE_KEY];
    return raw && typeof raw === 'object' ? { ...raw } : {};
  } catch {
    return {};
  }
}

async function writeFolderSequence(sequence) {
  try {
    await chrome.storage.local.set({ [FOLDER_SEQUENCE_STORAGE_KEY]: sequence });
  } catch {
    // ignore
  }
}

async function isFolderNameTakenInDownloads(folderName) {
  if (!chrome?.downloads?.search) return false;
  try {
    const escaped = escapeRegex(folderName);
    const results = await chrome.downloads.search({
      filenameRegex: `${escaped}[\\\\/]`,
      limit: 1,
    });
    return results.length > 0;
  } catch {
    return false;
  }
}

function nextStartIndex(sequence, base, settings) {
  const stored = Number(sequence[base]?.next ?? 0);
  if (stored > 0) return stored;
  const fromSettings = parseFolderIndex(base, settings.folderName);
  if (fromSettings > 0) return fromSettings + 1;
  return 1;
}

/** Gán folderName tuần tự cho session (không ghi đè khi user tự nhập). */
export async function allocateFolderNameForSession(settings, fallback = 'grok-folder') {
  const base = ensureFolderNameBase(settings, fallback);
  const sequence = await readFolderSequence();
  let index = nextStartIndex(sequence, base, settings);

  for (let attempt = 0; attempt < 9999; attempt += 1) {
    const folderName = buildFolderName(base, index);
    const taken = await isFolderNameTakenInDownloads(folderName);
    if (!taken) {
      settings.folderName = folderName;
      sequence[base] = { next: index + 1, lastAssigned: folderName };
      await writeFolderSequence(sequence);
      return folderName;
    }
    index += 1;
  }

  const fallbackName = buildFolderName(base, index);
  settings.folderName = fallbackName;
  sequence[base] = { next: index + 1, lastAssigned: fallbackName };
  await writeFolderSequence(sequence);
  return fallbackName;
}

/** User typed folder name — use exact value, no auto suffix this session. */
export function setFolderNameFromUser(settings, name, fallback = 'grok-folder') {
  const trimmed = String(name ?? '').trim() || fallback;
  settings.folderName = trimmed;
  settings.folderNameManual = true;
  settings.folderNameBase = stripAutoFolderSuffix(trimmed) || trimmed;
}
