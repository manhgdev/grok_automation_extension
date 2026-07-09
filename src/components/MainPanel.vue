<script setup>
import { reactive, ref, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { UI_CONFIG } from '@shared/config.js';
import { useSettings } from '@/composables/useSettings.js';
import { useFlowTab } from '@/composables/useFlowTab.js';
import { usePromptGroups } from '@/composables/usePromptGroups.js';
import { useClearCache } from '@/composables/useClearCache.js';
import { useExtensionVersion } from '@/composables/useExtensionVersion.js';
import { useTheme } from '@/composables/useTheme.js';
import { usePanelToast } from '@/composables/usePanelToast.js';
import { loginModalOpen } from '@/composables/useAuth.js';
import { LOCALE_OPTIONS } from '@/constants/locales.js';
import { setLocale, getLocale } from '@/i18n/index.js';
import PlanBanner from '@/components/widgets/PlanBanner.vue';
import NotOnFlowOverlay from '@/components/overlays/NotOnFlowOverlay.vue';
import LoginModal from '@/components/modals/LoginModal.vue';
import UpdateExtensionModal from '@/components/modals/UpdateExtensionModal.vue';
import TipBeforeUseModal from '@/components/modals/TipBeforeUseModal.vue';
import ControlTab from '@/components/tabs/ControlTab.vue';
import SettingsTab from '@/components/tabs/SettingsTab.vue';
import DebugLogsTab from '@/components/tabs/DebugLogsTab.vue';

const { settings, selectedMode, isSaving, save, reset, openDownloadSettings, load } = useSettings();
const { isFlowPageActive, navigateToFlowTab, startPolling, stopPolling } = useFlowTab();
const {
  promptGroups,
  installMessageListener,
  clearProgress,
  unusualActivityFirst,
} = usePromptGroups();
const { isClearing, clearFlowCache } = useClearCache();
const { version } = useExtensionVersion();
const { theme, toggleTheme } = useTheme();
const { t } = useI18n();
const toast = usePanelToast();

const activeTab = ref('control');
const hasConcat = ref(false);
const showUpdateModal = ref(false);
const isAutoUpdating = ref(false);
const unusualTipVisible = ref(false);

const textToVideoForm = reactive({ prompt: '' });
const imageToVideoForm = reactive({ prompt: '', images: [] });
const componentsToVideoForm = reactive({ prompt: '', images: [] });
const textToImageForm = reactive({ prompt: '' });
const imageToImageForm = reactive({ prompt: '', images: [] });
const agentAutomationForm = reactive({ prompt: '', images: [] });

const localeOptions = LOCALE_OPTIONS.map((opt) => ({ value: opt.value, labelKey: opt.labelKey }));

let removeListener = null;

async function checkForUpdate() {
  // Stub — matches old panel; hook for future store version check
}

async function showBeforeUseTipIfNeeded() {
  if (!UI_CONFIG.enableUnusualActivityTip) return;
  if (settings.hideTipBeforeUse) return;
  unusualTipVisible.value = true;
}

function onTipDismissed() {
  unusualTipVisible.value = false;
}

async function onTipDismissForever() {
  settings.hideTipBeforeUse = true;
  unusualTipVisible.value = false;
  await save();
}

async function onSaveSettings() {
  try {
    await save();
    toast.add({
      severity: 'success',
      summary: t('settingsTab.toast.saveSuccess.title'),
      detail: t('settingsTab.toast.saveSuccess.detail'),
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('settingsTab.toast.saveFailed.title'),
      detail: err?.message || t('settingsTab.toast.saveFailed.detail'),
      life: 6000,
    });
  }
}

async function onResetSettings() {
  try {
    await reset();
    toast.add({
      severity: 'success',
      summary: t('settingsTab.toast.resetSuccess.title'),
      detail: t('settingsTab.toast.resetSuccess.detail'),
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('settingsTab.toast.resetFailed.title'),
      detail: err?.message || t('settingsTab.toast.resetFailed.detail'),
      life: 6000,
    });
  }
}

onMounted(async () => {
  startPolling();
  removeListener = installMessageListener(isFlowPageActive);
  await load();
  await checkForUpdate();
  await showBeforeUseTipIfNeeded();
});

onUnmounted(() => {
  stopPolling();
  removeListener?.();
});

watch(
  () => settings.showUnusualActivityTip,
  (value) => {
    if (UI_CONFIG.enableUnusualActivityTip && value && !settings.hideTipBeforeUse) {
      void showBeforeUseTipIfNeeded();
    }
  },
);

watch(
  () => unusualActivityFirst.value,
  (evt) => {
    if (!evt || !settings.showUnusualActivityTip || settings.hideTipBeforeUse) return;
    void showBeforeUseTipIfNeeded();
  },
);

function onLocaleChange(value) {
  setLocale(value);
}

function clearCurrentMode() {
  const forms = {
    textToVideo: textToVideoForm,
    imageToVideo: imageToVideoForm,
    componentsToVideo: componentsToVideoForm,
    textToImage: textToImageForm,
    imageToImage: imageToImageForm,
    agentAutomation: agentAutomationForm,
  };
  const form = forms[selectedMode.value];
  if (!form) return;
  form.prompt = '';
  if ('images' in form) form.images = [];

  clearProgress();
  promptGroups.value = promptGroups.value.filter((group) => group.status !== 'completed');
}
</script>

<template>
  <div class="veo-panel flex flex-col min-h-full text-foreground relative">
    <PToast position="top-center" />
    <PConfirmDialog />

    <UpdateExtensionModal :visible="showUpdateModal" :is-auto-updating="isAutoUpdating" />
    <LoginModal v-if="UI_CONFIG.showPlanBanner && UI_CONFIG.isPricingEnabled" v-model:visible="loginModalOpen" />
    <TipBeforeUseModal
      v-if="UI_CONFIG.enableUnusualActivityTip"
      v-model:visible="unusualTipVisible"
      @dismiss="onTipDismissed"
      @dismiss-forever="onTipDismissForever"
    />

    <NotOnFlowOverlay v-if="!isFlowPageActive" @navigate="navigateToFlowTab" />

    <div class="p-3 sm:p-4 space-y-4 flex-1 overflow-y-auto">
      <header class="space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h1 class="text-base font-semibold flex items-center gap-2 flex-wrap">
              {{ $t('sidePanel.header.title') }}
              <span class="bg-yellow-400 text-black rounded px-1 text-xs font-normal">v{{ version }}</span>
            </h1>
            <p class="text-xs text-muted-foreground">{{ $t('sidePanel.header.description') }}</p>
            <div class="text-sm text-muted-foreground mt-1">
              <span class="font-medium">{{ $t('sidePanel.header.communityCtaPrefix') }}</span>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
              >
                {{ $t('sidePanel.header.communityCtaLink') }}
                <i class="pi pi-external-link text-xs" />
              </a>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <PButton
              :icon="theme === 'dark' ? 'pi pi-sun' : 'pi pi-moon'"
              text
              rounded
              severity="secondary"
              size="small"
              class="!w-8 !h-8"
              :title="theme === 'dark' ? $t('common.switchToLight') : $t('common.switchToDark')"
              :aria-label="theme === 'dark' ? $t('common.switchToLight') : $t('common.switchToDark')"
              @click="toggleTheme"
            />
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
              :title="$t('sidePanel.header.userGuideLink')"
            >
              <i class="pi pi-book text-sm" />
              <span class="hidden sm:inline">{{ $t('sidePanel.header.userGuideLink') }}</span>
            </a>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center w-8 h-8 text-primary hover:text-primary/80 transition-colors"
              title="Telegram"
            >
              <i class="pi pi-telegram text-lg" />
            </a>
            <PSelect
              :model-value="getLocale()"
              :options="localeOptions"
              :option-label="(opt) => $t(opt.labelKey)"
              option-value="value"
              size="small"
              class="w-28 text-xs"
              @update:model-value="onLocaleChange"
            />
          </div>
        </div>

        <PlanBanner v-if="UI_CONFIG.showPlanBanner && UI_CONFIG.isPricingEnabled" @show-login="loginModalOpen = true" />
      </header>

      <PTabs v-model:value="activeTab" lazy class="mt-2">
        <PTabList>
          <PTab value="control">
            <i class="pi pi-sliders-h text-xs mr-1.5" />
            {{ $t('sidePanel.tabs.control') }}
          </PTab>
          <PTab value="settings">
            <i class="pi pi-cog text-xs mr-1.5" />
            {{ $t('sidePanel.tabs.settings') }}
          </PTab>
          <PTab value="debug">
            <i class="pi pi-search text-xs mr-1.5" />
            {{ $t('sidePanel.tabs.debugLogs') }}
          </PTab>
        </PTabList>

        <PTabPanels>
          <PTabPanel value="control">
            <ControlTab
              v-model:selected-mode="selectedMode"
              :settings="settings"
              :prompt-groups="promptGroups"
              :is-clearing-cache="isClearing"
              :text-to-video-form="textToVideoForm"
              :image-to-video-form="imageToVideoForm"
              :components-to-video-form="componentsToVideoForm"
              :text-to-image-form="textToImageForm"
              :image-to-image-form="imageToImageForm"
              :agent-automation-form="agentAutomationForm"
              :has-concat="hasConcat"
              @clear="clearCurrentMode"
              @clear-cache="clearFlowCache"
              @update:has-concat="hasConcat = $event"
            />
          </PTabPanel>

          <PTabPanel value="settings">
            <SettingsTab
              :settings="settings"
              :is-saving-settings="isSaving"
              @save-settings="onSaveSettings"
              @reset-settings="onResetSettings"
              @open-download-config="openDownloadSettings"
            />
          </PTabPanel>

          <PTabPanel value="debug">
            <DebugLogsTab />
          </PTabPanel>
        </PTabPanels>
      </PTabs>
    </div>
  </div>
</template>

<style>
.veo-prompt-textarea {
  min-height: 8rem;
  max-height: none;
  overflow-y: auto !important;
  resize: vertical !important;
}

.veo-prompt-mode-list {
  min-height: 5rem;
  max-height: none;
  overflow: auto;
  resize: vertical;
  overscroll-behavior: contain;
  padding-right: 0.25rem;
}

.veo-prompt-queue-list {
  min-height: 4rem;
  max-height: none;
  overflow: auto;
  resize: vertical;
  overscroll-behavior: contain;
  padding-right: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
