import {
  formatIndexedPromptLabel,
  formatIndexedFilenameLabel,
  formatPromptTimeline,
  isSrtTimelineLine,
  parseTimelineRange,
  parseVisualSuffix,
  VISUAL_SUFFIX_RE,
} from '@/utils/timeline.js';

const MEDIA_EXT = '(?:jpg|jpeg|png|mp4|webp|gif|jfif)';
const TIMELINE_IN_BRACKET = String.raw`[^\]]+`;
const OPTIONAL_HEADER_SUFFIX = String.raw`(?:_VISUAL_\d{2}_\d{2}|_[^\s|]+(?:\.${MEDIA_EXT})?)?`;

/**
 * Tiền tố prompt ảnh — hỗ trợ 7 định dạng timeline hợp lệ:
 * - SRT: 00:00:00,000 --> 00:00:09,000 / 00:00:00.000 --> 00:00:09.000
 * - [00:00:00:000-00:00:09:000] / [00:00:00.000-00:00:09.000]
 * - [00:00.000-00:09.000]
 * - 001_[00:00.000-00:09.000]
 * - 001_[00:00.000-00:09.000]_VISUAL_01_03
 */
export const INDEXED_TIMED_HEADER_RE = new RegExp(
  `^\\d{3}_\\[${TIMELINE_IN_BRACKET}\\]${OPTIONAL_HEADER_SUFFIX}\\s*(?:\\|\\s*|\\s+)\\S`,
  'i',
);

const INDEXED_TIMED_HEADER_ONLY_RE = new RegExp(
  `^\\d{3}_\\[${TIMELINE_IN_BRACKET}\\]${OPTIONAL_HEADER_SUFFIX}$`,
  'i',
);

const BRACKET_TIMELINE_HEADER_RE = new RegExp(
  `^\\[${TIMELINE_IN_BRACKET}\\]\\s*(?:\\|\\s*|\\s+)\\S`,
  'i',
);

const BRACKET_TIMELINE_HEADER_ONLY_RE = new RegExp(
  `^\\[${TIMELINE_IN_BRACKET}\\]$`,
  'i',
);

/** @deprecated dùng INDEXED_TIMED_HEADER_RE */
export const INDEXED_PIPE_LINE_RE = INDEXED_TIMED_HEADER_RE;

export function isIndexedTimedPromptHeaderLine(line) {
  const trimmed = String(line ?? '').trim();
  if (!trimmed) return false;
  if (/^\d{3}_\[/i.test(trimmed)) {
    return INDEXED_TIMED_HEADER_RE.test(trimmed) || INDEXED_TIMED_HEADER_ONLY_RE.test(trimmed);
  }
  if (trimmed.startsWith('[')) {
    return BRACKET_TIMELINE_HEADER_RE.test(trimmed) || BRACKET_TIMELINE_HEADER_ONLY_RE.test(trimmed);
  }
  return isSrtTimelineLine(trimmed);
}

/** @deprecated */
export function isIndexedPipePromptLine(line) {
  return isIndexedTimedPromptHeaderLine(line);
}

function splitIndexedHeaderTail(tail) {
  const trimmed = String(tail ?? '').trim();
  if (!trimmed) return { visual: null, slug: null, body: '' };

  const visualOnly = trimmed.match(/^(?:_+)?(VISUAL_\d{2}_\d{2})(?:\s*(?:\|\s*)?([\s\S]*))?$/i);
  if (visualOnly) {
    return {
      visual: parseVisualSuffix(visualOnly[1]),
      slug: null,
      body: (visualOnly[2] ?? '').trim(),
    };
  }

  const slugMatch = trimmed.match(
    new RegExp(`^_(?:([a-zA-Z0-9_-]+)(?:\\.(${MEDIA_EXT}))?)(?:\\s*(?:\\|\\s*)?([\\s\\S]*))?$`, 'i'),
  );
  if (slugMatch) {
    return {
      visual: null,
      slug: slugMatch[1],
      slugExt: slugMatch[2]?.toLowerCase() ?? null,
      body: (slugMatch[3] ?? '').trim(),
    };
  }

  return { visual: null, slug: null, body: trimmed.replace(/^\s*\|\s*/, '').trim() };
}

/** @param {string} line */
export function parsePromptHeaderLine(line) {
  const trimmed = String(line ?? '').trim();
  if (!trimmed) return null;

  const indexed = trimmed.match(/^(\d{3})_\[([^\]]+)\]([\s\S]*)$/i);
  if (indexed) {
    const range = parseTimelineRange(`[${indexed[2]}]`);
    const tail = splitIndexedHeaderTail(indexed[3] ?? '');
    return {
      indexPart: indexed[1],
      range,
      tagRaw: indexed[2],
      visualIndex: tail.visual?.visualIndex ?? null,
      visualTotal: tail.visual?.visualTotal ?? null,
      slugPart: tail.slug,
      slugExt: tail.slugExt ?? null,
      body: tail.body,
    };
  }

  const bracket = trimmed.match(/^\[([^\]]+)\]([\s\S]*)$/);
  if (bracket) {
    const range = parseTimelineRange(`[${bracket[1]}]`);
    const tail = splitIndexedHeaderTail(bracket[2] ?? '');
    return {
      indexPart: null,
      range,
      tagRaw: bracket[1],
      visualIndex: tail.visual?.visualIndex ?? null,
      visualTotal: tail.visual?.visualTotal ?? null,
      slugPart: tail.slug,
      slugExt: tail.slugExt ?? null,
      body: tail.body,
    };
  }

  if (isSrtTimelineLine(trimmed)) {
    return {
      indexPart: null,
      range: parseTimelineRange(trimmed),
      tagRaw: null,
      visualIndex: null,
      visualTotal: null,
      slugPart: null,
      slugExt: null,
      body: '',
    };
  }

  return null;
}

