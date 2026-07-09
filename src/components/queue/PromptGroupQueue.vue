<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGenerationProgress } from '@/composables/useGenerationProgress.js';
import { usePersistResize } from '@/composables/usePersistResize.js';
import { getPromptStatus, groupOverallProgress, findActivePromptGroup, scrollQueueToActive } from '@/utils/queue.js';
import ExpandFullscreenButton from '@/components/widgets/ExpandFullscreenButton.vue';
import FullscreenViewModal from '@/components/modals/FullscreenViewModal.vue';
import PromptGroupQueueList from '@/components/queue/PromptGroupQueueList.vue';

const props = defineProps({
  promptGroups: { type: Array, default: () => [] },
  livePrompts: { type: Array, default: () => [] },
  selectedMode: { type: String, default: 'textToImage' },
});

const { t } = useI18n();
const { generationProgress } = useGenerationProgress();

const expandedGroupId = ref(null);
const fullscreenOpen = ref(false);
const { elementRef: queueListRef } = usePersistResize('veo-ui-queue-height', {
  defaultHeight: 160,
  minHeight: 64,
});
const { elementRef: fullscreenQueueListRef, refresh: refreshFullscreenQueueList } = usePersistResize(
  'veo-ui-queue-fs-height',
  {
    defaultHeight: 420,
    minHeight: 120,
  },
);
const userScrollingUntil = ref(0);
let scrollEl = null;

const countLabel = computed(() =>
  t('controlTab.promptGroups.countLabel', { count: props.promptGroups.length }),
);

const activeGroup = computed(() => findActivePromptGroup(props.promptGroups));

const overallProgress = computed(() => {
  if (!activeGroup.value) return null;
  return groupOverallProgress(activeGroup.value, getPromptStatus, generationProgress.value);
});

const showOverallProgress = computed(() => overallProgress.value != null);
const showRecovery = computed(() =>
  props.promptGroups.some((g) => g.recoveryPassActive && g.status === 'running'),
);
const recoverySummaryGroup = computed(() =>
  props.promptGroups.find((g) => g.recoveryPassSummary?.total > 0),
);
const recoverySummaryText = computed(() => {
  const summary = recoverySummaryGroup.value?.recoveryPassSummary;
  if (!summary) return '';
  return t('controlTab.promptGroups.recoveryPassDone', {
    success: summary.succeeded,
    failed: summary.failed,
  });
});
const recoverySummaryAllOk = computed(() => (recoverySummaryGroup.value?.recoveryPassSummary?.failed ?? 0) === 0);
const showDownloadOnly = computed(() => props.promptGroups.some((g) => g.downloadOnly && g.status === 'running'));

watch(
  () => props.promptGroups.length,
  (next, prev) => {
    if (next > (prev ?? 0)) {
      const target = findActivePromptGroup(props.promptGroups) ?? props.promptGroups[0];
      if (target) expandedGroupId.value = target.id;
    }
  },
);

function onScroll() {
  userScrollingUntil.value = Date.now() + 4000;
}

function bindScrollGuard() {
  const el = queueListRef.value?.$el ?? queueListRef.value;
  if (!el || el === scrollEl) return;
  scrollEl?.removeEventListener('scroll', onScroll);
  scrollEl = el;
  scrollEl.addEventListener('scroll', onScroll, { passive: true });
}

function scrollToActive() {
  if (Date.now() < userScrollingUntil.value) return;
  const active = activeGroup.value;
  if (active && expandedGroupId.value && expandedGroupId.value !== active.id) return;
  scrollQueueToActive(queueListRef.value?.$el ?? queueListRef.value, props.promptGroups, getPromptStatus);
}

watch(queueListRef, bindScrollGuard, { flush: 'post' });
onMounted(bindScrollGuard);
onUnmounted(() => {
  scrollEl?.removeEventListener('scroll', onScroll);
  scrollEl = null;
});

