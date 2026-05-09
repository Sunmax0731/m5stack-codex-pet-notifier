const state = {
  health: null,
  events: null,
  commands: null,
  latestSession: null,
  petManifest: null,
  petPackages: [],
  runtime: null,
  commandDefinitions: null,
  apiBase: '',
  apiBaseResolved: false,
  apiBasePromise: null,
  apiBaseWarning: '',
  activeCommandTab: 'setup',
  previewPetFrame: 0,
  previewAnimationInterval: null,
  previewAnimationDelay: null,
  autoDisplaySyncTimer: null,
  autoDisplaySyncInFlight: false,
  language: localStorage.getItem('m5pet-language') || 'ja',
  themeMode: localStorage.getItem('m5pet-theme') || 'system'
};

const expectedVersion = document.documentElement.dataset.version || '0.1.0-alpha.10';
const compatibleCommandRunners = new Set(['cmd-wrapper-v1', 'direct-npm-v1']);

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  bridgeLine: $('#bridgeLine'),
  lastUpdated: $('#lastUpdated'),
  pairedCount: $('#pairedCount'),
  outboundCount: $('#outboundCount'),
  inboundCount: $('#inboundCount'),
  securityCount: $('#securityCount'),
  runtimeDot: $('#runtimeDot'),
  runtimeState: $('#runtimeState'),
  runtimePid: $('#runtimePid'),
  deviceList: $('#deviceList'),
  deviceId: $('#deviceId'),
  sendResult: $('#sendResult'),
  outboundLog: $('#outboundLog'),
  inboundLog: $('#inboundLog'),
  securityLog: $('#securityLog'),
  latestReply: $('#latestReply'),
  sessionName: $('#sessionName'),
  sessionPhase: $('#sessionPhase'),
  sessionAnswer: $('#sessionAnswer'),
  sessionUser: $('#sessionUser'),
  petName: $('#petName'),
  petState: $('#petState'),
  petSprite: $('#petSprite'),
  petPackage: $('#petPackage'),
  petPackagePath: $('#petPackagePath'),
  petScale: $('#petScale'),
  uiTextScale: $('#uiTextScale'),
  bodyTextScale: $('#bodyTextScale'),
  animationFps: $('#animationFps'),
  motionStepMs: $('#motionStepMs'),
  petOffsetX: $('#petOffsetX'),
  petOffsetY: $('#petOffsetY'),
  screenBgColor: $('#screenBgColor'),
  screenBgAlpha: $('#screenBgAlpha'),
  petBgColor: $('#petBgColor'),
  petBgAlpha: $('#petBgAlpha'),
  textColor: $('#textColor'),
  textAlpha: $('#textAlpha'),
  textBgColor: $('#textBgColor'),
  textBgAlpha: $('#textBgAlpha'),
  textBorderColor: $('#textBorderColor'),
  textBorderAlpha: $('#textBorderAlpha'),
  textBorderEnabled: $('#textBorderEnabled'),
  beepOnAnswer: $('#beepOnAnswer'),
  autoDisplaySync: $('#autoDisplaySync'),
  petScaleValue: $('#petScaleValue'),
  uiTextScaleValue: $('#uiTextScaleValue'),
  bodyTextScaleValue: $('#bodyTextScaleValue'),
  animationFpsValue: $('#animationFpsValue'),
  motionStepValue: $('#motionStepValue'),
  petOffsetXValue: $('#petOffsetXValue'),
  petOffsetYValue: $('#petOffsetYValue'),
  screenBgValue: $('#screenBgValue'),
  petBgValue: $('#petBgValue'),
  textColorValue: $('#textColorValue'),
  textBgValue: $('#textBgValue'),
  textBorderValue: $('#textBorderValue'),
  screenBgSwatch: $('#screenBgSwatch'),
  petBgSwatch: $('#petBgSwatch'),
  textColorSwatch: $('#textColorSwatch'),
  textBgSwatch: $('#textBgSwatch'),
  textBorderSwatch: $('#textBorderSwatch'),
  screenBgPreview: $('#screenBgPreview'),
  petBgPreview: $('#petBgPreview'),
  textColorPreview: $('#textColorPreview'),
  textBgPreview: $('#textBgPreview'),
  textBorderPreview: $('#textBorderPreview'),
  previewDevice: $('#previewDevice'),
  previewMode: $('#previewMode'),
  m5Preview: $('#m5Preview'),
  previewPet: $('#previewPet'),
  previewBody: $('#previewBody'),
  previewFooter: $('#previewFooter'),
  previewDeviceReadout: $('#previewDeviceReadout'),
  previewPetReadout: $('#previewPetReadout'),
  previewUiReadout: $('#previewUiReadout'),
  previewBodyReadout: $('#previewBodyReadout'),
  previewFpsReadout: $('#previewFpsReadout'),
  previewMotionReadout: $('#previewMotionReadout'),
  petAssetName: $('#petAssetName'),
  petAssetDescription: $('#petAssetDescription'),
  commandTabs: $('#commandTabs'),
  commandList: $('#commandList'),
  commandOutput: $('#commandOutput'),
  commandModal: $('#commandModal'),
  debugSnapshotLink: $('#debugSnapshotLink'),
  languageMode: $('#languageMode'),
  themeMode: $('#themeMode')
};

