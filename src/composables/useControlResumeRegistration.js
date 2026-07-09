import { onMounted, onUnmounted } from 'vue';
import { registerResumeHandler, unregisterResumeHandler } from '@/composables/useActiveControlResume.js';

export function useControlResumeRegistration(resumeHandler) {
  onMounted(() => registerResumeHandler(resumeHandler));
  onUnmounted(() => unregisterResumeHandler(resumeHandler));
}
