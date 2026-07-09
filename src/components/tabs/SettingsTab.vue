<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConfirm } from 'primevue/useconfirm';
import { UI_CONFIG } from '@shared/config.js';
import { setFolderNameFromUser } from '@shared/folderNameSession.js';
import { MODE_VALUES } from '@/constants/options.js';
import { ASPECT_RATIO_VALUES, VIDEO_MODELS, IMAGE_MODELS, SPEAKERS } from '@/constants/options.js';
import { LOCALE_OPTIONS } from '@/constants/locales.js';
import { setLocale, getLocale } from '@/i18n/index.js';
import { useTheme } from '@/composables/useTheme.js';

const props = defineProps({
  settings: { type: Object, required: true },
  isSavingSettings: Boolean,
});

const emit = defineEmits(['save-settings', 'reset-settings', 'open-download-config']);

const { t } = useI18n();
const confirm = useConfirm();
const { theme, setTheme } = useTheme();

const themeOptions = computed(() => [
  { value: 'light', label: t('common.themeLight') },
  { value: 'dark', label: t('common.themeDark') },
]);

const locale = computed({
  get: () => getLocale(),
  set: (value) => setLocale(value),
});

const modeOptions = computed(() =>
  MODE_VALUES.map((mode) => ({
    value: mode,
    label: t(`sidePanel.modeOptions.${mode}.label`),
  })),
);

const aspectRatioKeyMap = {
  '16:9': 'youtube',
  '9:16': 'shortsReels',
  square: 'square',
  portrait: 'portrait',
  landscape: 'landscape',
};

const aspectRatioOptions = computed(() =>
  ASPECT_RATIO_VALUES.map((value) => ({
    value,
    label: t(`sidePanel.aspectRatioOptions.${aspectRatioKeyMap[value] ?? value}`),
  })),
);

const outputCountOptions = computed(() =>
  [1, 2, 3, 4].map((n) => ({ value: n, label: t(`settingsTab.outputCount.option${n}`) })),
);

const concurrentOptions = computed(() =>
  [1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: t(`settingsTab.concurrentPrompts.option${n}`) })),
);

const videoOptionChoices = computed(() => [
  { value: '6s', label: t('settingsTab.defaultVideoOption.option6s') },
  { value: '10s', label: t('settingsTab.defaultVideoOption.option10s') },
  { value: '15s', label: t('settingsTab.defaultVideoOption.option15s') },
  { value: '6s-concat', label: t('settingsTab.defaultVideoOption.option6sConcat') },
  { value: '10s-concat', label: t('settingsTab.defaultVideoOption.option10sConcat') },
  { value: '15s-concat', label: t('settingsTab.defaultVideoOption.option15sConcat') },
]);

const imageOptionChoices = computed(() => [
  { value: 'new-image', label: t('settingsTab.defaultImageOption.optionNewImage') },
  { value: 'new-image-concat', label: t('settingsTab.defaultImageOption.optionConcat') },
]);

const videoQualityOptions = computed(() => [
  { value: 'no-download', label: t('settingsTab.autoDownloadVideoQuality.optionNoDownload') },
  { value: '720p', label: t('settingsTab.autoDownloadVideoQuality.option720') },
  { value: '1080p', label: t('settingsTab.autoDownloadVideoQuality.option1080') },
]);

const imageQualityOptions = computed(() => [
  { value: 'no-download', label: t('settingsTab.autoDownloadImageQuality.optionNoDownload') },
  { value: '1k', label: t('settingsTab.autoDownloadImageQuality.option1k') },
  { value: '2k', label: t('settingsTab.autoDownloadImageQuality.option2k') },
  { value: '4k', label: t('settingsTab.autoDownloadImageQuality.option4k') },
]);

const localeOptions = computed(() =>
  LOCALE_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) })),
);

