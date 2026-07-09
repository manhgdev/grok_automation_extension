import { ref } from 'vue';
import { sortPromptGroups } from '@/utils/groupDisplay.js';
import { useI18n } from 'vue-i18n';
import { dispatchToFlowTab } from '@/chrome/messaging.js';
import { useGenerationProgress } from './useGenerationProgress.js';
import { useActionLog } from './useActionLog.js';
import { usePanelToast } from './usePanelToast.js';

let modelQuotaToastShown = false;
let lastUnusualToastAt = 0;
let lastUnusualToastKey = '';

export function usePromptGroups() {
  const promptGroups = ref([]);
  const isProcessingJob = ref(false);
  const unusualActivityFirst = ref(null);
  const toast = usePanelToast();
  const { t } = useI18n();

  const { updateProgress, clearProgress, clearGroupProgress, setRemoveGroupHandler, removeGroupFromQueue, generationProgress } =
    useGenerationProgress();
  const { addEntry } = useActionLog();

  function handleRuntimeMessage(message) {
    if (!message?.type) return;

    switch (message.type) {
      case 'ACTION_LOG':
        addEntry(message.data);
        break;

      case 'VIDEO_GENERATION_PROGRESS': {
        const { groupId, promptIndex, percentage, status, prompt } = message.data ?? {};
        if (!groupId) break;
        updateProgress(groupId, promptIndex, percentage, status, prompt);
        if (status === 'generating' || status === 'pending') {
          isProcessingJob.value = true;
        } else if (status === 'completed' || status === 'error') {
          isProcessingJob.value = generationProgress.value.some(
            (e) => e.status === 'generating' || e.status === 'pending',
          );
        }
        break;
      }

      case 'CONTENT_SCRIPT_RESET':
        promptGroups.value = [];
        clearProgress();
        isProcessingJob.value = false;
        break;

      case 'FLOW_PAGE_CHANGED':
        break;

      case 'PROMPT_GROUP_STATUS': {
        const data = message.data;
        if (!data?.id) break;

        const index = promptGroups.value.findIndex((g) => g.id === data.id);
        if (index >= 0) {
          const prev = promptGroups.value[index];
          if (data.status === 'running' && prev?.status !== 'running' && prev?.status !== 'paused') {
            clearGroupProgress(data.id);
          }
          const merged = { ...prev, ...data };
          if (data.delayPauseStartedAt !== undefined) {
            merged.delayPauseStartedAt = data.delayPauseStartedAt;
          } else if (data.isPaused && prev?.delayPauseStartedAt) {
            merged.delayPauseStartedAt = prev.delayPauseStartedAt;
          } else if (!data.isPaused) {
            merged.delayPauseStartedAt = null;
          }
          const ts = Date.now();
          if (data.promptDelayEndsAt !== undefined && data.promptDelayEndsAt !== null) {
            merged.promptDelayEndsAt = { ...data.promptDelayEndsAt };
          } else {
            const kept = {};
            for (const [k, v] of Object.entries(prev?.promptDelayEndsAt ?? {})) {
              if (Number(v) > ts) kept[k] = v;
            }
            if (prev?.delayEndsAt > ts && typeof prev?.delayPromptIndex === 'number') {
              kept[prev.delayPromptIndex] = prev.delayEndsAt;
            }
            if (Object.keys(kept).length) merged.promptDelayEndsAt = kept;
          }
          if (data.delayEndsAt !== undefined) {
            merged.delayEndsAt = data.delayEndsAt;
            merged.delayPromptIndex = data.delayPromptIndex ?? null;
            merged.delayTotalSeconds = data.delayTotalSeconds ?? null;
            merged.delayRemainingSeconds = data.delayRemainingSeconds ?? 0;
          } else if (prev?.delayEndsAt && prev.delayEndsAt > ts) {
            merged.delayEndsAt = prev.delayEndsAt;
            merged.delayPromptIndex = prev.delayPromptIndex ?? merged.delayPromptIndex;
            merged.delayTotalSeconds = prev.delayTotalSeconds ?? merged.delayTotalSeconds;
          }
          if (['completed', 'cancelled', 'error', 'paused'].includes(data.status)) {
            merged.recoveryPassActive = false;
          }
          if (data.recoveryPassSummary) {
            merged.recoveryPassSummary = data.recoveryPassSummary;
          }
          if (data.modelSwitchNotice) {
            merged.modelSwitchNotice = data.modelSwitchNotice;
            merged.modelSwitchFrom = data.modelSwitchFrom;
            merged.modelSwitchTo = data.modelSwitchTo;
          } else if (prev?.modelSwitchNotice && data.status !== 'completed') {
            merged.modelSwitchNotice = prev.modelSwitchNotice;
            merged.modelSwitchFrom = prev.modelSwitchFrom;
            merged.modelSwitchTo = prev.modelSwitchTo;
          } else if (data.status === 'completed') {
            merged.modelSwitchNotice = '';
            merged.modelSwitchFrom = '';
            merged.modelSwitchTo = '';
          }
          if (!data.downloadPayloads?.length && prev?.downloadPayloads?.length) {
            merged.downloadPayloads = prev.downloadPayloads;
          } else if (Array.isArray(data.downloadPayloads) && Array.isArray(prev?.downloadPayloads)) {
            merged.downloadPayloads = data.downloadPayloads.map((payload, idx) => {
              const prevPayload =
                prev.downloadPayloads.find(
                  (p) => (p.promptIndex ?? idx + 1) === (payload?.promptIndex ?? idx + 1),
                ) ?? prev.downloadPayloads[idx];
              if (!payload?.tileIds?.length && prevPayload?.tileIds?.length) {
                return { ...payload, tileIds: prevPayload.tileIds };
              }
              return payload;
            });
          }
          if (Array.isArray(data.results) && Array.isArray(prev?.results)) {
            merged.results = data.results.map((result, idx) => {
              const prevResult = prev.results.find(
                (r) => (r.index ?? r.promptIndex - 1) === (result.index ?? result.promptIndex - 1),
              ) ?? prev.results[idx];
              if (!result.tileIds?.length && prevResult?.tileIds?.length) {
                return { ...result, tileIds: prevResult.tileIds };
              }
              return result;
            });
          }
          promptGroups.value[index] = merged;
        } else {
          promptGroups.value.push(data);
        }
        promptGroups.value = sortPromptGroups(promptGroups.value);

        if (data.status === 'running' || data.status === 'queued') {
          isProcessingJob.value = true;
        } else if (['completed', 'cancelled', 'error', 'paused'].includes(data.status)) {
          if (['completed', 'cancelled', 'error'].includes(data.status)) {
            clearGroupProgress(data.id);
          }
          isProcessingJob.value = promptGroups.value.some(
            (g) => g.status === 'running' || g.status === 'queued',
          );
        }
        break;
      }

      case 'MODEL_QUOTA_SWITCH': {
        if (modelQuotaToastShown) break;
        modelQuotaToastShown = true;
        const { fromModel, toModel } = message.data ?? {};
        toast.add({
          severity: 'warn',
          summary: t('controlTab.promptGroups.modelQuotaSwitch.title'),
          detail: t('controlTab.promptGroups.modelQuotaSwitch.detail', { fromModel, toModel }),
          life: 0,
        });
        break;
      }

      case 'UNUSUAL_ACTIVITY': {
        const { message: unusualMsg, paused, count } = message.data ?? {};
        const detail = String(unusualMsg ?? '').trim();
        if (!detail) break;
        const toastKey = `${paused ? 'p' : 'w'}:${detail.slice(0, 120)}`;
        const now = Date.now();
        if (toastKey === lastUnusualToastKey && now - lastUnusualToastAt < 12000) break;
        lastUnusualToastAt = now;
        lastUnusualToastKey = toastKey;
        toast.add({
          severity: paused ? 'error' : 'warn',
          summary: paused
            ? t('controlTab.promptGroups.unusualActivity.pausedTitle')
            : t('controlTab.promptGroups.unusualActivity.title'),
          detail: paused && count
            ? `${detail} (${count}x)`
            : detail,
          life: paused ? 0 : 10000,
        });
        break;
      }

      case 'CONTENT_BLOCK_PROMPT': {
        const { promptIndex, message: blockMsg, filename } = message.data ?? {};
        if (!promptIndex) break;
        toast.add({
          severity: 'warn',
          summary: t('controlTab.promptGroups.contentBlock.title'),
          detail: t('controlTab.promptGroups.contentBlock.detail', {
            promptIndex,
            filename: filename || `prompt-${promptIndex}-CONTENT_BLOCK.txt`,
          }),
          life: 12000,
        });
        if (blockMsg) {
          addEntry({
            level: 'warn',
            message: `Content Block — prompt #${promptIndex}: ${blockMsg}`,
            timestamp: Date.now(),
          });
        }
        break;
      }

      case 'UNUSUAL_ACTIVITY_FIRST': {
        // Forward to MainPanel to show help modal once.
        unusualActivityFirst.value = {
          at: Date.now(),
          ...(message.data ?? {}),
        };
        break;
      }

      default:
        break;
    }
  }

  function installMessageListener(flowTabRef) {
    setRemoveGroupHandler((groupId) => {
      promptGroups.value = sortPromptGroups(promptGroups.value.filter((g) => g.id !== groupId));
    });

    dispatchToFlowTab({ type: 'SYNC_PROMPT_QUEUE' }).catch(() => {});

    if (!chrome?.runtime?.onMessage) return;

    const listener = (message) => {
      if (message.type === 'FLOW_PAGE_CHANGED') {
        flowTabRef.value = !!message.active;
      }
      handleRuntimeMessage(message);
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      setRemoveGroupHandler(null);
      chrome.runtime.onMessage.removeListener(listener);
    };
  }

  return {
    promptGroups,
    isProcessingJob,
    unusualActivityFirst,
    handleRuntimeMessage,
    installMessageListener,
    removeGroupFromQueue,
    clearProgress,
  };
}
