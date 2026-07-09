<script setup>
const visible = defineModel('visible', { type: Boolean, default: false });

const emit = defineEmits(['dismiss', 'dismiss-forever']);

function onVisibleChange(next) {
  if (!next) emit('dismiss');
}

function dismiss() {
  visible.value = false;
  emit('dismiss');
}

function dismissForever() {
  visible.value = false;
  emit('dismiss-forever');
}
</script>

<template>
  <PDialog
    v-model:visible="visible"
    closable
    modal
    :draggable="false"
    :style="{ width: '28rem' }"
    pt:root:class="border border-green-400/40 bg-slate-100 dark:bg-slate-800"
    @update:visible="onVisibleChange"
  >
    <template #header>
      <span class="font-semibold text-sm">{{ $t('tipBeforeUseModal.title') }}</span>
    </template>

    <div class="space-y-4 text-sm">
      <div
        class="rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-3 space-y-2"
      >
        <p class="font-medium text-blue-700 dark:text-blue-300 text-xs">
          {{ $t('tipBeforeUseModal.planTitle') }}
        </p>
        <ul class="space-y-3 text-xs text-foreground">
          <li class="flex items-center gap-2">
            <i class="pi pi-check-circle text-blue-500 text-xs" />
            <span>{{ $t('tipBeforeUseModal.planSuperLite') }}</span>
          </li>
          <li class="flex items-center gap-2">
            <i class="pi pi-check-circle text-green-500 text-xs" />
            <span>
              {{ $t('tipBeforeUseModal.planSuperGrok') }}
              <span
                class="ml-1 rounded bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 px-1 py-0.5 text-xs font-medium"
              >
                {{ $t('tipBeforeUseModal.planRecommended') }}
              </span>
            </span>
          </li>
          <li class="flex items-center gap-2">
            <i class="pi pi-check-circle text-blue-500 text-xs" />
            <span>{{ $t('tipBeforeUseModal.planHeavy') }}</span>
          </li>
        </ul>
      </div>

      <div class="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300/40 p-3 space-y-3">
        <p class="font-medium text-yellow-700 dark:text-yellow-300 text-xs">
          {{ $t('tipBeforeUseModal.tipsTitle') }}
        </p>
        <ul class="space-y-2 text-xs text-foreground">
          <li class="flex items-start gap-2">
            <i class="pi pi-exclamation-triangle text-yellow-500 text-xs mt-0.5" />
            <span>{{ $t('tipBeforeUseModal.tip720p') }}</span>
          </li>
          <li class="flex items-start gap-2">
            <i class="pi pi-exclamation-triangle text-yellow-500 text-xs mt-0.5" />
            <span>{{ $t('tipBeforeUseModal.tipStability') }}</span>
          </li>
        </ul>
      </div>

      <div class="flex flex-col gap-2">
        <PButton
          :label="$t('tipBeforeUseModal.dismissButton')"
          icon="pi pi-check"
          severity="success"
          size="small"
          class="w-full text-xs"
          @click="dismiss"
        />
        <PButton
          :label="$t('tipBeforeUseModal.dismissForeverButton')"
          icon="pi pi-check"
          severity="secondary"
          size="small"
          outlined
          class="w-full text-xs"
          @click="dismissForever"
        />
      </div>
    </div>
  </PDialog>
</template>
