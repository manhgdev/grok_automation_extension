import { ref } from 'vue';
import { cooldownSecondsLeft, isPromptInCooldown } from '@/utils/queue.js';

const now = ref(Date.now());

/** Đồng hồ dùng chung — không phụ thuộc onMounted từng instance list. */
setInterval(() => {
  now.value = Date.now();
}, 100);

/** Cập nhật đồng hồ chờ mỗi 100ms để đếm ngược mượt trên từng dòng prompt. */
export function usePromptDelayTicker() {
  function secondsLeft(group, promptIndex) {
    return cooldownSecondsLeft(group, promptIndex, now.value);
  }

  function isDelaying(group, promptIndex) {
    return isPromptInCooldown(group, promptIndex, now.value);
  }

  function delayProgress(group, promptIndex) {
    const total = Number(group?.delayTotalSeconds) || 0;
    if (total <= 0) return 0;
    const left = secondsLeft(group, promptIndex);
    if (left <= 0) return 100;
    return Math.min(100, Math.max(0, ((total - left) / total) * 100));
  }

  return { now, secondsLeft, isDelaying, delayProgress };
}
