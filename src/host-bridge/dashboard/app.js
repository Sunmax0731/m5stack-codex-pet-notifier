const state = {
  health: null,
  events: null,
  commands: null,
  latestSession: null,
  petManifest: null,
  previewPetFrame: 0,
  previewAnimationInterval: null,
  previewAnimationDelay: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  bridgeLine: $('#bridgeLine'),
  lastUpdated: $('#lastUpdated'),
  pairedCount: $('#pairedCount'),
  outboundCount: $('#outboundCount'),
  inboundCount: $('#inboundCount'),
  securityCount: $('#securityCount'),
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
  petScale: $('#petScale'),
  uiTextScale: $('#uiTextScale'),
  bodyTextScale: $('#bodyTextScale'),
  animationFps: $('#animationFps'),
  motionStepMs: $('#motionStepMs'),
  petScaleValue: $('#petScaleValue'),
  uiTextScaleValue: $('#uiTextScaleValue'),
  bodyTextScaleValue: $('#bodyTextScaleValue'),
  animationFpsValue: $('#animationFpsValue'),
  motionStepValue: $('#motionStepValue'),
  previewMode: $('#previewMode'),
  m5Preview: $('#m5Preview'),
  previewPet: $('#previewPet'),
  previewBody: $('#previewBody'),
  previewFooter: $('#previewFooter'),
  previewPetReadout: $('#previewPetReadout'),
  previewUiReadout: $('#previewUiReadout'),
  previewBodyReadout: $('#previewBodyReadout'),
  previewFpsReadout: $('#previewFpsReadout'),
  previewMotionReadout: $('#previewMotionReadout'),
  petAssetName: $('#petAssetName'),
  petAssetDescription: $('#petAssetDescription'),
  commandList: $('#commandList'),
  commandModal: $('#commandModal')
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    ...options
  });
  const body = await response.json();
  if (!response.ok || body.ok === false) {
    throw new Error(body.reason ?? body.message ?? `HTTP ${response.status}`);
  }
  return body;
}

function deviceId() {
  return elements.deviceId.value.trim() || 'm5stack-sample-001';
}

function nowLabel() {
  return new Date().toLocaleTimeString('ja-JP', { hour12: false });
}

async function refresh() {
  try {
    const [health, events, snapshot] = await Promise.all([
      api('/health'),
      api('/events'),
      api('/debug/snapshot')
    ]);
    state.health = health;
    state.events = events;
    state.commands = snapshot.commands;
    render();
  } catch (error) {
    elements.bridgeLine.textContent = `Host Bridge error: ${error.message}`;
    elements.bridgeLine.className = 'danger';
  }
}

async function loadCurrentPetManifest() {
  try {
    state.petManifest = await api('/pet/current/manifest');
  } catch (error) {
    state.petManifest = { ok: false, reason: error.message };
  }
  renderPetManifest();
  renderM5Preview();
}

function render() {
  const health = state.health;
  const events = state.events;
  if (!health || !events) {
    return;
  }

  elements.bridgeLine.textContent = `${health.product} ${health.version} / paired ${health.pairedDevices.length}`;
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
  renderCommands();
  renderM5Preview();
}

function renderLog(target, entries, template) {
  target.innerHTML = entries.length
    ? [...entries].reverse().slice(0, 20).map((entry) => `<li>${template(entry)}</li>`).join('')
    : '<li class="muted">event なし</li>';
}

function renderCommands() {
  if (!state.commands) {
    return;
  }
  elements.commandList.innerHTML = Object.entries(state.commands).map(([name, command]) => (
    `<div class="command"><strong>${escapeHtml(name)}</strong><code>${escapeHtml(command)}</code></div>`
  )).join('');
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

function displaySettingsPayload() {
  return {
    deviceId: deviceId(),
    petScale: Number(elements.petScale.value),
    uiTextScale: Number(elements.uiTextScale.value),
    bodyTextScale: Number(elements.bodyTextScale.value),
    animationFps: Number(elements.animationFps.value),
    motionStepMs: Number(elements.motionStepMs.value)
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
      motionStepMs: payload.motionStepMs
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
  renderM5Preview();
}

function renderPetManifest() {
  const manifest = state.petManifest;
  if (!manifest?.ok) {
    elements.petAssetName.textContent = 'fallback';
    elements.petAssetDescription.textContent = 'local hatch-pet asset が見つからないため fallback preview を表示';
    return;
  }
  elements.petAssetName.textContent = manifest.displayName ?? manifest.id ?? 'current pet';
  elements.petAssetDescription.textContent = manifest.description ?? 'local hatch-pet asset';
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
  const mode = elements.previewMode.value;
  const petHeight = Math.round(42 + ((petScale - 1) / 7) * 178);
  const manifest = state.petManifest;
  const aspect = manifest?.ok ? manifest.frameWidth / manifest.frameHeight : 1;
  const petWidth = Math.round(petHeight * aspect);
  const bodySize = Math.min(34, 10 + bodyTextScale * 3);
  const uiSize = Math.min(24, 9 + uiTextScale * 2);

  elements.m5Preview.dataset.mode = mode;
  elements.m5Preview.style.setProperty('--pet-width', `${petWidth}px`);
  elements.m5Preview.style.setProperty('--pet-height', `${petHeight}px`);
  elements.m5Preview.style.setProperty('--body-size', `${bodySize}px`);
  elements.m5Preview.style.setProperty('--ui-size', `${uiSize}px`);
  elements.previewPetReadout.textContent = `${petScale}/8`;
  elements.previewUiReadout.textContent = `${uiTextScale}/8`;
  elements.previewBodyReadout.textContent = `${bodyTextScale}/8`;
  elements.previewFpsReadout.textContent = `${animationFps} fps`;
  elements.previewMotionReadout.textContent = `${motionStepMs} ms`;

  if (manifest?.ok) {
    elements.previewPet.classList.add('sprite-pet');
    elements.previewPet.classList.remove('sprite-fallback');
    elements.previewPet.style.backgroundImage = `url("${manifest.spritesheetUrl}")`;
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
  elements.previewFooter.textContent = preview.footer;
  elements.previewBody.style.display = preview.body ? 'block' : 'none';
  elements.previewFooter.style.display = preview.footer ? 'block' : 'none';
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
      footer: 'A up    B idle    C down'
    };
  }
  if (mode === 'choice') {
    return {
      body: `${$('#choicePrompt').value}\nA: ${$('#choiceA').value}\nB: ${$('#choiceB').value}\nC: ${$('#choiceC').value}`,
      footer: 'A send  B send  C send'
    };
  }
  if (mode === 'notification') {
    return {
      body: `${$('#notificationTitle').value}\n${$('#notificationBody').value}`,
      footer: 'A ack   B pet   C idle'
    };
  }
  return {
    body: petScale >= 8 ? '' : `${elements.petName.value || 'Pet'}\n${elements.petState.value}`,
    footer: petScale >= 8 ? '' : 'A poll  B pet  C idle'
  };
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
  [elements.petScale, elements.uiTextScale, elements.bodyTextScale, elements.animationFps, elements.motionStepMs].forEach((control) => {
    control.addEventListener('input', renderDisplayControls);
  });
  [
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
  $('#clearViewButton').addEventListener('click', render);
  $('#loadCommandsButton').addEventListener('click', refresh);
  $('#openCommandsButton').addEventListener('click', () => openModal(elements.commandModal));
  $$('[data-close-modal]').forEach((item) => item.addEventListener('click', () => closeModal(elements.commandModal)));
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
loadCurrentPetManifest();
loadLatestSession();
setInterval(refresh, 2500);
setInterval(loadLatestSession, 5000);
