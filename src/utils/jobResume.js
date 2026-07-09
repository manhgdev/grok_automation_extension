import { buildPromptPreviews, formatPromptPreview } from '@/utils/prompts.js';
import { shouldReuseBatchGroup } from '@/utils/batchIdentity.js';

const ACTIVE_BATCH_STATUSES = new Set(['paused', 'running', 'queued']);

function previewsFromGroup(group) {
  if (Array.isArray(group?.promptPreviews) && group.promptPreviews.length) {
    return group.promptPreviews.map(formatPromptPreview);
  }
  if (Array.isArray(group?.payloads) && group.payloads.length) {
    return group.payloads.map((p) => formatPromptPreview(p?.prompt));
  }
  return null;
}

function previewsMatch(group, payloads) {
  const expected = buildPromptPreviews(payloads);
  const fromGroup = previewsFromGroup(group);
  if (!fromGroup?.length) return expected.length > 0;
  if (fromGroup.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (fromGroup[i] !== expected[i]) return false;
  }
  return true;
}

function getPendingIndexes(group, payloadCount) {
  const total = group.totalCount ?? payloadCount;
  const pending = [];
  for (let index = 0; index < total; index++) {
    const result = group.results?.find((r) => (r.index ?? r.promptIndex - 1) === index);
    if (!result || !result.success) pending.push(index);
  }
  return pending;
}

function isActiveBatchGroup(group) {
  if (!group || group.downloadOnly) return false;
  if (group.isPaused) return true;
  return ACTIVE_BATCH_STATUSES.has(group.status);
}

function findActiveBatchGroup(groups) {
  if (!groups?.length) return null;
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (isActiveBatchGroup(group)) return group;
  }
  return null;
}

function findMatchingIncompleteGroup(groups, payloads, options) {
  if (!groups?.length || !payloads?.length) return null;

  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (group.downloadOnly) continue;
    if (!shouldReuseBatchGroup(group, options, payloads)) continue;

    const pendingIndexes = getPendingIndexes(group, payloads.length);
    if (!pendingIndexes.length) continue;

    return group;
  }
  return null;
}

/** Tự gắn groupId khi gửi lại batch cùng cấu hình + prompt chưa xong. */
export function buildResumeOptions(groups, options, payloads) {
  if (options.groupId && options.resumeExisting) {
    return options;
  }
  if (options.groupId || options.resumeFrom || options.skipDuplicate) {
    return options;
  }

  const active = findActiveBatchGroup(groups);
  if (active && shouldReuseBatchGroup(active, options, payloads)) {
    if (active.status === 'paused' || active.isPaused) {
      return {
        ...options,
        groupId: active.id,
        resumeExisting: true,
      };
    }

    return {
      ...options,
      groupId: active.id,
      skipDuplicate: true,
    };
  }

  const matched = findMatchingIncompleteGroup(groups, payloads, options);
  if (!matched) return options;

  if (matched.status === 'paused' || matched.isPaused) {
    return {
      ...options,
      groupId: matched.id,
      resumeExisting: true,
    };
  }

  if (matched.status === 'queued' || matched.status === 'running') {
    return {
      ...options,
      groupId: matched.id,
      skipDuplicate: true,
    };
  }

  const pendingIndexes = getPendingIndexes(matched, payloads.length);
  return {
    ...options,
    groupId: matched.id,
    resumeFrom: {
      totalCount: matched.totalCount ?? payloads.length,
      processedCount: matched.results?.filter((r) => r.success).length ?? matched.processedCount ?? 0,
      results: (matched.results ?? []).filter((r) => r.success),
      pendingIndexes,
      promptPreviews: previewsFromGroup(matched) ?? buildPromptPreviews(payloads),
    },
  };
}
