import { ref } from 'vue';

const progressEntries = ref([]);
let removeGroupHandler = null;

export function useGenerationProgress() {
  function updateProgress(groupId, promptIndex, percentage, status, promptLabel) {
    const existing = progressEntries.value.findIndex(
      (e) => e.groupId === groupId && e.promptIndex === promptIndex,
    );
    const entry = {
      groupId,
      promptIndex,
      percentage,
      status,
      prompt: promptLabel || `Prompt ${promptIndex}`,
    };
    if (existing >= 0) {
      progressEntries.value[existing] = entry;
      progressEntries.value = [...progressEntries.value];
    } else {
      progressEntries.value.push(entry);
    }
  }

  function clearProgress() {
    progressEntries.value = [];
  }

  function setRemoveGroupHandler(handler) {
    removeGroupHandler = typeof handler === 'function' ? handler : null;
  }

  function removeGroupFromQueue(groupId) {
    removeGroupHandler?.(groupId);
    progressEntries.value = progressEntries.value.filter((e) => e.groupId !== groupId);
  }

  function clearGroupProgress(groupId) {
    if (!groupId) return;
    progressEntries.value = progressEntries.value.filter((e) => e.groupId !== groupId);
  }

  return {
    generationProgress: progressEntries,
    updateProgress,
    clearProgress,
    clearGroupProgress,
    setRemoveGroupHandler,
    removeGroupFromQueue,
  };
}
