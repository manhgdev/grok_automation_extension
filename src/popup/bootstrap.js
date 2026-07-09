/** Extension popup / side panel — load Vue bundle (CSP-safe external script). */
const status = document.createElement('div');
status.id = 'grok-boot-status';
status.textContent = 'Loading…';
document.body.appendChild(status);

function showPopupError(message) {
  status.id = '';
  status.style.cssText = 'padding:1.5rem;font:14px system-ui,sans-serif;color:#f87171;line-height:1.5';
  status.innerHTML =
    '<strong>Popup failed to load</strong><br>' +
    String(message || 'Unknown error') +
    '<br><small>Reload extension at chrome://extensions</small>';
}

window.addEventListener('error', (e) => {
  if (document.getElementById('grok-boot-status')) {
    showPopupError(e.message || e.error || 'Unknown error');
  }
});

window.addEventListener('unhandledrejection', (e) => {
  if (document.getElementById('grok-boot-status')) {
    showPopupError(e.reason?.message || e.reason || 'Unhandled promise rejection');
  }
});

import('./app.js').catch((err) => {
  console.error('[Grok popup] load failed:', err);
  showPopupError(err?.message || err);
});
