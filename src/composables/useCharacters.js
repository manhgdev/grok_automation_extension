import { ref, computed } from 'vue';
import { dispatchToFlowTab } from '@/chrome/messaging.js';

const SCANNED_CHARACTERS_KEY = 'scanned-characters';

export function useCharacterMatching(prompts, enableCharacterControl, scannedCharacters) {
  const characterPerPrompt = computed(() =>
    prompts.value.map((text) => {
      if (!enableCharacterControl.value) return null;
      const lower = text.toLowerCase();
      const matched = (scannedCharacters.value ?? []).filter((name) =>
        lower.includes(String(name).toLowerCase()),
      );
      return matched.length > 0 ? matched : null;
    }),
  );

  return { characterPerPrompt };
}

export function useCharacterScan(defaultCharacters) {
  const scannedCharacters = ref([]);
  const isScanning = ref(false);
  const scanError = ref(null);

  async function scanCharacters() {
    isScanning.value = true;
    scanError.value = null;
    try {
      const response = await dispatchToFlowTab({ type: 'SCAN_CHARACTERS' });
      const chars = response?.characters ?? [];
      scannedCharacters.value = chars;

      const current = [...(defaultCharacters.value ?? [])];
      if (!current.length && chars.length) {
        defaultCharacters.value = [chars[0]];
      } else {
        defaultCharacters.value = current.filter((c) => chars.includes(c));
      }
    } catch (err) {
      scanError.value = err?.message ?? 'Failed to scan characters.';
    } finally {
      isScanning.value = false;
    }
  }

  return { scannedCharacters, isScanning, scanError, scanCharacters };
}
