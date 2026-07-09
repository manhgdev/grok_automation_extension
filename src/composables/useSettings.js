import { ref, computed, watch, onMounted } from 'vue';
import {
  SETTINGS_STORAGE_KEY,
  DEFAULT_SETTINGS,
  RESET_SETTINGS,
  SETTINGS_MIGRATION_VERSION,
  migrateSettings,
  UI_CONFIG,
} from '@shared/config.js';
import {
  allocateFolderNameForSession,
  ensureFolderNameBase,
} from '@shared/folderNameSession.js';

export function useSettings() {
  const settings = ref({
    ...DEFAULT_SETTINGS,
    showUnusualActivityTip: UI_CONFIG.showUnusualActivityTipDefault,
  });
  const isLoading = ref(false);
  const isSaving = ref(false);

  function settingsForStorage() {
    const payload = { ...settings.value };
    delete payload.folderNameManual;
    return payload;
  }

  async function rotateFolderNameForPanelOpen() {
    if (settings.value.folderNameManual) return;
    await allocateFolderNameForSession(settings.value, DEFAULT_SETTINGS.folderNameBase);
  }

  async function load() {
    isLoading.value = true;
    try {
      settings.value.folderNameManual = false;

      if (!chrome?.storage?.local) {
        await rotateFolderNameForPanelOpen();
        return;
      }

      const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
      const raw = stored[SETTINGS_STORAGE_KEY];
      let shouldSave = false;

      if (raw) {
        const needsMigration = (raw.migrationVersion ?? 0) < SETTINGS_MIGRATION_VERSION;
        const merged = needsMigration ? migrateSettings(raw) : { ...raw };
        delete merged.folderNameManual;
        if (typeof merged.showUnusualActivityTip !== 'boolean') {
          merged.showUnusualActivityTip = UI_CONFIG.showUnusualActivityTipDefault;
        }
        if (!Array.isArray(merged.defaultCharacters)) {
          merged.defaultCharacters = Object.values(merged.defaultCharacters ?? {});
        }
        Object.assign(settings.value, merged);
        if (needsMigration) shouldSave = true;
      } else {
        Object.assign(settings.value, DEFAULT_SETTINGS, {
          showUnusualActivityTip: UI_CONFIG.showUnusualActivityTipDefault,
        });
        shouldSave = true;
      }

      ensureFolderNameBase(settings.value, DEFAULT_SETTINGS.folderNameBase);
      await rotateFolderNameForPanelOpen();
      shouldSave = true;

      if (shouldSave) await save();
    } finally {
      isLoading.value = false;
    }
  }

  async function save() {
    isSaving.value = true;
    try {
      if (chrome?.storage?.local) {
        await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: settingsForStorage() });
      }
    } finally {
      isSaving.value = false;
    }
  }

  async function reset() {
    Object.assign(settings.value, RESET_SETTINGS, {
      showUnusualActivityTip: UI_CONFIG.showUnusualActivityTipDefault,
    });
    settings.value.folderNameManual = false;
    await rotateFolderNameForPanelOpen();
    await save();
  }

  async function openDownloadSettings() {
    try {
      if (chrome?.tabs?.create) {
        await chrome.tabs.create({ url: 'chrome://settings/downloads' });
      } else {
        window.open('chrome://settings/downloads', '_blank');
      }
    } catch {
      throw new Error('Could not open download settings');
    }
  }

  let saveTimer = null;
  watch(
    settings,
    () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => save(), 400);
    },
    { deep: true },
  );

  onMounted(load);

  const selectedMode = computed({
    get: () => settings.value.defaultMode,
    set: (mode) => {
      settings.value.defaultMode = mode;
    },
  });

  return {
    settings,
    selectedMode,
    isLoading,
    isSaving,
    load,
    save,
    reset,
    openDownloadSettings,
  };
}
