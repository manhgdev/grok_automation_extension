/** Parse / format timeline cho SRT, prompt ảnh và tên file tải về. */

const RANGE_SEP = /[–—-]/;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function pad3(n) {
  return String(n).padStart(3, '0');
}

function normalizeMsDigits(digits) {
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return 0;
  if (digits.length === 1) return n * 100;
  if (digits.length === 2) return n * 10;
  return n;
}

/** @param {string} raw */
export function parseTimePart(raw) {
  const part = String(raw ?? '').trim();
  if (!part) return null;

  const normalized = part.replace(',', '.');

  let m = normalized.match(/^(\d{1,2}):(\d{2}):(\d{2}):(\d{1,3})$/);
  if (m) {
    return (+m[1]) * 3600000 + (+m[2]) * 60000 + (+m[3]) * 1000 + normalizeMsDigits(m[4]);
  }

  m = normalized.match(/^(\d{1,2}):(\d{2}):(\d{2})\.(\d{1,3})$/);
  if (m) {
    return (+m[1]) * 3600000 + (+m[2]) * 60000 + (+m[3]) * 1000 + normalizeMsDigits(m[4]);
  }

  m = normalized.match(/^(\d{1,2}):(\d{2})\.(\d{1,3})$/);
  if (m) {
    return (+m[1]) * 60000 + (+m[2]) * 1000 + normalizeMsDigits(m[3]);
  }

  m = normalized.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (m) {
    return (+m[1]) * 3600000 + (+m[2]) * 60000 + (+m[3]) * 1000;
  }

  m = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    return (+m[1]) * 60000 + (+m[2]) * 1000;
  }

  m = normalized.match(/^(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?(?:\.(\d{1,3}))?$/);
  if (m) {
    const [, a, b, c, ms] = m;
    const frac = ms ? normalizeMsDigits(ms) : 0;
    if (c != null) return (+a) * 3600000 + (+b) * 60000 + (+c) * 1000 + frac;
    return (+a) * 60000 + (+b) * 1000 + frac;
  }

  return null;
}

function msToParts(ms) {
  const total = Math.max(0, Math.floor(ms));
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const frac = total % 1000;
  return { h, m, s, ms: frac };
}

/** @typedef {{ startMs: number, endMs: number }} TimelineRange */

/** @param {string} text */
export function parseTimelineRange(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;

  const srt = raw.match(/^(\S+)\s*-->\s*(\S+)$/);
  if (srt) {
    const startMs = parseTimePart(srt[1]);
    const endMs = parseTimePart(srt[2]);
    if (startMs != null && endMs != null) return { startMs, endMs };
    return null;
  }

  let inner = raw;
  const bracket = raw.match(/^\[([^\]]+)\]$/);
  if (bracket) inner = bracket[1];

  const parts = inner.split(RANGE_SEP).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 2) {
    const startMs = parseTimePart(parts[0]);
    const endMs = parseTimePart(parts[1]);
    if (startMs != null && endMs != null) return { startMs, endMs };
  }

  return null;
}

/** Chuẩn kỹ thuật: [00:00:00.000-00:00:09.000] */
export function formatTechnicalTimeline(range) {
  const a = msToParts(range.startMs);
  const b = msToParts(range.endMs);
  return `[${pad2(a.h)}:${pad2(a.m)}:${pad2(a.s)}.${pad3(a.ms)}-${pad2(b.h)}:${pad2(b.m)}:${pad2(b.s)}.${pad3(b.ms)}]`;
}

/** Chuẩn kỹ thuật dấu hai chấm ms: [00:00:00:000-00:00:09:000] */
export function formatColonMsTimeline(range) {
  const a = msToParts(range.startMs);
  const b = msToParts(range.endMs);
  return `[${pad2(a.h)}:${pad2(a.m)}:${pad2(a.s)}:${pad3(a.ms)}-${pad2(b.h)}:${pad2(b.m)}:${pad2(b.s)}:${pad3(b.ms)}]`;
}

/** Prompt ảnh / tên file: [00:00.000-00:09.000] */
export function formatPromptTimeline(range) {
  const a = msToParts(range.startMs);
  const b = msToParts(range.endMs);
  if (a.h > 0 || b.h > 0) {
    return `[${pad2(a.h)}:${pad2(a.m)}:${pad2(a.s)}.${pad3(a.ms)}-${pad2(b.h)}:${pad2(b.m)}:${pad2(b.s)}.${pad3(b.ms)}]`;
  }
  return `[${pad2(a.m)}:${pad2(a.s)}.${pad3(a.ms)}-${pad2(b.m)}:${pad2(b.s)}.${pad3(b.ms)}]`;
}

/** Tên file Windows-safe: [00.00.000-00.09.000] — dùng dấu chấm thay `:` */
export function formatFilenameTimeline(range) {
  return formatPromptTimeline(range).replace(/:/g, '.');
}

/** SRT gốc */
export function formatSrtTimeline(range, useComma = true) {
  const sep = useComma ? ',' : '.';
  const fmt = (ms) => {
    const p = msToParts(ms);
    return `${pad2(p.h)}:${pad2(p.m)}:${pad2(p.s)}${sep}${pad3(p.ms)}`;
  };
  return `${fmt(range.startMs)} --> ${fmt(range.endMs)}`;
}

export const VISUAL_SUFFIX_RE = /^VISUAL_(\d{2})_(\d{2})$/i;

/** @param {string} token */
export function parseVisualSuffix(token) {
  const m = String(token ?? '').trim().match(VISUAL_SUFFIX_RE);
  if (!m) return null;
  return { visualIndex: parseInt(m[1], 10), visualTotal: parseInt(m[2], 10) };
}

/**
 * Output chính cho prompt ảnh / tên file.
 * @param {{ index?: number, range: TimelineRange, visualIndex?: number, visualTotal?: number }} opts
 */
export function formatIndexedPromptLabel({ index = 1, range, visualIndex, visualTotal }) {
  const idx = String(index).padStart(3, '0');
  let label = `${idx}_${formatPromptTimeline(range)}`;
  const total = Number(visualTotal) || 0;
  const beat = Number(visualIndex) || 0;
  if (total > 1 && beat >= 1) {
    label += `_VISUAL_${pad2(beat)}_${pad2(total)}`;
  }
  return label;
}

/** Nhãn timeline cho tên file tải về (dấu chấm, không kèm prompt). */
export function formatIndexedFilenameLabel({ index = 1, range, visualIndex, visualTotal }) {
  const idx = String(index).padStart(3, '0');
  let label = `${idx}_${formatFilenameTimeline(range)}`;
  const total = Number(visualTotal) || 0;
  const beat = Number(visualIndex) || 0;
  if (total > 1 && beat >= 1) {
    label += `_VISUAL_${pad2(beat)}_${pad2(total)}`;
  }
  return label;
}

/** Chuẩn hóa chuỗi timeline bất kỳ → tag prompt [00:00.000-00:09.000] */
export function formatTimelineTagForFilename(tagRaw) {
  const range = parseTimelineRange(tagRaw) || parseTimelineRange(`[${tagRaw}]`);
  if (range) return formatPromptTimeline(range);
  const trimmed = String(tagRaw ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return trimmed;
  return `[${trimmed.replace(/:/g, '.')}]`;
}

/** @param {string} line */
export function isSrtTimelineLine(line) {
  return /\d{1,2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[.,]\d{3}/.test(String(line ?? '').trim());
}
