<script setup>
import { CHROME_WEB_STORE_URL } from '@shared/config.js';

defineProps({
  visible: Boolean,
  isAutoUpdating: Boolean,
});
</script>

<template>
  <PDialog
    :visible="visible"
    :closable="false"
    modal
    :draggable="false"
    :style="{ width: '22rem' }"
    pt:root:class="border border-slate-300/30 bg-slate-100 dark:bg-slate-800"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <i class="pi pi-sync text-xl" />
        <span class="font-semibold">
          {{ $t(isAutoUpdating ? 'updateModal.title' : 'updateModal.titleManual') }}
        </span>
      </div>
    </template>

    <div v-if="isAutoUpdating" class="space-y-4 text-center">
      <div class="flex flex-col items-center gap-2">
        <i class="pi pi-spin pi-spinner text-2xl text-primary" />
        <p class="text-sm">{{ $t('updateModal.autoUpdating') }}</p>
      </div>
      <p class="text-xs text-muted-foreground">{{ $t('updateModal.autoUpdatingHint') }}</p>
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground">{{ $t('updateModal.takingTooLong') }}</p>
        <a :href="CHROME_WEB_STORE_URL" target="_blank" rel="noopener noreferrer" class="block">
          <PButton
            :label="$t('updateModal.reinstallButton')"
            icon="pi pi-external-link"
            severity="success"
            size="small"
            class="w-full"
          />
        </a>
      </div>
    </div>

    <div v-else class="space-y-4 text-sm">
      <p class="text-muted-foreground">{{ $t('updateModal.manualDescription') }}</p>
      <a :href="CHROME_WEB_STORE_URL" target="_blank" rel="noopener noreferrer" class="block">
        <PButton
          :label="$t('updateModal.reinstallButton')"
          icon="pi pi-external-link"
          severity="success"
          class="w-full"
        />
      </a>
    </div>
  </PDialog>
</template>
