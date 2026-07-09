/** Extension config — settings, UI flags, Grok selectors. Chỉnh ở đây rồi reload extension. */

export const CHROME_WEB_STORE_URL = '#';

// --- UI (panel) ---
export const UI_CONFIG = {
  enableUnusualActivityTip: true,
  showUnusualActivityTipDefault: false,
  showUnusualActivityTipInSettings: true,
  /** Ẩn khung tài khoản/gói; bật true khi có pricing + đăng nhập */
  showPlanBanner: false,
  isPricingEnabled: false,
  dailyPromptLimit: 999999,
  /**
   * 'popup' = cửa sổ rộng khi bấm icon.
   * 'sidePanel' = sidebar Chrome.
   */
  panelPresentation: 'sidePanel',
  panelWindowWidth: 640,
  panelWindowHeight: 920,
};

// --- User settings (chrome.storage.local) ---
export const SETTINGS_STORAGE_KEY = 'grok_automation_settings';
export const SETTINGS_MIGRATION_VERSION = 13;
export const MAX_CONCURRENT_PROMPTS = 6;

export const DEFAULT_SETTINGS = {
  migrationVersion: SETTINGS_MIGRATION_VERSION,
  defaultMode: 'textToImage',
  aspectRatio: '16:9',
  concurrentPrompts: 1,
  outputCount: 1,
  imageOutputCount: 4,
  promptDelaySecondsMin: 5,
  promptDelaySecondsMax: 20,
  model: 'Grok Imagine',
  defaultVideoOption: '6s',
  defaultImageOption: 'new-image',
  imageToVideoMaxImagesPerPrompt: 2,
  componentsToVideoMaxImagesPerPrompt: 3,
  imageToImageMaxImagesPerPrompt: 3,
  maxRetries: 1,
  autoDownloadVideoQuality: '720p',
  autoDownloadImageQuality: '1k',
  autoAddCharacterImages: false,
  autoAddVoiceBySpeaker: false,
  defaultSpeaker: 'none',
  enableCharacterControl: false,
  defaultCharacters: [],
  autoChangeFileName: true,
  imageModel: 'quality',
  folderName: 'grok-folder',
  folderNameBase: 'grok-folder',
  hideTipBeforeUse: false,
  showUnusualActivityTip: false,
};

export const RESET_SETTINGS = {
  ...DEFAULT_SETTINGS,
};

const SETTINGS_MIGRATIONS = {
  1: () => {},
  2: (s) => { if (/veo/i.test(s.model || '')) s.model = 'Grok Imagine'; },
  3: (s) => { if (/veo/i.test(s.model || '')) s.model = 'Grok Imagine'; },
  4: (s) => { if (/veo/i.test(s.model || '')) s.model = 'Grok Imagine'; },
  5: (s) => { if (s.defaultImageOption === 'concat') s.defaultImageOption = 'new-image-concat'; },
  6: (s) => {
    if ((s.concurrentPrompts ?? 1) > MAX_CONCURRENT_PROMPTS) s.concurrentPrompts = MAX_CONCURRENT_PROMPTS;
    if ((s.promptDelaySecondsMin ?? 0) < 15) s.promptDelaySecondsMin = 20;
    if ((s.promptDelaySecondsMax ?? 0) < 20) s.promptDelaySecondsMax = 30;
  },
  7: (s) => {
    if (s.maxRetries == null || s.maxRetries === 5) s.maxRetries = 1;
  },
  8: (s) => {
    if (s.promptDelaySecondsMin === 25 && s.promptDelaySecondsMax === 35) {
      s.promptDelaySecondsMin = 20;
      s.promptDelaySecondsMax = 45;
    }
  },
  9: (s) => {
    if ((s.concurrentPrompts ?? 1) > 1) s.concurrentPrompts = 1;
    if ((s.promptDelaySecondsMin ?? 0) < 45) s.promptDelaySecondsMin = 5;
    if ((s.promptDelaySecondsMax ?? 0) < 60) s.promptDelaySecondsMax = 20;
  },
  10: (s) => {
    if (s.defaultVideoOption === '8s') s.defaultVideoOption = '6s';
    if (s.autoDownloadVideoQuality === '720') s.autoDownloadVideoQuality = '720p';
    if (s.autoDownloadVideoQuality === '1080') s.autoDownloadVideoQuality = '1080p';
    if (s.imageModel === 'Grok Imagine') s.imageModel = 'quality';
    if (s.imageModel === 'speed') s.imageModel = 'quality';
  },
  11: (s) => {
    if (s.imageOutputCount == null) s.imageOutputCount = s.outputCount > 1 ? s.outputCount : 4;
    if (!s.imageModel) s.imageModel = 'quality';
  },
  12: (s) => {
    const legacy = new Set(['4s', '8s', '4s-concat', '8s-concat']);
    if (legacy.has(s.defaultVideoOption)) s.defaultVideoOption = '6s';
  },
  13: (s) => {
    if (typeof s.hideTipBeforeUse !== 'boolean') s.hideTipBeforeUse = false;
  },
};

