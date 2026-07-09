<script setup>
import { setFolderNameFromUser } from '@shared/folderNameSession.js';

const props = defineProps({
  settings: { type: Object, required: true },
});

function onFolderNameInput(value) {
  setFolderNameFromUser(props.settings, value);
}
</script>

<template>
  <div class="space-y-1">
    <label class="text-xs font-semibold text-foreground">{{ $t('controlTab.folderName.label') }}</label>
    <PInputText
      :model-value="settings.folderName"
      :placeholder="$t('controlTab.folderName.placeholder')"
      size="small"
      class="w-full text-sm"
      @update:model-value="onFolderNameInput"
    />
    <p class="text-[10px] text-muted-foreground">{{ $t('controlTab.folderName.description') }}</p>
  </div>
</template>