/** Lấy phần prompt từ dòng tiêu đề (sau ` | ` hoặc sau suffix). */
export function extractPromptBodyFromIndexedHeaderLine(line) {
  const parsed = parsePromptHeaderLine(line);
  if (parsed?.body) return parsed.body;
  const trimmed = String(line ?? '').trim();
  const match = trimmed.match(
    new RegExp(
      `^\\d{3}_\\[${TIMELINE_IN_BRACKET}\\]${OPTIONAL_HEADER_SUFFIX}\\s*(?:\\|\\s*|\\s+)([\\s\\S]+)$`,
      'i',
    ),
  );
  if (match) return match[1].trim();
  const bracketMatch = trimmed.match(new RegExp(`^\\[${TIMELINE_IN_BRACKET}\\]\\s*(?:\\|\\s*|\\s+)([\\s\\S]+)$`, 'i'));
  return bracketMatch ? bracketMatch[1].trim() : trimmed;
}

/** @deprecated */
export const extractPromptBodyFromIndexedLine = extractPromptBodyFromIndexedHeaderLine;

/** Lấy nội dung prompt từ khối có thể nhiều dòng (dòng đầu là tiêu đề timeline). */
export function extractPromptBodyFromTimedPrompt(block) {
  const text = String(block ?? '').trim();
  if (!text) return '';
  const nl = text.indexOf('\n');
  const firstLine = nl === -1 ? text : text.slice(0, nl);
  const tail = nl === -1 ? '' : text.slice(nl + 1).trim();
  const body = extractPromptBodyFromIndexedHeaderLine(firstLine);
  return tail ? `${body}\n${tail}` : body;
}

function parseSrtPrompts(text) {
  const lines = String(text).split(/\r?\n/);
  const blocks = [];
  let i = 0;
  let sawTimeline = false;

  while (i < lines.length) {
    while (i < lines.length && !lines[i].trim()) i += 1;
    if (i >= lines.length) break;

    if (/^\d+$/.test(lines[i].trim())) i += 1;
    const timeLine = lines[i]?.trim() ?? '';
    if (!isSrtTimelineLine(timeLine)) return sawTimeline ? blocks : null;

    const range = parseTimelineRange(timeLine);
    if (!range) return sawTimeline ? blocks : null;
    sawTimeline = true;
    i += 1;

    const textLines = [];
    while (i < lines.length && lines[i].trim()) {
      textLines.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ range, body: textLines.join('\n') });
  }

  if (!blocks.length) return null;
  return blocks.map((block, idx) => {
    const header = formatIndexedPromptLabel({ index: idx + 1, range: block.range });
    return block.body ? `${header} | ${block.body}` : header;
  });
}

function parseIndexedTimedPrompts(text) {
  const lines = String(text).split(/\r?\n/);
  const prompts = [];
  let current = null;
  let sawHeader = false;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (isIndexedTimedPromptHeaderLine(trimmed)) {
      sawHeader = true;
      if (current) prompts.push(current.trim());
      current = trimmed;
    } else if (current !== null) {
      current += `\n${trimmed}`;
    } else {
      return null;
    }
  }

  if (!sawHeader) return null;
  if (current) prompts.push(current.trim());
  return prompts.length ? prompts : null;
}

export function isIndexedPipePromptBlock(text) {
  return parseIndexedTimedPrompts(text) !== null || parseSrtPrompts(text) !== null;
}

