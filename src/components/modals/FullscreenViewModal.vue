<script setup>
import { ref, watch, nextTick } from 'vue';

const visible = defineModel('visible', { type: Boolean, default: false });

defineProps({
  title: { type: String, default: '' },
});

const dialogRef = ref(null);

function maximizeDialog() {
  nextTick(() => {
    dialogRef.value?.maximize?.();
  });
}

watch(visible, (open) => {
  if (open) maximizeDialog();
});
</script>

<template>
  <PDialog
    ref="dialogRef"
    v-model:visible="visible"
    modal
    maximizable
    :draggable="false"
    :header="title"
    class="veo-fullscreen-dialog"
    :style="{ width: 'min(96vw, 56rem)' }"
    pt:root:class="veo-fullscreen-dialog-root border border-border/60 bg-background"
    pt:content:class="veo-fullscreen-dialog-content flex flex-col min-h-0 overflow-hidden p-0"
    @show="maximizeDialog"
  >
    <div class="veo-fullscreen-panel flex flex-col flex-1 min-h-0 overflow-hidden p-3 sm:p-4">
      <slot />
    </div>
  </PDialog>
</template>
