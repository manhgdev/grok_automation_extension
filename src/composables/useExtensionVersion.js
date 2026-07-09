export function useExtensionVersion() {
  let version = 'dev';
  try {
    const manifest = chrome?.runtime?.getManifest?.();
    version = manifest?.version_name || manifest?.version || 'dev';
  } catch {
    /* ignore */
  }
  return { version };
}