const labels = {
  ja: {
    navPreview: 'プレビュー',
    navSession: '最近の回答',
    navLog: 'ログ',
    openCommands: '環境構築コマンド',
    languageLabel: '言語',
    themeLabel: 'テーマ',
    refresh: '更新',
    statusHeading: '状態確認',
    hide: '隠す',
    view: '表示',
    metricPaired: '接続',
    metricOutbound: '送信',
    metricInbound: '受信',
    metricSecurity: '拒否',
    previewHeading: 'M5Stack 表示プレビュー',
    deviceType: 'デバイス',
    screenMode: '画面',
    readoutDevice: 'デバイス',
    readoutPetArea: 'ペット面積',
    readoutUiText: 'UI文字',
    readoutBodyText: '本文文字',
    readoutRender: '描画',
    readoutMotion: '動き',
    currentPet: '現在のペット',
    assetPathOverride: 'アセットパス指定',
    spriteRef: 'スプライト参照',
    sendPet: 'ペット更新を送信',
    sendDisplay: '表示設定を送信',
    autoDisplaySync: '変更を自動送信',
    localPetAsset: 'local hatch-pet アセット',
    reloadAsset: 'asset 再読み込み',
    petName: 'ペット名',
    petState: '状態',
    petDisplayArea: 'ペット表示面積',
    uiTextSize: 'UI文字サイズ',
    bodyTextSize: '本文文字サイズ',
    renderFps: '描画FPS',
    motionStep: 'アニメ間隔',
    petOffsetX: 'ペットX位置',
    petOffsetY: 'ペットY位置',
    screenBackground: '画面背景',
    petBackground: 'ペット背景',
    textColor: '文字色',
    textBackground: '文字背景',
    textBorder: '文字枠',
    showTextBorder: 'テキスト枠を表示',
    beepOnAnswer: 'Codex回答のビープ通知',
    sessionHeading: '最近の Codex 回答',
    load: '読込',
    sendToM5: 'M5Stackへ送信',
    latestAnswer: '最新回答',
    previousUserMessage: '直前のuser message',
    logHeading: 'イベントログ',
    redraw: '表示を再描画',
    commandModalHeading: '環境構築とデバッグコマンド',
    reload: '再読込',
    close: '閉じる',
    debugSendHeading: 'Codex から M5Stack へ送る',
    debugSendNote: 'Answer / Decision / Notify はデバッグ操作として送信します。',
    deviceId: 'デバイスID',
    summary: '要約',
    body: '本文',
    sendAnswer: 'Answer を送信',
    prompt: '質問',
    sendDecision: 'Decision を送信',
    title: 'タイトル',
    severity: '重要度',
    sendNotification: 'Notification を送信',
    sendResult: '送信結果',
    decisionReply: 'Decision 返信',
    sampleReplay: 'sample replay',
    run: '実行',
    help: 'ヘルプ',
    commandNotRun: 'コマンド未実行',
    noPaired: 'paired device なし。M5Stack 起動または /pair を待機中。',
    noReply: 'まだ返信はありません。',
    eventNone: 'event なし',
    bridgeUnchecked: 'Bridge未確認',
    latestBridgeSearch: 'latest Bridge API を探索中',
    noSession: '最近の Codex session を読み込んでいません。',
    noUserMessage: '直前の user message はありません。',
    sessionUnread: '未読込',
    sessionLoadFailed: '読み込み失敗',
    noRecentAnswer: '最近の Codex 回答を取得できません。'
  },
  en: {
    navPreview: 'Preview',
    navSession: 'Recent answer',
    navLog: 'Logs',
    openCommands: 'Setup commands',
    languageLabel: 'Language',
    themeLabel: 'Theme',
    refresh: 'Refresh',
    statusHeading: 'Status',
    hide: 'Hide',
    view: 'View',
    metricPaired: 'paired',
    metricOutbound: 'outbound',
    metricInbound: 'inbound',
    metricSecurity: 'security',
    previewHeading: 'M5Stack display preview',
    deviceType: 'device',
    screenMode: 'screen',
    readoutDevice: 'device',
    readoutPetArea: 'pet area',
    readoutUiText: 'UI text',
    readoutBodyText: 'body text',
    readoutRender: 'render',
    readoutMotion: 'motion',
    currentPet: 'current pet',
    assetPathOverride: 'asset path override',
    spriteRef: 'spriteRef',
    sendPet: 'Send pet update',
    sendDisplay: 'Send display settings',
    autoDisplaySync: 'Auto-send changes',
    localPetAsset: 'local hatch-pet asset',
    reloadAsset: 'Reload asset',
    petName: 'pet name',
    petState: 'pet state',
    petDisplayArea: 'pet display area',
    uiTextSize: 'UI text size',
    bodyTextSize: 'body text size',
    renderFps: 'render FPS',
    motionStep: 'motion step',
    petOffsetX: 'pet X offset',
    petOffsetY: 'pet Y offset',
    screenBackground: 'screen background',
    petBackground: 'pet background',
    textColor: 'text color',
    textBackground: 'text background',
    textBorder: 'text border',
    showTextBorder: 'Show text border',
    beepOnAnswer: 'Beep on Codex answer',
    sessionHeading: 'Recent Codex answer',
    load: 'Load',
    sendToM5: 'Send to M5Stack',
    latestAnswer: 'latest answer',
    previousUserMessage: 'previous user message',
    logHeading: 'Event log',
    redraw: 'Redraw',
    commandModalHeading: 'Setup and debug commands',
    reload: 'Reload',
    close: 'Close',
    debugSendHeading: 'Send from Codex to M5Stack',
    debugSendNote: 'Answer / Decision / Notify are sent as debug operations.',
    deviceId: 'deviceId',
    summary: 'summary',
    body: 'body',
    sendAnswer: 'Send Answer',
    prompt: 'prompt',
    sendDecision: 'Send Decision',
    title: 'title',
    severity: 'severity',
    sendNotification: 'Send Notification',
    sendResult: 'Send result',
    decisionReply: 'Decision reply',
    sampleReplay: 'sample replay',
    run: 'Run',
    help: 'Help',
    commandNotRun: 'Command not run',
    noPaired: 'No paired device. Waiting for M5Stack boot or /pair.',
    noReply: 'No reply yet.',
    eventNone: 'no event',
    bridgeUnchecked: 'Bridge unchecked',
    latestBridgeSearch: 'Searching latest Bridge API',
    noSession: 'No recent Codex session loaded.',
    noUserMessage: 'No previous user message.',
    sessionUnread: 'not loaded',
    sessionLoadFailed: 'load failed',
    noRecentAnswer: 'Unable to read a recent Codex answer.'
  }
};

const optionLabels = {
  themeMode: {
    system: { ja: 'OSに追従', en: 'System' },
    light: { ja: 'ライト', en: 'Light' },
    dark: { ja: 'ダーク', en: 'Dark' }
  },
  previewMode: {
    pet: { ja: 'ペット', en: 'Pet' },
    answer: { ja: '回答', en: 'Answer' },
    choice: { ja: '三択', en: 'Decision' },
    notification: { ja: '通知', en: 'Notify' }
  }
};

const commandText = {
  bridgeStartBackground: {
    en: {
      label: 'Start Bridge in background',
      description: 'Start Host Bridge without leaving a PowerShell window. If the port is already active, only returns status.'
    }
  },
  petAsset: {
    en: {
      label: 'Generate pet asset',
      description: 'Generate firmware/include/pet_asset.local.h from a local hatch-pet package.'
    }
  },
  core2Upload: {
    en: {
      label: 'Upload Core2 firmware',
      description: 'Auto-detect USB serial and upload firmware to Core2. Specify COM only when needed.'
    }
  },
  codexAnswer: {
    en: {
      label: 'Send Answer',
      description: 'Send arbitrary Codex answer text to M5Stack.'
    }
  },
  codexDecision: {
    en: {
      label: 'Send ABC Decision',
      description: 'Send a three-choice prompt that M5Stack can answer with A/B/C.'
    }
  },
  codexDisplay: {
    en: {
      label: 'Send display settings',
      description: 'Send pet area, text size, FPS, RGBA, offset, border, and beep settings to M5Stack.'
    }
  },
  codexSessions: {
    en: {
      label: 'Send recent Codex session',
      description: 'One-shot send of the latest exchange from a recent Codex session.'
    }
  },
  sampleReplay: {
    en: {
      label: 'sample replay',
      description: 'Queue representative sample events on the Host Bridge.'
    }
  }
};

