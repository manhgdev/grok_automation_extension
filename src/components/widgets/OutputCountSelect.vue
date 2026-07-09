<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  settings: { type: Object, required: true },
  hasConcat: { type: Boolean, default: false },
  maxCount: { type: Number, default: 4 },
  countKey: { type: String, default: 'outputCount' },
});

const { t } = useI18n();

const options = computed(() =>
  Array.from({ length: props.maxCount }, (_, i) => {
    const value = i + 1;
    return {
      value,
      label: t(`settingsTab.outputCount.option${value}`),
    };
  }),
);

const effectiveValue = computed(() => (props.hasConcat ? 1 : props.settings[props.countKey]));
</script>

<template>
  <div class="space-y-1">
    <label class="text-xs font-semibold text-foreground">{{ $t('settingsTab.outputCount.label') }}</label>
    <PSelect
      :model-value="effectiveValue"
      :options="options"
      option-label="label"
      option-value="value"
      size="small"
      class="w-full"
      :disabled="hasConcat"
      @update:model-value="settings[countKey] = $event"
    />
    <p class="text-[10px] text-muted-foreground">{{ $t('settingsTab.outputCount.description') }}</p>
  </div>
</template>
