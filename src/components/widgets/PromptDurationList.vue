<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePersistResize } from '@/composables/usePersistResize.js';
import { formatPromptPreview, formatPromptDisplayTitle } from '@/utils/prompts.js';
import ExpandFullscreenButton from '@/components/widgets/ExpandFullscreenButton.vue';
import FullscreenViewModal from '@/components/modals/FullscreenViewModal.vue';
import PromptDurationListRows from '@/components/widgets/PromptDurationListRows.vue';

const props = defineProps({
  prompts: { type: Array, default: () => [] },
  defaultOption: { type: String, required: true },
  getPromptOption: { type: Function, required: true },
  setPromptOption: { type: Function, required: true },
  setAllPromptOptions: { type: Function, default: null },
  allOptions: { type: Array, default: () => [] },
  getOptionsForPrompt: { type: Function, required: true },
  getRowBadge: { type: Function, default: null },
  getExtraRowBadges: { type: Function, default: null },
  imagesPerPrompt: { type: Array, default: null },
  label: String,
  tip: String,
  concatLabel: String,
  chainIndicatorText: String,
  optionType: { type: String, default: 'video' },
  showRowWarning: { type: Function, default: null },
  rowWarningText: String,
  noImagesWarningText: String,
  showNoImagesWarning: { type: Function, default: null },
});

const { elementRef: modeListRef } = usePersistResize('veo-ui-mode-list-height', {
  defaultHeight: 176,
  minHeight: 80,
});
const { elementRef: fullscreenModeListRef, refresh: refreshFullscreenModeList } = usePersistResize(
  'veo-ui-mode-list-fs-height',
  {
    defaultHeight: 420,
    minHeight: 120,
  },
);
const fullscreenOpen = ref(false);
const totalPrompts = computed(() => props.prompts.length);

function optionValue(index) {
  return props.getPromptOption(index, {
    defaultPromptOption: props.defaultOption,
    totalPrompts: totalPrompts.value,
  });
}

function onOptionChange(index, value) {
  props.setPromptOption(index, value);
}

function rowOptions(index) {
  return props.getOptionsForPrompt(index, totalPrompts.value);
}

function isConcatValue(value) {
  return String(value).includes('concat');
}

function isChainedFromPrevious(index) {
  if (index <= 0) return false;
  return isConcatValue(optionValue(index - 1));
}

function rowImages(index) {
  return props.imagesPerPrompt?.[index] ?? [];
}

function hasRowImages(index) {
  return rowImages(index).length > 0;
}

function shouldShowRowWarning(index) {
  return props.showRowWarning?.(index) ?? false;
}

function shouldShowNoImagesWarning(index) {
  if (!props.noImagesWarningText) return false;
  return props.showNoImagesWarning?.(index) ?? true;
}

function rowBadges(index) {
  const badges = [];
  const primary = props.getRowBadge?.(index);
  if (primary) badges.push(primary);
  const extra = props.getExtraRowBadges?.(index) ?? [];
  badges.push(...extra);
  return badges;
}

function promptRowLabel(prompt) {
  return formatPromptPreview(prompt);
}

function promptRowTitle(prompt) {
  return formatPromptDisplayTitle(prompt);
}

function optionSubtitle(index, prompt) {
  const value = optionValue(index);
  if (isConcatValue(value)) {
    return props.concatLabel || props.chainIndicatorText || 'Concat';
  }
  return `${String(prompt).length} characters - ${value}`;
}

function chainLabel() {
  return props.chainIndicatorText || 'Last Frame';
}

const { t } = useI18n();
const bulkVideoOption = ref('');

const imageBulkOptions = computed(() => [
  { label: t('common.imageModeOptions.createNew'), value: 'new-image' },
  { label: t('common.imageModeOptions.concat'), value: 'new-image-concat' },
]);

function applyBulkOption(value) {
  if (!value || !props.setAllPromptOptions) return;
  props.setAllPromptOptions(value, totalPrompts.value);
}

watch(
  () => props.defaultOption,
  (value) => {
    if (props.optionType === 'video' && value) bulkVideoOption.value = value;
  },
  { immediate: true },
);

watch(fullscreenOpen, (open) => {
  if (open) nextTick(() => refreshFullscreenModeList());
});
</script>

