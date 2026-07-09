export const THEME_STORAGE_KEY = 'veo-ui-theme';

export function readStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function applyTheme(theme) {
  const root = document.documentElement;
  const isDark = theme !== 'light';
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
}

export function setTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark';
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  applyTheme(next);
  return next;
}

export function toggleTheme(current) {
  return setTheme(current === 'dark' ? 'light' : 'dark');
}
