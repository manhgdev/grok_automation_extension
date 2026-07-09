import { buildPromptPreviews } from '@/utils/prompts.js';

/** Chuẩn hóa toàn bộ nội dung prompt batch (không cắt 60 ký tự). */
export function normalizePromptBatchText(prompts) {
  return (Array.isArray(prompts) ? prompts : [])
    .map((p) => String(typeof p === 'string' ? p : p?.prompt ?? '').trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join('\n---\n');
}

function imageFingerprintFromPayloads(payloads) {
  return (payloads ?? [])
    .map((p) =>
      (p.images ?? [])
        .map((img) => `${img.id ?? ''}\t${img.name ?? ''}`)
        .join(','),
    )
    .join('|');
}

/** Fingerprint batch — đổi bất kỳ mục nào thì tạo group mới khi bấm Chạy. */
export function buildBatchIdentity({
  defaultMode,
  runMode,
  model,
  imageModel,
  aspectRatio,
  prompts,
  payloads,
}) {
  const promptList = prompts ?? (payloads ?? []).map((p) => p?.prompt);
  const imagePayloads = payloads ?? [];
  return JSON.stringify({
    defaultMode: defaultMode ?? '',
    runMode: runMode ?? '',
    model: model ?? '',
    imageModel: imageModel ?? '',
    aspectRatio: aspectRatio ?? '',
    prompts: normalizePromptBatchText(promptList),
    images: imageFingerprintFromPayloads(imagePayloads),
  });
}

export function batchIdentityForJob(settings, runMode, payloads) {
  return buildBatchIdentity({
    defaultMode: settings?.defaultMode,
    runMode,
    model: settings?.model,
    imageModel: settings?.imageModel,
    aspectRatio: settings?.aspectRatio,
    payloads,
  });
}

export function batchIdentityMatches(stored, current) {
  if (!stored || !current) return false;
  return stored === current;
}

/** Panel: có nên gộp vào group đang active khi bấm Chạy? */
export function shouldReuseBatchGroup(group, options, payloads) {
  const current = options?.batchIdentity;
  if (!current) return false;
  if (group?.batchIdentity) return batchIdentityMatches(group.batchIdentity, current);
  // Group cũ chưa có fingerprint — chỉ khớp preview prompt (không đủ so settings)
  const expected = buildPromptPreviews(payloads);
  const fromGroup = group?.promptPreviews?.map((p) => String(p ?? '').trim()) ?? [];
  if (fromGroup.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (fromGroup[i] !== expected[i]) return false;
  }
  return true;
}