const commandTabLabels = {
  setup: { ja: '環境構築', en: 'Setup' },
  debug: { ja: 'デバッグ送信', en: 'Debug send' }
};

const commandParamLabels = {
  host: { ja: 'host', en: 'host' },
  port: { ja: 'port', en: 'port' },
  petDir: { ja: 'petDir', en: 'petDir' },
  output: { ja: 'output', en: 'output' },
  uploadPort: { ja: 'uploadPort', en: 'uploadPort' },
  bridge: { ja: 'bridge', en: 'bridge' },
  deviceId: { ja: 'デバイスID', en: 'deviceId' },
  summary: { ja: '要約', en: 'summary' },
  text: { ja: '本文', en: 'text' },
  question: { ja: '質問', en: 'question' },
  phase: { ja: 'phase', en: 'phase' },
  petScale: { ja: 'ペット表示面積', en: 'pet scale' },
  uiTextScale: { ja: 'UI文字サイズ', en: 'UI text scale' },
  bodyTextScale: { ja: '本文文字サイズ', en: 'body text scale' },
  animationFps: { ja: '描画FPS', en: 'animation FPS' },
  motionStepMs: { ja: 'アニメ間隔(ms)', en: 'motion step ms' },
  screenBg: { ja: '画面背景', en: 'screen background' },
  petBg: { ja: 'ペット背景', en: 'pet background' },
  textColor: { ja: '文字色', en: 'text color' },
  textBg: { ja: '文字背景', en: 'text background' },
  petOffsetX: { ja: 'ペットX位置', en: 'pet X offset' },
  petOffsetY: { ja: 'ペットY位置', en: 'pet Y offset' },
  textBorderEnabled: { ja: '文字枠を表示', en: 'show text border' },
  textBorderColor: { ja: '文字枠色', en: 'text border color' },
  beepOnAnswer: { ja: 'ビープ通知', en: 'beep on answer' }
};

function t(key) {
  return labels[state.language]?.[key] ?? labels.ja[key] ?? key;
}

function applyTheme() {
  const mode = state.themeMode === 'dark' || state.themeMode === 'light' ? state.themeMode : 'system';
  const resolved = mode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = mode;
  if (elements.themeMode) {
    elements.themeMode.value = mode;
  }
}

function applyLanguage() {
  document.documentElement.lang = state.language;
  if (elements.languageMode) {
    elements.languageMode.value = state.language;
  }
  $$('[data-i18n]').forEach((item) => {
    item.textContent = t(item.dataset.i18n);
  });
  Object.entries(optionLabels.themeMode).forEach(([value, text]) => {
    const option = elements.themeMode?.querySelector(`option[value="${CSS.escape(value)}"]`);
    if (option) {
      option.textContent = text[state.language] ?? text.ja;
    }
  });
  Object.entries(optionLabels.previewMode).forEach(([value, text]) => {
    const option = elements.previewMode?.querySelector(`option[value="${CSS.escape(value)}"]`);
    if (option) {
      option.textContent = text[state.language] ?? text.ja;
    }
  });
  updateHelpTexts();
  renderDisplayControls();
  renderLatestSession();
}

function enhanceHints() {
  $$('.hint[data-tooltip]').forEach((item, index) => {
    if (item.querySelector('.help-control')) {
      return;
    }
    item.dataset.tooltipJa = item.dataset.tooltipJa || item.dataset.tooltip;
    const control = document.createElement('span');
    control.className = 'help-control';
    control.innerHTML = `<span class="help-button" role="button" tabindex="0" aria-label="${escapeHtml(t('help'))}" aria-expanded="false">?</span><span class="help-popover" role="tooltip" id="help-${index}"></span>`;
    item.append(control);
    const button = control.querySelector('.help-button');
    button.setAttribute('aria-describedby', `help-${index}`);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeHelpPopovers(item);
      const open = !item.classList.contains('help-open');
      item.classList.toggle('help-open', open);
      button.setAttribute('aria-expanded', String(open));
    });
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
      button.click();
    });
  });
  updateHelpTexts();
}

function updateHelpTexts() {
  $$('.hint[data-tooltip]').forEach((item) => {
    const text = state.language === 'en'
      ? (item.dataset.tooltipEn || item.dataset.tooltipJa || item.dataset.tooltip)
      : (item.dataset.tooltipJa || item.dataset.tooltip);
    const popover = item.querySelector('.help-popover');
    if (popover) {
      popover.textContent = text;
    }
  });
  $$('.help-button').forEach((button) => {
    button.setAttribute('aria-label', t('help'));
  });
}

function closeHelpPopovers(except = null) {
  $$('.hint.help-open').forEach((item) => {
    if (item === except) {
      return;
    }
    item.classList.remove('help-open');
    item.querySelector('.help-button')?.setAttribute('aria-expanded', 'false');
  });
}

async function api(path, options = {}) {
  await ensureApiBase();
  const response = await fetch(apiUrl(path), {
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    ...options
  });
  const body = await response.json();
  if (!response.ok || body.ok === false) {
    throw new Error(body.reason ?? body.message ?? `HTTP ${response.status}`);
  }
  return body;
}

