import { computed, unref } from 'vue';

export function useImagesPerPrompt({
  uploadedImages,
  prompts,
  maxImagesPerPrompt,
  getMaxImagesForPrompt,
  autoAddCharacterImages,
  isPromptAfterConcat,
  assignmentMode = 'cyclic',
}) {
  function limitForIndex(index) {
    if (getMaxImagesForPrompt) return getMaxImagesForPrompt(index);
    return unref(maxImagesPerPrompt);
  }

  function matchCharacterImages(promptText) {
    if (!autoAddCharacterImages.value) return [];
    const lower = promptText.toLowerCase();
    return uploadedImages.value.filter((img) => {
      const name = img.name.replace(/\.[^/.]+$/, '').toLowerCase();
      return name && lower.includes(name);
    });
  }

  const imagesPerPrompt = computed(() => {
    if (!prompts.value.length || !uploadedImages.value.length) {
      return prompts.value.map(() => []);
    }

    const result = [];
    let rotateIndex = 0;
    let sequentialCursor = 0;

    for (let i = 0; i < prompts.value.length; i++) {
      if (isPromptAfterConcat?.(i)) {
        result.push([]);
        continue;
      }

      const limit = limitForIndex(i);
      const picked = [];
      const seen = new Set();

      if (autoAddCharacterImages.value) {
        for (const img of matchCharacterImages(prompts.value[i])) {
          if (!seen.has(img.id) && picked.length < limit) {
            picked.push(img);
            seen.add(img.id);
          }
        }
      } else if (assignmentMode === 'sequential') {
        for (let n = 0; n < limit && sequentialCursor < uploadedImages.value.length; n++) {
          const img = uploadedImages.value[sequentialCursor++];
          if (!seen.has(img.id)) {
            picked.push(img);
            seen.add(img.id);
          }
        }
      } else {
        const count = Math.min(limit, uploadedImages.value.length);
        for (let n = 0; n < count && picked.length < limit; n++) {
          const img = uploadedImages.value[rotateIndex % uploadedImages.value.length];
          if (!seen.has(img.id)) {
            picked.push(img);
            seen.add(img.id);
          }
          rotateIndex++;
        }
      }

      result.push(picked);
    }

    return result;
  });

  const promptsWithoutImages = computed(() =>
    imagesPerPrompt.value
      .map((imgs, i) => (isPromptAfterConcat?.(i) ? null : imgs.length ? null : i + 1))
      .filter((v) => v != null),
  );

  const allPromptsHaveImages = computed(() => {
    if (!prompts.value.length) return true;
    if (autoAddCharacterImages.value) return true;
    if (!uploadedImages.value.length) return true;
    return promptsWithoutImages.value.length === 0;
  });

  function hasCharacterImages(index) {
    if (!autoAddCharacterImages.value) return false;
    const promptText = prompts.value[index];
    if (!promptText) return false;
    return matchCharacterImages(promptText).length > 0;
  }

  return { imagesPerPrompt, promptsWithoutImages, allPromptsHaveImages, hasCharacterImages };
}
