<script setup>
import { computed } from 'vue';
import { useAuth, useLoginModal } from '@/composables/useAuth.js';
import { usePlanUpgrade } from '@/composables/usePlanUpgrade.js';

const { isLoggedIn, isPro, email, logout, refreshPlan } = useAuth();
const { openLogin } = useLoginModal();
const { openUpgrade } = usePlanUpgrade();

const statusLabel = computed(() => {
  if (!isLoggedIn.value) return 'planBanner.notLoggedIn';
  if (isPro.value) return 'planBanner.proActive';
  return 'planBanner.freeUpgrade';
});
</script>

<template>
  <div
    class="rounded-lg border border-border/60 bg-gradient-to-r from-primary/5 to-accent/5 px-3 py-2 flex items-center justify-between gap-2"
  >
    <div class="min-w-0">
      <p class="text-xs font-semibold text-foreground">{{ $t(statusLabel) }}</p>
      <p v-if="isLoggedIn && email" class="text-[10px] text-muted-foreground truncate">{{ email }}</p>
    </div>

    <div class="flex items-center gap-1 shrink-0">
      <PButton
        v-if="!isLoggedIn"
        :label="$t('planBanner.signIn')"
        size="small"
        icon="pi pi-sign-in"
        @click="openLogin"
      />
      <template v-else>
        <PButton
          :label="$t('planBanner.refreshPlan')"
          size="small"
          severity="secondary"
          text
          icon="pi pi-refresh"
          @click="refreshPlan"
        />
        <PButton
          v-if="!isPro"
          :label="$t('planBanner.upgrade')"
          size="small"
          severity="warning"
          icon="pi pi-crown"
          @click="openUpgrade"
        />
        <PButton
          :label="$t('planBanner.signOut')"
          size="small"
          severity="secondary"
          text
          icon="pi pi-sign-out"
          @click="logout"
        />
      </template>
    </div>
  </div>
</template>
