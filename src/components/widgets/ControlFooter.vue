<script setup>
import PromptGroupQueue from '@/components/queue/PromptGroupQueue.vue';

defineProps({
  promptGroups: { type: Array, default: () => [] },
  livePrompts: { type: Array, default: () => [] },
  selectedMode: { type: String, default: 'textToImage' },
  isClearingCache: Boolean,
  isSending: Boolean,
  isRunning: Boolean,
  runLabel: String,
  clearLabel: String,
  showUpgrade: Boolean,
  onRun: Function,
  onClear: Function,
  onClearCache: Function,
  onReportBug: Function,
});
</script>

<template>
  <div
    class="rounded-lg border border-border/60 bg-gradient-to-r from-primary/5 to-accent/5 p-2 sm:p-3 space-y-2"
  >
    <slot name="before-queue" />

    <PromptGroupQueue
      :prompt-groups="promptGroups"
      :live-prompts="livePrompts"
      :selected-mode="selectedMode"
    />

    <div class="grid grid-cols-2 gap-2 items-stretch">
      <div class="grid grid-cols-3 gap-2">
        <PButton
          :label="$t('common.reportBug')"
          severity="secondary"
          class="w-full text-xs sm:text-sm"
          size="small"
          icon="pi pi-flag"
          outlined
          @click="onReportBug?.()"
        />
        <PButton
          :label="$t('common.clearCache')"
          severity="secondary"
          class="w-full text-xs sm:text-sm"
          size="small"
          icon="pi pi-database"
          icon-pos="left"
          outlined
          :loading="isClearingCache"
          :disabled="isClearingCache"
          @click="onClearCache?.()"
        />
        <PButton
          :label="clearLabel"
          severity="secondary"
          class="w-full text-xs sm:text-sm"
          size="small"
          icon="pi pi-refresh"
          outlined
          @click="onClear?.()"
        />
      </div>

      <PButton
        v-if="showUpgrade"
        :label="$t('common.upgradeMax')"
        class="w-full h-full min-h-[2.25rem] text-xs sm:text-sm"
        size="small"
        icon="pi pi-crown"
        severity="warning"
        @click="onRun?.()"
      />
      <PButton
        v-else
        :label="runLabel"
        class="w-full h-full min-h-[2.25rem] text-xs sm:text-sm"
        size="small"
        :icon="isSending || isRunning ? 'pi pi-spin pi-spinner' : 'pi pi-play'"
        :disabled="isSending || isRunning"
        :loading="isSending"
        @click="onRun?.()"
      />
    </div>
  </div>
</template>
