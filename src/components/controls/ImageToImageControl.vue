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
import CharacterControl from '@/components/widgets/CharacterControl.vue';
import OutputCountSelect from '@/components/widgets/OutputCountSelect.vue';
import FolderNameInput from '@/components/widgets/FolderNameInput.vue';
import AutoFileNameToggle from '@/components/widgets/AutoFileNameToggle.vue';
import VideoControlFooter from '@/components/widgets/VideoControlFooter.vue';
import BugReportModal from '@/components/modals/BugReportModal.vue';

const props = defineProps({
  imageToImageForm: { type: Object, required: true },
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
const characterControlRef = ref(null);

const uploadedImages = computed({
  get: () => props.imageToImageForm.images,
  set: (value) => {
    props.imageToImageForm.images = value;
  },
});

const { getPromptOption, setPromptOption, setAllPromptOptions, getOptionsForPrompt, allOptions } = usePromptOptions({ optionType: 'image' });
const prompts = computed(() => parsePrompts(props.imageToImageForm.prompt));
const defaultImageOption = computed(() => props.settings.defaultImageOption);
const { isConcatPrompt, isPromptAfterConcat, hasConcat } = useConcatDetection(
  getPromptOption,
  prompts,
  defaultImageOption,
);

const maxImagesPerPrompt = computed(() => props.settings.imageToImageMaxImagesPerPrompt || 3);

const { imagesPerPrompt, allPromptsHaveImages, promptsWithoutImages, hasCharacterImages } =
  useImagesPerPrompt({
    uploadedImages,
    prompts,
    maxImagesPerPrompt,
    autoAddCharacterImages: computed(() => props.settings.autoAddCharacterImages),
    isPromptAfterConcat,
  });

watch(hasConcat, (v) => emit('update:has-concat', v), { immediate: true });

function getExtraRowBadges(index) {
  const badge = characterControlRef.value?.getCharacterRowBadge?.(index);
  return badge ? [badge] : [];
}

function showRowWarning(index) {
  return (
    props.settings.autoAddCharacterImages &&
    !isPromptAfterConcat(index) &&
    !hasCharacterImages(index)
  );
}

function canRunJob() {
  if ((!uploadedImages.value.length && !props.settings.autoAddCharacterImages) || !prompts.value.length) {
    return false;
  }
  if (!props.settings.autoAddCharacterImages && !allPromptsHaveImages.value) {
    alert(
      t('imageToImageControl.validation.noImages', {
        prompts: promptsWithoutImages.value.join(', '),
      }),
    );
    return false;
  }
  return true;
}

function buildPayloads() {
  const concurrent = hasConcat.value ? 1 : props.settings.concurrentPrompts;
  const outputCount = hasConcat.value ? 1 : props.settings.outputCount;
  return {
    payloads: prompts.value.map((prompt, index) => ({
      prompt,
      mode: 'imageToImage',
      characters: characterControlRef.value?.getPayloadCharacters?.(index) ?? null,
      images: (imagesPerPrompt.value[index] || []).map((img) => ({
        id: img.id,
        base64: img.base64,
        name: img.name,
      })),
      aspectRatio: props.settings.aspectRatio,
      outputCount,
      imageModel: props.settings.imageModel,
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
    batchIdentity: batchIdentityForJob(props.settings, 'imageToImage', payloads),
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
  if (!canRunJob()) return;

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
      settings-key="imageToImageMaxImagesPerPrompt"
      label-key="imageToImageMaxImages"
      options-key="imageToImageMaxImages"
      :option-count="10"
      :uploaded-images="uploadedImages"
    />

    <div class="space-y-3">
      <PromptTextarea
        v-model="imageToImageForm.prompt"
        :label="$t('imageToImageControl.prompts.label')"
        :placeholder="$t('imageToImageControl.prompts.placeholder')"
        :tip="$t('imageToImageControl.prompts.tip')"
      />

      <CharacterControl ref="characterControlRef" :settings="settings" :prompts="prompts" />

      <div class="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
        <div class="flex items-start gap-2">
          <i class="pi pi-user text-primary text-sm mt-0.5" />
          <div>
            <label class="text-xs font-semibold">
              {{ $t('imageToImageControl.autoAddCharacterImages.label') }}
            </label>
            <p class="text-[10px] text-muted-foreground">
              {{ $t('imageToImageControl.autoAddCharacterImages.description') }}
            </p>
          </div>
        </div>
        <PInputSwitch v-model="settings.autoAddCharacterImages" />
      </div>

      <PromptDurationList
        :prompts="prompts"
        :default-option="settings.defaultImageOption"
        :get-prompt-option="getPromptOption"
        :set-prompt-option="setPromptOption"
        :set-all-prompt-options="setAllPromptOptions"
        :all-options="allOptions"
        :get-options-for-prompt="getOptionsForPrompt"
        :images-per-prompt="imagesPerPrompt"
        :show-row-warning="showRowWarning"
        :row-warning-text="$t('imageToImageControl.autoAddCharacterImages.noMatch')"
        :no-images-warning-text="$t('imageToImageControl.validation.noImagesForPrompt')"
        :show-no-images-warning="(index) => !isPromptAfterConcat(index)"
        :get-extra-row-badges="getExtraRowBadges"
        option-type="image"
        :label="$t('common.imageModeControl.label')"
        :tip="$t('common.imageModeControl.tip')"
        :concat-label="$t('common.imageModeControl.chainLabel')"
        :chain-indicator-text="$t('common.imageModeOptions.concat')"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <OutputCountSelect :settings="settings" :has-concat="hasConcat" />
      <FolderNameInput :settings="settings" />
    </div>

    <div class="space-y-2">
      <p class="text-xs text-muted-foreground">{{ $t('imageToImageControl.advancedHint') }}</p>
      <AutoFileNameToggle :settings="settings" />
    </div>

    <div
      v-if="prompts.length > 0 && !allPromptsHaveImages && !settings.autoAddCharacterImages"
      class="flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-200"
    >
      <i class="pi pi-exclamation-triangle" />
      <span>
        {{
          $t('imageToImageControl.validation.noImages', {
            prompts: promptsWithoutImages.join(', '),
          })
        }}
      </span>
    </div>

    <VideoControlFooter
      :settings="settings"
      :prompt-groups="promptGroups"
      :live-prompts="prompts"
      selected-mode="imageToImage"
      :is-clearing-cache="isClearingCache"
      :is-sending="isSending"
      :is-running="isRunning"
      :show-upgrade="isLimitReached"
      :show-voice-warning="false"
      :character-warning-active="settings.autoAddCharacterImages"
      :run-label="isSending ? $t('imageToImageControl.buttons.sending') : $t('imageToImageControl.buttons.run')"
      :clear-label="$t('imageToImageControl.buttons.clear')"
      :on-run="isLimitReached ? openUpgrade : runJob"
      :on-clear="() => emit('clear')"
      :on-clear-cache="() => emit('clear-cache')"
      :on-report-bug="() => (bugReportOpen = true)"
    />

    <BugReportModal v-model:visible="bugReportOpen" />
  </div>
</template>
