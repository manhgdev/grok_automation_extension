import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const CONCAT_SUFFIX = '-concat';

/** Quản lý duration/mode từng dòng prompt (video hoặc image). */
export function usePromptOptions({ optionType = 'video' }) {
  const { t } = useI18n();
  const perPromptOptions = ref({});

  const allOptions = computed(() => {
    if (optionType === 'image') {
      return [
        { label: t('common.imageModeOptions.createNew'), value: 'new-image' },
        { label: t('common.imageModeOptions.concat'), value: 'new-image-concat' },
      ];
    }
    return [
      { label: t('common.durationOptions.6s'), value: '6s' },
      { label: t('common.durationOptions.10s'), value: '10s' },
      { label: t('common.durationOptions.15s'), value: '15s' },
      { label: t('common.durationOptions.6sConcat'), value: '6s-concat' },
      { label: t('common.durationOptions.10sConcat'), value: '10s-concat' },
      { label: t('common.durationOptions.15sConcat'), value: '15s-concat' },
    ];
  });

  function getPromptOption(index, { defaultPromptOption, totalPrompts }) {
    const fallback = defaultPromptOption ?? '';
    if (perPromptOptions.value[index]) return perPromptOptions.value[index];
    if (totalPrompts > 0 && index === totalPrompts - 1 && fallback.includes(CONCAT_SUFFIX)) {
      return fallback.split(CONCAT_SUFFIX)[0];
    }
    return fallback;
  }

  function setPromptOption(index, value) {
    perPromptOptions.value[index] = value;
  }

  function setAllPromptOptions(value, totalPrompts) {
    if (!value || totalPrompts <= 0) return;
    const next = { ...perPromptOptions.value };
    for (let index = 0; index < totalPrompts; index++) {
      const allowed = getOptionsForPrompt(index, totalPrompts);
      const match = allowed.find((opt) => opt.value === value);
      if (match) {
        next[index] = value;
        continue;
      }
      if (String(value).includes(CONCAT_SUFFIX)) {
        const base = String(value).split(CONCAT_SUFFIX)[0];
        const baseMatch = allowed.find((opt) => opt.value === base);
        if (baseMatch) next[index] = base;
      }
    }
    perPromptOptions.value = next;
  }

  function getOptionsForPrompt(index, totalPrompts) {
    if (index === totalPrompts - 1) {
      return allOptions.value.filter((opt) => !opt.value.includes('concat'));
    }
    return allOptions.value;
  }

  function resetOptions() {
    perPromptOptions.value = {};
  }

  return {
    getPromptOption,
    setPromptOption,
    setAllPromptOptions,
    getOptionsForPrompt,
    resetOptions,
    allOptions,
  };
}

export function useConcatDetection(getPromptOption, prompts, defaultPromptOption) {
  function isConcatPrompt(index) {
    const option = getPromptOption(index, {
      defaultPromptOption: defaultPromptOption.value ?? '',
      totalPrompts: prompts.value.length,
    });
    return String(option).includes('concat');
  }

  function isPromptAfterConcat(index) {
    if (index === 0) return false;
    const option = getPromptOption(index - 1, {
      defaultPromptOption: defaultPromptOption.value ?? '',
      totalPrompts: prompts.value.length,
    });
    return String(option).includes('concat');
  }

  const hasConcat = computed(() => prompts.value.some((_, i) => isConcatPrompt(i)));

  return { isConcatPrompt, isPromptAfterConcat, hasConcat };
}
