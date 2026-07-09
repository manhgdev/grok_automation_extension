import { useToast } from 'primevue/usetoast';

const noopToast = {
  add: () => {},
  remove: () => {},
  removeGroup: () => {},
  removeAllGroups: () => {},
};

export function usePanelToast() {
  try {
    return useToast();
  } catch {
    return noopToast;
  }
}
