<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGenerationProgress } from '@/composables/useGenerationProgress.js';
import { useJobService } from '@/composables/useJobService.js';
import { resumePausedGroupFromUI } from '@/composables/useActiveControlResume.js';
import { usePanelToast } from '@/composables/usePanelToast.js';
import { cooldownSecondsLeft, getPromptStatus } from '@/utils/queue.js';
import { formatPromptPreview, formatPromptDisplayTitle } from '@/utils/prompts.js';
import { canRedownloadGroup } from '@/utils/downloadOnly.js';
import { formatGroupDisplayName } from '@/utils/groupDisplay.js';
import { usePromptDelayTicker } from '@/composables/usePromptDelayTicker.js';

const props = defineProps({
  promptGroups: { type: Array, default: () => [] },
  livePrompts: { type: Array, default: () => [] },
  expandedGroupId: { type: [String, Number, null], default: null },
  fullscreen: Boolean,
  selectedMode: { type: String, default: 'textToImage' },
});

const emit = defineEmits(['update:expandedGroupId']);

const { t } = useI18n();
const toast = usePanelToast();
const { generationProgress, removeGroupFromQueue } = useGenerationProgress();
const { cancelJobGroup, pauseJobGroup, downloadOnlyGroup } = useJobService();
const { now, isDelaying } = usePromptDelayTicker();
const delayClock = computed(() => now.value);

const groupStatusClass = {
  queued: 'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600',
  running: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700',
  paused: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-700',
  completed: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700',
  cancelled: 'bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600',
  error: 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-700',
};

const promptStatusClass = {
  pending: 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600',
  delaying: 'bg-amber-50/80 dark:bg-amber-900/20 text-amber-800 dark:text-amber-100 border-amber-200 dark:border-amber-700',
  running: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-700',
  retrying: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200 border-orange-200 dark:border-orange-700',
  submitted: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-700',
  completed: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700',
  error: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-700',
};

function toggleGroup(id) {
  emit('update:expandedGroupId', props.expandedGroupId === id ? null : id);
}

function groupStatusLabel(status) {
  return t(`controlTab.promptGroups.status.${status}`);
}

function promptStatusLabel(status, group, index) {
  const ts = delayClock.value;
  if (status === 'delaying' || isDelaying(group, index)) {
    return t('controlTab.promptGroups.delayCountdown', {
      seconds: cooldownSecondsLeft(group, index, ts),
    });
  }
  if (status === 'retrying') {
    const n = group.downloadRetryCountByIndex?.[index] ?? 0;
    return t('controlTab.promptGroups.promptStatus.retrying', { n });
  }
  return t(`controlTab.promptGroups.promptStatus.${status}`);
}

function promptStatus(group, index) {
  return getPromptStatus(group, index, delayClock.value);
}

function progressEntry(groupId, promptIndex) {
  return generationProgress.value.find(
    (e) => e.groupId === groupId && e.promptIndex === promptIndex,
  );
}

function promptResult(group, index) {
  return group.results?.find((r) => (r.index ?? r.promptIndex - 1) === index);
}

function promptError(group, index) {
  return promptResult(group, index)?.error ?? null;
}

function promptCount(group) {
  return Math.max(0, Number(group.totalCount) || 0);
}

function displayPromptPreview(group, promptIdx) {
  const index = promptIdx - 1;
  const live = props.livePrompts?.[index];
  const useLive =
    live != null &&
    String(live).trim() !== '' &&
    (group.isActive || group.status === 'paused' || group.status === 'running');
  const raw = useLive ? live : group.promptPreviews?.[index];
  return formatPromptPreview(raw) || `Prompt ${promptIdx}`;
}

function displayPromptTitle(group, promptIdx) {
  const index = promptIdx - 1;
  const live = props.livePrompts?.[index];
  const useLive =
    live != null &&
    String(live).trim() !== '' &&
    (group.isActive || group.status === 'paused' || group.status === 'running');
  const raw = useLive ? live : group.promptPreviews?.[index];
  return formatPromptDisplayTitle(raw) || (group.promptPreviews?.[index] ?? `Prompt ${promptIdx}`);
}

function groupDisplayName(group) {
  return formatGroupDisplayName(group, t);
}

async function onResumeGroup(groupId) {
  await resumePausedGroupFromUI(groupId);
}

async function runGroupAction(action, groupId) {
  try {
    await action(groupId);
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('common.errors.sendJobFailed'),
      detail: err?.message,
      life: 8000,
    });
  }
}

async function onRedownload(group) {
  try {
    await downloadOnlyGroup(group, props.selectedMode);
    toast.add({
      severity: 'info',
      summary: t('controlTab.promptGroups.redownload.started'),
      life: 5000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('controlTab.promptGroups.redownload.failed'),
      detail: err?.message,
      life: 8000,
    });
  }
}
</script>

