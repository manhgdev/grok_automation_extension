import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { dispatchToFlowTab, isFlowTabActive } from '@/chrome/messaging.js';
import { buildResumeOptions } from '@/utils/jobResume.js';
import { buildDownloadPayloadsFromGroup } from '@/utils/downloadOnly.js';
import { SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS } from '@shared/config.js';

const CHUNK_BYTES = 1024 * 1024;
const DAILY_COUNT_KEY = 'daily-prompt-count';
const DAILY_DATE_KEY = 'daily-prompt-date';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function incrementDailyCount(count = 1) {
  if (!chrome?.storage?.local) return;
  const stored = await chrome.storage.local.get([DAILY_COUNT_KEY, DAILY_DATE_KEY]);
  const key = todayKey();
  const base = stored[DAILY_DATE_KEY] === key ? stored[DAILY_COUNT_KEY] ?? 0 : 0;
  await chrome.storage.local.set({
    [DAILY_COUNT_KEY]: base + count,
    [DAILY_DATE_KEY]: key,
  });
}

async function sendChunked(messageType, data, imageId) {
  const json = JSON.stringify(data);
  const totalChunks = Math.ceil(json.length / CHUNK_BYTES);

  if (totalChunks <= 1) {
    return dispatchToFlowTab({ type: messageType, id: imageId, data });
  }

  let lastResponse = null;
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const chunk = json.slice(chunkIndex * CHUNK_BYTES, (chunkIndex + 1) * CHUNK_BYTES);
    lastResponse = await dispatchToFlowTab({
      type: `${messageType}_CHUNK`,
      id: imageId,
      chunk,
      chunkIndex,
      totalChunks,
    });
  }
  return lastResponse;
}

async function readStoredSettings() {
  try {
    if (!chrome?.storage?.local) return { ...DEFAULT_SETTINGS };
    const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
    return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_STORAGE_KEY] || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function preparePayloadImages(payloads) {
  const imageCache = {};

  const strippedPayloads = payloads.map((item) => {
    if (!item.images?.length) return item;
    const imageIds = [];
    for (const img of item.images) {
      const imageId = img.id || `img-${img.name}-${img.base64.length}`;
      imageCache[imageId] = { base64: img.base64, name: img.name };
      imageIds.push(imageId);
    }
    return { ...item, imageIds, images: undefined };
  });

  for (const imageId of Object.keys(imageCache)) {
    try {
      await sendChunked('PREPARE_IMAGE', imageCache[imageId], imageId);
    } catch {
      /* optional images */
    }
  }

  return strippedPayloads;
}

function buildDispatchOptions(runOptions) {
  return {
    concurrentPrompts: runOptions.concurrentPrompts,
    promptDelaySecondsMin: runOptions.promptDelaySecondsMin,
    promptDelaySecondsMax: runOptions.promptDelaySecondsMax,
    batchIdentity: runOptions.batchIdentity,
  };
}

export function useJobService() {
  const { t } = useI18n();
  const isSending = ref(false);
  const error = ref(null);

  async function sendJob(payloads, options = {}) {
    isSending.value = true;
    error.value = null;

    try {
      const resolvedOptions = buildResumeOptions(options.getGroups?.() ?? [], options, payloads);
      const { getGroups: _omit, skipDuplicate, resumeExisting, ...runOptions } = resolvedOptions;

      if (!(await isFlowTabActive())) {
        throw new Error(t('notOnGrokOverlay.description'));
      }

      if (skipDuplicate && runOptions.groupId) {
        return { success: true, groupId: runOptions.groupId, alreadyActive: true };
      }

      if (resumeExisting && runOptions.groupId) {
        const strippedPayloads = await preparePayloadImages(payloads);
        const response = await dispatchToFlowTab({
          type: 'RESUME_PROMPT_GROUP',
          groupId: runOptions.groupId,
          payloads: strippedPayloads,
          ...buildDispatchOptions(runOptions),
        });
        if (response?.success === false) {
          throw new Error(response.error || t('common.errors.sendJobFailed'));
        }
        return { ...(response || {}), groupId: response?.groupId ?? runOptions.groupId };
      }

      const groupId = runOptions.groupId ?? `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const strippedPayloads = await preparePayloadImages(payloads);

      const response = await dispatchToFlowTab({
        type: 'AUTO_FILL_GROK',
        payloads: strippedPayloads,
        groupId,
        resumeFrom: runOptions.resumeFrom,
        ...buildDispatchOptions(runOptions),
      });

      if (response?.success === false) {
        throw new Error(response.error || t('common.errors.sendJobFailed'));
      }

      await incrementDailyCount(payloads.length);
      return { ...(response || {}), groupId: response?.groupId ?? groupId };
    } catch (err) {
      const message = err?.message || 'Unknown error';
      if (
        message.includes('Receiving end does not exist') ||
        message.includes('Could not establish connection')
      ) {
        error.value = t('common.errors.connectionError');
        throw new Error(error.value);
      }
      error.value = message;
      throw err;
    } finally {
      isSending.value = false;
    }
  }

  function cancelJobGroup(groupId) {
    return dispatchToFlowTab({ type: 'CANCEL_PROMPT_GROUP', groupId });
  }

  function pauseJobGroup(groupId) {
    return dispatchToFlowTab({ type: 'PAUSE_PROMPT_GROUP', groupId });
  }

  async function resumeJobGroup(groupId, payloads = null, options = {}) {
    if (payloads?.length) {
      const strippedPayloads = await preparePayloadImages(payloads);
      const response = await dispatchToFlowTab({
        type: 'RESUME_PROMPT_GROUP',
        groupId,
        payloads: strippedPayloads,
        ...buildDispatchOptions(options),
      });
      if (response?.success === false) {
        throw new Error(response.error || t('common.errors.sendJobFailed'));
      }
      return response;
    }
    const stored = await readStoredSettings();
    const response = await dispatchToFlowTab({
      type: 'RESUME_PROMPT_GROUP',
      groupId,
      ...buildDispatchOptions({
        concurrentPrompts: options.concurrentPrompts ?? stored.concurrentPrompts,
        promptDelaySecondsMin: options.promptDelaySecondsMin ?? stored.promptDelaySecondsMin,
        promptDelaySecondsMax: options.promptDelaySecondsMax ?? stored.promptDelaySecondsMax,
      }),
    });
    if (response?.success === false) {
      throw new Error(response.error || t('common.errors.sendJobFailed'));
    }
    return response;
  }

  async function downloadOnlyGroup(group, selectedMode) {
    isSending.value = true;
    error.value = null;
    try {
      if (!(await isFlowTabActive())) {
        throw new Error(t('notOnGrokOverlay.description'));
      }
      const settings = await readStoredSettings();
      const payloads = buildDownloadPayloadsFromGroup(group, settings, selectedMode);
      if (!payloads.length) {
        throw new Error(t('controlTab.promptGroups.redownload.noPayloads'));
      }
      const response = await dispatchToFlowTab({
        type: 'DOWNLOAD_ONLY_GROK',
        groupId: group.id,
        payloads,
      });
      if (response?.success === false) {
        throw new Error(response.error || t('controlTab.promptGroups.redownload.failed'));
      }
      return response;
    } catch (err) {
      const message = err?.message || 'Unknown error';
      error.value = message;
      throw err;
    } finally {
      isSending.value = false;
    }
  }

  return {
    sendJob,
    cancelJobGroup,
    pauseJobGroup,
    resumeJobGroup,
    downloadOnlyGroup,
    isSending,
    error,
  };
}
