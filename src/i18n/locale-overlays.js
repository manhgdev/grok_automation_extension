/** grok_automation v2.5.7 — popup "Lưu ý trước khi sử dụng" */
const TIP_BEFORE_USE_BY_LOCALE = {
  en: {
    tipBeforeUseModal: {
      title: 'Tips Before You Use',
      planTitle: 'Make sure you have one of these Grok plans:',
      planSuperLite: 'Super Grok Lite',
      planSuperGrok: 'Super Grok (3-day free trial available)',
      planRecommended: 'Recommended',
      planHeavy: 'Grok Heavy',
      tipsTitle: 'Good to know:',
      tip720p: 'Grok strictly limits the number of 720p videos you can generate.',
      tipStability:
        "If automation doesn't work as expected, check that your internet is stable and that your prompts and images don't violate Grok's policies.",
      dismissButton: 'Got it',
      dismissForeverButton: "I understand, don't show again",
    },
  },
  vi: {
    tipBeforeUseModal: {
      title: 'Lưu ý trước khi sử dụng',
      planTitle: 'Đảm bảo bạn có một trong các gói Grok sau:',
      planSuperLite: 'Super Grok Lite',
      planSuperGrok: 'Super Grok (dùng thử miễn phí 3 ngày)',
      planRecommended: 'Đề xuất',
      planHeavy: 'Grok Heavy',
      tipsTitle: 'Cần biết:',
      tip720p: 'Grok giới hạn nghiêm ngặt số lượng video 720p bạn có thể tạo.',
      tipStability:
        'Nếu tự động hóa không hoạt động đúng, hãy kiểm tra kết nối internet ổn định và đảm bảo prompt cùng hình ảnh không vi phạm chính sách của Grok.',
      dismissButton: 'Đã hiểu',
      dismissForeverButton: 'Tôi đã hiểu và không hiển thị lại',
    },
  },
};

/** @param {string} locale */
export function tipBeforeUseOverlay(locale) {
  return TIP_BEFORE_USE_BY_LOCALE[locale] ?? TIP_BEFORE_USE_BY_LOCALE.en;
}

/** grok_automation v2.5.7 — 6s / 10s / 15s (+ concat) trong popup video */
const VIDEO_POPUP_BY_LOCALE = {
  en: {
    common: {
      durationOptions: {
        '6s': '6s',
        '10s': '10s',
        '15s': '15s',
        '6sConcat': '6s Concat',
        '10sConcat': '10s Concat',
        '15sConcat': '15s concat',
      },
      videoModeControl: {
        tip: 'Choose "6s", "10s", "15s", "6s Concat", "10s Concat", or "15s Concat" to combine with next prompt into 1 video.',
      },
    },
    settingsTab: {
      defaultVideoOption: {
        description:
          'Default duration setting for prompts (6s, 10s, 15s, 6s concat, 10s concat or 15s concat). Last prompt will always use 6s, 10s or 15s.',
        option6sConcat: '6 seconds (concat)',
        option10sConcat: '10 seconds (concat)',
        option15s: '15 seconds',
        option15sConcat: '15 seconds (concat)',
      },
    },
  },
  vi: {
    common: {
      durationOptions: {
        '6s': '6 giây',
        '10s': '10 giây',
        '15s': '15 giây',
        '6sConcat': '6 giây nối tiếp',
        '10sConcat': '10 giây nối tiếp',
        '15sConcat': '15 giây nối tiếp',
      },
      videoModeControl: {
        tip: 'Chọn "6s", "10s", "15s", "6s Nối tiếp", "10s Nối tiếp" hoặc "15s Nối tiếp" để ghép với prompt tiếp theo thành 1 video.',
      },
    },
    settingsTab: {
      defaultVideoOption: {
        description:
          'Thời lượng mặc định (6s, 10s, 15s hoặc nối tiếp). Prompt cuối luôn dùng 6s, 10s hoặc 15s.',
        option6sConcat: '6 giây (nối tiếp)',
        option10sConcat: '10 giây (nối tiếp)',
        option15s: '15 giây',
        option15sConcat: '15 giây (nối tiếp)',
      },
    },
  },
};

/** @param {string} locale */
export function videoPopupOverlay(locale) {
  return VIDEO_POPUP_BY_LOCALE[locale] ?? VIDEO_POPUP_BY_LOCALE.en;
}

/** Bản dịch bổ sung (theme, tải lại Grok, áp dụng tất cả…). Sửa file này rồi chạy build. */

const PROMPT_RANGE_KEYS = {
  promptRangeSingle: 'Prompt #1',
  promptRange: 'Prompt #{from}→#{to}',
  promptSnippetRange: '{from} → {to}',
};

