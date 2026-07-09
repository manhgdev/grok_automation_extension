<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { isVideoMedia, uploadMediaKind } from '@/utils/media.js';

const props = defineProps({
  settings: { type: Object, required: true },
  settingsKey: { type: String, required: true },
  labelKey: { type: String, required: true },
  optionsKey: { type: String, required: true },
  optionCount: { type: Number, default: 3 },
  uploadedImages: { type: Array, default: () => [] },
});

const { t } = useI18n();

const isOmniFlash = computed(() => props.settings.model === 'Omni Flash');

const label = computed(() => {
  if (isOmniFlash.value && props.labelKey === 'componentsToVideoMaxImages') {
    const kind = uploadMediaKind(props.uploadedImages);
    if (kind === 'both') return t('settingsTab.componentsToVideoMaxImages.labelBoth');
    if (kind === 'video-only') return t('settingsTab.componentsToVideoMaxImages.labelVideoOnly');
  }
  return t(`settingsTab.${props.labelKey}.label`);
});

const options = computed(() => {
  const kind = uploadMediaKind(props.uploadedImages);
  const hasVideo = kind === 'video-only' || kind === 'both';
  const hasImage = kind === 'image-only' || kind === 'both';

  return Array.from({ length: props.optionCount }, (_, i) => {
    const count = i + 1;
    if (hasVideo && hasImage) {
      return {
        value: count,
        label: t(`settingsTab.${props.optionsKey}.optionBoth`, { count }, count),
      };
    }
    if (hasVideo && !hasImage) {
      return {
        value: count,
        label: t(`settingsTab.${props.optionsKey}.optionVideoOnly`, { count }, count),
      };
    }
    return {
      value: count,
      label: t(`settingsTab.${props.optionsKey}.option${count}`),
    };
  });
});
</script>

<template>
  <div class="space-y-1">
    <label class="text-xs font-semibold text-foreground">{{ label }}</label>
    <PSelect
      v-model="settings[settingsKey]"
      :options="options"
      option-label="label"
      option-value="value"
      size="small"
      class="w-full"
    />
    <p class="text-[10px] text-muted-foreground">
      {{ $t(`settingsTab.${labelKey}.description`) }}
    </p>
  </div>
</template>
