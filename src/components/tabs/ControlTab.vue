<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { MODE_VALUES } from '@/constants/options.js';
import TextToVideoControl from '@/components/controls/TextToVideoControl.vue';
import ImageToVideoControl from '@/components/controls/ImageToVideoControl.vue';
import ComponentsToVideoControl from '@/components/controls/ComponentsToVideoControl.vue';
import TextToImageControl from '@/components/controls/TextToImageControl.vue';
import ImageToImageControl from '@/components/controls/ImageToImageControl.vue';
import AgentAutomationControl from '@/components/controls/AgentAutomationControl.vue';

const props = defineProps({
  selectedMode: { type: String, required: true },
  settings: { type: Object, required: true },
  promptGroups: { type: Array, default: () => [] },
  isClearingCache: Boolean,
  textToVideoForm: Object,
  imageToVideoForm: Object,
  componentsToVideoForm: Object,
  textToImageForm: Object,
  imageToImageForm: Object,
  agentAutomationForm: Object,
  hasConcat: Boolean,
});

const emit = defineEmits(['update:selectedMode', 'clear', 'clear-cache', 'update:has-concat']);

const { t } = useI18n();
const modeComponents = {
  textToVideo: TextToVideoControl,
  imageToVideo: ImageToVideoControl,
  componentsToVideo: ComponentsToVideoControl,
  textToImage: TextToImageControl,
  imageToImage: ImageToImageControl,
  agentAutomation: AgentAutomationControl,
};

const activeComponent = computed(() => modeComponents[props.selectedMode] ?? TextToVideoControl);

const concurrentOptions = computed(() =>
  [1, 2, 3, 4, 5, 6].map((count) => ({
    value: count,
    label: t(`settingsTab.concurrentPrompts.option${count}`, { count }),
  })),
);

const effectiveConcurrent = computed(() => {
  if (props.selectedMode === 'agentAutomation' || props.hasConcat) return 1;
  return props.settings.concurrentPrompts;
});

const concurrentDisabled = computed(
  () => props.selectedMode === 'agentAutomation' || props.hasConcat,
);

function selectMode(mode) {
  emit('update:selectedMode', mode);
}

function onConcurrentChange(value) {
  if (!concurrentDisabled.value) props.settings.concurrentPrompts = value;
}

function onDelayMinChange(value) {
  props.settings.promptDelaySecondsMin = Math.min(value, props.settings.promptDelaySecondsMax);
}

function onDelayMaxChange(value) {
  props.settings.promptDelaySecondsMax = Math.max(value, props.settings.promptDelaySecondsMin);
}

const modeButtons = MODE_VALUES.map((mode) => ({
  mode,
  icon: {
    textToVideo: 'pi pi-file-edit',
    imageToVideo: 'pi pi-image',
    componentsToVideo: 'pi pi-th-large',
    textToImage: 'pi pi-star',
    imageToImage: 'pi pi-images',
    agentAutomation: 'pi pi-sparkles',
  }[mode],
}));
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2 mt-1">
      <div class="grid grid-cols-3 gap-2">
        <PButton
          v-for="{ mode, icon } in modeButtons.slice(0, 3)"
          :key="mode"
          :label="$t(`controlTab.modeButtons.${mode}`)"
          :severity="selectedMode === mode ? 'primary' : 'secondary'"
          :outlined="selectedMode !== mode"
          class="flex-1 px-0"
          size="small"
          :icon="icon"
          @click="selectMode(mode)"
        />
      </div>
      <div class="grid grid-cols-3 gap-2">
        <PButton
          v-for="{ mode, icon } in modeButtons.slice(3)"
          :key="mode"
          :label="$t(`controlTab.modeButtons.${mode}`)"
          :severity="selectedMode === mode ? 'primary' : 'secondary'"
          :outlined="selectedMode !== mode"
          class="flex-1 px-0"
          size="small"
          :icon="icon"
          @click="selectMode(mode)"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <i class="pi pi-bolt text-primary text-sm" />
          <label class="text-xs font-semibold">{{ $t('settingsTab.concurrentPrompts.label') }}</label>
        </div>
        <PSelect
          :model-value="effectiveConcurrent"
          :options="concurrentOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          size="small"
          :disabled="concurrentDisabled"
          @update:model-value="onConcurrentChange"
        />
        <p class="text-[10px] text-muted-foreground">{{ $t('settingsTab.concurrentPrompts.description') }}</p>
      </div>

      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <i class="pi pi-clock text-primary text-sm" />
          <label class="text-xs font-semibold">{{ $t('settingsTab.promptDelay.label') }}</label>
        </div>
        <div class="flex items-center gap-2">
          <PInputNumber
            :model-value="settings.promptDelaySecondsMin"
            :min="0"
            :max="300"
            :step="1"
            button-layout="horizontal"
            class="w-full flex-1"
            input-class="w-full"
            @update:model-value="onDelayMinChange"
          />
          <span class="text-xs text-muted-foreground"><i class="pi pi-arrow-right-arrow-left text-[10px]" /></span>
          <PInputNumber
            :model-value="settings.promptDelaySecondsMax"
            :min="0"
            :max="300"
            :step="1"
            button-layout="horizontal"
            class="w-full flex-1"
            input-class="w-full"
            @update:model-value="onDelayMaxChange"
          />
        </div>
        <p class="text-[10px] text-muted-foreground">{{ $t('settingsTab.promptDelay.description') }}</p>
      </div>
    </div>

    <component
      :is="activeComponent"
      :settings="settings"
      :prompt-groups="promptGroups"
      :is-clearing-cache="isClearingCache"
      :text-to-video-form="textToVideoForm"
      :image-to-video-form="imageToVideoForm"
      :components-to-video-form="componentsToVideoForm"
      :text-to-image-form="textToImageForm"
      :image-to-image-form="imageToImageForm"
      :agent-automation-form="agentAutomationForm"
      @clear="emit('clear')"
      @clear-cache="emit('clear-cache')"
      @update:has-concat="emit('update:has-concat', $event)"
    />
  </div>
</template>