const MODEL_QUOTA_KEYS = {
  title: 'Model switched automatically',
  detail: 'Quota reached for {fromModel}. Switched to {toModel} and continuing automatically.',
};

const SETTINGS_TAB_TOAST = {
  en: {
    saveSuccess: { title: 'Settings saved', detail: 'Your settings have been saved successfully.' },
    saveFailed: { title: 'Could not save', detail: 'Failed to save settings. Please try again.' },
    resetSuccess: { title: 'Defaults restored', detail: 'All settings have been reset to default.' },
    resetFailed: { title: 'Could not reset', detail: 'Failed to reset settings. Please try again.' },
  },
  vi: {
    saveSuccess: { title: 'Đã lưu cài đặt', detail: 'Cài đặt đã được lưu thành công.' },
    saveFailed: { title: 'Lưu thất bại', detail: 'Không lưu được cài đặt. Vui lòng thử lại.' },
    resetSuccess: { title: 'Đã đặt lại mặc định', detail: 'Tất cả cài đặt đã về mặc định.' },
    resetFailed: { title: 'Đặt lại thất bại', detail: 'Không đặt lại được cài đặt. Vui lòng thử lại.' },
  },
};

/** @param {string} locale */
function settingsTabOverlay(locale) {
  return { toast: SETTINGS_TAB_TOAST[locale] ?? SETTINGS_TAB_TOAST.en };
}

/** Gợi ý định dạng SRT + pipe cho ô prompt ảnh (20 locale). */
const PROMPT_INDEXED_LINE_TIPS = {
  ar: 'افصل المطالبات بسطر فارغ، أو سطرًا لكل مطالبة: 001_[00.00-00.02]_name.jpg | نص المطالبة',
  bn: 'প্রম্পট আলাদা করতে খালি লাইন দিন, অথবা প্রতি লাইনে: 001_[00.00-00.02]_name.jpg | প্রম্পট',
  de: 'Prompts mit Leerzeile trennen oder pro Zeile: 001_[00.00-00.02]_name.jpg | Prompt-Text',
  en: 'One prompt per line — SRT or indexed timeline OK: 001_[00:00.000-00:09.000]_VISUAL_01_03 | full prompt text',
  es: 'Separa prompts con línea en blanco, o una línea cada uno: 001_[00.00-00.02]_nombre.jpg | texto del prompt',
  fr: 'Séparez les prompts par une ligne vide, ou une ligne chacun : 001_[00.00-00.02]_nom.jpg | texte du prompt',
  hi: 'प्रॉम्प्ट को खाली पंक्ति से अलग करें, या प्रति पंक्ति: 001_[00.00-00.02]_name.jpg | प्रॉम्प्ट',
  id: 'Pisahkan prompt dengan baris kosong, atau satu baris: 001_[00.00-00.02]_nama.jpg | teks prompt',
  it: 'Separa i prompt con riga vuota, o una riga ciascuno: 001_[00.00-00.02]_nome.jpg | testo prompt',
  ja: 'プロンプトは空行で区切るか、1行ずつ: 001_[00.00-00.02]_name.jpg | プロンプト本文',
  ko: '프롬프트는 빈 줄로 구분하거나 한 줄씩: 001_[00.00-00.02]_name.jpg | 프롬프트 내용',
  nl: 'Scheid prompts met een lege regel, of één regel per prompt: 001_[00.00-00.02]_naam.jpg | prompttekst',
  pt: 'Separe prompts com linha em branco, ou uma linha cada: 001_[00.00-00.02]_nome.jpg | texto do prompt',
  ru: 'Разделяйте промпты пустой строкой или по одному в строке: 001_[00.00-00.02]_name.jpg | текст промпта',
  th: 'แยกพรอมป์ตด้วยบรรทัดว่าง หรือหนึ่งบรรทัดต่อพรอมป์ต: 001_[00.00-00.02]_name.jpg | ข้อความพรอมป์ต',
  tl: 'Paghiwalayin ang prompt sa blank line, o isang linya bawat isa: 001_[00.00-00.02]_name.jpg | teksto ng prompt',
  tr: 'Promptları boş satırla ayırın veya her satırda bir tane: 001_[00.00-00.02]_name.jpg | prompt metni',
  ur: 'پرامپٹس کو خالی لائن سے الگ کریں، یا ہر لائن: 001_[00.00-00.02]_name.jpg | پرامپٹ متن',
  vi: 'Mỗi prompt một dòng — SRT hoặc timeline có STT: 001_[00:00.000-00:09.000]_VISUAL_01_03 | nội dung prompt',
  zh: '用空行分隔提示词，或每行一条：001_[00.00-00.02]_name.jpg | 提示词内容',
};