/** Tách prompt: SRT gốc, khối timeline, hoặc dòng trống. */
export function parsePrompts(text) {
  if (!text?.trim()) return [];
  const normalized = text.trim().replace(/^\ufeff/, '');

  const srt = parseSrtPrompts(normalized);
  if (srt) return srt;

  const indexed = parseIndexedTimedPrompts(normalized);
  if (indexed) return indexed;

  return normalized
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Lấy nhãn STT + timeline (+ VISUAL / tên file) từ dòng đầu. */
export function extractPromptDisplayPrefix(text) {
  const firstLine = String(text ?? '').trim().split(/\r?\n/)[0] ?? '';
  const parsed = parsePromptHeaderLine(firstLine);
  if (!parsed) return '';

  const index = parsed.indexPart ?? '001';
  if (parsed.range) {
    return formatIndexedPromptLabel({
      index: parseInt(index, 10) || 1,
      range: parsed.range,
      visualIndex: parsed.visualIndex ?? undefined,
      visualTotal: parsed.visualTotal ?? undefined,
    });
  }

  const legacy = firstLine.match(/^(\d{3})_(\[[^\]]+\])(?:_(VISUAL_\d{2}_\d{2}|[^\s|]+))?/i);
  if (!legacy) return '';
  let prefix = `${legacy[1]}_${legacy[2]}`;
  if (legacy[3]) prefix += `_${legacy[3]}`;
  return prefix;
}

export function hasIndexedPromptDisplayPrefix(text) {
  return !!extractPromptDisplayPrefix(text);
}

/** Tooltip / title — giữ prefix timeline + toàn bộ nội dung prompt. */
export function formatPromptDisplayTitle(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return '';
  const prefix = extractPromptDisplayPrefix(raw);
  let body = raw;
  if (/^(\d{3}_)?\[[^\]]+\]/i.test(body) || isSrtTimelineLine(body.split(/\r?\n/)[0] ?? '')) {
    body = extractPromptBodyFromTimedPrompt(body);
  }
  body = body.replace(/\s+/g, ' ').trim();
  if (prefix && body) return `${prefix} · ${body}`;
  if (prefix) return prefix;
  return body || raw;
}

export const PROMPT_PREVIEW_MAX_LEN = 60;

const TRUNCATE_ELLIPSIS = '...';

function truncateWithEllipsis(text, maxLen) {
  const s = String(text ?? '');
  if (maxLen <= 0) return '';
  if (s.length <= maxLen) return s;
  const cut = Math.max(0, maxLen - TRUNCATE_ELLIPSIS.length);
  return cut > 0 ? `${s.slice(0, cut)}${TRUNCATE_ELLIPSIS}` : TRUNCATE_ELLIPSIS;
}

/** Cùng format hiển thị prompt ở Chế độ ảnh/video và Hàng đợi. */
export function formatPromptPreview(text, maxLen = PROMPT_PREVIEW_MAX_LEN) {
  const raw = String(text ?? '').trim();
  if (!raw) return '';
  const prefix = extractPromptDisplayPrefix(raw);
  let body = raw;
  if (/^(\d{3}_)?\[[^\]]+\]/i.test(body)) {
    body = extractPromptBodyFromTimedPrompt(body);
  }
  body = body.replace(/\s+/g, ' ').trim();
  if (prefix) {
    const sep = body ? ' · ' : '';
    const prefixPart = `${prefix}${sep}`;
    const bodyLimit = maxLen - prefixPart.length;
    if (bodyLimit <= 0) return truncateWithEllipsis(prefixPart, maxLen);
    const bodyPart = body ? truncateWithEllipsis(body, bodyLimit) : '';
    return `${prefixPart}${bodyPart}`;
  }
  return truncateWithEllipsis(body, maxLen);
}

/** Dòng danh sách: số thứ tự queue (1,2,3…) + nhãn timeline nếu có. */
export function formatPromptListLabel(text, index, maxLen = PROMPT_PREVIEW_MAX_LEN) {
  const preview = formatPromptPreview(text, maxLen);
  return `${index + 1}. ${preview}`;
}

export function buildPromptPreviews(payloads) {
  return (payloads ?? []).map((p) => formatPromptPreview(p?.prompt));
}

/** Chỉ lấy dòng nhãn timeline — bỏ phần sau ` | ` (không đưa vào tên file). */
export function stripPromptLabelLine(prompt) {
  const firstLine = String(prompt ?? '').trim().split(/\r?\n/)[0] ?? '';
  return firstLine.replace(/\s\|\s*[\s\S]*$/, '').trim();
}

/**
 * Stem tên file tải về: 001_[00.00.000-00.09.000]_VISUAL_01_03
 * Không bao gồm nội dung prompt sau dấu `|`.
 */
export function buildDownloadFileStem(prompt, { promptIndex = 1, variantIndex = 0, variantCount = 1 } = {}) {
  const headerLine = stripPromptLabelLine(prompt);
  const parsed = parsePromptHeaderLine(headerLine);
  if (!parsed?.range) return null;

  const indexPart = parsed.indexPart || String(promptIndex).padStart(3, '0');
  const total = parsed.visualTotal || variantCount || 1;
  const beat = parsed.visualIndex || (total > 1 ? variantIndex + 1 : undefined);

  return formatIndexedFilenameLabel({
    index: parseInt(indexPart, 10) || promptIndex,
    range: parsed.range,
    visualIndex: beat,
    visualTotal: total,
  });
}

export { VISUAL_SUFFIX_RE, formatIndexedPromptLabel, formatPromptTimeline };
