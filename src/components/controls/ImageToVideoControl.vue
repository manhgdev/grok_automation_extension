<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { parsePrompts } from '@/utils/prompts.js';
import { batchIdentityForJob } from '@/utils/batchIdentity.js';
import { usePromptOptions, useConcatDetection } from '@/composables/usePromptOptions.js';
import { useImagesPerPrompt } from '@/composables/useImagesPerPrompt.js';
import { useJobService } from '@/composables/useJobService.js';
import { useControlResumeRegistration } from '@/composables/useControlResumeRegistration.js';
import { usePlanUpgrade } from '@/composables/usePlanUpgrade.js';
import { usePanelToast } from '@/composables/usePanelToast.js';
import ImageUploader from '@/components/widgets/ImageUploader.vue';
import MaxImagesSelect from '@/components/widgets/MaxImagesSelect.vue';
import PromptTextarea from '@/components/widgets/PromptTextarea.vue';
import PromptDurationList from '@/components/widgets/PromptDurationList.vue';
import OutputCountSelect from '@/components/widgets/OutputCountSelect.vue';
import FolderNameInput from '@/components/widgets/FolderNameInput.vue';
import AutoFileNameToggle from '@/components/widgets/AutoFileNameToggle.vue';
import VideoControlFooter from '@/components/widgets/VideoControlFooter.vue';
import BugReportModal from '@/components/modals/BugReportModal.vue';

const props = defineProps({
  imageToVideoForm: { type: Object, required: true },
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

const uploadedImages = computed({
  get: () => props.imageToVideoForm.images,
  set: (value) => {
    props.imageToVideoForm.images = value;
  },
});

const { getPromptOption, setPromptOption, setAllPromptOptions, getOptionsForPrompt, allOptions } = usePromptOptions({ optionType: 'video' });
const prompts = computed(() => parsePrompts(props.imageToVideoForm.prompt));
const defaultVideoOption = computed(() => props.settings.defaultVideoOption);
const { isConcatPrompt, isPromptAfterConcat, hasConcat } = useConcatDetection(
  getPromptOption,
  prompts,
  defaultVideoOption,
);

const maxImagesPerPrompt = computed(() => props.settings.imageToVideoMaxImagesPerPrompt);

function imagesNeededForPrompt(index) {
  if (isPromptAfterConcat(index)) return maxImagesPerPrompt.value === 1 ? 0 : 1;
  return maxImagesPerPrompt.value;
}

const imagesNeeded = computed(() => {
  let total = 0;
  for (let i = 0; i < prompts.value.length; i++) total += imagesNeededForPrompt(i);
  return total;
});

const { imagesPerPrompt, allPromptsHaveImages } = useImagesPerPrompt({
  uploadedImages,
  prompts,
  getMaxImagesForPrompt: imagesNeededForPrompt,
  autoAddCharacterImages: computed(() => false),
  isPromptAfterConcat,
  assignmentMode: 'sequential',
});

watch(hasConcat, (v) => emit('update:has-concat', v), { immediate: true });

const hasEnoughUploaded = computed(
  () => uploadedImages.value.length >= imagesNeeded.value,
);

const hasEnoughImages = computed(() => {
  if (!uploadedImages.value.length || !prompts.value.length) return false;
  return allPromptsHaveImages.value && hasEnoughUploaded.value;
});

function buildPayloads() {
  const concurrent = hasConcat.value ? 1 : props.settings.concurrentPrompts;
  const outputCount = hasConcat.value ? 1 : props.settings.outputCount;
  return {
    payloads: prompts.value.map((prompt, index) => ({
      prompt,
      mode: 'imageToVideo',
      images: (imagesPerPrompt.value[index] || []).map((img) => ({
        id: img.id,
        base64: img.base64,
        name: img.name,
      })),
      aspectRatio: props.settings.aspectRatio,
      outputCount,
      model: props.settings.model,
      videoOption: getPromptOption(index, {
        defaultPromptOption: props.settings.defaultVideoOption,
        totalPrompts: prompts.value.length,
      }),
      promptIndex: index + 1,
      autoDownloadResourceQuality: props.settings.autoDownloadVideoQuality,
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
    batchIdentity: batchIdentityForJob(props.settings, 'imageToVideo', payloads),
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
  if (!uploadedImages.value.length || !prompts.value.length || !hasEnoughImages.value) return;

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
    <ImageUploader v-model="uploadedImages" />

    <MaxImagesSelect
      :settings="settings"
      settings-key="imageToVideoMaxImagesPerPrompt"
      label-key="imageToVideoMaxImages"
      options-key="imageToVideoMaxImages"
      :option-count="2"
      :uploaded-images="uploadedImages"
    />

    <div>
      <PromptTextarea
        v-model="imageToVideoForm.prompt"
        :label="$t('imageToVideoControl.prompts.label')"
        :placeholder="$t('imageToVideoControl.prompts.placeholder')"
        :tip="$t('imageToVideoControl.prompts.tip')"
      />

      <PromptDurationList
        class="mt-2"
        :prompts="prompts"
        :default-option="settings.defaultVideoOption"
        :get-prompt-option="getPromptOption"
        :set-prompt-option="setPromptOption"
        :set-all-prompt-options="setAllPromptOptions"
        :all-options="allOptions"
        :get-options-for-prompt="getOptionsForPrompt"
        :images-per-prompt="imagesPerPrompt"
        :no-images-warning-text="$t('imageToVideoControl.validation.noImagesForPrompt')"
        :show-no-images-warning="(index) => !isPromptAfterConcat(index)"
        :label="$t('common.videoModeControl.label')"
        :tip="$t('common.videoModeControl.tip')"
        :concat-label="$t('common.videoModeControl.concatLabel')"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <OutputCountSelect :settings="settings" :has-concat="hasConcat" />
      <FolderNameInput :settings="settings" />
    </div>

    <div class="space-y-2">
      <p class="text-xs text-muted-foreground">{{ $t('imageToVideoControl.advancedHint') }}</p>
      <AutoFileNameToggle :settings="settings" />
    </div>

    <div
      v-if="prompts.length > 0 && !hasEnoughUploaded"
      class="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-200"
    >
      ⚠️
      {{
        $t('imageToVideoControl.notEnoughImages', {
          needed: imagesNeeded,
          prompts: prompts.length,
          uploaded: uploadedImages.length,
        })
      }}
    </div>

    <VideoControlFooter
      :settings="settings"
      :prompt-groups="promptGroups"
      :live-prompts="prompts"
      selected-mode="imageToVideo"
      :is-clearing-cache="isClearingCache"
      :is-sending="isSending"
      :is-running="isRunning"
      :show-upgrade="isLimitReached"
      :show-voice-warning="false"
      :show-character-warning="false"
      :run-label="isSending ? $t('imageToVideoControl.buttons.sending') : $t('imageToVideoControl.buttons.run')"
      :clear-label="$t('imageToVideoControl.buttons.clear')"
      :on-run="isLimitReached ? openUpgrade : runJob"
      :on-clear="() => emit('clear')"
      :on-clear-cache="() => emit('clear-cache')"
      :on-report-bug="() => (bugReportOpen = true)"
    />

    <BugReportModal v-model:visible="bugReportOpen" />
  </div>
</template>
