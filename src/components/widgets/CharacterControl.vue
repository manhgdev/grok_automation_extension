<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCharacterScan, useCharacterMatching } from '@/composables/useCharacters.js';

const props = defineProps({
  settings: { type: Object, required: true },
  prompts: { type: Array, default: () => [] },
});

const { t } = useI18n();
const showCharacterList = ref(false);

const promptsRef = computed(() => props.prompts);
const defaultCharactersRef = computed({
  get: () => props.settings.defaultCharacters ?? [],
  set: (value) => {
    props.settings.defaultCharacters = value;
  },
});

const { scannedCharacters, isScanning, scanError, scanCharacters } =
  useCharacterScan(defaultCharactersRef);

const { characterPerPrompt } = useCharacterMatching(
  promptsRef,
  computed(() => props.settings.enableCharacterControl),
  scannedCharacters,
);

const characterOptions = computed(() =>
  scannedCharacters.value.map((name) => ({ label: name, value: name })),
);

function getCharacterRowBadge(index) {
  if (props.settings.enableCharacterControl) {
    const chars = characterPerPrompt.value[index];
    if (chars?.length) {
      return { icon: 'pi-user', text: chars.join(', '), colorClass: 'text-violet-500' };
    }
    return {
      icon: 'pi-user',
      text: t('componentsToVideoControl.characterControl.noMatch'),
      colorClass: 'text-muted-foreground italic',
    };
  }
  const defaults = Object.values(props.settings.defaultCharacters ?? {});
  if (defaults.length) {
    return { icon: 'pi-user', text: defaults.join(', '), colorClass: 'text-violet-500' };
  }
  return null;
}

function getPayloadCharacters(index) {
  if (props.settings.enableCharacterControl) return characterPerPrompt.value[index] ?? null;
  const defaults = Object.values(props.settings.defaultCharacters ?? {});
  return defaults.length ? defaults : null;
}

defineExpose({ getCharacterRowBadge, getPayloadCharacters });
</script>

<template>
  <div class="flex flex-col gap-1.5 p-2 bg-muted/20 rounded border border-border/40">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <i class="pi pi-user text-primary text-sm shrink-0" />
        <div class="min-w-0">
          <label class="text-xs sm:text-sm font-semibold text-foreground">
            {{ $t('componentsToVideoControl.characterControl.label') }}
          </label>
          <p class="text-[10px] text-muted-foreground">
            {{ $t('componentsToVideoControl.characterControl.description') }}
          </p>
        </div>
      </div>
      <PInputSwitch v-model="settings.enableCharacterControl" />
    </div>

    <div class="space-y-1">
      <label class="text-xs font-semibold">
        {{ $t('componentsToVideoControl.characterControl.defaultCharacterLabel') }}
      </label>
      <div class="flex items-center gap-2">
        <PMultiSelect
          v-model="settings.defaultCharacters"
          :options="characterOptions"
          option-label="label"
          option-value="value"
          :disabled="settings.enableCharacterControl"
          :placeholder="$t('componentsToVideoControl.characterControl.defaultCharacterNone')"
          class="flex-1 text-xs"
          size="small"
          display="chip"
        />
        <PButton
          icon="pi pi-search"
          :label="$t('componentsToVideoControl.characterControl.scanButton')"
          severity="secondary"
          text
          size="small"
          :loading="isScanning"
          :disabled="isScanning"
          @click="scanCharacters"
        />
      </div>
      <p v-if="settings.enableCharacterControl" class="text-[10px] text-muted-foreground">
        {{ $t('componentsToVideoControl.characterControl.autoSelectHint') }}
      </p>
      <p v-else-if="scanError" class="text-[10px] text-rose-500">{{ scanError }}</p>
      <p
        v-else-if="!isScanning && !scannedCharacters.length"
        class="text-[10px] text-muted-foreground"
      >
        {{ $t('componentsToVideoControl.characterControl.noCharactersHint') }}
      </p>
    </div>

    <div v-if="scannedCharacters.length">
      <button
        type="button"
        class="text-xs text-primary underline underline-offset-2 cursor-pointer"
        @click="showCharacterList = !showCharacterList"
      >
        {{
          showCharacterList
            ? $t('componentsToVideoControl.characterControl.hideCharacters')
            : $t('componentsToVideoControl.characterControl.showCharacters', {
                count: scannedCharacters.length,
              })
        }}
      </button>
      <div v-if="showCharacterList" class="mt-1.5 space-y-1 max-h-40 overflow-y-auto">
        <div
          v-for="name in scannedCharacters"
          :key="name"
          class="flex items-center gap-2 px-2 py-1 rounded bg-muted/30 border border-border/30"
        >
          <i class="pi pi-user text-[10px] shrink-0 text-violet-500" />
          <span class="text-xs font-semibold text-foreground">{{ name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
