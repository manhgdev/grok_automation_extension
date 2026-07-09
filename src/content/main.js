/**
 * Content script entry — grok.com pages.
 * Starts Grok automation.
 */
if (!globalThis.__GROK_CONTENT_SCRIPT__) {
  globalThis.__GROK_CONTENT_SCRIPT__ = true;
  import('./automation/engine.js');
}