/** @param {string} locale */
function withIndexedPromptTip(locale) {
  const tip = PROMPT_INDEXED_LINE_TIPS[locale];
  if (!tip) return {};
  return {
    textToImageControl: {
      prompt: { tip },
    },
  };
}

/** @param {Record<string, string>} promptRange @param {typeof MODEL_QUOTA_KEYS} modelQuota */
function promptGroupsOverlay(redownload, promptRange = PROMPT_RANGE_KEYS, modelQuota = MODEL_QUOTA_KEYS, recoveryPassDone) {
  return {
    actions: { redownload: redownload.action },
    redownload: {
      started: redownload.started,
      failed: redownload.failed,
      inProgress: redownload.inProgress,
      noPayloads: redownload.noPayloads,
      tip: redownload.tip,
    },
    modelQuotaSwitch: modelQuota,
    promptRangeSingle: promptRange.promptRangeSingle,
    promptRange: promptRange.promptRange,
    promptSnippetRange: promptRange.promptSnippetRange,
    recoveryPassDone: recoveryPassDone ?? 'Retry finished: {success} succeeded, {failed} failed',
    unusualActivity: {
      title: 'Unusual activity (Grok)',
      pausedTitle: 'Paused — unusual activity',
    },
    contentBlock: {
      title: 'Content blocked (Grok)',
      detail: 'Prompt #{promptIndex} was blocked. Error report downloaded: {filename}',
    },
  };
}

