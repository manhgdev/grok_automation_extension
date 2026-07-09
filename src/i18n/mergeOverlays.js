/** Gộp locale-overlays.js vào cây message khi build. */

export function mergeLocaleOverlays(target, overlay, { overwrite = false } = {}) {
  if (!overlay || typeof overlay !== 'object') return target;
  const out = target ?? {};

  for (const [key, value] of Object.entries(overlay)) {
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = mergeLocaleOverlays(out[key], value, { overwrite });
      continue;
    }
    if (overwrite || out[key] == null || out[key] === '') {
      out[key] = value;
    }
  }

  return out;
}

export function applyLocaleOverlays(messages, overlays) {
  for (const [locale, overlay] of Object.entries(overlays)) {
    if (!messages[locale]) continue;
    mergeLocaleOverlays(messages[locale], overlay, { overwrite: true });
  }
  return messages;
}
