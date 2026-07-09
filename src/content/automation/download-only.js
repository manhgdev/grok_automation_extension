import jQuery from 'jquery';

const $ = jQuery;

export function collectOrderedTileIds(selectors) {
  const ids = [];
  const seen = new Set();
  $(selectors.outputItems).each((_, el) => {
    const id = el.getAttribute('data-tile-id');
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  });
  if (!ids.length) {
    document.querySelectorAll('[data-tile-id]').forEach((el) => {
      const id = el.getAttribute('data-tile-id');
      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    });
  }
  return ids;
}

export function assignTilesToPayloads(payloads, pageTileIds) {
  const pageSet = new Set(pageTileIds);
  const hasStoredTiles = payloads.some((p) => Array.isArray(p.tileIds) && p.tileIds.length > 0);

  if (hasStoredTiles) {
    const items = [];
    for (let index = 0; index < payloads.length; index++) {
      const payload = payloads[index];
      const expected = Math.max(1, Number(payload.outputCount) || 1);
      const stored = Array.isArray(payload.tileIds) ? payload.tileIds.slice(0, expected) : [];
      if (stored.length < expected) {
        return {
          ok: false,
          error: `Prompt ${index + 1}: missing saved tile ID(s) for this group`,
          requiredTiles: 0,
          items: [],
          usedStoredTiles: true,
        };
      }
      const missing = stored.filter((id) => !pageSet.has(id));
      if (missing.length) {
        return {
          ok: false,
          error: `Prompt ${index + 1}: tile not found on Flow page (image may have been removed)`,
          requiredTiles: stored.length,
          items: [],
          usedStoredTiles: true,
        };
      }
      items.push({ index, tileIds: stored, config: payload });
    }
    const requiredTiles = items.reduce((sum, item) => sum + item.tileIds.length, 0);
    return { ok: true, requiredTiles, items, usedStoredTiles: true };
  }

  const required = payloads.reduce(
    (sum, p) => sum + Math.max(1, Number(p.outputCount) || 1),
    0,
  );
  if (pageTileIds.length < required) {
    return {
      ok: false,
      error: `Need ${required} tile(s) on Flow page, found ${pageTileIds.length}. Run a new job first to save tile IDs.`,
      requiredTiles: required,
      items: [],
      usedStoredTiles: false,
    };
  }
  const slice = pageTileIds.slice(-required);
  const items = [];
  let cursor = 0;
  for (let index = 0; index < payloads.length; index++) {
    const payload = payloads[index];
    const count = Math.max(1, Number(payload.outputCount) || 1);
    items.push({
      index,
      tileIds: slice.slice(cursor, cursor + count),
      config: payload,
    });
    cursor += count;
  }
  return { ok: true, requiredTiles: required, items, usedStoredTiles: false };
}