const speakerOptions = computed(() => [
  { value: 'none', label: t('componentsToVideoControl.autoAddVoiceBySpeaker.defaultSpeakerNone') },
  ...SPEAKERS.map((s) => ({ value: s.name, label: s.name })),
]);

function maxImageOptions(key, count) {
  return Array.from({ length: count }, (_, i) => ({
    value: i + 1,
    label: t(`settingsTab.${key}.option${i + 1}`),
  }));
}

function confirmReset() {
  confirm.require({
    message: t('settingsTab.confirmReset.message'),
    header: t('settingsTab.confirmReset.header'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('settingsTab.confirmReset.acceptLabel'),
    rejectLabel: t('settingsTab.confirmReset.rejectLabel'),
    acceptClass: 'p-button-danger',
    rejectClass: 'p-button-secondary p-button-outlined',
    accept: () => emit('reset-settings'),
  });
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-3">
      <div class="rounded-lg border border-border/70 bg-gradient-to-br from-background to-muted/10 p-3 space-y-2">
        <label class="text-xs font-semibold">{{ $t('settingsTab.defaultMode.label') }}</label>
        <PSelect v-model="settings.defaultMode" :options="modeOptions" option-label="label" option-value="value" class="w-full" size="small" />
        <p class="text-[10px] text-muted-foreground">{{ $t('settingsTab.defaultMode.description') }}</p>
      </div>

      <div class="rounded-lg border border-border/70 p-3 space-y-2">
        <label class="text-xs font-semibold">{{ $t('settingsTab.model.label') }}</label>
        <PSelect v-model="settings.model" :options="VIDEO_MODELS" option-label="label" option-value="value" class="w-full" size="small" />
        <p class="text-[10px] text-muted-foreground">{{ $t('settingsTab.model.description') }}</p>
      </div>

      <div class="rounded-lg border border-border/70 p-3 space-y-2">
        <label class="text-xs font-semibold">{{ $t('settingsTab.imageModel.label') }}</label>
        <PSelect v-model="settings.imageModel" :options="IMAGE_MODELS" option-label="label" option-value="value" class="w-full" size="small" />
        <p class="text-[10px] text-muted-foreground">{{ $t('settingsTab.imageModel.description') }}</p>
      </div>

      <div class="rounded-lg border border-border/70 p-3 space-y-2">
        <label class="text-xs font-semibold">{{ $t('settingsTab.aspectRatio.label') }}</label>
        <PSelect v-model="settings.aspectRatio" :options="aspectRatioOptions" option-label="label" option-value="value" class="w-full" size="small" />
        <p class="text-[10px] text-muted-foreground">{{ $t('settingsTab.aspectRatio.description') }}</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-lg border border-border/70 p-3 space-y-2">
          <label class="text-xs font-semibold">{{ $t('settingsTab.outputCount.label') }}</label>
          <PSelect v-model="settings.outputCount" :options="outputCountOptions" option-label="label" option-value="value" class="w-full" size="small" />
        </div>
        <div class="rounded-lg border border-border/70 p-3 space-y-2">
          <label class="text-xs font-semibold">{{ $t('settingsTab.concurrentPrompts.label') }}</label>
          <PSelect v-model="settings.concurrentPrompts" :options="concurrentOptions" option-label="label" option-value="value" class="w-full" size="small" />
        </div>
      </div>

      <div class="rounded-lg border border-border/70 p-3 space-y-2">
        <label class="text-xs font-semibold">{{ $t('settingsTab.promptDelay.label') }}</label>
        <div class="flex items-center gap-2">
          <PInputNumber v-model="settings.promptDelaySecondsMin" :min="0" :max="300" class="flex-1" size="small" />
          <span class="text-xs">–</span>
          <PInputNumber v-model="settings.promptDelaySecondsMax" :min="0" :max="300" class="flex-1" size="small" />
        </div>
        <p class="text-[10px] text-muted-foreground">{{ $t('settingsTab.promptDelay.description') }}</p>
      </div>

      <div class="rounded-lg border border-border/70 p-3 space-y-2">
        <label class="text-xs font-semibold">{{ $t('settingsTab.defaultVideoOption.label') }}</label>
        <PSelect v-model="settings.defaultVideoOption" :options="videoOptionChoices" option-label="label" option-value="value" class="w-full" size="small" />
      </div>

      <div class="rounded-lg border border-border/70 p-3 space-y-2">
        <label class="text-xs font-semibold">{{ $t('settingsTab.defaultImageOption.label') }}</label>
        <PSelect v-model="settings.defaultImageOption" :options="imageOptionChoices" option-label="label" option-value="value" class="w-full" size="small" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="rounded-lg border border-border/70 p-3 space-y-2">
          <label class="text-xs font-semibold">{{ $t('settingsTab.imageToVideoMaxImages.label') }}</label>
          <PSelect
            v-model="settings.imageToVideoMaxImagesPerPrompt"
            :options="maxImageOptions('imageToVideoMaxImages', 2)"
            option-label="label"
            option-value="value"
            class="w-full"
            size="small"
          />
        </div>
        <div class="rounded-lg border border-border/70 p-3 space-y-2">
          <label class="text-xs font-semibold">{{ $t('settingsTab.componentsToVideoMaxImages.label') }}</label>
          <PSelect
            v-model="settings.componentsToVideoMaxImagesPerPrompt"
            :options="maxImageOptions('componentsToVideoMaxImages', 10)"
            option-label="label"
            option-value="value"
            class="w-full"
            size="small"
          />
        </div>
        <div class="rounded-lg border border-border/70 p-3 space-y-2">
          <label class="text-xs font-semibold">{{ $t('settingsTab.imageToImageMaxImages.label') }}</label>
          <PSelect
            v-model="settings.imageToImageMaxImagesPerPrompt"
            :options="maxImageOptions('imageToImageMaxImages', 10)"
            option-label="label"
            option-value="value"
            class="w-full"
            size="small"
          />
        </div>
      </div>

      <div class="rounded-lg border border-border/70 p-3 space-y-2">
        <label class="text-xs font-semibold">{{ $t('settingsTab.maxRetries.label') }}</label>
        <PInputNumber v-model="settings.maxRetries" :min="1" :max="20" show-buttons class="w-full" size="small" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="rounded-lg border border-border/70 p-3 space-y-2">
          <label class="text-xs font-semibold">{{ $t('settingsTab.autoDownloadVideoQuality.label') }}</label>
          <PSelect v-model="settings.autoDownloadVideoQuality" :options="videoQualityOptions" option-label="label" option-value="value" class="w-full" size="small" />
        </div>
        <div class="rounded-lg border border-border/70 p-3 space-y-2">
          <label class="text-xs font-semibold">{{ $t('settingsTab.autoDownloadImageQuality.label') }}</label>
          <PSelect v-model="settings.autoDownloadImageQuality" :options="imageQualityOptions" option-label="label" option-value="value" class="w-full" size="small" />
        </div>
      </div>

      <div class="rounded-lg border border-border/70 p-3 flex items-center justify-between gap-3">
        <div>
          <label class="text-xs font-semibold">{{ $t('componentsToVideoControl.autoAddCharacterImages.label') }}</label>
          <p class="text-[10px] text-muted-foreground">{{ $t('componentsToVideoControl.autoAddCharacterImages.description') }}</p>
        </div>
        <PInputSwitch v-model="settings.autoAddCharacterImages" />
      </div>

      <div class="rounded-lg border border-border/70 p-3 flex items-center justify-between gap-3">
        <div>
          <label class="text-xs font-semibold">{{ $t('componentsToVideoControl.autoAddVoiceBySpeaker.label') }}</label>
          <p class="text-[10px] text-muted-foreground">{{ $t('componentsToVideoControl.autoAddVoiceBySpeaker.description') }}</p>
        </div>
        <PInputSwitch v-model="settings.autoAddVoiceBySpeaker" />
      </div>

      <div class="rounded-lg border border-border/70 p-3 space-y-2">
        <label class="text-xs font-semibold">{{ $t('componentsToVideoControl.autoAddVoiceBySpeaker.defaultSpeakerLabel') }}</label>
        <PSelect
          v-model="settings.defaultSpeaker"
          :options="speakerOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          size="small"
          :disabled="settings.autoAddVoiceBySpeaker"
        />
      </div>

      <div class="rounded-lg border border-border/70 p-3 flex items-center justify-between gap-3">
        <div>
          <label class="text-xs font-semibold">{{ $t('componentsToVideoControl.characterControl.label') }}</label>
          <p class="text-[10px] text-muted-foreground">{{ $t('componentsToVideoControl.characterControl.description') }}</p>
        </div>
        <PInputSwitch v-model="settings.enableCharacterControl" />
      </div>

      <div class="rounded-lg border border-border/70 p-3 space-y-2">
        <label class="text-xs font-semibold">{{ $t('controlTab.folderName.label') }}</label>
        <PInputText
          :model-value="settings.folderName"
          class="w-full"
          size="small"
          @update:model-value="(v) => setFolderNameFromUser(settings, v)"
        />
      </div>

      <div class="rounded-lg border border-border/70 p-3 flex items-center justify-between gap-3">
        <label class="text-xs font-semibold">{{ $t('controlTab.autoChangeFileName') }}</label>
        <PInputSwitch v-model="settings.autoChangeFileName" />
      </div>

      <div class="rounded-lg border border-border/70 p-3 space-y-2">
        <label class="text-xs font-semibold">{{ $t('common.appearance') }}</label>
        <PSelect
          :model-value="theme"
          :options="themeOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          size="small"
          @update:model-value="setTheme"
        />
      </div>

      <div class="rounded-lg border border-border/70 p-3 space-y-2">
        <label class="text-xs font-semibold">{{ $t('settingsTab.language.label') }}</label>
        <PSelect v-model="locale" :options="localeOptions" option-label="label" option-value="value" class="w-full" size="small" />
      </div>

      <div
        v-if="UI_CONFIG.showUnusualActivityTipInSettings"
        class="rounded-lg border border-border/70 p-3 flex items-center justify-between gap-3"
      >
        <div>
          <label class="text-xs font-semibold">{{ $t('settingsTab.showUnusualActivityTip.label') }}</label>
          <p class="text-[10px] text-muted-foreground">{{ $t('settingsTab.showUnusualActivityTip.description') }}</p>
        </div>
        <PInputSwitch v-model="settings.showUnusualActivityTip" :disabled="!UI_CONFIG.enableUnusualActivityTip" />
      </div>

      <div class="rounded-lg border border-border/70 p-3 flex items-center justify-between gap-3">
        <div>
          <label class="text-xs font-semibold">{{ $t('settingsTab.downloadSettings.label') }}</label>
          <p class="text-[10px] text-muted-foreground">{{ $t('settingsTab.downloadSettings.description') }}</p>
        </div>
        <PButton icon="pi pi-cog" severity="secondary" outlined size="small" @click="emit('open-download-config')" />
      </div>
    </div>

    <div class="flex flex-wrap gap-2 justify-end">
      <PButton
        :label="$t('settingsTab.buttons.resetDefaults')"
        icon="pi pi-refresh"
        severity="secondary"
        outlined
        size="small"
        @click="confirmReset"
      />
      <PButton
        :label="$t('settingsTab.buttons.saveSettings')"
        icon="pi pi-check"
        size="small"
        :loading="isSavingSettings"
        :disabled="isSavingSettings"
        @click="emit('save-settings')"
      />
    </div>

    <p class="text-xs text-muted-foreground flex items-center gap-2">
      <i class="pi pi-info-circle text-primary text-xs" />
      {{ $t('settingsTab.infoMessage') }}
    </p>
  </div>
</template>
