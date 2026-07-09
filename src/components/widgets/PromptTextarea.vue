<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePanelToast } from '@/composables/usePanelToast.js';
import { parseSpreadsheetFile } from '@/utils/spreadsheet.js';
import { usePersistResize } from '@/composables/usePersistResize.js';
import SpreadsheetImportModal from '@/components/modals/SpreadsheetImportModal.vue';
import ExpandFullscreenButton from '@/components/widgets/ExpandFullscreenButton.vue';
import FullscreenViewModal from '@/components/modals/FullscreenViewModal.vue';

const model = defineModel({ type: String, default: '' });

const props = defineProps({
  label: String,
  placeholder: String,
  tip: String,
});

const emit = defineEmits(['import']);

const { t } = useI18n();
const toast = usePanelToast();

const txtInputRef = ref(null);
const spreadsheetInputRef = ref(null);
const spreadsheetModalVisible = ref(false);
const spreadsheetSheets = ref([]);
const spreadsheetFilename = ref('');
const { elementRef: textareaRef } = usePersistResize('veo-ui-prompt-height', {
  defaultHeight: 224,
  minHeight: 96,
});
const fullscreenOpen = ref(false);

function openTxtPicker() {
  txtInputRef.value?.click();
}

function openSpreadsheetPicker() {
  spreadsheetInputRef.value?.click();
}

async function onTxtSelected(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.txt')) {
    toast.add({
      severity: 'warn',
      summary: t('common.uploadTxt'),
      detail: t('common.errors.invalidFileType', { type: '.txt' }),
      life: 5000,
    });
    return;
  }

  try {
    const text = await file.text();
    model.value = text;
    emit('import', text);
  } catch {
    toast.add({
      severity: 'error',
      summary: t('common.uploadTxt'),
      detail: t('common.errors.fileReadError'),
      life: 6000,
    });
  }
}

async function onSpreadsheetSelected(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  const name = file.name.toLowerCase();
  const isSpreadsheet = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');

  if (!isSpreadsheet) {
    toast.add({
      severity: 'warn',
      summary: t('common.uploadSpreadsheet'),
      detail: t('common.errors.invalidFileType', { type: '.xlsx / .csv' }),
      life: 5000,
    });
    return;
  }

  try {
    const sheets = await parseSpreadsheetFile(file);
    spreadsheetSheets.value = sheets;
    spreadsheetFilename.value = file.name;
    spreadsheetModalVisible.value = true;
  } catch {
    toast.add({
      severity: 'error',
      summary: t('common.uploadSpreadsheet'),
      detail: t('common.errors.fileReadError'),
      life: 6000,
    });
  }
}

function onSpreadsheetConfirm(text) {
  model.value = text;
  emit('import', text);
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-2">
      <label v-if="label" class="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
        <i class="pi pi-file-edit flex-shrink-0" />
        <span>{{ label }}</span>
      </label>
      <div class="flex items-center gap-1 shrink-0">
        <ExpandFullscreenButton @click="fullscreenOpen = true" />
        <PButton
          :label="$t('common.uploadTxt')"
          icon="pi pi-file"
          size="small"
          severity="secondary"
          text
          class="text-xs"
          @click="openTxtPicker"
        />
        <PButton
          :label="$t('common.uploadSpreadsheet')"
          icon="pi pi-table"
          size="small"
          severity="secondary"
          text
          class="text-xs"
          @click="openSpreadsheetPicker"
        />
      </div>
    </div>

    <input ref="txtInputRef" type="file" accept=".txt" class="hidden" @change="onTxtSelected" />
    <input
      ref="spreadsheetInputRef"
      type="file"
      accept=".xlsx,.xls,.csv"
      class="hidden"
      @change="onSpreadsheetSelected"
    />

    <PInputTextarea
      ref="textareaRef"
      v-model="model"
      :placeholder="placeholder"
      rows="6"
      size="small"
      class="mt-2 w-full text-xs veo-prompt-textarea"
    />

    <p v-if="tip" class="text-xs text-muted-foreground mt-1">{{ tip }}</p>

    <FullscreenViewModal v-model:visible="fullscreenOpen" :title="label">
      <div class="flex flex-col flex-1 min-h-0 gap-3">
        <PInputTextarea
          v-model="model"
          :placeholder="placeholder"
          rows="16"
          size="small"
          class="w-full text-xs veo-fullscreen-textarea flex-1 min-h-0"
        />
        <p v-if="tip" class="text-xs text-muted-foreground shrink-0">{{ tip }}</p>
      </div>
    </FullscreenViewModal>

    <SpreadsheetImportModal
      v-model:visible="spreadsheetModalVisible"
      :sheets="spreadsheetSheets"
      :filename="spreadsheetFilename"
      @confirm="onSpreadsheetConfirm"
    />
  </div>
</template>