<template>
  <div
    :class="
      fullscreen
        ? 'veo-fullscreen-queue-list text-muted-foreground dark:text-slate-300'
        : 'veo-prompt-queue-list text-muted-foreground dark:text-slate-300'
    "
  >
    <div v-if="!promptGroups.length" class="text-xs text-center py-4 text-muted-foreground">
      {{ $t('controlTab.promptGroups.empty') }}
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="group in promptGroups"
        :key="group.id"
        :data-veo-queue-group-id="group.id"
        class="veo-prompt-queue-group rounded-lg border border-border/50 bg-background/80 text-xs transition hover:border-primary/40"
        :class="{
          'border-primary/60 bg-primary/5 shadow-sm veo-prompt-queue-group--active': group.isActive,
          'veo-prompt-queue-group--expanded': expandedGroupId === group.id,
        }"
      >
        <div
          class="veo-prompt-queue-group-header flex items-start justify-between gap-3 px-3 py-2 cursor-pointer"
          :class="{ 'veo-prompt-queue-group-header--expanded': expandedGroupId === group.id }"
          @click="toggleGroup(group.id)"
        >
          <div class="flex-1 min-w-0 space-y-1">
            <div class="flex items-center gap-2">
              <i
                class="pi text-xs transition-transform"
                :class="expandedGroupId === group.id ? 'pi-chevron-down' : 'pi-chevron-right'"
              />
              <span class="text-xs font-semibold truncate" :title="group.id">{{ groupDisplayName(group) }}</span>
              <span
                class="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                :class="groupStatusClass[group.status] || groupStatusClass.queued"
              >
                {{ groupStatusLabel(group.status) }}
              </span>
            </div>
            <div class="space-y-0.5 pl-4">
              <span class="text-xs text-muted-foreground">
                {{
                  $t('controlTab.promptGroups.itemsLabel', {
                    processed: group.processedCount,
                    total: group.totalCount,
                  })
                }}
              </span>
              <div
                v-if="group.modelSwitchNotice"
                class="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-200 font-medium"
              >
                <i class="pi pi-exclamation-triangle text-xs" />
                <span>{{ group.modelSwitchNotice }}</span>
              </div>
              <div
                v-else-if="
                  group.status === 'paused' &&
                  group.errorMessage &&
                  group.pauseReason !== 'unusual'
                "
                class="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-200 font-medium"
              >
                <i class="pi pi-pause text-xs" />
                <span>{{ group.errorMessage }}</span>
              </div>
            </div>
          </div>

          <div class="flex flex-row flex-wrap gap-1 justify-end" @click.stop>
            <PButton
              v-if="canRedownloadGroup(group)"
              size="small"
              :label="$t('controlTab.promptGroups.actions.redownload')"
              :title="$t('controlTab.promptGroups.redownload.tip')"
              severity="info"
              icon="pi pi-download"
              text
              @click="onRedownload(group)"
            />
            <PButton
              v-if="group.status === 'paused'"
              size="small"
              :label="$t('common.resume')"
              severity="warning"
              icon="pi pi-play"
              text
              @click="runGroupAction(onResumeGroup, group.id)"
            />
            <PButton
              v-if="group.status === 'running' || group.status === 'queued'"
              size="small"
              :label="$t('common.pause')"
              severity="secondary"
              icon="pi pi-pause"
              text
              @click="runGroupAction(pauseJobGroup, group.id)"
            />
            <PButton
              v-if="group.status === 'queued'"
              size="small"
              :label="$t('controlTab.promptGroups.actions.remove')"
              severity="secondary"
              text
              @click="cancelJobGroup(group.id)"
            />
            <PButton
              v-if="group.status === 'running' || group.status === 'paused'"
              size="small"
              :label="$t('controlTab.promptGroups.actions.stop')"
              severity="danger"
              text
              @click="cancelJobGroup(group.id)"
            />
            <PButton
              v-if="['completed', 'cancelled', 'error'].includes(group.status)"
              size="small"
              :label="$t('controlTab.promptGroups.actions.remove')"
              severity="secondary"
              icon="pi pi-trash"
              text
              @click="removeGroupFromQueue(group.id)"
            />
          </div>
        </div>

        <div
          v-if="expandedGroupId === group.id"
          class="border-t border-border/50 bg-background/90 px-3 py-2 space-y-1.5"
        >
          <div
            v-if="group.downloadOnly && group.status === 'running'"
            class="mx-2 mb-2 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-2 py-1.5 text-xs text-blue-700 dark:text-blue-200"
          >
            {{ $t('controlTab.promptGroups.redownload.inProgress') }}
          </div>

          <div
            v-if="
              group.status === 'paused' &&
              group.errorMessage &&
              !group.modelSwitchNotice &&
              group.pauseReason !== 'unusual'
            "
            class="mx-2 mb-2 rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-2 py-1.5 text-xs text-amber-800 dark:text-amber-200"
          >
            {{ group.errorMessage }}
          </div>

          <div
            v-if="group.status === 'error' && group.errorMessage"
            class="mx-2 mb-2 rounded border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-2 py-1.5 text-xs text-rose-700 dark:text-rose-200"
          >
            {{ group.errorMessage }}
          </div>

          <div v-if="promptCount(group) === 0" class="px-2 py-1.5 text-xs text-muted-foreground">
            {{ $t('controlTab.promptGroups.empty') }}
          </div>

          <div
            v-else
            class="veo-prompt-queue-prompts"
            :data-veo-queue-prompts="group.id"
            :data-veo-delay-clock="delayClock"
          >
            <div
              v-for="promptIdx in promptCount(group)"
              :key="promptIdx"
              :data-veo-queue-group="group.id"
              :data-veo-queue-prompt="`${group.id}-${promptIdx - 1}`"
              :data-veo-queue-prompt-active="
                group.currentPromptIndex === promptIdx - 1 ||
                isDelaying(group, promptIdx - 1) ||
                ['running', 'retrying', 'submitted'].includes(promptStatus(group, promptIdx - 1))
                  ? '1'
                  : null
              "
              class="flex flex-col rounded px-2 py-1.5 border text-xs mb-1"
              :class="promptStatusClass[promptStatus(group, promptIdx - 1)] || promptStatusClass.pending"
            >
              <div class="flex items-center gap-2">
                <span
                  class="veo-prompt-queue-num shrink-0 w-6 text-right tabular-nums text-muted-foreground"
                  :title="`#${promptIdx}`"
                >
                  {{ promptIdx }}.
                </span>
                <i
                  class="pi w-4 shrink-0"
                  :class="{
                    'pi-clock':
                      promptStatus(group, promptIdx - 1) === 'pending' ||
                      promptStatus(group, promptIdx - 1) === 'delaying',
                    'pi-spin pi-spinner':
                      promptStatus(group, promptIdx - 1) === 'running' ||
                      (promptStatus(group, promptIdx - 1) === 'retrying' &&
                        !group.results?.find((r) => (r.index ?? r.promptIndex - 1) === promptIdx - 1)?.success),
                    'pi-download':
                      promptStatus(group, promptIdx - 1) === 'submitted' ||
                      (promptStatus(group, promptIdx - 1) === 'retrying' &&
                        group.results?.find((r) => (r.index ?? r.promptIndex - 1) === promptIdx - 1)?.success),
                    'pi-check-circle': promptStatus(group, promptIdx - 1) === 'completed',
                    'pi-times-circle': promptStatus(group, promptIdx - 1) === 'error',
                  }"
                />
                <span class="flex-1 min-w-0 truncate" :title="displayPromptTitle(group, promptIdx)">
                  {{ displayPromptPreview(group, promptIdx) }}
                </span>
                <span
                  class="shrink-0 font-medium tabular-nums"
                  :class="
                    promptStatus(group, promptIdx - 1) === 'delaying'
                      ? 'text-amber-700 dark:text-amber-200'
                      : ''
                  "
                >
                  {{ promptStatusLabel(promptStatus(group, promptIdx - 1), group, promptIdx - 1) }}
                </span>
                <span
                  v-if="promptStatus(group, promptIdx - 1) === 'error' && promptError(group, promptIdx - 1)"
                  class="shrink-0 max-w-24 truncate text-xs text-rose-600 dark:text-rose-200"
                  :title="promptError(group, promptIdx - 1)"
                >
                  {{ promptError(group, promptIdx - 1) }}
                </span>
              </div>

              <div v-if="progressEntry(group.id, promptIdx)" class="mt-1.5 flex items-center gap-2">
                <div class="flex-1 bg-muted rounded-full h-1.5">
                  <div
                    class="h-1.5 rounded-full transition-all duration-300"
                    :class="
                      promptStatus(group, promptIdx - 1) === 'error'
                        ? 'bg-rose-500'
                        : promptStatus(group, promptIdx - 1) === 'completed'
                          ? 'bg-green-500'
                          : 'bg-primary'
                    "
                    :style="{ width: `${Number(progressEntry(group.id, promptIdx)?.percentage) || 0}%` }"
                  />
                </div>
                <span
                  class="shrink-0 font-bold text-xs"
                  :class="
                    promptStatus(group, promptIdx - 1) === 'error'
                      ? 'text-rose-500'
                      : promptStatus(group, promptIdx - 1) === 'completed'
                        ? 'text-green-500'
                        : 'text-primary'
                  "
                >
                  {{ Number(progressEntry(group.id, promptIdx)?.percentage) || 0 }}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
