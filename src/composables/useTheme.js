import { ref, computed } from 'vue';
import { readStoredTheme, setTheme, toggleTheme as flipTheme } from '@/utils/theme.js';

const theme = ref(readStoredTheme());

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark');

  function toggleTheme() {
    theme.value = flipTheme(theme.value);
  }

  function chooseTheme(next) {
    theme.value = setTheme(next);
  }

  return {
    theme,
    isDark,
    toggleTheme,
    setTheme: chooseTheme,
  };
}