export default {
  ar: {
    ...withIndexedPromptTip('ar'),
    common: {
      openFullscreen: 'فتح ملء الشاشة',
      themeLight: 'المظهر الفاتح',
      themeDark: 'المظهر الداكن',
      switchToLight: 'التبديل إلى المظهر الفاتح',
      switchToDark: 'التبديل إلى المظهر الداكن',
      appearance: 'المظهر',
      promptModeApplyAll: 'تطبيق على الكل',
      promptModeApply: 'تطبيق',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'تحميل من Grok',
          started: 'جارٍ تحميل العناصر الموجودة من Grok…',
          failed: 'فشل التحميل من Grok',
          inProgress: 'تحميل فقط: باستخدام معرفات العناصر المحفوظة لهذه المجموعة.',
          noPayloads: 'لا توجد بيانات مطالبة لهذه المجموعة.',
          tip: 'يستخدم معرفات العناصر الدقيقة من وقت إنشاء هذه المجموعة (نفس المشروع).',
        },
        {
          promptRangeSingle: 'مطالبة #1',
          promptRange: 'مطالبة #{from}→#{to}',
          promptSnippetRange: '{from} → {to}',
        },
        {
          title: 'تم تبديل النموذج تلقائياً',
          detail: 'تم الوصول إلى حد {fromModel}. تم التبديل إلى {toModel} والمتابعة.',
        },
      ),
    },
  },
  bn: {
    ...withIndexedPromptTip('bn'),
    common: {
      openFullscreen: 'পূর্ণ স্ক্রিন খুলুন',
      themeLight: 'হালকা থিম',
      themeDark: 'ডার্ক থিম',
      switchToLight: 'হালকা থিমে যান',
      switchToDark: 'ডার্ক থিমে যান',
      appearance: 'চেহারা',
      promptModeApplyAll: 'সবগুলোতে প্রয়োগ করুন',
      promptModeApply: 'প্রয়োগ করুন',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'Grok থেকে ডাউনলোড করুন',
          started: 'Grok থেকে বিদ্যমান টাইল ডাউনলোড করা হচ্ছে…',
          failed: 'Grok থেকে ডাউনলোড ব্যর্থ',
          inProgress: 'শুধু ডাউনলোড: এই গ্রুপের সংরক্ষিত টাইল আইডি ব্যবহার করা হচ্ছে।',
          noPayloads: 'এই গ্রুপের জন্য কোনো প্রম্পট ডেটা নেই।',
          tip: 'এই গ্রুপ তৈরি হওয়ার সময়ের সঠিক টাইল আইডি ব্যবহার করে (একই প্রকল্প)।',
        },
        {
          promptRangeSingle: 'প্রম্পট #1',
          promptRange: 'প্রম্পট #{from}→#{to}',
          promptSnippetRange: '{from} → {to}',
        },
        {
          title: 'মডেল স্বয়ংক্রিয়ভাবে পরিবর্তন হয়েছে',
          detail: '{fromModel}-এর সীমায় পৌঁছেছে। {toModel}-এ পরিবর্তন করে চালিয়ে যাচ্ছে।',
        },
      ),
    },
  },
  de: {
    ...withIndexedPromptTip('de'),
    common: {
      openFullscreen: 'Vollbild öffnen',
      themeLight: 'Helles Design',
      themeDark: 'Dunkles Design',
      switchToLight: 'Helles Design aktivieren',
      switchToDark: 'Dunkles Design aktivieren',
      appearance: 'Erscheinungsbild',
      promptModeApplyAll: 'Auf alle anwenden',
      promptModeApply: 'Anwenden',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'Von Grok herunterladen',
          started: 'Vorhandene Kacheln von Grok werden heruntergeladen…',
          failed: 'Download von Grok fehlgeschlagen',
          inProgress: 'Nur Download: gespeicherte Kachel-IDs dieser Gruppe werden verwendet.',
          noPayloads: 'Keine Prompt-Daten für diese Gruppe.',
          tip: 'Verwendet die exakten Kachel-IDs von der Erstellung dieser Gruppe (gleiches Projekt).',
        },
        PROMPT_RANGE_KEYS,
        {
          title: 'Modell automatisch gewechselt',
          detail: 'Kontingent für {fromModel} erreicht. Gewechselt zu {toModel} und fortgesetzt.',
        },
      ),
    },
  },
  en: {
    ...withIndexedPromptTip('en'),
    common: {
      openFullscreen: 'Open fullscreen',
      themeLight: 'Light theme',
      themeDark: 'Dark theme',
      switchToLight: 'Switch to light theme',
      switchToDark: 'Switch to dark theme',
      appearance: 'Appearance',
      promptModeApplyAll: 'Apply to all',
      promptModeApply: 'Apply',
      clearCacheSuccess: 'Cache cleared — Grok tab reloaded.',
    },
    controlTab: {
      folderName: {
        sessionHint: 'This session downloads to: {folder} (auto 001, 002…)',
      },
      promptGroups: promptGroupsOverlay({
        action: 'Download from Grok',
        started: 'Downloading existing tiles from Grok…',
        failed: 'Download from Grok failed',
        inProgress: 'Download-only: using saved tile IDs from this group.',
        noPayloads: 'No prompt data for this group.',
        tip: 'Uses the exact tile IDs from when this group was generated (same project).',
      }, PROMPT_RANGE_KEYS, MODEL_QUOTA_KEYS, 'Retry finished: {success} succeeded, {failed} failed'),
    },
    settingsTab: settingsTabOverlay('en'),
  },
  es: {
    ...withIndexedPromptTip('es'),
    common: {
      openFullscreen: 'Abrir pantalla completa',
      themeLight: 'Tema claro',
      themeDark: 'Tema oscuro',
      switchToLight: 'Cambiar a tema claro',
      switchToDark: 'Cambiar a tema oscuro',
      appearance: 'Apariencia',
      promptModeApplyAll: 'Aplicar a todos',
      promptModeApply: 'Aplicar',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'Descargar desde Grok',
          started: 'Descargando mosaicos existentes de Grok…',
          failed: 'Error al descargar desde Grok',
          inProgress: 'Solo descarga: usando los ID de mosaico guardados de este grupo.',
          noPayloads: 'No hay datos de prompt para este grupo.',
          tip: 'Usa los ID de mosaico exactos de cuando se generó este grupo (mismo proyecto).',
        },
        PROMPT_RANGE_KEYS,
        {
          title: 'Modelo cambiado automáticamente',
          detail: 'Cuota alcanzada para {fromModel}. Cambiado a {toModel} y continuando.',
        },
      ),
    },
  },
  fr: {
    ...withIndexedPromptTip('fr'),
    common: {
      openFullscreen: 'Ouvrir en plein écran',
      themeLight: 'Thème clair',
      themeDark: 'Thème sombre',
      switchToLight: 'Passer au thème clair',
      switchToDark: 'Passer au thème sombre',
      appearance: 'Apparence',
      promptModeApplyAll: 'Appliquer à tous',
      promptModeApply: 'Appliquer',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'Télécharger depuis Grok',
          started: 'Téléchargement des tuiles existantes depuis Grok…',
          failed: 'Échec du téléchargement depuis Grok',
          inProgress: 'Téléchargement uniquement : utilisation des ID de tuile enregistrés pour ce groupe.',
          noPayloads: 'Aucune donnée de prompt pour ce groupe.',
          tip: 'Utilise les ID de tuile exacts de la génération de ce groupe (même projet).',
        },
        {
          promptRangeSingle: 'Prompt n°1',
          promptRange: 'Prompt #{from}→#{to}',
          promptSnippetRange: '{from} → {to}',
        },
        {
          title: 'Modèle changé automatiquement',
          detail: 'Quota atteint pour {fromModel}. Passage à {toModel} et poursuite.',
        },
      ),
    },
  },
  hi: {
    ...withIndexedPromptTip('hi'),
    common: {
      openFullscreen: 'पूर्ण स्क्रीन खोलें',
      themeLight: 'लाइट थीम',
      themeDark: 'डार्क थीम',
      switchToLight: 'लाइट थीम पर स्विच करें',
      switchToDark: 'डार्क थीम पर स्विच करें',
      appearance: 'रूप',
      promptModeApplyAll: 'सभी पर लागू करें',
      promptModeApply: 'लागू करें',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'Grok से डाउनलोड करें',
          started: 'Grok से मौजूदा टाइल डाउनलोड हो रहे हैं…',
          failed: 'Grok से डाउनलोड विफल',
          inProgress: 'केवल डाउनलोड: इस समूह के सहेजे गए टाइल ID का उपयोग।',
          noPayloads: 'इस समूह के लिए कोई प्रॉम्प्ट डेटा नहीं।',
          tip: 'इस समूह के जनरेशन के समय के सटीक टाइल ID का उपयोग करता है (एक ही प्रोजेक्ट)।',
        },
        {
          promptRangeSingle: 'प्रॉम्प्ट #1',
          promptRange: 'प्रॉम्प्ट #{from}→#{to}',
          promptSnippetRange: '{from} → {to}',
        },
        {
          title: 'मॉडल स्वचालित रूप से बदला गया',
          detail: '{fromModel} की सीमा पूरी। {toModel} पर स्विच करके जारी है।',
        },
      ),
    },
  },
  id: {
    ...withIndexedPromptTip('id'),
    common: {
      openFullscreen: 'Buka layar penuh',
      themeLight: 'Tema terang',
      themeDark: 'Tema gelap',
      switchToLight: 'Beralih ke tema terang',
      switchToDark: 'Beralih ke tema gelap',
      appearance: 'Tampilan',
      promptModeApplyAll: 'Terapkan ke semua',
      promptModeApply: 'Terapkan',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'Unduh dari Grok',
          started: 'Mengunduh tile yang ada dari Grok…',
          failed: 'Unduh dari Grok gagal',
          inProgress: 'Hanya unduh: menggunakan ID tile tersimpan dari grup ini.',
          noPayloads: 'Tidak ada data prompt untuk grup ini.',
          tip: 'Menggunakan ID tile persis saat grup ini dibuat (proyek yang sama).',
        },
        PROMPT_RANGE_KEYS,
        {
          title: 'Model diganti otomatis',
          detail: 'Kuota {fromModel} tercapai. Beralih ke {toModel} dan melanjutkan.',
        },
      ),
    },
  },
  it: {
    ...withIndexedPromptTip('it'),
    common: {
      openFullscreen: 'Apri schermo intero',
      themeLight: 'Tema chiaro',
      themeDark: 'Tema scuro',
      switchToLight: 'Passa al tema chiaro',
      switchToDark: 'Passa al tema scuro',
      appearance: 'Aspetto',
      promptModeApplyAll: 'Applica a tutti',
      promptModeApply: 'Applica',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'Scarica da Grok',
          started: 'Download delle tessere esistenti da Grok…',
          failed: 'Download da Grok non riuscito',
          inProgress: 'Solo download: uso degli ID tessera salvati di questo gruppo.',
          noPayloads: 'Nessun dato prompt per questo gruppo.',
          tip: 'Usa gli ID tessera esatti della generazione di questo gruppo (stesso progetto).',
        },
        PROMPT_RANGE_KEYS,
        {
          title: 'Modello cambiato automaticamente',
          detail: 'Quota raggiunta per {fromModel}. Passato a {toModel} e continuazione.',
        },
      ),
    },
  },
  ja: {
    ...withIndexedPromptTip('ja'),
    common: {
      openFullscreen: '全画面で開く',
      themeLight: 'ライトテーマ',
      themeDark: 'ダークテーマ',
      switchToLight: 'ライトテーマに切り替え',
      switchToDark: 'ダークテーマに切り替え',
      appearance: '外観',
      promptModeApplyAll: 'すべてに適用',
      promptModeApply: '適用',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'Grokからダウンロード',
          started: 'Grokの既存タイルをダウンロード中…',
          failed: 'Grokからのダウンロードに失敗しました',
          inProgress: 'ダウンロードのみ：このグループに保存されたタイルIDを使用しています。',
          noPayloads: 'このグループのプロンプトデータがありません。',
          tip: 'このグループ生成時に保存された正確なタイルIDを使用します（同じプロジェクト）。',
        },
        {
          promptRangeSingle: 'プロンプト #1',
          promptRange: 'プロンプト #{from}→#{to}',
          promptSnippetRange: '{from} → {to}',
        },
        {
          title: 'モデルを自動切り替えしました',
          detail: '{fromModel} の上限に達しました。{toModel} に切り替えて続行します。',
        },
      ),
    },
  },
  ko: {
    ...withIndexedPromptTip('ko'),
    common: {
      openFullscreen: '전체 화면으로 열기',
      themeLight: '라이트 테마',
      themeDark: '다크 테마',
      switchToLight: '라이트 테마로 전환',
      switchToDark: '다크 테마로 전환',
      appearance: '테마',
      promptModeApplyAll: '모두 적용',
      promptModeApply: '적용',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'Grok에서 다운로드',
          started: 'Grok의 기존 타일 다운로드 중…',
          failed: 'Grok에서 다운로드 실패',
          inProgress: '다운로드만: 이 그룹에 저장된 타일 ID를 사용합니다.',
          noPayloads: '이 그룹에 prompt 데이터가 없습니다.',
          tip: '이 그룹 생성 시 저장된 정확한 타일 ID를 사용합니다(동일 프로젝트).',
        },
        {
          promptRangeSingle: '프롬프트 #1',
          promptRange: '프롬프트 #{from}→#{to}',
          promptSnippetRange: '{from} → {to}',
        },
        {
          title: '모델이 자동으로 전환되었습니다',
          detail: '{fromModel} 한도에 도달했습니다. {toModel}(으)로 전환하여 계속합니다.',
        },
      ),
    },
  },
  nl: {
    ...withIndexedPromptTip('nl'),
    common: {
      openFullscreen: 'Volledig scherm openen',
      themeLight: 'Licht thema',
      themeDark: 'Donker thema',
      switchToLight: 'Schakel naar licht thema',
      switchToDark: 'Schakel naar donker thema',
      appearance: 'Weergave',
      promptModeApplyAll: 'Toepassen op alles',
      promptModeApply: 'Toepassen',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'Downloaden van Grok',
          started: 'Bestaande tegels van Grok downloaden…',
          failed: 'Downloaden van Grok mislukt',
          inProgress: "Alleen downloaden: opgeslagen tegel-ID's van deze groep gebruiken.",
          noPayloads: 'Geen promptgegevens voor deze groep.',
          tip: "Gebruikt de exacte tegel-ID's van wanneer deze groep werd gegenereerd (zelfde project).",
        },
        PROMPT_RANGE_KEYS,
        {
          title: 'Model automatisch gewisseld',
          detail: 'Quotum voor {fromModel} bereikt. Overgeschakeld naar {toModel} en doorgegaan.',
        },
      ),
    },
  },
  pt: {
    ...withIndexedPromptTip('pt'),
    common: {
      openFullscreen: 'Abrir tela cheia',
      themeLight: 'Tema claro',
      themeDark: 'Tema escuro',
      switchToLight: 'Mudar para tema claro',
      switchToDark: 'Mudar para tema escuro',
      appearance: 'Aparência',
      promptModeApplyAll: 'Aplicar a todos',
      promptModeApply: 'Aplicar',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'Baixar do Grok',
          started: 'Baixando blocos existentes do Grok…',
          failed: 'Falha ao baixar do Grok',
          inProgress: 'Somente download: usando IDs de bloco salvos deste grupo.',
          noPayloads: 'Sem dados de prompt para este grupo.',
          tip: 'Usa os IDs de bloco exatos de quando este grupo foi gerado (mesmo projeto).',
        },
        PROMPT_RANGE_KEYS,
        {
          title: 'Modelo alterado automaticamente',
          detail: 'Cota de {fromModel} atingida. Alterado para {toModel} e continuando.',
        },
      ),
    },
  },
  ru: {
    ...withIndexedPromptTip('ru'),
    common: {
      openFullscreen: 'Открыть на весь экран',
      themeLight: 'Светлая тема',
      themeDark: 'Тёмная тема',
      switchToLight: 'Переключить на светлую тему',
      switchToDark: 'Переключить на тёмную тему',
      appearance: 'Оформление',
      promptModeApplyAll: 'Применить ко всем',
      promptModeApply: 'Применить',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'Скачать из Grok',
          started: 'Загрузка существующих плиток из Grok…',
          failed: 'Не удалось скачать из Grok',
          inProgress: 'Только загрузка: используются сохранённые ID плиток этой группы.',
          noPayloads: 'Нет данных промпта для этой группы.',
          tip: 'Использует точные ID плиток с момента генерации этой группы (тот же проект).',
        },
        {
          promptRangeSingle: 'Промпт #1',
          promptRange: 'Промпт #{from}→#{to}',
          promptSnippetRange: '{from} → {to}',
        },
        {
          title: 'Модель переключена автоматически',
          detail: 'Достигнут лимит {fromModel}. Переключено на {toModel}, продолжаем.',
        },
      ),
    },
  },
  th: {
    ...withIndexedPromptTip('th'),
    common: {
      openFullscreen: 'เปิดเต็มหน้าจอ',
      themeLight: 'ธีมสว่าง',
      themeDark: 'ธีมมืด',
      switchToLight: 'สลับเป็นธีมสว่าง',
      switchToDark: 'สลับเป็นธีมมืด',
      appearance: 'ธีม',
      promptModeApplyAll: 'ใช้กับทั้งหมด',
      promptModeApply: 'ใช้',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'ดาวน์โหลดจาก Grok',
          started: 'กำลังดาวน์โหลดไทล์จาก Grok…',
          failed: 'ดาวน์โหลดจาก Grok ล้มเหลว',
          inProgress: 'ดาวน์โหลดเท่านั้น: ใช้ tile ID ที่บันทึกไว้ของกลุ่มนี้',
          noPayloads: 'ไม่มีข้อมูล prompt สำหรับกลุ่มนี้',
          tip: 'ใช้ tile ID ที่บันทึกตอนสร้างกลุ่มนี้ (โปรเจกต์เดียวกัน)',
        },
        {
          promptRangeSingle: 'พรอมป์ต #1',
          promptRange: 'พรอมป์ต #{from}→#{to}',
          promptSnippetRange: '{from} → {to}',
        },
        {
          title: 'สลับโมเดลอัตโนมัติ',
          detail: 'ถึงโควตา {fromModel} แล้ว สลับเป็น {toModel} และดำเนินการต่อ',
        },
      ),
    },
  },
  tl: {
    ...withIndexedPromptTip('tl'),
    common: {
      openFullscreen: 'Buksan ang fullscreen',
      themeLight: 'Light theme',
      themeDark: 'Dark theme',
      switchToLight: 'Lumipat sa light theme',
      switchToDark: 'Lumipat sa dark theme',
      appearance: 'Itsura',
      promptModeApplyAll: 'Ilapat sa lahat',
      promptModeApply: 'Ilapat',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'I-download mula sa Grok',
          started: 'Dina-download ang mga tile mula sa Grok…',
          failed: 'Nabigo ang pag-download mula sa Grok',
          inProgress: 'Download lamang: ginagamit ang naka-save na tile ID ng grupong ito.',
          noPayloads: 'Walang prompt data para sa grupong ito.',
          tip: 'Gumagamit ng eksaktong tile ID noong ginawa ang grupong ito (parehong proyekto).',
        },
        PROMPT_RANGE_KEYS,
        {
          title: 'Awtomatikong pinalitan ang model',
          detail: 'Naabot ang quota para sa {fromModel}. Lumipat sa {toModel} at nagpapatuloy.',
        },
      ),
    },
  },
  tr: {
    ...withIndexedPromptTip('tr'),
    common: {
      openFullscreen: 'Tam ekran aç',
      themeLight: 'Açık tema',
      themeDark: 'Koyu tema',
      switchToLight: 'Açık temaya geç',
      switchToDark: 'Koyu temaya geç',
      appearance: 'Görünüm',
      promptModeApplyAll: 'Tümüne uygula',
      promptModeApply: 'Uygula',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: "Grok'dan indir",
          started: "Grok'daki mevcut kutucuklar indiriliyor…",
          failed: "Grok'dan indirme başarısız",
          inProgress: 'Yalnızca indirme: bu grubun kayıtlı kutucuk kimlikleri kullanılıyor.',
          noPayloads: 'Bu grup için prompt verisi yok.',
          tip: 'Bu grubun oluşturulduğu andaki kayıtlı kutucuk kimliklerini kullanır (aynı proje).',
        },
        PROMPT_RANGE_KEYS,
        {
          title: 'Model otomatik değiştirildi',
          detail: '{fromModel} kotası doldu. {toModel} modeline geçildi ve devam ediliyor.',
        },
      ),
    },
  },
  ur: {
    ...withIndexedPromptTip('ur'),
    common: {
      openFullscreen: 'پوری اسکرین کھولیں',
      themeLight: 'لائٹ تھیم',
      themeDark: 'ڈارک تھیم',
      switchToLight: 'لائٹ تھیم پر جائیں',
      switchToDark: 'ڈارک تھیم پر جائیں',
      appearance: 'ظاہری شکل',
      promptModeApplyAll: 'سب پر لاگو کریں',
      promptModeApply: 'لاگو کریں',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: 'Grok سے ڈاؤن لوڈ کریں',
          started: 'Grok سے موجودہ ٹائلز ڈاؤن لوڈ ہو رہی ہیں…',
          failed: 'Grok سے ڈاؤن لوڈ ناکام',
          inProgress: 'صرف ڈاؤن لوڈ: اس گروپ کی محفوظ ٹائل ID استعمال ہو رہی ہے۔',
          noPayloads: 'اس گروپ کے لیے پرامپٹ ڈیٹا نہیں ہے۔',
          tip: 'اس گروپ بنتے وقت محفوظ ٹائل ID استعمال کرتا ہے (وہی پروجیکٹ)۔',
        },
        {
          promptRangeSingle: 'پرامپٹ #1',
          promptRange: 'پرامپٹ #{from}→#{to}',
          promptSnippetRange: '{from} → {to}',
        },
        {
          title: 'ماڈل خودکار طور پر تبدیل ہو گیا',
          detail: '{fromModel} کی حد پوری ہو گئی۔ {toModel} پر سوئچ کر کے جاری ہے۔',
        },
      ),
    },
  },
  vi: {
    ...withIndexedPromptTip('vi'),
    common: {
      openFullscreen: 'Mở toàn màn hình',
      themeLight: 'Giao diện sáng',
      themeDark: 'Giao diện tối',
      switchToLight: 'Chuyển giao diện sáng',
      switchToDark: 'Chuyển giao diện tối',
      appearance: 'Giao diện',
      promptModeApplyAll: 'Áp dụng tất cả',
      promptModeApply: 'Áp dụng',
      clearCacheSuccess: 'Đã xóa cache — trang Grok đang tải lại.',
    },
    controlTab: {
      folderName: {
        sessionHint: 'Lần mở này lưu vào: {folder} (tự tăng 001, 002…, bỏ qua thư mục đã có)',
      },
      promptGroups: {
        ...promptGroupsOverlay(
        {
          action: 'Tải lại từ Grok',
          started: 'Đang tải tile có sẵn trên Grok…',
          failed: 'Tải lại từ Grok thất bại',
          inProgress: 'Chỉ tải: dùng đúng tile ID đã lưu của group này.',
          noPayloads: 'Không có dữ liệu prompt cho nhóm này.',
          tip: 'Dùng đúng tile ID lúc group này được tạo (cùng project Grok).',
        },
        PROMPT_RANGE_KEYS,
        {
          title: 'Đổi model tự động',
          detail: 'Hết hạn mức {fromModel}. Chuyển sang {toModel} và tự chạy tiếp.',
        },
        'Chạy lại xong: {success} thành công, {failed} lỗi',
      ),
        unusualActivity: {
          title: 'Hoạt động bất thường (Grok)',
          pausedTitle: 'Tạm dừng — hoạt động bất thường',
        },
        contentBlock: {
          title: 'Content Block (Grok)',
          detail: 'Prompt #{promptIndex} bị chặn. Đã tải file báo lỗi: {filename}',
        },
      },
    },
    settingsTab: settingsTabOverlay('vi'),
  },
  zh: {
    ...withIndexedPromptTip('zh'),
    common: {
      openFullscreen: '打开全屏',
      themeLight: '浅色主题',
      themeDark: '深色主题',
      switchToLight: '切换到浅色主题',
      switchToDark: '切换到深色主题',
      appearance: '外观',
      promptModeApplyAll: '应用到全部',
      promptModeApply: '应用',
    },
    controlTab: {
      promptGroups: promptGroupsOverlay(
        {
          action: '从 Grok 下载',
          started: '正在从 Grok 下载现有内容…',
          failed: '从 Grok 下载失败',
          inProgress: '仅下载：使用本组保存的 tile ID。',
          noPayloads: '该组没有 prompt 数据。',
          tip: '使用本组生成时保存的 tile ID（同一 Grok 项目）。',
        },
        {
          promptRangeSingle: '提示词 #1',
          promptRange: '提示词 #{from}→#{to}',
          promptSnippetRange: '{from} → {to}',
        },
        {
          title: '已自动切换模型',
          detail: '已达 {fromModel} 配额上限。已切换至 {toModel} 并继续运行。',
        },
      ),
    },
  },
};