export function migrateSettings(raw) {
  const settings = { ...raw };
  for (let v = (settings.migrationVersion ?? 0) + 1; v <= SETTINGS_MIGRATION_VERSION; v += 1) {
    SETTINGS_MIGRATIONS[v]?.(settings);
  }
  settings.migrationVersion = SETTINGS_MIGRATION_VERSION;
  return settings;
}

// --- Flow page detection ---
export function isFlowPageUrl(url) {
  if (!url) return false;
  const u = url.toLowerCase();
  return /^https?:\/\/([^/]+\.)?grok\.com(?:\/|$)/.test(u);
}

// --- Grok automation selectors ---
export const FALLBACK_FLOW_CONFIG = {
  version: '2.5.7, 2.5.8, 2.5.9, 2.6.0, 2.6.1, 2.6.2, 2.6.3, 2.6.4, 2.6.5, 2.6.6, 2.6.7, 2.6.8, 2.6.9',
  hash: 'prh65ryghftgrws24423255fef750422p',
  shareUrlTemplate: 'https://imagine-public.x.ai/imagine-public/share-videos/{uuid}.mp4',
  videoSrcRegex: 'generated/([^/]+)/generated_video(_hd)?\\.mp4',
  selectors: {
    imagineLink: 'a > div:has(path[d^="m12 19-7-7 7-7"]), li > a[href="/imagine"], a[href="/imagine"], button:has(path[d^="M72.1494 3.57692C73.4403 3.57692"])',
    agentLink: 'li > a[href="/imagine/agent"], a[href="/imagine/agent"], a[href*="/imagine/agent"]',
    modeSelectTrigger: '#model-select-trigger, button[aria-expanded]:has(svg.transition-transform)',
    modeSelectedWrapper: 'div[data-state="open"]',
    videoModeButton: 'div[role="radiogroup"] button[role="radio"]:contains("Video"), button[role="radio"]:contains("Video")',
    imageModeButton: 'button:has(path[d^="M14.0996 2.5C15.2032 2.5"]), button:contains("Image"), button:has(span:contains("Image"))',
    agentModeButton: 'div[role="radiogroup"] button[role="radio"]:contains("Agent"), button[role="radio"]:contains("Agent")',
    imageSpeedModel: 'div[role="radiogroup"] button:contains("Speed"), div[role="radiogroup"] button:contains("Tốc độ")',
    imageQualityModel: 'div[role="radiogroup"] button:contains("Quality"), div[role="radiogroup"] button:contains("Chất lượng")',
    aspectRatioButton: 'button:has(span:contains(":")), button:has(div:contains(":"))',
    aspectRatioTemplate: 'button[aria-label="{aspectRatio}"], div[role="menuitem"]:has(span:contains("{aspectRatio}"))',
    aspectRatioTemplateV3: 'div[role="menuitem"]:has(span:contains("{aspectRatio}")), button:has(span:contains("{aspectRatio}"))',
    numberOfImagesOutputButton: 'button:has(path[d^="M12.2002 6C13.0237 6 13.7016 5.99898"])',
    numberOfImagesOutputTemplate: 'div[role="menuitem"]:contains("x {numberOfImages}")',
    videoQualityMenu: 'button[aria-label="480p"], button[aria-label="720p"], button:has(span:contains("480p")), button:has(span:contains("720p"))',
    videoQuality480pItem: 'button[role="radio"]:contains("480p"), button:has(span:contains("480p"))',
    videoQuality720pItem: 'button[role="radio"]:contains("720p"), button:has(span:contains("720p"))',
    videoLengthMenu: 'button[role="radio"]:contains("6s"), button[role="radio"]:contains("10s"), button:has(span:contains("6s"))',
    videoLength6sItem: 'button[role="radio"]:contains("6s"), button:has(span:contains("6s"))',
    videoLength10sItem: 'button[role="radio"]:contains("10s"), button:has(span:contains("10s"))',
    videoLength15sItem: 'button[role="radio"]:contains("15s"), button:has(span:contains("15s"))',
    plusImageButton: 'button:has(path[d="M6 6L18 18M18 6L6 18"])',
    fileInput: 'input[type="file"]',
    promptContentEditable: "form div[contenteditable='true']:eq(0)",
    promptDropUiTextarea: "div[data-testid='drop-ui'] textarea:eq(0)",
    promptTextarea: "form div[contenteditable='true']:eq(0), div[data-testid='drop-ui'] textarea:eq(0), textarea, div[role='textbox'], [contenteditable='true']",
    makeVideoEllipsis: 'button:has(svg.lucide-ellipsis)',
    imageUploading: 'span.animate-pulse, div.animate-spin',
    imageUploadFailed: 'svg.lucide-triangle-alert',
    removeFailedUploadedImage: 'button svg.lucide-x',
    submitButton: 'button.rounded-full:has(path[d="M6 11L12 5M12 5L18 11M12 5V19"]):not(:disabled), button[type="submit"]:not(:disabled)',
    comparisonImage: "img[class*='hover:ring-4 hover:ring-surface-invert']",
    ignoreComparisonImageButton: "div.absolute > div.flex-col > button[class*='rounded-full']",
    generateVideoButton: 'button[data-filmstrip-item="true"]:has(div[class*="animate-spin"]):eq(0), button[data-filmstrip-item="true"]:has(div:contains("%"))',
    mainArticle: 'div[id^="imagine-masonry-section-"]:last(), main article, [data-testid="masonry-grid"], .grid',
    generatedImageItem: 'img[src*="imagine"], img[src*="assets"], article img, div[role="listitem"] img, .grid img, img[alt*="Generated"], img.blur',
    shareButton: 'button:has(path[d^="M6.99609 9L11.9961 4L16.9961"])',
    moreOptionsButton: 'div[class*="absolute"] > button:has(path[d^="M21 7H10M14 17H3M20.25 17C20.25"]), article button:has(svg.lucide-ellipsis)',
    extendVideoMenuItem: 'div:has(path[d^="M12.1676 2.5C13.0873 2.5 13.8275 2.49919 14.4251"]):last()',
    upscaleMenuItem: 'button:has(path[d^="M11.7503 2.0835C12.67"]), div[role="menuitem"]:has(path[d^="M11.7503 2.0835C12.67"]):last()',
    upscale720pOption: 'div[role="menuitem"]:contains("720")',
    upscale1080pOption: 'div[role="menuitem"]:contains("1080")',
    hdButton: 'main article:last button:contains("HD"), div.text-white:contains("HD"), div.text-white:contains("720p"), video[id="hd-video"][src]',
    downloadButton: 'button:has(path[d^="M11.996 3v12m0 0-5-5m5 5 5-5M4 15v1a4"]), button:has(path[d^="M4.16667 13.3333C4.16667"]), button[aria-label*="Download" i], a[download]',
    percentageDiv: 'button div:contains("%")',
    percentageSvg: 'div.absolute > svg > g > circle:eq(1)',
    percentageSpan: 'div > span:contains("%")',
    imageToImageMoreOptionsButton: 'article div.absolute > button[data-slot="button"]',
    imageToImageResultGrid: 'main article div.relative div.group > div.grid, .grid',
    outputItems: 'img[src*="imagine"], img[src*="assets"], img[src^="blob:"], img[src^="data:"], video, img.blur, img[alt*="Generated"]',
    imagineUrl: 'https://grok.com/imagine',
    homeUrl: 'https://grok.com',
    downloadTimeoutMs: 240000,
  },
};

