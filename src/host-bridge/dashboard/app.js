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
  previewAnimationDelay: null
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
  debugSnapshotLink: $('#debugSnapshotLink')
};

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
    elements.bridgeLine.className = 'danger';
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
  elements.bridgeLine.className = health.pairedDevices.length ? 'ok' : 'warn';
  elements.lastUpdated.textContent = `updated ${nowLabel()}`;
  elements.pairedCount.textContent = String(health.pairedDevices.length);
  elements.outboundCount.textContent = String(health.outboundEvents);
  elements.inboundCount.textContent = String(health.inboundEvents);
  elements.securityCount.textContent = String(health.securityRejections);
  elements.deviceList.innerHTML = health.pairedDevices.length
    ? health.pairedDevices.map((device) => (
      `<span class="device-chip">${escapeHtml(device.deviceId)} / pending ${device.pending} / ws ${device.websocket ? 'on' : 'off'}</span>`
    )).join('')
    : '<span class="muted">paired device なし。M5Stack 起動または /pair を待機中。</span>';

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
    : 'まだ返信はありません。';
  renderLatestSession();
  renderRuntimeStatus();
  renderCommands();
  renderM5Preview();
}

function renderLog(target, entries, template) {
  target.innerHTML = entries.length
    ? [...entries].reverse().slice(0, 20).map((entry) => `<li>${template(entry)}</li>`).join('')
    : '<li class="muted">event なし</li>';
}

function renderRuntimeStatus() {
  const current = state.runtime?.currentProcess;
  if (!current) {
    elements.runtimeState.textContent = state.apiBaseWarning || 'Bridge未確認';
    elements.runtimePid.textContent = 'latest Bridge API を探索中';
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
    `<button class="command-tab ${tab.id === state.activeCommandTab ? 'active' : ''}" type="button" data-command-tab="${escapeHtml(tab.id)}">${escapeHtml(tab.label)}</button>`
  )).join('');

  const activeCommands = definitions.commands.filter((command) => command.tab === state.activeCommandTab);
  elements.commandList.innerHTML = activeCommands.map((command) => (
    `<article class="command-card" data-command-id="${escapeHtml(command.id)}">
      <div>
        <h3>${escapeHtml(command.label)}</h3>
        <p>${escapeHtml(command.description ?? '')}</p>
      </div>
      <div class="command-param-grid">
        ${(command.params ?? []).map((param) => renderCommandParam(command.id, param)).join('')}
      </div>
      <button class="run-command" type="button" data-command-id="${escapeHtml(command.id)}">実行</button>
    </article>`
  )).join('');
}

function renderCommandParam(commandId, param) {
  const fieldId = `cmd-${commandId}-${param.name}`;
  const value = readCommandParamValue(commandId, param) ?? param.defaultValue ?? '';
  if (param.type === 'textarea') {
    return `<label class="field">
      <span>${escapeHtml(param.label)}</span>
      <textarea id="${escapeHtml(fieldId)}" data-param="${escapeHtml(param.name)}" rows="3">${escapeHtml(value)}</textarea>
    </label>`;
  }
  if (param.type === 'select') {
    return `<label class="field">
      <span>${escapeHtml(param.label)}</span>
      <select id="${escapeHtml(fieldId)}" data-param="${escapeHtml(param.name)}">
        ${(param.options ?? []).map((option) => `<option value="${escapeHtml(option)}" ${String(value) === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
      </select>
    </label>`;
  }
  if (param.type === 'checkbox') {
    return `<label class="check-field">
      <input id="${escapeHtml(fieldId)}" data-param="${escapeHtml(param.name)}" type="checkbox" ${value === true || value === 'true' ? 'checked' : ''}>
      <span>${escapeHtml(param.label)}</span>
    </label>`;
  }
  return `<label class="field">
    <span>${escapeHtml(param.label)}</span>
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
    elements.sessionName.textContent = 'session 未読込';
    elements.sessionPhase.textContent = 'phase -';
    elements.sessionAnswer.textContent = '最近の Codex session を読み込んでいません。';
    elements.sessionUser.textContent = '未読込';
    return;
  }
  if (latest.ok === false) {
    elements.sessionName.textContent = latest.reason ?? '読み込み失敗';
    elements.sessionPhase.textContent = 'phase -';
    elements.sessionAnswer.textContent = latest.message ?? latest.reason ?? '最近の Codex 回答を取得できません。';
    elements.sessionUser.textContent = '未読込';
    return;
  }
  elements.sessionName.textContent = latest.sessionName ?? 'session';
  elements.sessionPhase.textContent = `phase ${latest.phase ?? '-'}`;
  elements.sessionAnswer.textContent = latest.body ?? '';
  elements.sessionUser.textContent = latest.user?.text ?? '直前の user message はありません。';
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
    `<span class="muted">${escapeHtml(key)}:</span> ${escapeHtml(String(value))}`
  )).join('<br>');
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

function petPayload() {
  return {
    deviceId: deviceId(),
    name: elements.petName.value || state.petManifest?.displayName || 'Codex Pet',
    state: elements.petState.value,
    spriteRef: elements.petSprite.value || 'host://pet/current'
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
    control.addEventListener('input', renderDisplayControls);
    control.addEventListener('change', renderDisplayControls);
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
  $$('.section-toggle').forEach((button) => {
    button.addEventListener('click', () => toggleSection(button.dataset.target, button));
  });
}

function toggleSection(sectionId, button) {
  const section = $(`#${sectionId}`);
  section.classList.toggle('collapsed');
  button.textContent = section.classList.contains('collapsed') ? 'View' : 'Hide';
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
