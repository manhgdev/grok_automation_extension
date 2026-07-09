<script setup>
import { computed, watch, ref } from 'vue';

const props = defineProps({
  visible: Boolean,
  sheets: { type: Array, default: () => [] },
  filename: String,
});

const emit = defineEmits(['update:visible', 'confirm']);

const sheetIndex = ref(0);
const columnIndex = ref(0);

function longestColumnIndex(sheet) {
  if (!sheet?.columns?.length) return 0;
  let best = 0;
  for (let i = 1; i < sheet.columns.length; i++) {
    if (sheet.columns[i].totalLength > sheet.columns[best].totalLength) best = i;
  }
  return best;
}

const activeSheet = computed(() => props.sheets[sheetIndex.value] ?? null);

const sheetOptions = computed(() =>
  props.sheets.map((sheet, index) => ({ label: sheet.name, value: index })),
);

const columnOptions = computed(() => {
  const sheet = activeSheet.value;
  if (!sheet) return [];
  const auto = longestColumnIndex(sheet);
  return sheet.columns.map((col, index) => ({
    label: index === auto ? `${col.header || `Col ${index + 1}`} (auto)` : col.header || `Col ${index + 1}`,
    value: index,
  }));
});

const previewRows = computed(() => activeSheet.value?.columns[columnIndex.value]?.values.slice(0, 6) ?? []);
const totalRows = computed(() => activeSheet.value?.columns[columnIndex.value]?.values.length ?? 0);

watch(
  () => [props.visible, props.sheets],
  ([visible, sheets]) => {
    if (visible && sheets?.length) {
      sheetIndex.value = 0;
      columnIndex.value = longestColumnIndex(sheets[0]);
    }
  },
  { immediate: true },
);

watch(sheetIndex, (index) => {
  const sheet = props.sheets[index];
  if (sheet) columnIndex.value = longestColumnIndex(sheet);
});

function confirmImport() {
  const values = activeSheet.value?.columns[columnIndex.value]?.values;
  if (!values?.length) return;
  emit('confirm', values.join('\n\n'));
  emit('update:visible', false);
}
</script>

<template>
  <PDialog
    :visible="visible"
    modal
    :draggable="false"
    style="width: 28rem"
    pt:root:class="border border-slate-300/30 bg-slate-100 dark:bg-slate-800"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <i class="pi pi-table text-xl" />
        <span class="font-semibold">{{ $t('spreadsheetImport.title') }}</span>
      </div>
    </template>

    <div class="space-y-3 text-sm">
      <div class="flex items-center gap-2 text-xs">
        <i class="pi pi-file-excel text-emerald-500" />
        <span class="truncate font-medium" :title="filename">{{ filename }}</span>
      </div>

      <div>
        <label class="text-xs text-muted-foreground">{{ $t('spreadsheetImport.sheet') }}</label>
        <PSelect
          v-model="sheetIndex"
          :options="sheetOptions"
          option-label="label"
          option-value="value"
          size="small"
          class="w-full text-xs mt-1"
          :disabled="sheets.length <= 1"
        />
      </div>

      <div v-if="activeSheet?.columns?.length">
        <label class="text-xs text-muted-foreground">{{ $t('spreadsheetImport.column') }}</label>
        <PSelect
          v-model="columnIndex"
          :options="columnOptions"
          option-label="label"
          option-value="value"
          size="small"
          class="w-full text-xs mt-1"
        />
      </div>

      <div v-if="previewRows.length">
        <div class="flex justify-between text-xs mb-1">
          <span>{{ $t('spreadsheetImport.preview') }}</span>
          <span class="text-muted-foreground">{{ totalRows }} {{ $t('spreadsheetImport.rows') }}</span>
        </div>
        <ul class="rounded border border-border/50 divide-y divide-border/30 max-h-40 overflow-y-auto">
          <li
            v-for="(row, index) in previewRows"
            :key="index"
            class="px-3 py-2 text-xs truncate"
            :title="row"
          >
            <span class="text-muted-foreground mr-1">{{ index + 1 }}.</span>
            {{ row || '—' }}
          </li>
          <li v-if="totalRows > previewRows.length" class="px-3 py-2 text-xs text-muted-foreground">
            +{{ totalRows - previewRows.length }} {{ $t('spreadsheetImport.more') }}
          </li>
        </ul>
      </div>
      <div v-else-if="activeSheet" class="text-xs text-muted-foreground">
        {{ $t('spreadsheetImport.noData') }}
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <PButton
          :label="$t('common.cancel')"
          severity="secondary"
          size="small"
          text
          @click="emit('update:visible', false)"
        />
        <PButton
          :label="$t('spreadsheetImport.import', { count: totalRows })"
          icon="pi pi-check"
          size="small"
          :disabled="!totalRows"
          @click="confirmImport"
        />
      </div>
    </template>
  </PDialog>
</template>
