<script setup>
import { FLOW_URL } from '@/constants/options.js';

defineProps({
  flowUrl: { type: String, default: FLOW_URL },
});

const emit = defineEmits(['navigate']);

function openFlow() {
  emit('navigate', FLOW_URL);
}
</script>

<template>
  <div class="veo-not-on-flow-backdrop">
    <div class="veo-not-on-flow-card">
      <div class="veo-not-on-flow-icon" aria-hidden="true">
        <i class="pi pi-exclamation-circle" />
      </div>

      <p class="veo-not-on-flow-title">
        {{ $t('notOnGrokOverlay.title') }}
      </p>
      <p class="veo-not-on-flow-desc">
        {{ $t('notOnGrokOverlay.description') }}
      </p>

      <div class="mt-6">
        <PButton
          :label="$t('notOnGrokOverlay.button')"
          icon="pi pi-external-link"
          severity="success"
          class="w-full"
          @click="openFlow"
        />
      </div>
    </div>
  </div>
</template>
