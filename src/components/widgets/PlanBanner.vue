<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuth, useLoginModal } from '@/composables/useAuth.js';
import { usePlanUpgrade } from '@/composables/usePlanUpgrade.js';
import { useDailyPromptQuota, usePricingEnabled } from '@/composables/useDailyPromptQuota.js';
import { UI_CONFIG } from '@shared/config.js';

const emit = defineEmits(['show-login']);

const showBanner = computed(
  () => UI_CONFIG.showPlanBanner && UI_CONFIG.isPricingEnabled,
);

const { t } = useI18n();
const { isLoggedIn, isPro, email, logout, refreshPlan } = useAuth();
const { openLogin } = useLoginModal();
const { openUpgrade } = usePlanUpgrade();
const { usedToday, percentage, limit } = useDailyPromptQuota();
const isPricingEnabled = usePricingEnabled();

const isRefreshing = ref(false);

const maskedEmail = computed(() => {
  if (!email.value) return '';
  const [user, domain] = email.value.split('@');
  return domain ? `${'*'.repeat(user.length)}@${domain}` : email.value;
});

async function onRefreshPlan() {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  await Promise.all([refreshPlan(), new Promise((r) => setTimeout(r, 1000))]);
  isRefreshing.value = false;
}

function onSignIn() {
  openLogin();
  emit('show-login');
}
</script>

<template>
  <div
    v-if="showBanner"
    class="rounded-lg border border-border/60 bg-gradient-to-br from-background to-muted/20 overflow-hidden"
  >
    <div
      v-if="isLoggedIn"
      class="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-emerald-400 text-black text-xs font-semibold"
    >
      <div class="flex items-center gap-1.5">
        <template v-if="isPricingEnabled">
          <i :class="isPro ? 'pi pi-crown' : 'pi pi-bolt'" class="text-xs" />
          <button
            type="button"
            class="hover:opacity-70 transition-opacity bg-transparent border-none cursor-pointer p-0 font-semibold text-black"
            @click="openUpgrade"
          >
            {{ isPro ? $t('planBanner.proActive') : $t('planBanner.freeUpgrade') }}
          </button>
          <button
            v-if="!isPro"
            type="button"
            class="inline-flex items-center gap-1 hover:opacity-70 transition-opacity bg-transparent border-none cursor-pointer p-0 font-semibold text-black"
            :disabled="isRefreshing"
            @click="onRefreshPlan"
          >
            <span
              v-if="isRefreshing"
              class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
            />
            <i v-else class="pi pi-refresh text-xs" />
            <span>{{ $t('planBanner.refreshPlan') }}</span>
          </button>
        </template>
      </div>

      <div class="flex items-center gap-1.5">
        <i class="pi pi-user text-xs" />
        <span
          class="max-w-[200px] truncate cursor-default select-none"
          :title="email"
          @mouseenter="($event.target.textContent = email)"
          @mouseleave="($event.target.textContent = maskedEmail)"
        >
          {{ maskedEmail }}
        </span>
        <button
          type="button"
          class="inline-flex items-center hover:opacity-70 transition-opacity bg-transparent border-none cursor-pointer p-0 text-black"
          :title="$t('planBanner.signOut')"
          @click="logout"
        >
          <i class="pi pi-sign-out text-xs" />
        </button>
      </div>
    </div>

    <div
      v-else-if="isPricingEnabled"
      class="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-emerald-400 text-black text-xs font-semibold"
    >
      <button
        type="button"
        class="flex items-center gap-1.5 hover:opacity-70 transition-opacity bg-transparent border-none cursor-pointer p-0 font-semibold text-black"
        @click="openUpgrade"
      >
        <i class="pi pi-bolt text-xs" />
        <span>{{ $t('planBanner.notLoggedIn') }}</span>
      </button>
      <button
        type="button"
        class="flex items-center gap-1 hover:opacity-70 transition-opacity bg-transparent border-none cursor-pointer p-0 font-semibold text-black"
        @click="onSignIn"
      >
        <i class="pi pi-user text-xs" />
        <span>{{ $t('planBanner.signIn') }}</span>
      </button>
    </div>

    <div
      v-if="isPricingEnabled && !isPro"
      class="px-2.5 pt-1.5 pb-1.5 space-y-1 bg-muted/20"
    >
      <span class="text-xs text-muted-foreground">
        {{ $t('planBanner.promptsToday', { used: usedToday, limit }) }}
      </span>
      <div class="w-full h-2 rounded-full bg-muted/40 overflow-hidden py-0.5">
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="percentage >= 100 ? 'bg-red-500' : 'bg-emerald-400'"
          :style="{ width: `${percentage}%` }"
        />
      </div>
      <PButton
        :label="$t('planBanner.upgrade')"
        icon="pi pi-crown"
        size="small"
        class="w-full text-xs"
        @click="openUpgrade"
      />
      <p class="text-center text-xs text-muted-foreground mt-0.5">{{ $t('planBanner.upgradeTagline') }}</p>
    </div>
  </div>
</template>