function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${state.apiBase}${path}`;
}

function sameOriginBase() {
  return window.location.origin;
}

function bridgeCandidates() {
  const search = new URLSearchParams(window.location.search);
  const requested = search.get('bridge');
  const current = sameOriginBase();
  return [
    requested,
    current,
    'http://127.0.0.1:18081',
    'http://localhost:18081',
    'http://127.0.0.1:8080',
    'http://localhost:8080'
  ].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index);
}

async function fetchJson(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    ...options
  });
  const body = await response.json();
  if (!response.ok || body.ok === false) {
    throw new Error(body.reason ?? body.message ?? `HTTP ${response.status}`);
  }
  return body;
}

async function ensureApiBase() {
  if (state.apiBaseResolved) {
    return;
  }
  if (state.apiBasePromise) {
    await state.apiBasePromise;
    return;
  }
  state.apiBasePromise = discoverApiBase();
  try {
    await state.apiBasePromise;
  } finally {
    state.apiBasePromise = null;
  }
}

async function discoverApiBase() {
  for (const base of bridgeCandidates()) {
    try {
      const health = await fetchJson(base, '/health');
      if (health.version !== expectedVersion) {
        state.apiBaseWarning = `${base} は ${health.version} のため最新Bridgeではありません`;
        continue;
      }
      const runtime = await fetchJson(base, '/debug/runtime');
      if (runtime.version !== expectedVersion) {
        state.apiBaseWarning = `${base} は ${runtime.version} のため最新Bridgeではありません`;
        continue;
      }
      if (!compatibleCommandRunners.has(runtime.commandExecution?.runner)) {
        state.apiBaseWarning = `${base} はGUI command runner更新前のBridgeです`;
        continue;
      }
      state.apiBase = base === sameOriginBase() ? '' : base;
      state.apiBaseWarning = state.apiBase ? `API: ${base}` : '';
      state.apiBaseResolved = true;
      updateApiLinks();
      return;
    } catch {
      // Try the next known local bridge endpoint.
    }
  }
  state.apiBase = '';
  state.apiBaseResolved = true;
  updateApiLinks();
}

function resetApiDiscovery() {
  state.apiBaseResolved = false;
  state.apiBasePromise = null;
  state.apiBase = '';
}

function updateApiLinks() {
  if (elements.debugSnapshotLink) {
    elements.debugSnapshotLink.href = apiUrl('/debug/snapshot');
  }
}

function deviceId() {
  return elements.deviceId.value.trim() || 'm5stack-sample-001';
}

function nowLabel() {
  return new Date().toLocaleTimeString('ja-JP', { hour12: false });
}

async function refresh() {
  try {
    const [health, events, snapshot, runtime] = await Promise.all([
      api('/health'),
      api('/events'),
      api('/debug/snapshot'),
      api('/debug/runtime')
    ]);
    state.health = health;
    state.events = events;
    state.commands = snapshot.commands;
    state.commandDefinitions = snapshot.commandDefinitions;
    state.runtime = runtime;
    render();
  } catch (error) {
    resetApiDiscovery();
    elements.bridgeLine.textContent = `Host Bridge error: ${error.message}`;
    elements.bridgeLine.className = 'visually-hidden danger';
    renderRuntimeStatus();
  }
}

async function loadCurrentPetManifest() {
  try {
    state.petManifest = await api(`/pet/current/manifest${selectedPetQuery()}`);
  } catch (error) {
    state.petManifest = { ok: false, reason: error.message };
  }
  renderPetManifest();
  renderM5Preview();
}

async function loadPetPackages() {
  try {
    const result = await api('/pet/packages');
    state.petPackages = result.packages ?? [];
  } catch {
    state.petPackages = [];
  }
  renderPetPackages();
  await loadCurrentPetManifest();
}

function renderPetPackages() {
  if (!elements.petPackage) {
    return;
  }
  if (!state.petPackages.length) {
    elements.petPackage.innerHTML = '<option value="">fallback / env default</option>';
    return;
  }
  const current = elements.petPackage.value || state.petManifest?.packageName || 'Mira';
  elements.petPackage.innerHTML = state.petPackages.map((pet) => (
    `<option value="${escapeHtml(pet.name)}">${escapeHtml(pet.displayName)} (${escapeHtml(pet.name)})</option>`
  )).join('');
  if (state.petPackages.some((pet) => pet.name === current)) {
    elements.petPackage.value = current;
  }
}

function selectedPetQuery() {
  const petDir = elements.petPackagePath?.value?.trim();
  if (petDir) {
    return `?petDir=${encodeURIComponent(petDir)}`;
  }
  const packageName = elements.petPackage?.value;
  return packageName ? `?package=${encodeURIComponent(packageName)}` : '';
}

function render() {
  const health = state.health;
  const events = state.events;
  if (!health || !events) {
    return;
  }

  elements.bridgeLine.textContent = `${health.product} ${health.version} / paired ${health.pairedDevices.length}`;
  if (state.apiBaseWarning) {
    elements.bridgeLine.textContent += ` / ${state.apiBaseWarning}`;
  }
  elements.bridgeLine.className = `visually-hidden ${health.pairedDevices.length ? 'ok' : 'warn'}`;
  elements.lastUpdated.textContent = `updated ${nowLabel()}`;
  elements.pairedCount.textContent = String(health.pairedDevices.length);
  elements.outboundCount.textContent = String(health.outboundEvents);
  elements.inboundCount.textContent = String(health.inboundEvents);
  elements.securityCount.textContent = String(health.securityRejections);
  elements.deviceList.innerHTML = health.pairedDevices.length
    ? health.pairedDevices.map((device) => (
      `<span class="device-chip">${escapeHtml(device.deviceId)} / pending ${device.pending} / ws ${device.websocket ? 'on' : 'off'}</span>`
    )).join('')
    : `<span class="muted">${escapeHtml(t('noPaired'))}</span>`;

  renderLog(elements.outboundLog, events.outbound, (entry) => (
    `<code>${escapeHtml(entry.type)}</code><br>${escapeHtml(entry.eventId)}<br><span class="muted">${escapeHtml(entry.deviceId)}</span>`
  ));
  renderLog(elements.inboundLog, events.inbound, (entry) => (
    `<code>${escapeHtml(entry.type)}</code><br>${escapeHtml(entry.eventId)}<br>${formatDetails(entry.details)}`
  ));
  renderLog(elements.securityLog, events.security, (entry) => (
    `<code>${escapeHtml(entry.kind ?? 'security')}</code><br><span class="muted">${escapeHtml(entry.deviceId ?? '')}</span>`
  ));

  const latestReply = [...events.inbound].reverse().find((entry) => entry.type === 'device.reply_selected');
  elements.latestReply.innerHTML = latestReply
    ? `<strong>choiceId: ${escapeHtml(latestReply.details.choiceId)}</strong><br>request: ${escapeHtml(latestReply.details.requestEventId)}<br>input: ${escapeHtml(latestReply.details.input ?? '')}`
    : t('noReply');
  renderLatestSession();
  renderRuntimeStatus();
  renderCommands();
  renderM5Preview();
}

function renderLog(target, entries, template) {
  target.innerHTML = entries.length
    ? [...entries].reverse().slice(0, 20).map((entry) => `<li>${template(entry)}</li>`).join('')
    : `<li class="muted">${escapeHtml(t('eventNone'))}</li>`;
}

function renderRuntimeStatus() {
  const current = state.runtime?.currentProcess;
  if (!current) {
    elements.runtimeState.textContent = state.apiBaseWarning || t('bridgeUnchecked');
    elements.runtimePid.textContent = t('latestBridgeSearch');
    elements.runtimeDot.className = 'status-dot warn';
    return;
  }
  const mode = current.background ? 'background' : 'foreground';
  elements.runtimeState.textContent = `Bridge running / ${mode}`;
  elements.runtimePid.textContent = `pid ${current.pid} / uptime ${current.uptimeSec}s`;
  elements.runtimeDot.className = current.background ? 'status-dot' : 'status-dot warn';
}

function renderCommands() {
  const definitions = state.commandDefinitions;
  if (!definitions?.commands?.length) {
    if (!state.commands) {
      return;
    }
    elements.commandTabs.innerHTML = '';
    elements.commandList.innerHTML = Object.entries(state.commands).map(([name, command]) => (
      `<div class="command"><strong>${escapeHtml(name)}</strong><code>${escapeHtml(command)}</code></div>`
    )).join('');
    return;
  }

  elements.commandTabs.innerHTML = definitions.tabs.map((tab) => (
    `<button class="command-tab ${tab.id === state.activeCommandTab ? 'active' : ''}" type="button" data-command-tab="${escapeHtml(tab.id)}">${escapeHtml(localizedCommandTab(tab))}</button>`
  )).join('');

  const activeCommands = definitions.commands.filter((command) => command.tab === state.activeCommandTab);
  elements.commandList.innerHTML = activeCommands.map((command) => (
    `<article class="command-card" data-command-id="${escapeHtml(command.id)}">
      <div>
        <h3>${escapeHtml(localizedCommandLabel(command))}</h3>
        <p>${escapeHtml(localizedCommandDescription(command))}</p>
      </div>
      <div class="command-param-grid">
        ${(command.params ?? []).map((param) => renderCommandParam(command.id, param)).join('')}
      </div>
      <button class="run-command" type="button" data-command-id="${escapeHtml(command.id)}">${escapeHtml(t('run'))}</button>
    </article>`
  )).join('');
}

function localizedCommandTab(tab) {
  return commandTabLabels[tab.id]?.[state.language] ?? tab.label;
}

function localizedCommandLabel(command) {
  return commandText[command.id]?.[state.language]?.label ?? command.label;
}

function localizedCommandDescription(command) {
  return commandText[command.id]?.[state.language]?.description ?? command.description ?? '';
}

function localizedCommandParamLabel(param) {
  return commandParamLabels[param.name]?.[state.language] ?? param.label;
}

function renderCommandParam(commandId, param) {
  const fieldId = `cmd-${commandId}-${param.name}`;
  const value = readCommandParamValue(commandId, param) ?? param.defaultValue ?? '';
  if (param.type === 'textarea') {
    return `<label class="field">
      <span>${escapeHtml(localizedCommandParamLabel(param))}</span>
      <textarea id="${escapeHtml(fieldId)}" data-param="${escapeHtml(param.name)}" rows="3">${escapeHtml(value)}</textarea>
    </label>`;
  }
  if (param.type === 'select') {
    return `<label class="field">
      <span>${escapeHtml(localizedCommandParamLabel(param))}</span>
      <select id="${escapeHtml(fieldId)}" data-param="${escapeHtml(param.name)}">
        ${(param.options ?? []).map((option) => `<option value="${escapeHtml(option)}" ${String(value) === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
      </select>
    </label>`;
  }
  if (param.type === 'checkbox') {
    return `<label class="check-field">
      <input id="${escapeHtml(fieldId)}" data-param="${escapeHtml(param.name)}" type="checkbox" ${value === true || value === 'true' ? 'checked' : ''}>
      <span>${escapeHtml(localizedCommandParamLabel(param))}</span>
    </label>`;
  }
  return `<label class="field">
    <span>${escapeHtml(localizedCommandParamLabel(param))}</span>
    <input id="${escapeHtml(fieldId)}" data-param="${escapeHtml(param.name)}" type="${escapeHtml(param.type ?? 'text')}" value="${escapeHtml(value)}" placeholder="${escapeHtml(param.placeholder ?? '')}">
  </label>`;
}

