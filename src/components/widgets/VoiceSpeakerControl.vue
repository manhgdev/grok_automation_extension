<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { SPEAKERS } from '@/constants/options.js';
import { useSpeakerMatching } from '@/composables/useSpeakers.js';

const props = defineProps({
  settings: { type: Object, required: true },
  prompts: { type: Array, default: () => [] },
});

const { t } = useI18n();
const voiceI18n = 'componentsToVideoControl.autoAddVoiceBySpeaker';
const showSpeakerList = ref(false);

const promptsRef = computed(() => props.prompts);
const { speakerPerPrompt } = useSpeakerMatching(
  promptsRef,
  computed(() => props.settings.autoAddVoiceBySpeaker),
);

const speakerOptions = computed(() => [
  { label: t(`${voiceI18n}.defaultSpeakerNone`), value: 'none' },
  ...SPEAKERS.map((s) => ({
    label: `${s.name} - ${t(`common.speakerDescriptions.${s.name}`)}`,
    value: s.name,
  })),
]);

function getSpeakerRowBadge(index) {
  if (props.settings.autoAddVoiceBySpeaker) {
    const speaker = speakerPerPrompt.value[index];
    if (speaker) {
      return {
        icon: 'pi-microphone',
        text: `${speaker.name} - ${t(`common.speakerDescriptions.${speaker.name}`)}`,
        colorClass: 'text-green-600',
      };
    }
    return {
      icon: 'pi-microphone',
      text: t(`${voiceI18n}.noMatch`),
      colorClass: 'text-muted-foreground italic',
    };
  }
  if (props.settings.defaultSpeaker && props.settings.defaultSpeaker !== 'none') {
    return {
      icon: 'pi-microphone',
      text: `${props.settings.defaultSpeaker} - ${t(`common.speakerDescriptions.${props.settings.defaultSpeaker}`)}`,
      colorClass: 'text-primary',
    };
  }
  return null;
}

function getPayloadSpeaker(index) {
  if (props.settings.autoAddVoiceBySpeaker) return speakerPerPrompt.value[index]?.name ?? null;
  return props.settings.defaultSpeaker !== 'none' ? props.settings.defaultSpeaker : null;
}

defineExpose({ getSpeakerRowBadge, getPayloadSpeaker });
</script>

<template>
  <div class="flex flex-col gap-1.5 p-2 bg-muted/20 rounded border border-border/40">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <i class="pi pi-microphone text-primary text-sm shrink-0" />
        <div class="min-w-0">
          <label class="text-xs sm:text-sm font-semibold text-foreground">
            {{ $t('componentsToVideoControl.autoAddVoiceBySpeaker.label') }}
          </label>
          <p class="text-[10px] text-muted-foreground">
            {{ $t('componentsToVideoControl.autoAddVoiceBySpeaker.description') }}
          </p>
        </div>
      </div>
      <PInputSwitch v-model="settings.autoAddVoiceBySpeaker" />
    </div>

    <div class="space-y-1">
      <label class="text-xs font-semibold">
        {{ $t('componentsToVideoControl.autoAddVoiceBySpeaker.defaultSpeakerLabel') }}
      </label>
      <PSelect
        v-model="settings.defaultSpeaker"
        :options="speakerOptions"
        option-label="label"
        option-value="value"
        class="w-full text-xs"
        size="small"
        :disabled="settings.autoAddVoiceBySpeaker"
      />
      <p v-if="settings.autoAddVoiceBySpeaker" class="text-[10px] text-muted-foreground">
        {{ $t('componentsToVideoControl.autoAddVoiceBySpeaker.defaultSpeakerDisabledHint') }}
      </p>
    </div>

    <div v-if="settings.autoAddVoiceBySpeaker">
      <button
        type="button"
        class="text-xs text-primary underline underline-offset-2 cursor-pointer"
        @click="showSpeakerList = !showSpeakerList"
      >
        {{
          showSpeakerList
            ? $t('componentsToVideoControl.autoAddVoiceBySpeaker.hideSpeakers')
            : $t('componentsToVideoControl.autoAddVoiceBySpeaker.showSpeakers', { count: SPEAKERS.length })
        }}
      </button>
      <div v-if="showSpeakerList" class="mt-1.5 space-y-1 max-h-40 overflow-y-auto">
        <div
          v-for="speaker in SPEAKERS"
          :key="speaker.name"
          class="flex items-center gap-2 px-2 py-1 rounded bg-muted/30 border border-border/30"
        >
          <i
            class="pi pi-user text-[10px] shrink-0"
            :class="{
              'text-pink-500': speaker.gender === 'Female',
              'text-blue-500': speaker.gender === 'Male',
              'text-muted-foreground': speaker.gender === 'Ungendered',
            }"
          />
          <span class="text-xs font-semibold text-foreground min-w-[80px]">{{ speaker.name }}</span>
          <span class="text-xs text-muted-foreground">{{ $t(`common.speakerDescriptions.${speaker.name}`) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
