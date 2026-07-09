import { ref } from 'vue';

const activeResumeHandler = ref(null);

export function registerResumeHandler(handler) {
  activeResumeHandler.value = handler;
}

export function unregisterResumeHandler(handler) {
  if (activeResumeHandler.value === handler) {
    activeResumeHandler.value = null;
  }
}

export async function resumePausedGroupFromUI(groupId) {
  const handler = activeResumeHandler.value;
  if (!handler) {
    throw new Error('No active control to build resume payloads');
  }
  return handler(groupId);
}
