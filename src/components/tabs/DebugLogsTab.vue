<script setup>
import { ref, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useActionLog } from '@/composables/useActionLog.js';

const { t } = useI18n();
const { entries, clearLog } = useActionLog();

const autoScroll = ref(true);
const copied = ref(false);
const scrollContainer = ref(null);

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function copyLogs() {
  const text = entries.value
    .map((e) => `[${formatTime(e.timestamp)}] [${String(e.level || 'info').toUpperCase()}] ${e.message}`)
    .join('\n');
  if (!text) return;
  await navigator.clipboard.writeText(text);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}

function scrollToBottom() {
  if (!autoScroll.value || !scrollContainer.value) return;
  scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
}

watch(
  entries,
  () => {
    nextTick(scrollToBottom);
  },
  { deep: true },
);
</script>

<template>
  <div class="flex flex-col gap-2 pt-2">
    <div class="flex items-center justify-between">
      <span class="text-xs text-muted-foreground">{{ $t('debugLogs.entries', { count: entries.length }) }}</span>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <label class="text-xs text-muted-foreground select-none">{{ $t('debugLogs.autoScroll') }}</label>
          <PInputSwitch v-model="autoScroll" size="small" />
        </div>
        <PButton
          size="small"
          severity="secondary"
          text
          :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
          :label="copied ? $t('debugLogs.copied') : $t('debugLogs.copy')"
          :disabled="!entries.length"
          @click="copyLogs"
        />
        <PButton
          size="small"
          severity="secondary"
          text
          icon="pi pi-trash"
          :label="$t('debugLogs.clear')"
          :disabled="!entries.length"
          @click="clearLog"
        />
      </div>
    </div>

    <div
      ref="scrollContainer"
      class="overflow-y-auto rounded border border-border/50 bg-muted/10 font-mono text-[11px] leading-relaxed"
      style="height: 50vh"
    >
      <div v-if="!entries.length" class="text-muted-foreground text-center py-10 text-xs">
        {{ $t('debugLogs.empty') }}
      </div>
      <div
        v-for="(entry, index) in entries"
        :key="index"
        class="flex gap-2 px-3 py-1.5 border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
      >
        <span class="text-muted-foreground/60 shrink-0 tabular-nums">{{ formatTime(entry.timestamp) }}</span>
        <PTag
          :severity="entry.level === 'error' ? 'danger' : entry.level === 'warn' ? 'warn' : 'info'"
          :value="String(entry.level || 'info').toUpperCase()"
          class="shrink-0 text-[10px] h-5"
        />
        <span class="break-all whitespace-pre-wrap text-foreground/90">{{ entry.message }}</span>
      </div>
    </div>
  </div>
</template>
