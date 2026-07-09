import { ref } from 'vue';

const AUTH_TOKEN_KEY = 'auth-access-token';
const AUTH_EMAIL_KEY = 'auth-email';

const email = ref('');
const isPro = ref(true);
const isLoggedIn = ref(true);
const isChecking = ref(false);
const error = ref('');

async function loadFromStorage() {
  if (!chrome?.storage?.local) return;
  const stored = await chrome.storage.local.get([AUTH_TOKEN_KEY, AUTH_EMAIL_KEY]);
  if (stored[AUTH_TOKEN_KEY] && stored[AUTH_EMAIL_KEY]) {
    email.value = stored[AUTH_EMAIL_KEY];
    isLoggedIn.value = true;
    isPro.value = true;
  }
}

let storageLoaded = false;
function ensureStorageLoaded() {
  if (!storageLoaded) {
    storageLoaded = true;
    loadFromStorage().catch(() => {});
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function useAuth() {
  ensureStorageLoaded();
  async function verifyEmail(address) {
    isChecking.value = true;
    error.value = '';
    try {
      email.value = address;
      isLoggedIn.value = true;
      isPro.value = true;
      if (chrome?.storage?.local) {
        await chrome.storage.local.set({
          [AUTH_TOKEN_KEY]: 'local-offline',
          [AUTH_EMAIL_KEY]: address,
        });
      }
    } catch {
      isLoggedIn.value = true;
      isPro.value = true;
    } finally {
      isChecking.value = false;
    }
  }

  async function logout() {
    email.value = '';
    isPro.value = false;
    isLoggedIn.value = false;
    error.value = '';
    if (chrome?.storage?.local) {
      await chrome.storage.local.remove([AUTH_TOKEN_KEY, AUTH_EMAIL_KEY]);
    }
  }

  async function refreshPlan() {
    isPro.value = true;
    isLoggedIn.value = true;
    isChecking.value = false;
  }

  return {
    email,
    isPro,
    isLoggedIn,
    isChecking,
    error,
    isValidEmail,
    verifyEmail,
    logout,
    refreshPlan,
  };
}

export const loginModalOpen = ref(false);

export function useLoginModal() {
  return {
    showLoginModal: loginModalOpen,
    openLogin: () => {
      loginModalOpen.value = true;
    },
  };
}
