import { computed } from 'vue';
import { SPEAKERS } from '@/constants/options.js';

export function useSpeakers(prompts, autoAddVoiceBySpeaker) {
  return useSpeakerMatching(prompts, autoAddVoiceBySpeaker);
}

export function useSpeakerMatching(prompts, autoAddVoiceBySpeaker) {
  const speakerPerPrompt = computed(() =>
    prompts.value.map((text) => {
      if (!autoAddVoiceBySpeaker.value) return null;
      const lower = text.toLowerCase();
      return SPEAKERS.find((s) => lower.includes(s.name.toLowerCase())) ?? null;
    }),
  );

  function getPayloadSpeaker(index, defaultSpeaker) {
    if (autoAddVoiceBySpeaker.value) return speakerPerPrompt.value[index]?.name ?? null;
    return defaultSpeaker !== 'none' ? defaultSpeaker : null;
  }

  return { speakerPerPrompt, getPayloadSpeaker, SPEAKERS };
}
