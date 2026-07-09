<script setup>
import { computed } from 'vue';
import ControlFooter from '@/components/widgets/ControlFooter.vue';

const props = defineProps({
  settings: { type: Object, required: true },
  promptGroups: { type: Array, default: () => [] },
  livePrompts: { type: Array, default: () => [] },
  selectedMode: { type: String, default: 'textToVideo' },
  isClearingCache: Boolean,
  isSending: Boolean,
  isRunning: Boolean,
  showUpgrade: Boolean,
  runLabel: String,
  clearLabel: String,
  onRun: Function,
  onClear: Function,
  onClearCache: Function,
  onReportBug: Function,
  showVoiceWarning: { type: Boolean, default: true },
  showCharacterWarning: { type: Boolean, default: true },
  characterWarningActive: { type: Boolean, default: null },
});

const showCharacterBanner = computed(() => {
  if (!props.showCharacterWarning) return false;
  if (props.characterWarningActive != null) return props.characterWarningActive;
  return props.settings.enableCharacterControl;
});
</script>

<template>
  <ControlFooter
    :prompt-groups="promptGroups"
    :live-prompts="livePrompts"
    :selected-mode="selectedMode"
    :is-clearing-cache="isClearingCache"
    :is-sending="isSending"
    :is-running="isRunning"
    :show-upgrade="showUpgrade"
    :run-label="runLabel"
    :clear-label="clearLabel"
    :on-run="onRun"
    :on-clear="onClear"
    :on-clear-cache="onClearCache"
    :on-report-bug="onReportBug"
  >
    <template #before-queue>
      <div
        v-if="showVoiceWarning && settings.autoAddVoiceBySpeaker"
        class="flex items-center gap-2 px-2 py-1.5 bg-primary/10 border border-primary/20 rounded-md text-[10px] sm:text-xs text-primary font-medium"
      >
        <i class="pi pi-microphone" />
        <span>{{ $t('common.warnings.autoAddVoiceActive') }}</span>
      </div>
      <div
        v-if="showCharacterBanner"
        class="flex items-center gap-2 px-2 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-md text-[10px] sm:text-xs text-violet-600 dark:text-violet-300 font-medium"
      >
        <i class="pi pi-user" />
        <span>{{ $t('common.warnings.autoAddCharacterActive') }}</span>
      </div>
    </template>
  </ControlFooter>
</template>