function readCommandParamValue(commandId, param) {
  const existing = $(`[data-command-id="${CSS.escape(commandId)}"] [data-param="${CSS.escape(param.name)}"]`);
  if (!existing) {
    return undefined;
  }
  if (existing.type === 'checkbox') {
    return existing.checked;
  }
  return existing.value;
}

function collectCommandParams(commandId) {
  const card = $(`[data-command-id="${CSS.escape(commandId)}"]`);
  const params = {};
  card?.querySelectorAll('[data-param]').forEach((field) => {
    params[field.dataset.param] = field.type === 'checkbox' ? field.checked : field.value;
  });
  return params;
}

async function runDashboardCommand(commandId) {
  elements.commandOutput.textContent = `running ${commandId}...`;
  const response = await fetch(apiUrl('/debug/commands/run'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      commandId,
      params: collectCommandParams(commandId)
    })
  });
  const result = await response.json();
  elements.commandOutput.textContent = JSON.stringify(result, null, 2);
  await refresh();
}

function renderLatestSession() {
  const latest = state.latestSession;
  if (!latest) {
    elements.sessionName.textContent = `session ${t('sessionUnread')}`;
    elements.sessionPhase.textContent = 'phase -';
    elements.sessionAnswer.textContent = t('noSession');
    elements.sessionUser.textContent = t('sessionUnread');
    return;
  }
  if (latest.ok === false) {
    elements.sessionName.textContent = latest.reason ?? t('sessionLoadFailed');
    elements.sessionPhase.textContent = 'phase -';
    elements.sessionAnswer.textContent = latest.message ?? latest.reason ?? t('noRecentAnswer');
    elements.sessionUser.textContent = t('sessionUnread');
    return;
  }
  elements.sessionName.textContent = latest.sessionName ?? 'session';
  elements.sessionPhase.textContent = `phase ${latest.phase ?? '-'}`;
  elements.sessionAnswer.textContent = latest.body ?? '';
  elements.sessionUser.textContent = latest.user?.text ?? t('noUserMessage');
  renderM5Preview();
}

async function loadLatestSession() {
  try {
    state.latestSession = await api('/codex/session/latest?phase=any&mode=assistant');
  } catch (error) {
    state.latestSession = { ok: false, reason: 'session-load-failed', message: error.message };
  }
  renderLatestSession();
}

async function publishLatestSession() {
  const result = await api('/codex/session/publish', {
    method: 'POST',
    body: JSON.stringify({
      deviceId: deviceId(),
      phase: 'any',
      mode: 'exchange'
    })
  });
  elements.sendResult.textContent = JSON.stringify(result, null, 2);
  await refresh();
  await loadLatestSession();
}

function formatDetails(details = {}) {
  const pairs = Object.entries(details).filter(([, value]) => value !== null && value !== undefined);
  if (!pairs.length) {
    return '<span class="muted">details なし</span>';
  }
  return pairs.map(([key, value]) => (
    `<span class="muted">${escapeHtml(key)}:</span> ${formatDetailValue(value)}`
  )).join('<br>');
}

function formatDetailValue(value) {
  if (value && typeof value === 'object') {
    return `<code>${escapeHtml(JSON.stringify(value))}</code>`;
  }
  return escapeHtml(String(value));
}

function rgbaFromControls(colorInput, alphaInput) {
  const hex = colorInput.value.replace('#', '');
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: Number(alphaInput.value)
  };
}

function rgbaCss(value) {
  return `rgba(${value.r}, ${value.g}, ${value.b}, ${value.a / 255})`;
}

function rgbaLabel(colorInput, alphaInput) {
  return `${colorInput.value} / ${alphaInput.value}`;
}

