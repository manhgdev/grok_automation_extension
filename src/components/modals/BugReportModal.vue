<script setup>
import { ref } from 'vue';
import { useActionLog } from '@/composables/useActionLog.js';

const visible = defineModel('visible', { type: Boolean, default: false });

const { entries } = useActionLog();
const copied = ref(false);

function formatLogs() {
  return entries.value
    .map((e) => `[${formatTime(e.timestamp)}] [${String(e.level || 'info').toUpperCase()}] ${e.message}`)
    .join('\n');
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function copyLogs() {
  const text = formatLogs();
  if (!text) return;
  await navigator.clipboard.writeText(text);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}

function openSupport() {
  window.open('#', '_blank', 'noopener');
}
</script>

<template>
  <PDialog
    v-model:visible="visible"
    modal
    :draggable="false"
    style="width: 32rem"
    pt:root:class="border border-slate-300/30 bg-slate-100 dark:bg-slate-800"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <i class="pi pi-flag text-xl" />
        <span class="font-semibold">{{ $t('bugReportModal.title') }}</span>
      </div>
    </template>

    <div class="space-y-3 text-sm">
      <p class="text-muted-foreground">{{ $t('bugReportModal.instruction') }}</p>

      <div
        v-if="entries.length"
        class="rounded border border-border/50 max-h-48 overflow-y-auto p-2 font-mono text-[10px] bg-muted/20"
      >
        <pre class="whitespace-pre-wrap">{{ formatLogs() }}</pre>
      </div>
      <p v-else class="text-xs text-muted-foreground">{{ $t('bugReportModal.noLogs') }}</p>

      <div class="flex flex-wrap gap-2">
        <PButton
          :label="copied ? $t('bugReportModal.copied') : $t('bugReportModal.copyLogs')"
          :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
          size="small"
          severity="secondary"
          :disabled="!entries.length"
          @click="copyLogs"
        />
      </div>

      <p class="text-xs text-muted-foreground">{{ $t('bugReportModal.sendHint') }}</p>
    </div>

    <template #footer>
      <PButton
        :label="$t('bugReportModal.openSupport')"
        icon="pi pi-external-link"
        size="small"
        @click="openSupport"
      />
    </template>
  </PDialog>
</template>
