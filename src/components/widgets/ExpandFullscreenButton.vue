<script setup>
defineProps({
  title: { type: String, default: '' },
});

defineEmits(['click']);
</script>

<template>
  <button
    type="button"
    class="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded border border-border/50 bg-background/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
    :title="title || $t('common.openFullscreen')"
    :aria-label="title || $t('common.openFullscreen')"
    @click="$emit('click')"
  >
    <i class="pi pi-window-maximize text-xs" aria-hidden="true" />
  </button>
</template>