function updateRgbaVisual(swatch, preview, colorInput, alphaInput) {
  const value = rgbaFromControls(colorInput, alphaInput);
  const css = rgbaCss(value);
  [swatch, preview].forEach((item) => {
    if (!item) {
      return;
    }
    item.style.setProperty('--rgba-preview', css);
    item.title = rgbaLabel(colorInput, alphaInput);
  });
}

function displaySettingsPayload() {
  return {
    deviceId: deviceId(),
    petScale: Number(elements.petScale.value),
    uiTextScale: Number(elements.uiTextScale.value),
    bodyTextScale: Number(elements.bodyTextScale.value),
    animationFps: Number(elements.animationFps.value),
    motionStepMs: Number(elements.motionStepMs.value),
    screenBackgroundRgba: rgbaFromControls(elements.screenBgColor, elements.screenBgAlpha),
    petBackgroundRgba: rgbaFromControls(elements.petBgColor, elements.petBgAlpha),
    textColorRgba: rgbaFromControls(elements.textColor, elements.textAlpha),
    textBackgroundRgba: rgbaFromControls(elements.textBgColor, elements.textBgAlpha),
    petOffsetX: Number(elements.petOffsetX.value),
    petOffsetY: Number(elements.petOffsetY.value),
    textBorderEnabled: elements.textBorderEnabled.checked,
    textBorderRgba: rgbaFromControls(elements.textBorderColor, elements.textBorderAlpha),
    beepOnAnswer: elements.beepOnAnswer.checked
  };
}

async function publishDisplaySettings() {
  const payload = displaySettingsPayload();
  try {
    return await submitJson('/codex/display', payload);
  } catch (error) {
    if (!String(error.message).includes('not-found')) {
      throw error;
    }
    return submitJson('/codex/event', {
      deviceId: payload.deviceId,
      event: createDisplayFallbackPetEvent(payload)
    });
  }
}

function createDisplayFallbackPetEvent(payload) {
  return {
    type: 'pet.updated',
    eventId: `evt-display-fallback-${Date.now()}`,
    createdAt: new Date().toISOString(),
    pet: {
      id: 'display-settings',
      name: elements.petName.value || 'Codex Pet',
      state: elements.petState.value || 'idle',
      spriteRef: elements.petSprite.value || 'host://display/settings'
    },
    display: {
      petScale: payload.petScale,
      uiTextScale: payload.uiTextScale,
      bodyTextScale: payload.bodyTextScale,
      animationFps: payload.animationFps,
      motionStepMs: payload.motionStepMs,
      screenBackgroundRgba: payload.screenBackgroundRgba,
      petBackgroundRgba: payload.petBackgroundRgba,
      textColorRgba: payload.textColorRgba,
      textBackgroundRgba: payload.textBackgroundRgba,
      petOffsetX: payload.petOffsetX,
      petOffsetY: payload.petOffsetY,
      textBorderEnabled: payload.textBorderEnabled,
      textBorderRgba: payload.textBorderRgba,
      beepOnAnswer: payload.beepOnAnswer
    }
  };
}

function scheduleAutoDisplaySync() {
  if (!elements.autoDisplaySync?.checked) {
    return;
  }
  if (state.autoDisplaySyncTimer) {
    clearTimeout(state.autoDisplaySyncTimer);
  }
  state.autoDisplaySyncTimer = setTimeout(() => {
    state.autoDisplaySyncTimer = null;
    if (state.autoDisplaySyncInFlight) {
      scheduleAutoDisplaySync();
      return;
    }
    state.autoDisplaySyncInFlight = true;
    publishDisplaySettings()
      .catch(showError)
      .finally(() => {
        state.autoDisplaySyncInFlight = false;
      });
  }, 650);
}

function petPayload() {
  return {
    deviceId: deviceId(),
    name: elements.petName.value || state.petManifest?.displayName || 'Codex Pet',
    state: elements.petState.value,
    spriteRef: elements.petSprite.value || 'host://pet/current',
    display: displaySettingsPayload()
  };
}

function renderDisplayControls() {
  elements.petScaleValue.textContent = `${elements.petScale.value}/8`;
  elements.uiTextScaleValue.textContent = `${elements.uiTextScale.value}/8`;
  elements.bodyTextScaleValue.textContent = `${elements.bodyTextScale.value}/8`;
  elements.animationFpsValue.textContent = `${elements.animationFps.value} fps`;
  elements.motionStepValue.textContent = `${elements.motionStepMs.value} ms`;
  elements.petOffsetXValue.textContent = `${elements.petOffsetX.value} px`;
  elements.petOffsetYValue.textContent = `${elements.petOffsetY.value} px`;
  elements.screenBgValue.textContent = rgbaLabel(elements.screenBgColor, elements.screenBgAlpha);
  elements.petBgValue.textContent = rgbaLabel(elements.petBgColor, elements.petBgAlpha);
  elements.textColorValue.textContent = rgbaLabel(elements.textColor, elements.textAlpha);
  elements.textBgValue.textContent = rgbaLabel(elements.textBgColor, elements.textBgAlpha);
  elements.textBorderValue.textContent = rgbaLabel(elements.textBorderColor, elements.textBorderAlpha);
  updateRgbaVisual(elements.screenBgSwatch, elements.screenBgPreview, elements.screenBgColor, elements.screenBgAlpha);
  updateRgbaVisual(elements.petBgSwatch, elements.petBgPreview, elements.petBgColor, elements.petBgAlpha);
  updateRgbaVisual(elements.textColorSwatch, elements.textColorPreview, elements.textColor, elements.textAlpha);
  updateRgbaVisual(elements.textBgSwatch, elements.textBgPreview, elements.textBgColor, elements.textBgAlpha);
  updateRgbaVisual(elements.textBorderSwatch, elements.textBorderPreview, elements.textBorderColor, elements.textBorderAlpha);
  renderM5Preview();
}

function renderPetManifest() {
  const manifest = state.petManifest;
  if (!manifest?.ok) {
    elements.petAssetName.textContent = 'fallback';
    elements.petAssetDescription.textContent = manifest?.reason
      ? `local hatch-pet asset 未読込: ${manifest.reason}`
      : 'local hatch-pet asset が見つからないため fallback preview を表示';
    return;
  }
  elements.petAssetName.textContent = manifest.displayName ?? manifest.id ?? 'current pet';
  elements.petAssetDescription.textContent = manifest.description ?? 'local hatch-pet asset';
  if (manifest.packageName && elements.petPackage && elements.petPackage.value !== manifest.packageName) {
    elements.petPackage.value = manifest.packageName;
  }
  if (elements.petName.value === 'Codex Pet') {
    elements.petName.value = manifest.displayName ?? manifest.id ?? elements.petName.value;
  }
}

