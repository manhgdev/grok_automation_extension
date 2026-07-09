import { ref } from 'vue';

const entries = ref([]);

export function useActionLog() {
  function addEntry(entry) {
    entries.value = [...entries.value, entry];
    if (entries.value.length > 500) {
      entries.value = entries.value.slice(-500);
    }
  }

  function clearLog() {
    entries.value = [];
  }

  return { entries, addEntry, clearLog };
}