export const FLOW_INPUT_CONFIG = {
  useNativeDomInput: true,
  nativeTextInputOnly: true,
  cdpFallback: false,
  cdpTransient: true,
  skipCaPreAttach: true,
  disableRunZoom: true,
  disablePageLoadZoom: true,
  noFirstPromptSkip: false,
  cdpClickJitter: 0,
  typeChunkChars: 80,
  typeChunkDelayMs: 20,
  unusualRetryBackoffSec: 60,
};

/*
 * The old Flow selector map intentionally stays out of source now. Grok changes
 * DOM often, so the content script prefers semantic selectors and remote config.
 */
export const LEGACY_FLOW_SELECTORS_UNUSED = {
  selectors: {
    charactersTabButton: '',
    charactersNameSelector: '',
    createProjectButton: '',
    configureUIModeButton: '',
    selectGridModeOption: '',
    selectSizeGridModeOption: '',
    selectShowTextModeOption: '',
    selectClearPromptModeOption: '',
    closeConfigureUIModeButton: '',
    fileInput: 'input[type="file"]',
    configButton: 'button:has(i:contains("crop")), button:has(i:contains("tune"))',
    removeSelectedImagesButton: 'button:has(i:contains("close")):has(span:contains("prompt"))',
    disableAgentModeButton:
      'div:has(div[data-scroll-state="START"]) button[aria-pressed="true"], button:has(i:contains("close")):has(span:contains("prompt")), div:has(i:contains("edit_square")) > button:has(i:contains("close"))',
    enableAgentModeButton:
      'div:has(div[data-scroll-state="START"]) button[aria-pressed="false"], button:has(i:contains("expand_content"))',
    neverAskAgentSettingButton: 'div[role="radiogroup"] button:last()',
    saveAgentSettings:
      'div[style*="width"]:has(div[aria-orientation="vertical"]) button:has(div[data-type="button-overlay"]):last()',
    configButtonActived: 'button:has(i:contains("crop")), button:has(i:contains("tune"))',
    configVideoButton: 'button[color="BLURPLE"][aria-haspopup="dialog"]',
    configImageButton: 'button:has(i:contains("tune"))',
    modelSelectButton: 'div[data-state="open"] button:has(i:contains("arrow_drop_down"))',
    selectVideoMode: 'div[data-state="open"] div[role="tablist"]:eq(0) button:eq(1)',
    selectImageMode: 'div[data-state="open"] div[role="tablist"]:eq(0) button:eq(0)',
    toImageModeOption: 'div[data-state="open"] div[role="tablist"]:eq(0) button:eq(0)',
    textToVideoModeOption: 'div[data-state="open"] div[role="tablist"]:eq(1) button:eq(1)',
    imageToVideoModeOption: 'div[data-state="open"] div[role="tablist"]:eq(1) button:eq(0)',
    componentToVideoModeOption: 'div[data-state="open"] div[role="tablist"]:eq(1) button:eq(1)',
    aspectRatioTemplate: 'div[data-state="open"] div[role="tablist"] button:has(i:contains("{aspectRatio}"))',
    outputCountTemplate: 'div[data-state="open"] div[role="tablist"] button:contains("{outputCount}")',
    modelTemplate: 'div[role="menu"] button:has(span:contains("{model}"))',
    videoLengthTemplate: 'div[data-orientation="horizontal"] > div > button:contains("{videoLength}")',
    addImageButton: 'div[type="button"][aria-controls*="radix-"]:first(), button:has(i:contains("add_2"))',
    promptTextarea: 'div[role="textbox"]',
    submitButton: 'button:has(i:contains("arrow_forward"))',
    stopButton: 'button:has(i:contains("stop"))',
    downloadButton: 'button[aria-haspopup="menu"]:has(i:contains("download"))',
    uploadMediaButton: 'button:has(i:contains("upload")):last()',
    selectUploadImageType: 'div[data-side="top"] button:has(i:contains("image")):eq(0)',
    agreeTermUploadedVideoButton: 'div[role="dialog"]:contains("policies") button:eq(-1)',
    selectUploadVideoType: 'div[data-side="top"] button:has(i:contains("videocam")):eq(0)',
    selectUploadCharacterType: 'div[data-side="top"] button:has(i:contains("accessibility_new")):eq(0)',
    selectSpeakerType: 'div[data-side="top"] button:has(i:contains("voice_selection")):eq(0)',
    sortOptionsButton:
      'div[data-side="top"] button[aria-haspopup="menu"]:last(), div[role="dialog"]:not([data-side="top"]) div > i:contains("search")',
    sortLatestOption: 'div[role="menu"] > button:eq(2), div[role="dialog"]:not([data-side="top"]) div > i:contains("search")',
    virtuosoItemList: 'div[data-side="top"] div[data-testid="virtuoso-item-list"] > div:has(img)',
    searchUploadedImage: 'div[data-side="top"] input[type="text"]',
    outputItems: 'div > div > div[data-tile-id]:has(div)',
    tileOnQueue: 'i:contains("movie"), div[style*="brightness(1)"]',
    tileByIdTemplate: 'div[data-tile-id="{tileId}"]:has(div)',
    tileEditLinkTemplate: 'div[data-tile-id="{tileId}"] a[href*="/edit/"]',
    moreOptionsButtonInHoverTile: 'button:has(i:contains("more_vert"))',
    downloadButtonInTile: 'button:has(i:contains("download"))',
    downloadButtonInHoverTile: 'div[aria-haspopup="menu"] i:contains("download")',
    quality1KOption: 'button:has(span:contains("1K"))',
    quality2KOption: 'button:has(span:contains("2K"))',
    quality1080Option: 'button:has(span:contains("1080p"))',
    quality4KOption: 'button:has(span:contains("4K"))',
    downloadDoneButton: 'button:has(i:contains("check")), header button:last(), button:has(span:contains("Done"))',
    openProfileInfoButton: 'button > img[width="32"][height="32"]',
    closeProfileInfoButton: 'div[role="dialog"] button:has(i:contains("close"))',
  },
};

const USE_REMOTE_SERVER = true;
const CONFIG_URLS = [
  'https://configs.kylenguyen.me/config/grok-automation',
  'https://extension-config.onegreen.workers.dev/config/grok-automation',
];
const CLIENT_SECRET = 'YES_THAT_IS_VERY_EASY_RIGHT_?';
let cachedConfig = null;

export function isVersionSupported(config, version) {
  if (!config?.version) return false;
  return config.version.split(',').map((v) => v.trim()).filter(Boolean).includes(version.trim());
}

async function fetchRemoteConfig(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'X-Client-Secret': CLIENT_SECRET },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!data?.selectors) throw new Error('Invalid config shape');
  return data;
}

export async function getRemoteConfig() {
  if (cachedConfig) return cachedConfig;
  if (!USE_REMOTE_SERVER) {
    cachedConfig = FALLBACK_FLOW_CONFIG;
    return cachedConfig;
  }
  for (const url of CONFIG_URLS) {
    try {
      cachedConfig = await fetchRemoteConfig(url);
      return cachedConfig;
    } catch {
      // try next
    }
  }
  cachedConfig = FALLBACK_FLOW_CONFIG;
  return cachedConfig;
}
