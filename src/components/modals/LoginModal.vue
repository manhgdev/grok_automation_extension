<script setup>
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth.js';

const visible = defineModel('visible', { type: Boolean, default: false });

const { verifyEmail, isChecking, isValidEmail } = useAuth();

const emailInput = ref('');
const localError = ref('');

async function submit() {
  localError.value = '';
  const address = emailInput.value.trim();
  if (!address) {
    localError.value = 'loginModal.emailRequired';
    return;
  }
  if (!isValidEmail(address)) {
    localError.value = 'loginModal.emailInvalid';
    return;
  }
  await verifyEmail(address);
  visible.value = false;
  emailInput.value = '';
}
</script>

<template>
  <PDialog
    v-model:visible="visible"
    modal
    :draggable="false"
    style="width: 28rem"
    pt:root:class="border border-slate-300/30 bg-slate-100 dark:bg-slate-800"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <i class="pi pi-sign-in text-xl" />
        <span class="font-semibold">{{ $t('loginModal.title') }}</span>
      </div>
    </template>

    <div class="space-y-3 text-sm">
      <p class="text-muted-foreground">{{ $t('loginModal.description') }}</p>

      <div>
        <label class="text-xs font-medium">{{ $t('loginModal.emailLabel') }}</label>
        <PInputText
          v-model="emailInput"
          type="email"
          :placeholder="$t('loginModal.emailPlaceholder')"
          class="w-full mt-1"
          @keyup.enter="submit"
        />
        <p v-if="localError" class="text-xs text-rose-500 mt-1">{{ $t(localError) }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <PButton
          :label="$t('common.cancel')"
          severity="secondary"
          size="small"
          text
          @click="visible = false"
        />
        <PButton
          :label="$t('loginModal.submit')"
          icon="pi pi-check"
          size="small"
          :loading="isChecking"
          @click="submit"
        />
      </div>
    </template>
  </PDialog>
</template>