function renderM5Preview() {
  if (!elements.m5Preview) {
    return;
  }
  const petScale = Number(elements.petScale.value);
  const uiTextScale = Number(elements.uiTextScale.value);
  const bodyTextScale = Number(elements.bodyTextScale.value);
  const animationFps = Number(elements.animationFps.value);
  const motionStepMs = Number(elements.motionStepMs.value);
  const petOffsetX = Number(elements.petOffsetX.value);
  const petOffsetY = Number(elements.petOffsetY.value);
  const mode = elements.previewMode.value;
  const device = elements.previewDevice.value;
  const screenBackground = rgbaFromControls(elements.screenBgColor, elements.screenBgAlpha);
  const petBackground = rgbaFromControls(elements.petBgColor, elements.petBgAlpha);
  const textColor = rgbaFromControls(elements.textColor, elements.textAlpha);
  const textBackground = rgbaFromControls(elements.textBgColor, elements.textBgAlpha);
  const textBorder = rgbaFromControls(elements.textBorderColor, elements.textBorderAlpha);
  const petHeight = Math.round(42 + ((petScale - 1) / 7) * 178);
  const manifest = state.petManifest;
  const aspect = manifest?.ok ? manifest.frameWidth / manifest.frameHeight : 1;
  const petWidth = Math.round(petHeight * aspect);
  const bodySize = Math.min(34, 10 + bodyTextScale * 3);
  const uiSize = Math.min(24, 9 + uiTextScale * 2);

  elements.m5Preview.dataset.mode = mode;
  elements.m5Preview.dataset.device = device;
  elements.m5Preview.style.setProperty('--pet-width', `${petWidth}px`);
  elements.m5Preview.style.setProperty('--pet-height', `${petHeight}px`);
  elements.m5Preview.style.setProperty('--pet-x', `${petOffsetX}px`);
  elements.m5Preview.style.setProperty('--pet-y', `${petOffsetY}px`);
  elements.m5Preview.style.setProperty('--body-size', `${bodySize}px`);
  elements.m5Preview.style.setProperty('--ui-size', `${uiSize}px`);
  elements.m5Preview.style.setProperty('--screen-bg', rgbaCss(screenBackground));
  elements.m5Preview.style.setProperty('--pet-bg', rgbaCss(petBackground));
  elements.m5Preview.style.setProperty('--overlay-text', rgbaCss(textColor));
  elements.m5Preview.style.setProperty('--overlay-bg', rgbaCss(textBackground));
  elements.m5Preview.style.setProperty('--overlay-border', rgbaCss(textBorder));
  elements.m5Preview.style.setProperty('--overlay-border-width', elements.textBorderEnabled.checked ? '1px' : '0px');
  elements.previewDeviceReadout.textContent = device === 'gray' ? 'GRAY / 320x240 / buttons' : 'Core2 / 320x240 / touch';
  elements.previewPetReadout.textContent = `${petScale}/8`;
  elements.previewUiReadout.textContent = `${uiTextScale}/8`;
  elements.previewBodyReadout.textContent = `${bodyTextScale}/8`;
  elements.previewFpsReadout.textContent = `${animationFps} fps`;
  elements.previewMotionReadout.textContent = `${motionStepMs} ms`;

  if (manifest?.ok) {
    elements.previewPet.classList.add('sprite-pet');
    elements.previewPet.classList.remove('sprite-fallback');
    elements.previewPet.style.backgroundImage = `url("${assetUrl(manifest.spritesheetUrl)}")`;
    elements.previewPet.style.backgroundSize = `${petWidth * manifest.columns}px ${petHeight * manifest.rows}px`;
  } else {
    elements.previewPet.classList.remove('sprite-pet');
    elements.previewPet.classList.add('sprite-fallback');
    elements.previewPet.style.backgroundImage = '';
    elements.previewPet.style.backgroundSize = '';
  }
  renderPreviewPetFrame();
  syncPreviewAnimationTimer();

  const preview = previewContent(mode, petScale);
  elements.previewBody.textContent = preview.body;
  elements.previewFooter.innerHTML = footerHtml(preview.footer, device);
  elements.previewBody.style.display = preview.body ? 'block' : 'none';
  elements.previewFooter.style.display = preview.footer?.length ? 'flex' : 'none';
}

function assetUrl(value) {
  if (!value) {
    return '';
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return apiUrl(value.startsWith('/') ? value : `/${value}`);
}

function renderPreviewPetFrame() {
  const manifest = state.petManifest;
  if (!manifest?.ok) {
    return;
  }
  const petWidth = Number.parseFloat(getComputedStyle(elements.m5Preview).getPropertyValue('--pet-width')) || 100;
  const frameCount = Math.max(1, Number(manifest.idleFrames ?? 6));
  const frame = state.previewPetFrame % frameCount;
  elements.previewPet.style.backgroundPosition = `${-frame * petWidth}px 0px`;
}

function syncPreviewAnimationTimer() {
  const delay = Math.max(Number(elements.motionStepMs.value), Math.round(1000 / Math.max(1, Number(elements.animationFps.value))));
  if (state.previewAnimationInterval && state.previewAnimationDelay === delay) {
    return;
  }
  if (state.previewAnimationInterval) {
    clearInterval(state.previewAnimationInterval);
  }
  state.previewAnimationDelay = delay;
  state.previewAnimationInterval = setInterval(() => {
    state.previewPetFrame += 1;
    renderPreviewPetFrame();
  }, delay);
}

function previewContent(mode, petScale) {
  if (mode === 'answer') {
    const sessionText = state.latestSession?.body;
    const body = sessionText || $('#answerBody').value;
    return {
      body: `${$('#answerSummary').value}\n${body}`,
      footer: ['A up', 'B idle', 'C down']
    };
  }
  if (mode === 'choice') {
    return {
      body: `${$('#choicePrompt').value}\nA: ${$('#choiceA').value}\nB: ${$('#choiceB').value}\nC: ${$('#choiceC').value}`,
      footer: ['A send', 'B send', 'C send']
    };
  }
  if (mode === 'notification') {
    return {
      body: `${$('#notificationTitle').value}\n${$('#notificationBody').value}`,
      footer: ['A ack', 'B pet', 'C idle']
    };
  }
  return {
    body: petScale >= 8 ? '' : `${elements.petName.value || 'Pet'}\n${elements.petState.value}`,
    footer: petScale >= 8 ? [] : ['A poll', 'B pet', 'C idle']
  };
}

function footerHtml(value, device) {
  if (!value?.length) {
    return '';
  }
  return value.map((label) => {
    const text = device === 'gray'
      ? label.replace('A ', 'A btn ').replace('B ', 'B btn ').replace('C ', 'C btn ')
      : label;
    return `<span>${escapeHtml(text)}</span>`;
  }).join('');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

async function submitJson(path, payload) {
  const result = await api(path, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  elements.sendResult.textContent = JSON.stringify(result, null, 2);
  await refresh();
  return result;
}

function wireTabs() {
  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((item) => item.classList.remove('active'));
      $$('.tab-panel').forEach((item) => item.classList.remove('active'));
      tab.classList.add('active');
      $(`#${tab.dataset.tab}Form`).classList.add('active');
      elements.previewMode.value = tab.dataset.tab === 'choice' ? 'choice' : tab.dataset.tab;
      renderM5Preview();
    });
  });
}

