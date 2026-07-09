<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { parsePrompts } from '@/utils/prompts.js';
import { batchIdentityForJob } from '@/utils/batchIdentity.js';
import { usePromptOptions, useConcatDetection } from '@/composables/usePromptOptions.js';
import { useJobService } from '@/composables/useJobService.js';
import { useControlResumeRegistration } from '@/composables/useControlResumeRegistration.js';
import { usePlanUpgrade } from '@/composables/usePlanUpgrade.js';
import { usePanelToast } from '@/composables/usePanelToast.js';
import PromptTextarea from '@/components/widgets/PromptTextarea.vue';
import PromptDurationList from '@/components/widgets/PromptDurationList.vue';
import OutputCountSelect from '@/components/widgets/OutputCountSelect.vue';
import FolderNameInput from '@/components/widgets/FolderNameInput.vue';
import AutoFileNameToggle from '@/components/widgets/AutoFileNameToggle.vue';
import ControlFooter from '@/components/widgets/ControlFooter.vue';
import BugReportModal from '@/components/modals/BugReportModal.vue';

const props = defineProps({
  textToImageForm: { type: Object, required: true },
  settings: { type: Object, required: true },
  promptGroups: { type: Array, default: () => [] },
  isClearingCache: Boolean,
});

const emit = defineEmits(['clear', 'clear-cache', 'update:has-concat']);

const { t } = useI18n();
const toast = usePanelToast();
const { sendJob, isSending } = useJobService();
const { isLimitReached, openUpgrade } = usePlanUpgrade();

const isRunning = ref(false);
const bugReportOpen = ref(false);

const { getPromptOption, setPromptOption, setAllPromptOptions, getOptionsForPrompt, allOptions } = usePromptOptions({ optionType: 'image' });
const prompts = computed(() => parsePrompts(props.textToImageForm.prompt));
const defaultImageOption = computed(() => props.settings.defaultImageOption);
const { isConcatPrompt, hasConcat } = useConcatDetection(getPromptOption, prompts, defaultImageOption);

watch(hasConcat, (v) => emit('update:has-concat', v), { immediate: true });

function buildPayloads() {
  const concurrent = hasConcat.value ? 1 : props.settings.concurrentPrompts;
  const outputCount = hasConcat.value ? 1 : props.settings.imageOutputCount;
  return {
    payloads: prompts.value.map((prompt, index) => ({
      prompt,
      mode: 'textToImage',
      aspectRatio: props.settings.aspectRatio,
      outputCount,
      imageModel: props.settings.imageModel || 'quality',
      promptIndex: index + 1,
      autoDownloadResourceQuality: props.settings.autoDownloadImageQuality,
      concurrentPrompts: concurrent,
      promptDelaySecondsMin: props.settings.promptDelaySecondsMin,
      promptDelaySecondsMax: props.settings.promptDelaySecondsMax,
      isConcat: isConcatPrompt(index),
      maxRetries: props.settings.maxRetries,
      autoChangeFileName: props.settings.autoChangeFileName,
      folderName: props.settings.folderName,
    })),
    concurrent,
  };
}

function jobRunOptions(concurrent, payloads) {
  return {
    concurrentPrompts: concurrent,
    promptDelaySecondsMin: props.settings.promptDelaySecondsMin,
    promptDelaySecondsMax: props.settings.promptDelaySecondsMax,
    getGroups: () => props.promptGroups,
    batchIdentity: batchIdentityForJob(props.settings, 'textToImage', payloads),
  };
}

async function resumePausedGroup(groupId) {
  if (!prompts.value.length) {
    throw new Error(t('common.errors.sendJobFailed'));
  }
  const { payloads, concurrent } = buildPayloads();
  await sendJob(payloads, { ...jobRunOptions(concurrent, payloads), groupId, resumeExisting: true });
}

useControlResumeRegistration(resumePausedGroup);

async function runJob() {
  if (!props.textToImageForm.prompt.trim() || !prompts.value.length) return;

  isRunning.value = true;
  const { payloads, concurrent } = buildPayloads();

  try {
    await sendJob(payloads, jobRunOptions(concurrent, payloads));
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('common.errors.sendJobFailed'),
      detail: err?.message,
      life: 8000,
    });
  } finally {
    isRunning.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <PromptTextarea
      v-model="textToImageForm.prompt"
      :label="$t('textToImageControl.prompt.label')"
      :placeholder="$t('textToImageControl.prompt.placeholder')"
      :tip="$t('textToImageControl.prompt.tip')"
    />

    <PromptDurationList
      :prompts="prompts"
      :default-option="settings.defaultImageOption"
      :get-prompt-option="getPromptOption"
      :set-prompt-option="setPromptOption"
      :set-all-prompt-options="setAllPromptOptions"
      :all-options="allOptions"
      :get-options-for-prompt="getOptionsForPrompt"
      option-type="image"
      :label="$t('common.imageModeControl.label')"
      :tip="$t('common.imageModeControl.tip')"
      :concat-label="$t('common.imageModeControl.chainLabel')"
      :chain-indicator-text="$t('common.imageModeOptions.concat')"
    />

    <div class="grid grid-cols-2 gap-3">
      <OutputCountSelect :settings="settings" :has-concat="hasConcat" count-key="imageOutputCount" />
      <FolderNameInput :settings="settings" />
    </div>

    <div class="space-y-2">
      <p class="text-xs text-muted-foreground">{{ $t('textToImageControl.advancedHint') }}</p>
      <AutoFileNameToggle :settings="settings" />
    </div>

    <ControlFooter
      :prompt-groups="promptGroups"
      :live-prompts="prompts"
      selected-mode="textToImage"
      :is-clearing-cache="isClearingCache"
      :is-sending="isSending"
      :is-running="isRunning"
      :show-upgrade="isLimitReached"
      :run-label="isSending ? $t('textToImageControl.buttons.sending') : $t('textToImageControl.buttons.run')"
      :clear-label="$t('textToImageControl.buttons.clear')"
      :on-run="isLimitReached ? openUpgrade : runJob"
      :on-clear="() => emit('clear')"
      :on-clear-cache="() => emit('clear-cache')"
      :on-report-bug="() => (bugReportOpen = true)"
    />

    <BugReportModal v-model:visible="bugReportOpen" />
  </div>
</template>
