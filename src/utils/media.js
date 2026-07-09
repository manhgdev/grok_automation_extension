export function isVideoMedia(item) {
  if (!item) return false;
  if (item.mimeType?.startsWith('video/')) return true;
  const src = item.base64 ?? '';
  return src.startsWith('data:video/') || /\.(mp4|webm|mov)$/i.test(item.name ?? '');
}

export function mediaSrc(item) {
  const src = item?.base64 ?? '';
  if (src.startsWith('data:')) return src;
  const mime = isVideoMedia(item) ? 'video/mp4' : 'image/jpeg';
  return `data:${mime};base64,${src}`;
}

export function uploadMediaKind(items) {
  if (!items?.length) return 'none';
  const hasVideo = items.some(isVideoMedia);
  const hasImage = items.some((item) => !isVideoMedia(item));
  if (hasVideo && hasImage) return 'both';
  if (hasVideo) return 'video-only';
  return 'image-only';
}
