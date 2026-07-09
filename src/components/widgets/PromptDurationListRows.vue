<script setup>
import { isVideoMedia, mediaSrc } from '@/utils/media.js';

const props = defineProps({
  prompts: { type: Array, default: () => [] },
  optionValue: { type: Function, required: true },
  rowOptions: { type: Function, required: true },
  onOptionChange: { type: Function, required: true },
  imagesPerPrompt: { type: Array, default: null },
  concatLabel: String,
  chainIndicatorText: String,
  isChainedFromPrevious: { type: Function, required: true },
  hasRowImages: { type: Function, required: true },
  rowImages: { type: Function, required: true },
  shouldShowRowWarning: { type: Function, required: true },
  shouldShowNoImagesWarning: { type: Function, required: true },
  rowWarningText: String,
  noImagesWarningText: String,
  rowBadges: { type: Function, required: true },
  optionSubtitle: { type: Function, required: true },
  promptRowLabel: { type: Function, required: true },
  promptRowTitle: { type: Function, required: true },
  chainLabel: { type: Function, required: true },
});
</script>

<template>
  <div class="grid gap-2">
    <div
      v-for="(prompt, index) in prompts"
      :key="index"
      class="p-1.5 bg-muted/30 rounded border border-border/40 space-y-1"
    >
      <div class="flex items-center gap-2">
        <PSelect
          :model-value="optionValue(index)"
          :options="rowOptions(index)"
          option-label="label"
          option-value="value"
          size="small"
          class="text-xs w-[8.75rem] shrink-0"
          @update:model-value="onOptionChange(index, $event)"
        />
        <div class="flex-1 min-w-0 flex items-start gap-2">
          <span
            class="shrink-0 w-6 text-right tabular-nums text-muted-foreground text-xs pt-0.5"
            :title="`#${index + 1}`"
          >
            {{ index + 1 }}.
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xs text-foreground truncate" :title="promptRowTitle(prompt)">
              {{ promptRowLabel(prompt) }}
            </p>
            <p class="text-xs text-muted-foreground truncate">
              {{ optionSubtitle(index, prompt) }}
            </p>
          </div>
        </div>
      </div>

      <template v-if="imagesPerPrompt">
        <div v-if="hasRowImages(index)" class="flex gap-2 flex-wrap">
          <div
            v-if="isChainedFromPrevious(index)"
            class="relative rounded border border-dashed border-primary/60 overflow-hidden bg-primary/10 w-12 h-12 shrink-0"
          >
            <div class="w-full h-full flex flex-col items-center justify-center p-1">
              <i class="pi pi-image text-primary text-xs mb-0.5" />
              <span class="text-[8px] text-primary font-semibold text-center leading-tight">
                {{ chainLabel() }}
              </span>
            </div>
          </div>
          <div
            v-for="img in rowImages(index)"
            :key="img.id"
            class="relative rounded border border-border/40 overflow-hidden bg-muted/40 w-12 h-12 shrink-0"
          >
            <video
              v-if="isVideoMedia(img)"
              :src="mediaSrc(img)"
              class="w-full h-full object-cover"
              muted
              playsinline
            />
            <img v-else :src="mediaSrc(img)" :alt="img.name" class="w-full h-full object-cover" />
            <div
              class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-0.5 truncate flex items-center gap-0.5"
            >
              <i v-if="isVideoMedia(img)" class="pi pi-video text-[9px] shrink-0" />
              <span>{{ img.name.length > 8 ? `${img.name.slice(0, 8)}...` : img.name }}</span>
            </div>
          </div>
        </div>
        <div v-else-if="isChainedFromPrevious(index)" class="flex gap-2 flex-wrap">
          <div
            class="relative rounded border border-dashed border-primary/60 overflow-hidden bg-primary/10 w-12 h-12 shrink-0"
          >
            <div class="w-full h-full flex flex-col items-center justify-center p-1">
              <i class="pi pi-image text-primary text-xs mb-0.5" />
              <span class="text-[8px] text-primary font-semibold text-center leading-tight">
                {{ chainLabel() }}
              </span>
            </div>
          </div>
        </div>
        <div
          v-else-if="shouldShowRowWarning(index)"
          class="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-200"
        >
          <i class="pi pi-flag text-warning" />
          <span>{{ rowWarningText }}</span>
        </div>
        <div
          v-else-if="shouldShowNoImagesWarning(index)"
          class="text-[10px] text-rose-600 dark:text-rose-300"
        >
          ⚠️ {{ noImagesWarningText }}
        </div>
      </template>

      <template v-else-if="isChainedFromPrevious(index)">
        <div class="flex gap-2 flex-wrap">
          <div
            class="relative rounded border border-dashed border-primary/60 overflow-hidden bg-primary/10 w-12 h-12 shrink-0"
          >
            <div class="w-full h-full flex flex-col items-center justify-center p-1">
              <i class="pi pi-image text-primary text-xs mb-0.5" />
              <span class="text-[8px] text-primary font-semibold text-center leading-tight">
                {{ chainLabel() }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <div
        v-for="(badge, bi) in rowBadges(index)"
        :key="bi"
        class="flex items-center gap-1.5 text-xs"
        :class="badge.colorClass"
      >
        <i class="pi shrink-0" :class="badge.icon" />
        <span>{{ badge.text }}</span>
      </div>
    </div>
  </div>
</template>