watch(
  () => activeGroup.value?.id,
  (id, prev) => {
    if (id && id !== prev) expandedGroupId.value = id;
    scrollToActive();
  },
  { flush: 'post' },
);

watch(
  () => `${activeGroup.value?.id ?? ''}:${activeGroup.value?.currentPromptIndex ?? ''}`,
  scrollToActive,
  { flush: 'post' },
);

watch(fullscreenOpen, (open) => {
  if (open) nextTick(() => refreshFullscreenQueueList());
});
</script>

<template>
  <div class="rounded-xl border border-border/60 bg-background/70 backdrop-blur-md shadow-sm p-3 space-y-3">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <i class="pi pi-list-check text-sm text-primary shrink-0" />
        <span class="text-sm font-semibold tracking-wide uppercase truncate">
          {{ $t('controlTab.promptGroups.title') }}
        </span>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs text-muted-foreground">{{ countLabel }}</span>
        <ExpandFullscreenButton @click="fullscreenOpen = true" />
      </div>
    </div>

    <div v-if="showOverallProgress" class="space-y-1.5">
      <div class="flex items-center justify-between gap-2 text-xs">
        <span class="text-muted-foreground">{{ $t('controlTab.promptGroups.overallProgress') }}</span>
        <span class="font-semibold tabular-nums text-primary">{{ overallProgress }}%</span>
      </div>
      <div class="h-2 bg-muted rounded-full overflow-hidden">
        <div
          class="h-full bg-primary transition-all duration-300 rounded-full"
          :style="{ width: `${overallProgress}%` }"
        />
      </div>
    </div>

    <div
      v-if="showDownloadOnly"
      class="flex items-center gap-2 rounded-lg border border-blue-300/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 text-xs text-blue-800 dark:text-blue-200"
    >
      <i class="pi pi-download text-sm" />
      <span>{{ $t('controlTab.promptGroups.redownload.inProgress') }}</span>
    </div>

    <div
      v-if="showRecovery"
      class="flex items-center gap-2 rounded-lg border border-orange-300/60 bg-orange-50 dark:bg-orange-950/40 px-3 py-2 text-xs text-orange-800 dark:text-orange-200"
    >
      <i class="pi pi-replay text-sm" />
      <span>{{ $t('controlTab.promptGroups.recoveryPass') }}</span>
    </div>

    <div
      v-else-if="recoverySummaryGroup"
      class="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
      :class="
        recoverySummaryAllOk
          ? 'border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
          : 'border-amber-300/60 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
      "
    >
      <i class="pi text-sm" :class="recoverySummaryAllOk ? 'pi-check-circle' : 'pi-info-circle'" />
      <span>{{ recoverySummaryText }}</span>
    </div>

    <PromptGroupQueueList
      ref="queueListRef"
      :prompt-groups="promptGroups"
      :live-prompts="livePrompts"
      :selected-mode="selectedMode"
      v-model:expanded-group-id="expandedGroupId"
    />

    <FullscreenViewModal v-model:visible="fullscreenOpen" :title="$t('controlTab.promptGroups.title')">
      <div class="flex flex-col flex-1 min-h-0 gap-3">
        <div v-if="showOverallProgress" class="space-y-1.5 shrink-0">
          <div class="flex items-center justify-between gap-2 text-xs">
            <span class="text-muted-foreground">{{ $t('controlTab.promptGroups.overallProgress') }}</span>
            <span class="font-semibold tabular-nums text-primary">{{ overallProgress }}%</span>
          </div>
          <div class="h-2 bg-muted rounded-full overflow-hidden">
            <div
              class="h-full bg-primary transition-all duration-300 rounded-full"
              :style="{ width: `${overallProgress}%` }"
            />
          </div>
        </div>
        <PromptGroupQueueList
          ref="fullscreenQueueListRef"
          :prompt-groups="promptGroups"
          :live-prompts="livePrompts"
          :selected-mode="selectedMode"
          v-model:expanded-group-id="expandedGroupId"
          fullscreen
        />
      </div>
    </FullscreenViewModal>
  </div>
</template>
