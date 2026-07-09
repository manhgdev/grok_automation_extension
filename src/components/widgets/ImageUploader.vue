<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePanelToast } from '@/composables/usePanelToast.js';
import { isVideoMedia, mediaSrc, uploadMediaKind } from '@/utils/media.js';

const images = defineModel({ type: Array, default: () => [] });

const props = defineProps({
  allowVideo: { type: Boolean, default: false },
});

const { t } = useI18n();
const toast = usePanelToast();

const fileInputRef = ref(null);
const isDragging = ref(false);
const sortMode = ref('custom');
const dragSource = ref(null);
const dragOverId = ref(null);

const sortOptions = computed(() => [
  { label: t('common.images.sortOptions.custom'), value: 'custom' },
  { label: t('common.images.sortOptions.nameAsc'), value: 'name-asc' },
  { label: t('common.images.sortOptions.nameDesc'), value: 'name-desc' },
  { label: t('common.images.sortOptions.newest'), value: 'date-newest' },
  { label: t('common.images.sortOptions.oldest'), value: 'date-oldest' },
]);

const sortedImages = computed(() => {
  const list = [...images.value];
  switch (sortMode.value) {
    case 'name-asc':
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return list.sort((a, b) => b.name.localeCompare(a.name));
    case 'date-newest':
      return list.sort(
        (a, b) => new Date(b.uploadedAt ?? 0).getTime() - new Date(a.uploadedAt ?? 0).getTime(),
      );
    case 'date-oldest':
      return list.sort(
        (a, b) => new Date(a.uploadedAt ?? 0).getTime() - new Date(b.uploadedAt ?? 0).getTime(),
      );
    default:
      return list;
  }
});

const listLabel = computed(() => {
  const kind = uploadMediaKind(images.value);
  if (kind === 'both') return t('common.images.labelImagesAndVideos');
  if (kind === 'video-only') return t('common.images.labelVideos');
  return t('common.images.label');
});

watch(sortMode, () => {
  if (sortMode.value !== 'custom') {
    images.value = sortedImages.value;
  }
});

function makeId(name) {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${name}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

async function addFiles(fileList) {
  const files = Array.from(fileList ?? []);
  if (!files.length) return;

  const accepted = [];
  for (const file of files) {
    const isImage = file.type.startsWith('image/');
    const isVideo = props.allowVideo && file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.add({
        severity: 'warn',
        summary: t('common.upload.title'),
        detail: t('common.errors.invalidFileType', { type: 'image/video' }),
        life: 5000,
      });
      continue;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      accepted.push({
        id: makeId(file.name),
        name: file.name,
        base64: dataUrl,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      });
    } catch {
      toast.add({
        severity: 'error',
        summary: t('common.upload.title'),
        detail: t('common.errors.fileReadError'),
        life: 6000,
      });
    }
  }

  if (accepted.length) {
    images.value = [...images.value, ...accepted];
  }
}

function onInputChange(event) {
  addFiles(event.target.files);
  event.target.value = '';
}

function onDrop(event) {
  isDragging.value = false;
  addFiles(event.dataTransfer?.files);
}

function removeImage(id) {
  images.value = images.value.filter((img) => img.id !== id);
}

function openPicker() {
  fileInputRef.value?.click();
}

function onDragStart(item) {
  dragSource.value = item;
}

function onDragOver(event, id) {
  event.preventDefault();
  event.stopPropagation();
  dragOverId.value = id;
}

function onDropReorder(event, targetId) {
  event.preventDefault();
  event.stopPropagation();
  if (!dragSource.value) return;

  const list = [...images.value];
  const from = list.findIndex((item) => item.id === dragSource.value.id);
  const to = list.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0 || from === to) {
    dragSource.value = null;
    dragOverId.value = null;
    return;
  }

  const swapped = [...list];
  [swapped[from], swapped[to]] = [swapped[to], swapped[from]];
  sortMode.value = 'custom';
  images.value = swapped;
  dragSource.value = null;
  dragOverId.value = null;
}

function onDragLeave() {
  dragOverId.value = null;
}
</script>

<template>
  <div class="space-y-2">
    <div
      class="rounded-lg border-2 border-dashed p-4 text-center transition-colors cursor-pointer"
      :class="isDragging ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40 bg-muted/10'"
      @click="openPicker"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <i class="pi pi-cloud-upload text-2xl text-primary mb-2" />
      <p class="text-xs text-foreground">{{ $t('common.upload.title') }}</p>
      <p class="text-[10px] text-muted-foreground mt-1">
        <template v-if="allowVideo">
          PNG, JPG, GIF,
          <span class="bg-primary/15 text-primary border border-primary/20 px-1 py-0.5 rounded font-bold text-[10px] align-middle">
            MP4
          </span>
          up to 50MB each
        </template>
        <template v-else>{{ $t('common.upload.formats') }}</template>
      </p>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      multiple
      :accept="allowVideo ? 'image/*,video/*' : 'image/*'"
      class="hidden"
      @change="onInputChange"
    />

    <div v-if="images.length" class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <label class="text-xs font-semibold text-foreground">
          {{ listLabel }} ({{ images.length }})
        </label>
        <PSelect
          v-model="sortMode"
          :options="sortOptions"
          option-label="label"
          option-value="value"
          size="small"
          class="text-xs w-36"
        />
      </div>

      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="img in sortedImages"
          :key="img.id"
          class="group relative aspect-square rounded-lg border border-border/40 overflow-hidden bg-muted/40 cursor-move transition-all"
          :class="{ 'ring-2 ring-primary': dragOverId === img.id }"
          draggable="true"
          @dragstart="onDragStart(img)"
          @dragover="onDragOver($event, img.id)"
          @drop="onDropReorder($event, img.id)"
          @dragleave="onDragLeave"
        >
          <video
            v-if="isVideoMedia(img)"
            :src="mediaSrc(img)"
            class="h-full w-full object-cover"
            muted
            playsinline
            loop
            autoplay
          />
          <img
            v-else
            :src="mediaSrc(img)"
            :alt="img.name"
            class="h-full w-full object-cover"
          />

          <div
            v-if="isVideoMedia(img)"
            class="absolute top-1 left-1 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[9px] text-white"
          >
            <i class="pi pi-video text-[9px]" />
            <span>VIDEO</span>
          </div>

          <div class="absolute top-0.5 right-0.5">
            <PButton
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              size="small"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click.stop="removeImage(img.id)"
            />
          </div>

          <span
            class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] truncate px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            :title="img.name"
          >
            {{ img.name }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
