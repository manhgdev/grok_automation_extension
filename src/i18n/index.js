import { createI18n } from 'vue-i18n';
import rawMessages from './messages.json';

const messages = structuredClone(rawMessages);

const defaultLocale = navigator.language?.split('-')[0] || 'en';

function readStoredLocale() {
  try {
    const raw = localStorage.getItem('user-locale');
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return defaultLocale;
}

export const i18n = createI18n({
  legacy: false,
  locale: readStoredLocale(),
  fallbackLocale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages,
});

export function setLocale(locale) {
  i18n.global.locale.value = locale;
  localStorage.setItem('user-locale', JSON.stringify(locale));
  const rtl = new Set(['ar', 'ur']);
  document.documentElement.dir = rtl.has(locale) ? 'rtl' : 'ltr';
}

export function getLocale() {
  return i18n.global.locale.value;
}
