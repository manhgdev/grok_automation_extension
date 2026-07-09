import { createApp } from 'vue';
import './assets/style.css';
import './assets/panel-shell.css';

import App from './App.vue';
import { i18n } from './i18n/index.js';
import { installPrimeVue } from './plugins/primevue.js';
import { applyTheme, readStoredTheme } from './utils/theme.js';

applyTheme(readStoredTheme());

const rtl = new Set(['ar', 'ur']);
const locale =
  (() => {
    try {
      const raw = localStorage.getItem('user-locale');
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return navigator.language?.split('-')[0] || 'en';
  })();
document.documentElement.dir = rtl.has(locale) ? 'rtl' : 'ltr';

const bootStatus = document.getElementById('grok-boot-status');
if (bootStatus) bootStatus.remove();

const app = createApp(App);

installPrimeVue(app);
app.use(i18n);

app.config.errorHandler = (err, instance, info) => {
  console.error('[Grok popup]', info, err);
  const root = document.getElementById('app');
  if (root && !root.querySelector('.veo-panel-root')) {
    root.innerHTML =
      '<div style="padding:1.5rem;font:14px system-ui,sans-serif;color:#f87171">' +
      '<strong>Popup error</strong><br>' +
      String(err?.message || err) +
      '</div>';
  }
};

app.mount('#app');