<template>
  <div v-if="prompts.length" class="space-y-2">
    <div v-if="label" class="flex items-center justify-between gap-2">
      <label class="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2 min-w-0">
        <i class="pi pi-clock shrink-0" />
        <span class="truncate">{{ label }}</span>
      </label>
      <ExpandFullscreenButton @click="fullscreenOpen = true" />
    </div>

    <div
      v-if="setAllPromptOptions && prompts.length > 1"
      class="flex items-center gap-2 flex-wrap rounded-lg border border-border/50 bg-muted/20 px-2 py-1.5"
    >
      <span class="text-[10px] text-muted-foreground shrink-0">{{ $t('common.promptModeApplyAll') }}</span>
      <template v-if="optionType === 'image'">
        <PButton
          v-for="opt in imageBulkOptions"
          :key="opt.value"
          :label="opt.label"
          size="small"
          severity="secondary"
          outlined
          class="!text-xs !py-1"
          @click="applyBulkOption(opt.value)"
        />
      </template>
      <template v-else>
        <PSelect
          v-model="bulkVideoOption"
          :options="allOptions"
          option-label="label"
          option-value="value"
          size="small"
          class="flex-1 min-w-[8rem] text-xs"
        />
        <PButton
          :label="$t('common.promptModeApply')"
          icon="pi pi-check"
          size="small"
          severity="secondary"
          class="!text-xs shrink-0"
          :disabled="!bulkVideoOption"
          @click="applyBulkOption(bulkVideoOption)"
        />
      </template>
    </div>

    <div ref="modeListRef" class="veo-prompt-mode-list">
      <PromptDurationListRows
        :prompts="prompts"
        :images-per-prompt="imagesPerPrompt"
        :row-warning-text="rowWarningText"
        :no-images-warning-text="noImagesWarningText"
        :option-value="optionValue"
        :row-options="rowOptions"
        :on-option-change="onOptionChange"
        :is-chained-from-previous="isChainedFromPrevious"
        :has-row-images="hasRowImages"
        :row-images="rowImages"
        :should-show-row-warning="shouldShowRowWarning"
        :should-show-no-images-warning="shouldShowNoImagesWarning"
        :row-badges="rowBadges"
        :option-subtitle="optionSubtitle"
        :prompt-row-label="promptRowLabel"
        :prompt-row-title="promptRowTitle"
        :chain-label="chainLabel"
      />
    </div>

    <p v-if="tip" class="text-xs text-muted-foreground italic">{{ tip }}</p>

    <FullscreenViewModal v-model:visible="fullscreenOpen" :title="label">
      <div class="flex flex-col flex-1 min-h-0 gap-3">
        <div
          v-if="setAllPromptOptions && prompts.length > 1"
          class="flex items-center gap-2 flex-wrap rounded-lg border border-border/50 bg-muted/20 px-2 py-1.5 shrink-0"
        >
          <span class="text-[10px] text-muted-foreground shrink-0">{{ $t('common.promptModeApplyAll') }}</span>
          <template v-if="optionType === 'image'">
            <PButton
              v-for="opt in imageBulkOptions"
              :key="opt.value"
              :label="opt.label"
              size="small"
              severity="secondary"
              outlined
              class="!text-xs !py-1"
              @click="applyBulkOption(opt.value)"
            />
          </template>
          <template v-else>
            <PSelect
              v-model="bulkVideoOption"
              :options="allOptions"
              option-label="label"
              option-value="value"
              size="small"
              class="flex-1 min-w-[8rem] text-xs"
            />
            <PButton
              :label="$t('common.promptModeApply')"
              icon="pi pi-check"
              size="small"
              severity="secondary"
              class="!text-xs shrink-0"
              :disabled="!bulkVideoOption"
              @click="applyBulkOption(bulkVideoOption)"
            />
          </template>
        </div>
        <div ref="fullscreenModeListRef" class="veo-fullscreen-mode-list">
          <PromptDurationListRows
            :prompts="prompts"
            :images-per-prompt="imagesPerPrompt"
            :row-warning-text="rowWarningText"
            :no-images-warning-text="noImagesWarningText"
            :option-value="optionValue"
            :row-options="rowOptions"
            :on-option-change="onOptionChange"
            :is-chained-from-previous="isChainedFromPrevious"
            :has-row-images="hasRowImages"
            :row-images="rowImages"
            :should-show-row-warning="shouldShowRowWarning"
            :should-show-no-images-warning="shouldShowNoImagesWarning"
            :row-badges="rowBadges"
            :option-subtitle="optionSubtitle"
            :prompt-row-label="promptRowLabel"
            :prompt-row-title="promptRowTitle"
            :chain-label="chainLabel"
          />
        </div>
        <p v-if="tip" class="text-xs text-muted-foreground italic shrink-0">{{ tip }}</p>
      </div>
    </FullscreenViewModal>
  </div>
</template>
