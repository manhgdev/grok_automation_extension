import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

/** Lưu chiều cao vùng resize (queue, mode list, prompt) vào chrome.storage. */
export function usePersistResize(storageKey, options = {}) {
  const defaultHeight = options.defaultHeight ?? null;
  const minHeight = options.minHeight ?? 64;

  const elementRef = ref(null);
  let resizeObserver = null;
  let saveTimer = null;

  async function applySavedHeight() {
    await nextTick();
    const root = elementRef.value?.$el ?? elementRef.value;
    const el =
      root?.tagName === 'TEXTAREA' ? root : root?.querySelector?.('textarea') ?? root;
    if (!el) return;

    el.style.resize = 'vertical';
    el.style.overflowY = 'auto';
    el.style.boxSizing = 'border-box';
    el.style.maxHeight = 'none';
    el.style.minHeight = `${minHeight}px`;

    resizeObserver?.disconnect();
    resizeObserver = null;

    let height = defaultHeight;
    if (chrome?.storage?.local) {
      const stored = await chrome.storage.local.get(storageKey);
      const saved = stored[storageKey];
      if (typeof saved === 'number' && saved >= minHeight) {
        height = saved;
      }
    }

    if (height) {
      el.style.height = `${height}px`;
    }

    resizeObserver = new ResizeObserver(() => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const nextHeight = el.offsetHeight;
        if (nextHeight >= minHeight && chrome?.storage?.local) {
          chrome.storage.local.set({ [storageKey]: nextHeight }).catch(() => {});
        }
      }, 200);
    });
    resizeObserver.observe(el);
  }

  onMounted(applySavedHeight);
  watch(elementRef, applySavedHeight, { flush: 'post' });
  onUnmounted(() => {
    resizeObserver?.disconnect();
    clearTimeout(saveTimer);
  });

  return { elementRef, refresh: applySavedHeight };
}
