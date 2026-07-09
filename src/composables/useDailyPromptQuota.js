import { ref, computed, onMounted } from 'vue';
import { UI_CONFIG } from '@shared/config.js';

const DAILY_COUNT_KEY = 'daily-prompt-count';
const DAILY_DATE_KEY = 'daily-prompt-date';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function useDailyPromptQuota() {
  const usedToday = ref(0);
  const limit = UI_CONFIG.dailyPromptLimit ?? 999999;

  const percentage = computed(() => {
    if (!limit || limit <= 0) return 0;
    return Math.min(100, Math.round((usedToday.value / limit) * 100));
  });

  const isExceeded = computed(() => usedToday.value >= limit);

  function syncFromStorage(stored) {
    usedToday.value = stored[DAILY_DATE_KEY] === todayKey() ? stored[DAILY_COUNT_KEY] ?? 0 : 0;
  }

  onMounted(() => {
    if (!chrome?.storage?.local) return;
    chrome.storage.local.get([DAILY_COUNT_KEY, DAILY_DATE_KEY], (data) => syncFromStorage(data));
    chrome.storage.local.onChanged.addListener((changes) => {
      if (changes[DAILY_COUNT_KEY] || changes[DAILY_DATE_KEY]) {
        chrome.storage.local.get([DAILY_COUNT_KEY, DAILY_DATE_KEY], (data) => syncFromStorage(data));
      }
    });
  });

  return { usedToday, percentage, isExceeded, limit };
}

export function usePricingEnabled() {
  return computed(() => !!(UI_CONFIG.showPlanBanner && UI_CONFIG.isPricingEnabled));
}
