import { formatPromptDisplayTitle } from '@/utils/prompts.js';

const SNIPPET_LEN = 36;

function truncateSnippet(text) {
  const s = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (!s) return '';
  return s.length <= SNIPPET_LEN ? s : `${s.slice(0, SNIPPET_LEN)}...`;
}

/** Chế độ chạy của group (textToImage, textToVideo, …). */
export function getGroupRunMode(group) {
  if (group?.runMode) return group.runMode;
  const fromPayload = group?.downloadPayloads?.[0]?.mode;
  if (fromPayload) return fromPayload;
  return null;
}

function tOr(t, key, params, fallback) {
  const value = t(key, params);
  if (!value || value === key || String(value).startsWith('controlTab.promptGroups.')) {
    return fallback;
  }
  return value;
}

/**
 * Tên hiển thị: Chế độ · Prompt 1→6 · preview đầu → preview cuối
 * @param {object} group
 * @param {(key: string, params?: object) => string} t
 */
export function formatGroupDisplayName(group, t) {
  const total = Math.max(0, Number(group?.totalCount) || 0);
  const previews = (group?.promptPreviews ?? []).map((p) => truncateSnippet(formatPromptDisplayTitle(p)));
  const mode = getGroupRunMode(group);
  const modeLabel = mode ? t(`controlTab.modeButtons.${mode}`) : '';

  const rangeLabel =
    total <= 1
      ? tOr(t, 'controlTab.promptGroups.promptRangeSingle', {}, 'Prompt #1')
      : tOr(t, 'controlTab.promptGroups.promptRange', { from: 1, to: total }, `Prompt #1→#${total}`);

  const first = truncateSnippet(previews[0]);
  const last = total > 1 ? truncateSnippet(previews[total - 1]) : '';

  let snippet = first;
  if (total > 1 && last && last !== first) {
    snippet = tOr(
      t,
      'controlTab.promptGroups.promptSnippetRange',
      { from: first, to: last },
      `${first} → ${last}`,
    );
  } else if (first) {
    snippet = first;
  }

  const parts = [modeLabel, rangeLabel, snippet].filter(Boolean);
  return parts.join(' · ') || group?.id || '';
}

/** Group đang chạy / active lên đầu, còn lại theo thời gian tạo (mới hơn trước). */
export function sortPromptGroups(groups) {
  function rank(g) {
    if (g?.isActive) return 0;
    if (g?.status === 'running') return 1;
    if (g?.status === 'queued') return 2;
    if (g?.status === 'paused' || g?.isPaused) return 3;
    if (g?.status === 'completed') return 4;
    if (g?.status === 'error') return 5;
    if (g?.status === 'cancelled') return 6;
    return 7;
  }

  return [...(groups ?? [])].sort((a, b) => {
    const dr = rank(a) - rank(b);
    if (dr !== 0) return dr;
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
}
