/** Group có tile ID đã lưu lúc generate — dùng để tải lại đúng ảnh. */
export function hasStoredTileIds(group) {
  if (!group) return false;
  if (group.downloadPayloads?.some((p) => p.tileIds?.length)) return true;
  return group.results?.some((r) => r.tileIds?.length) ?? false;
}

export function hasFailedDownloads(group) {
  return group?.results?.some((r) => !r.cancelled && (!r.success || !r.downloadComplete)) ?? false;
}

function needsRedownload(group, index) {
  const result = group.results?.find((r) => (r.index ?? r.promptIndex - 1) === index);
  if (!result) return true;
  return !result.success || !result.downloadComplete;
}

/** Có thể tải lại tile trên Flow cho group đã xong (không tạo lại). */
export function canRedownloadGroup(group) {
  if (!group || group.isActive || group.downloadOnly) return false;
  if (!['completed', 'error', 'cancelled'].includes(group.status)) return false;
  const total = Number(group.totalCount) || 0;
  if (total <= 0) return false;
  if (!hasStoredTileIds(group)) return false;
  return hasFailedDownloads(group);
}

export function stripDownloadPayload(payload, groupId) {
  if (!payload?.prompt) return null;
  let quality = payload.autoDownloadResourceQuality;
  if (!quality || quality === 'no-download') quality = null;
  const entry = {
    prompt: payload.prompt,
    promptIndex: payload.promptIndex,
    mode: payload.mode,
    outputCount: Math.max(1, Number(payload.outputCount) || 1),
    folderName: payload.folderName ?? '',
    autoChangeFileName: payload.autoChangeFileName,
    autoDownloadResourceQuality: quality,
    groupId: groupId || payload.groupId,
  };
  if (Array.isArray(payload.tileIds) && payload.tileIds.length) {
    entry.tileIds = payload.tileIds;
  }
  return entry;
}

export function buildDownloadPayloadsFromGroup(group, settings, selectedMode, { onlyFailed = true } = {}) {
  if (group.downloadPayloads?.length) {
    return group.downloadPayloads
      .map((p, i) => {
        if (onlyFailed && !needsRedownload(group, i)) return null;
        const stripped = stripDownloadPayload(p, group.id);
        if (!stripped) return null;
        const result = group.results?.find((r) => (r.index ?? r.promptIndex - 1) === i);
        if (!stripped.tileIds?.length && result?.tileIds?.length) {
          stripped.tileIds = result.tileIds;
        }
        return {
          ...stripped,
          promptIndex: stripped.promptIndex ?? i + 1,
          autoDownloadResourceQuality:
            stripped.autoDownloadResourceQuality ||
            resolveDefaultQuality(stripped.mode || selectedMode, settings),
        };
      })
      .filter(Boolean);
  }

  const previews = group.promptPreviews || [];
  const mode = selectedMode || 'textToImage';
  const quality = resolveDefaultQuality(mode, settings);

  return previews
    .map((preview, i) => {
      if (onlyFailed && !needsRedownload(group, i)) return null;
      return {
        prompt: preview,
        promptIndex: i + 1,
        mode,
        outputCount: Math.max(1, Number(settings.outputCount) || 1),
        folderName: settings.folderName ?? '',
        autoChangeFileName: settings.autoChangeFileName,
        autoDownloadResourceQuality: quality,
        groupId: group.id,
      };
    })
    .filter(Boolean);
}

function resolveDefaultQuality(mode, settings) {
  const isImage = String(mode || '').includes('Image') || mode === 'textToImage' || mode === 'imageToImage';
  const q = isImage ? settings.autoDownloadImageQuality : settings.autoDownloadVideoQuality;
  return q && q !== 'no-download' ? q : isImage ? 'original' : '1080';
}
