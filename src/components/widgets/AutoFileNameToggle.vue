<script setup>
defineProps({
  settings: { type: Object, required: true },
});
</script>

<template>
  <div class="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
    <div class="space-y-0.5">
      <label class="text-xs font-semibold text-foreground">{{ $t('controlTab.autoChangeFileName') }}</label>
      <p class="text-[10px] text-muted-foreground">{{ $t('controlTab.folderName.description') }}</p>
    </div>
    <PInputSwitch v-model="settings.autoChangeFileName" />
  </div>
</template>
