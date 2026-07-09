import { IMAGE_MODELS, VIDEO_MODELS } from '@/constants/options.js';

export const IMAGE_MODEL_CHAIN = IMAGE_MODELS.map((m) => m.value);
export const VIDEO_MODEL_CHAIN = VIDEO_MODELS.map((m) => m.value);

const MODEL_NAME_ALIASES = [
  { value: '🍌 Nano Banana Pro', patterns: [/nano banana pro/i, /🍌\s*nano banana pro/i] },
  {
    value: '🍌 Nano Banana 2 Lite',
    patterns: [/nano banana 2\s*lite/i, /🍌\s*nano banana 2\s*lite/i],
  },
  { value: '🍌 Nano Banana 2', patterns: [/nano banana 2(?!\s*lite)/i, /🍌\s*nano banana 2(?!\s*lite)/i] },
  { value: 'Imagen 4', patterns: [/imagen\s*4/i] },
  { value: 'Veo 3.1 - Quality', patterns: [/veo\s*3\.1\s*[-–]?\s*quality/i] },
  { value: 'Veo 3.1 - Fast', patterns: [/veo\s*3\.1\s*[-–]?\s*fast/i] },
  { value: 'Veo 3.1 - Lite [Lower Priority]', patterns: [/veo\s*3\.1\s*[-–]?\s*lite\s*\[lower priority\]/i] },
  { value: 'Veo 3.1 - Lite', patterns: [/veo\s*3\.1\s*[-–]?\s*lite(?!\s*\[)/i] },
  { value: 'Omni Flash', patterns: [/omni flash/i] },
];

/** Flow gợi ý đổi sang model khác (đa ngôn ngữ). */
const SUGGEST_OTHER_MODEL_PATTERNS = [
  /mô hình khác/i,
  /thử dùng (?:một )?mô hình/i,
  /(?:try|use)(?:\s+\w+){0,5}\s+(?:a\s+)?different\s+model/i,
  /(?:try|use)(?:\s+\w+){0,5}\s+another\s+model/i,
  /other\s+model/i,
  /switch\s+to\s+(?:a\s+)?different/i,
  /otro\s+modelo/i,
  /(?:prueba|intenta|usa)\s+(?:un\s+)?otro\s+modelo/i,
  /autre\s+mod[eè]le/i,
  /(?:essayez|utilisez)\s+(?:un\s+)?autre\s+mod[eè]le/i,
  /anderes\s+modell/i,
  /(?:versuchen|nutzen)\s+sie\s+(?:ein\s+)?anderes\s+modell/i,
  /un\s+altro\s+modello/i,
  /prova\s+(?:un\s+)?altro\s+modello/i,
  /outro\s+modelo/i,
  /tente\s+(?:outro|um\s+outro)\s+modelo/i,
  /друг(?:ой|ую)\s+модел/i,
  /попробуйте\s+друг/i,
  /別のモデル/,
  /他のモデル/,
  /다른\s*모델/,
  /换一个模型/,
  /換一個模型/,
  /其他模型/,
  /尝试.*模型/,
  /model\s+lain/i,
  /coba\s+model\s+lain/i,
  /farkl[ıi]\s+(?:bir\s+)?model/i,
  /başka\s+(?:bir\s+)?model/i,
  /โมเดลอื่น/,
  /ลองใช้.*โมเดล/,
  /ander\s+model/i,
  /probeer\s+(?:een\s+)?ander\s+model/i,
  /दूसर[ाेी]\s*मॉडल/,
  /अन्य\s+मॉडल/,
  /অন্য\s+মডেল/,
  /دوسر[اےی]\s+ماڈل/,
  /مختلف\s+ماڈل/,
  /ibang\s+model/i,
  /نموذج\s+آخر/,
  /موديل\s+آخر/,
  /جرّب\s+نموذج/i,
];

/** Hết hạn mức / limit (đa ngôn ngữ). */
const LIMIT_PATTERNS = [
  /hết\s+hạn\s+mức/i,
  /hạn\s+mức/i,
  /đã\s+dùng\s+hết/i,
  /số\s+lượt\s+tạo/i,
  /lượt\s+tạo/i,
  /(?:reached|exceeded|used\s+up).{0,48}(?:limit|quota|generations?)/i,
  /(?:generation|daily|monthly)\s+limit/i,
  /quota/i,
  /credit/i,
  /l[ií]mite\s+de/i,
  /l[ií]mite\s+alcanzad/i,
  /cr[eé]ditos?\s+agotad/i,
  /quota\s+d[eé]pass[eé]/i,
  /limite\s+(?:de\s+)?(?:cr[eé]dit|g[eé]n[eé]ration)/i,
  /cr[eé]dits?\s+(?:insuffisants|[eé]puis[eé]s)/i,
  /kontingent/i,
  /guthaben.*(?:aufgebraucht|erschöpft)/i,
  /limite\s+(?:di\s+)?generazion/i,
  /limite\s+de\s+gera[cç][aã]o/i,
  /лимит/i,
  /квот/i,
  /上限/,
  /制限/,
  /한도/,
  /할당량/,
  /限额/,
  /额度/,
  /kuota/i,
  /batas/i,
  /kotas[ıi]/i,
  /ขีดจำกัด/,
  /โควตา/,
  /حد\s+(?:الإنشاء|التوليد|الاستخدام)?/i,
  /حصة/i,
  /सीमा/,
  /limiet/i,
];

/** Giới hạn gắn với một model cụ thể (đa ngôn ngữ). */
const MODEL_CONTEXT_PATTERNS = [
  /đối với/i,
  /for\s+(?:the\s+)?(?:🍌|nano|imagen|veo)/i,
  /for\s+🍌/i,
  /pour\s+(?:le\s+)?(?:mod[eè]le|🍌|nano|imagen|veo)/i,
  /für\s+(?:das\s+)?(?:modell|🍌|nano|imagen|veo)/i,
  /para\s+(?:el\s+)?(?:modelo|🍌|nano|imagen|veo)/i,
  /per\s+(?:il\s+)?(?:modello|🍌|nano|imagen|veo)/i,
  /para\s+o\s+(?:modelo|🍌|nano|imagen|veo)/i,
  /для\s+(?:модели\s+)?(?:🍌|nano|imagen|veo)/i,
  /(?:🍌|nano|imagen|veo).{0,24}(?:の上限|の制限)/i,
  /(?:🍌|nano|imagen|veo).{0,24}(?:한도|할당량)/i,
  /(?:🍌|nano|imagen|veo).{0,24}(?:限额|额度)/i,
  /untuk\s+(?:model|🍌|nano|imagen|veo)/i,
  /için\s+(?:🍌|nano|imagen|veo)/i,
  /สำหรับ\s*(?:🍌|nano|imagen|veo|โมเดล)/i,
  /(?:🍌|nano|imagen|veo).{0,24}के\s+लिए/i,
  /(?:🍌|nano|imagen|veo).{0,24}জন্য/i,
  /(?:🍌|nano|imagen|veo).{0,24}کے\s+لیے/i,
  /para\s+sa\s+(?:model|🍌|nano|imagen|veo)/i,
  /(?:لـ|لأجل)\s*(?:🍌|nano|imagen|veo|نموذج)/i,
  /voor\s+(?:het\s+)?(?:model|🍌|nano|imagen|veo)/i,
  /with\s+(?:🍌|nano|imagen|veo)/i,
  /on\s+(?:🍌|nano|imagen|veo)/i,
];

function normalizeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function mentionsModel(text) {
  return /nano\s*banana|imagen\s*4?|veo\s*3\.?1|omni\s*flash|🍌/i.test(text);
}

/** Hết hạn mức riêng một model (Flow gợi ý đổi model khác). */
export function isModelQuotaMessage(text) {
  const t = normalizeText(text);
  if (!t) return false;

  const suggestsOther = matchesAny(t, SUGGEST_OTHER_MODEL_PATTERNS);
  const hasLimit = matchesAny(t, LIMIT_PATTERNS);
  const namesModel = mentionsModel(t);
  const hasModelContext = matchesAny(t, MODEL_CONTEXT_PATTERNS);

  if (suggestsOther && (namesModel || hasLimit)) return true;
  if (hasLimit && namesModel && hasModelContext) return true;
  if (hasLimit && namesModel && /(?:for|with|on)\s+(?:🍌|nano|imagen|veo)/i.test(t)) return true;

  return false;
}

export function extractModelFromQuotaMessage(text) {
  const t = normalizeText(text);
  if (!t) return null;
  for (const { value, patterns } of MODEL_NAME_ALIASES) {
    if (t.includes(value)) return value;
    if (patterns.some((p) => p.test(t))) return value;
  }
  return null;
}

export function getModelChainForPayload(payload) {
  const mode = String(payload?.mode || '');
  if (mode.includes('Image') || mode.includes('image')) return IMAGE_MODEL_CHAIN;
  if (mode.includes('Video') || mode.includes('video') || mode === 'agentAutomation') {
    return VIDEO_MODEL_CHAIN;
  }
  return IMAGE_MODEL_CHAIN;
}

export const IMAGEN_4_MODEL = 'Imagen 4';

export function pickNextModel(currentModel, chain, exhausted = new Set()) {
  const start = Math.max(0, chain.indexOf(currentModel) + 1);
  for (let i = start; i < chain.length; i++) {
    if (!exhausted.has(chain[i])) return chain[i];
  }
  for (const model of chain) {
    if (model !== currentModel && !exhausted.has(model)) return model;
  }
  return null;
}

/** Pro / NB2 / NB2 Lite luôn fallback; Imagen 4 chỉ khi acc đã xác nhận có trong menu. */
export function pickNextModelAfterQuota(currentModel, chain, exhausted, hasImagen4) {
  const next = pickNextModel(currentModel, chain, exhausted);
  if (!next || next === IMAGEN_4_MODEL && hasImagen4 !== true) return null;
  return next;
}