function wireSideNav() {
  $$('.side-link').forEach((link) => {
    link.addEventListener('click', () => {
      $$('.side-link').forEach((item) => item.classList.remove('active'));
      link.classList.add('active');
      const target = $(`#${link.dataset.section}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function wireForms() {
  $('#answerForm').addEventListener('submit', (event) => {
    event.preventDefault();
    submitJson('/codex/answer', {
      deviceId: deviceId(),
      summary: $('#answerSummary').value,
      body: $('#answerBody').value
    }).catch(showError);
  });

  $('#choiceForm').addEventListener('submit', (event) => {
    event.preventDefault();
    submitJson('/codex/decision', {
      deviceId: deviceId(),
      question: $('#choicePrompt').value,
      a: $('#choiceA').value,
      b: $('#choiceB').value,
      c: $('#choiceC').value,
      timeoutSec: 300
    }).catch(showError);
  });

  $('#notificationForm').addEventListener('submit', (event) => {
    event.preventDefault();
    submitJson('/codex/notification', {
      deviceId: deviceId(),
      title: $('#notificationTitle').value,
      severity: $('#notificationSeverity').value,
      body: $('#notificationBody').value
    }).catch(showError);
  });
}

function wireActions() {
  [
    elements.petScale,
    elements.uiTextScale,
    elements.bodyTextScale,
    elements.animationFps,
    elements.motionStepMs,
    elements.petOffsetX,
    elements.petOffsetY,
    elements.screenBgColor,
    elements.screenBgAlpha,
    elements.petBgColor,
    elements.petBgAlpha,
    elements.textColor,
    elements.textAlpha,
    elements.textBgColor,
    elements.textBgAlpha,
    elements.textBorderColor,
    elements.textBorderAlpha,
    elements.textBorderEnabled,
    elements.beepOnAnswer
  ].forEach((control) => {
    control.addEventListener('input', () => {
      renderDisplayControls();
      scheduleAutoDisplaySync();
    });
    control.addEventListener('change', () => {
      renderDisplayControls();
      scheduleAutoDisplaySync();
    });
  });
  [
    elements.previewDevice,
    elements.previewMode,
    elements.petName,
    elements.petState,
    elements.petSprite,
    $('#answerSummary'),
    $('#answerBody'),
    $('#choicePrompt'),
    $('#choiceA'),
    $('#choiceB'),
    $('#choiceC'),
    $('#notificationTitle'),
    $('#notificationBody')
  ].forEach((control) => {
    control.addEventListener('input', renderM5Preview);
    control.addEventListener('change', renderM5Preview);
  });
  $('#refreshButton').addEventListener('click', refresh);
  elements.languageMode.addEventListener('change', () => {
    state.language = elements.languageMode.value === 'en' ? 'en' : 'ja';
    localStorage.setItem('m5pet-language', state.language);
    applyLanguage();
    renderCommands();
  });
  elements.themeMode.addEventListener('change', () => {
    state.themeMode = ['system', 'light', 'dark'].includes(elements.themeMode.value) ? elements.themeMode.value : 'system';
    localStorage.setItem('m5pet-theme', state.themeMode);
    applyTheme();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.themeMode === 'system') {
      applyTheme();
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.hint')) {
      closeHelpPopovers();
    }
    if (!event.target.closest('[data-rgba-picker]')) {
      closeRgbaPickers();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeHelpPopovers();
      closeRgbaPickers();
      closeModal(elements.commandModal);
    }
  });
  $('#reloadPetPackagesButton').addEventListener('click', () => {
    loadPetPackages().catch(showError);
  });
  elements.petPackage.addEventListener('change', () => {
    loadCurrentPetManifest().catch(showError);
  });
  elements.petPackagePath.addEventListener('change', () => {
    loadCurrentPetManifest().catch(showError);
  });
  $('#clearViewButton').addEventListener('click', render);
  $('#loadCommandsButton').addEventListener('click', refresh);
  $('#openCommandsButton').addEventListener('click', () => openModal(elements.commandModal));
  $$('[data-close-modal]').forEach((item) => item.addEventListener('click', () => closeModal(elements.commandModal)));
  elements.commandTabs.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-command-tab]');
    if (!tab) {
      return;
    }
    state.activeCommandTab = tab.dataset.commandTab;
    renderCommands();
  });
  elements.commandList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-command-id].run-command');
    if (!button) {
      return;
    }
    runDashboardCommand(button.dataset.commandId).catch((error) => {
      elements.commandOutput.textContent = `ERROR: ${error.message}`;
    });
  });
  $('#loadSessionButton').addEventListener('click', loadLatestSession);
  $('#publishSessionButton').addEventListener('click', () => {
    publishLatestSession().catch(showError);
  });
  $('#replayButton').addEventListener('click', () => {
    submitJson('/codex/replay-samples', { deviceId: deviceId() }).catch(showError);
  });
  $('#sendPetButton').addEventListener('click', () => {
    submitJson('/codex/pet', petPayload()).catch(showError);
  });
  $('#sendDisplayButton').addEventListener('click', () => {
    publishDisplaySettings().catch(showError);
  });
  $$('[data-rgba-toggle]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const picker = button.closest('[data-rgba-picker]');
      const shouldOpen = !picker.classList.contains('open');
      closeRgbaPickers(picker);
      picker.classList.toggle('open', shouldOpen);
    });
  });
  $$('.section-toggle').forEach((button) => {
    button.addEventListener('click', () => toggleSection(button.dataset.target, button));
  });
}

function closeRgbaPickers(except = null) {
  $$('[data-rgba-picker].open').forEach((picker) => {
    if (picker !== except) {
      picker.classList.remove('open');
    }
  });
}

function toggleSection(sectionId, button) {
  const section = $(`#${sectionId}`);
  section.classList.toggle('collapsed');
  button.dataset.i18n = section.classList.contains('collapsed') ? 'view' : 'hide';
  button.textContent = t(button.dataset.i18n);
}

function openModal(modal) {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(modal) {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function showError(error) {
  elements.sendResult.textContent = `ERROR: ${error.message}`;
}

applyTheme();
enhanceHints();
applyLanguage();
wireTabs();
wireSideNav();
wireForms();
wireActions();
renderDisplayControls();
refresh();
loadPetPackages();
loadLatestSession();
setInterval(refresh, 2500);
setInterval(loadLatestSession, 5000);
