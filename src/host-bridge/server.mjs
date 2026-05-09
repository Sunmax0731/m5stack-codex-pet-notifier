import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createAnswerEvent,
  createChoiceEvent,
  createDisplaySettingsEvent,
  createNotificationEvent,
  createPetEvent
} from '../codex-adapter/eventFactory.mjs';
import { readLatestSessionExchange } from '../codex-adapter/sessionWatcher.mjs';
import { productProfile } from '../core/product-profile.mjs';
import { loadSchemas, validateEvent } from '../protocol/validator.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dashboardRoot = path.join(repoRoot, 'src', 'host-bridge', 'dashboard');
const runtimeStatusPath = path.join(repoRoot, 'tmp', 'bridge-runtime.json');
const hostToDeviceTypes = new Set([
  'pet.updated',
  'notification.created',
  'answer.completed',
  'prompt.choice_requested',
  'display.settings_updated'
]);
const deviceToHostTypes = new Set([
  'device.reply_selected',
  'device.pet_interacted',
  'device.heartbeat'
]);

export class LanHostBridge {
  constructor(options = {}) {
    this.schemas = options.schemas ?? loadSchemas();
    this.pairingCode = options.pairingCode ?? productProfile.defaultPairingCode;
    this.devices = new Map();
    this.outboundLog = [];
    this.inboundLog = [];
    this.securityLog = [];
  }

  pair(deviceId, pairingCode) {
    if (!deviceId) {
      return { ok: false, reason: 'device-id-required' };
    }
    if (pairingCode !== this.pairingCode) {
      this.securityLog.push({ kind: 'pairing-rejected', deviceId });
      return { ok: false, reason: 'invalid-pairing-code' };
    }
    const record = this.ensureDevice(deviceId);
    record.token = `paired-${crypto.randomBytes(18).toString('base64url')}`;
    record.paired = true;
    return { ok: true, deviceId, token: record.token };
  }

  publish(event, options = {}) {
    const validation = validateEvent(event, this.schemas);
    if (!validation.valid) {
      return { ok: false, reason: 'invalid-event', validation };
    }
    if (!hostToDeviceTypes.has(event.type)) {
      return { ok: false, reason: 'not-host-to-device-event' };
    }

    const targets = options.deviceId
      ? [this.ensureDevice(options.deviceId)]
      : [...this.devices.values()].filter((device) => device.paired);
    if (targets.length === 0) {
      return { ok: false, reason: 'no-paired-device' };
    }

    for (const target of targets) {
      const details = summarizeHostEvent(event);
      const logEntry = {
        deviceId: target.deviceId,
        type: event.type,
        eventId: event.eventId,
        warnings: validation.warnings
      };
      if (Object.keys(details).length) {
        logEntry.details = details;
      }
      target.queue.push(event);
      this.outboundLog.push(logEntry);
      if (target.socket) {
        sendWebSocketText(target.socket, JSON.stringify(event));
      }
    }
    return { ok: true, queued: targets.length, validation };
  }

  poll(deviceId, token) {
    const auth = this.checkToken(deviceId, token);
    if (!auth.ok) {
      return auth;
    }
    const record = this.devices.get(deviceId);
    return {
      ok: true,
      event: record.queue.shift() ?? null,
      pending: record.queue.length
    };
  }

  receive(deviceId, token, event) {
    const auth = this.checkToken(deviceId, token);
    if (!auth.ok) {
      return auth;
    }
    const validation = validateEvent(event, this.schemas);
    if (!validation.valid) {
      return { ok: false, reason: 'invalid-event', validation };
    }
    if (!deviceToHostTypes.has(event.type)) {
      return { ok: false, reason: 'not-device-to-host-event' };
    }
    this.inboundLog.push({ deviceId, type: event.type, eventId: event.eventId, event });
    const sideEffect = event.type === 'device.pet_interacted'
      ? this.handlePetInteraction(deviceId, event)
      : null;
    return { ok: true, validation, ...(sideEffect ? { sideEffect } : {}) };
  }

  handlePetInteraction(deviceId, event) {
    if (!['long-press', 'button-long-press'].includes(event.interaction)) {
      return null;
    }
    const choiceEvent = createChoiceEvent({
      eventId: `evt-device-choice-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      prompt: 'M5Stack から長押しされました。次のCodex作業を選んでください。',
      choices: [
        { id: 'continue', label: '進める' },
        { id: 'revise', label: '修正する' },
        { id: 'hold', label: '保留する' }
      ],
      timeoutSec: 300
    });
    const result = this.publish(choiceEvent, { deviceId });
    return {
      type: 'prompt.choice_requested',
      eventId: choiceEvent.eventId,
      queued: result.queued ?? 0,
      sourceInteraction: event.interaction
    };
  }

  replaySamples(options = {}) {
    const sampleNames = options.samples ?? [
      'pet-update-event.json',
      'display-settings-event.json',
      'notification-event.json',
      'answer-completed-event.json',
      'choice-request-event.json'
    ];
    const results = [];
    for (const sampleName of sampleNames) {
      const event = JSON.parse(fs.readFileSync(path.join(repoRoot, 'samples', sampleName), 'utf8'));
      results.push({ sampleName, result: this.publish(event, { deviceId: options.deviceId }) });
    }
    return { ok: results.every((entry) => entry.result.ok), results };
  }

  attachSocket(deviceId, token, socket) {
    const auth = this.checkToken(deviceId, token);
    if (!auth.ok) {
      return auth;
    }
    const record = this.devices.get(deviceId);
    record.socket = socket;
    socket.on('data', (data) => {
      const text = decodeWebSocketText(data);
      if (!text) {
        return;
      }
      try {
        this.receive(deviceId, token, JSON.parse(text));
      } catch (error) {
        this.securityLog.push({ kind: 'websocket-json-error', deviceId, message: error.message });
      }
    });
    socket.on('close', () => {
      if (record.socket === socket) {
        record.socket = null;
      }
    });
    return { ok: true };
  }

  summary() {
    return {
      product: productProfile.repo,
      version: productProfile.version,
      pairedDevices: [...this.devices.values()].filter((record) => record.paired).map((record) => ({
        deviceId: record.deviceId,
        pending: record.queue.length,
        websocket: Boolean(record.socket)
      })),
      outboundEvents: this.outboundLog.length,
      inboundEvents: this.inboundLog.length,
      securityRejections: this.securityLog.length
    };
  }

  safeEvents() {
    return {
      ok: true,
      outbound: this.outboundLog,
      inbound: this.inboundLog.map((entry) => ({
        deviceId: entry.deviceId,
        type: entry.type,
        eventId: entry.eventId,
        details: summarizeDeviceEvent(entry.event)
      })),
      security: this.securityLog
    };
  }

  ensureDevice(deviceId) {
    if (!this.devices.has(deviceId)) {
      this.devices.set(deviceId, {
        deviceId,
        token: null,
        paired: false,
        queue: [],
        socket: null
      });
    }
    return this.devices.get(deviceId);
  }

  checkToken(deviceId, token) {
    const record = this.devices.get(deviceId);
    if (!record || !record.paired) {
      if (isRecoverablePairingToken(token)) {
        const recovered = this.ensureDevice(deviceId);
        recovered.token = token;
        recovered.paired = true;
        this.securityLog.push({ kind: 'token-rehydrated', deviceId });
        return { ok: true };
      }
      this.securityLog.push({ kind: 'unpaired-device', deviceId });
      return { ok: false, reason: 'device-not-paired' };
    }
    if (record.token !== token) {
      this.securityLog.push({ kind: 'token-rejected', deviceId });
      return { ok: false, reason: 'invalid-token' };
    }
    return { ok: true };
  }
}

function isRecoverablePairingToken(token) {
  return typeof token === 'string' && /^paired-[A-Za-z0-9_-]{20,}$/.test(token);
}

export function createBridgeHttpServer(bridge = new LanHostBridge(), options = {}) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
      if (request.method === 'OPTIONS') {
        return sendOptions(response);
      }
      if (request.method === 'GET' && url.pathname === '/health') {
        return sendJson(response, 200, { ok: true, ...bridge.summary() });
      }
      if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/dashboard')) {
        return sendStaticFile(response, path.join(dashboardRoot, 'index.html'));
      }
      if (request.method === 'GET' && url.pathname === '/favicon.ico') {
        return sendNoContent(response);
      }
      if (request.method === 'GET' && url.pathname.startsWith('/dashboard/')) {
        return sendDashboardAsset(response, url.pathname);
      }
      if (request.method === 'GET' && url.pathname === '/pet/packages') {
        return sendJson(response, 200, listLocalPetPackages());
      }
      if (request.method === 'GET' && url.pathname === '/pet/current/manifest') {
        return sendJson(response, 200, buildCurrentPetManifest(petSelectionFromUrl(url)));
      }
      if (request.method === 'GET' && url.pathname === '/pet/current/spritesheet.webp') {
        const filePath = resolveCurrentPetSpritesheetPath(petSelectionFromUrl(url));
        if (!filePath) {
          return sendJson(response, 404, { ok: false, reason: 'pet-asset-not-found' });
        }
        return sendStaticFile(response, filePath);
      }
      if (request.method === 'GET' && url.pathname === '/debug/snapshot') {
        return sendJson(response, 200, {
          ok: true,
          health: bridge.summary(),
          events: bridge.safeEvents(),
          runtime: buildRuntimeStatus(),
          commands: buildDebugCommands(),
          commandDefinitions: buildDashboardCommandDefinitions(request)
        });
      }
      if (request.method === 'GET' && url.pathname === '/debug/runtime') {
        return sendJson(response, 200, buildRuntimeStatus());
      }
      if (request.method === 'GET' && url.pathname === '/debug/commands') {
        return sendJson(response, 200, buildDashboardCommandDefinitions(request));
      }
      if (request.method === 'POST' && url.pathname === '/debug/commands/run') {
        if (!isLocalRequest(request)) {
          return sendJson(response, 403, { ok: false, reason: 'local-command-execution-only' });
        }
        const body = await readJsonBody(request);
        const result = await runDashboardCommand(body.commandId ?? body.id, body.params ?? {}, request, bridge);
        return sendJson(response, result.ok ? 200 : 500, result);
      }
      if (request.method === 'POST' && url.pathname === '/pair') {
        const body = await readJsonBody(request);
        return sendJson(response, 200, bridge.pair(body.deviceId, body.pairingCode));
      }
      if (request.method === 'GET' && url.pathname === '/device/poll') {
        return sendJson(response, 200, bridge.poll(url.searchParams.get('deviceId'), url.searchParams.get('token')));
      }
      if (request.method === 'POST' && url.pathname === '/device/event') {
        const body = await readJsonBody(request);
        return sendJson(response, 200, bridge.receive(url.searchParams.get('deviceId'), url.searchParams.get('token'), body));
      }
      if (request.method === 'POST' && url.pathname === '/codex/event') {
        const body = await readJsonBody(request);
        return sendJson(response, 200, bridge.publish(body.event ?? body, { deviceId: body.deviceId }));
      }
      if (request.method === 'POST' && url.pathname === '/codex/answer') {
        const body = await readJsonBody(request);
        const event = createAnswerEvent(body.event ?? body);
        const result = bridge.publish(event, { deviceId: body.deviceId });
        return sendJson(response, 200, { ...result, event });
      }
      if (request.method === 'POST' && url.pathname === '/codex/notification') {
        const body = await readJsonBody(request);
        const event = createNotificationEvent(body.event ?? body);
        const result = bridge.publish(event, { deviceId: body.deviceId });
        return sendJson(response, 200, { ...result, event });
      }
      if (request.method === 'POST' && url.pathname === '/codex/choice') {
        const body = await readJsonBody(request);
        const event = createChoiceEvent(body.event ?? body);
        const result = bridge.publish(event, { deviceId: body.deviceId });
        return sendJson(response, 200, { ...result, event });
      }
      if (request.method === 'POST' && url.pathname === '/codex/decision') {
        const body = await readJsonBody(request);
        const event = createChoiceEvent({
          prompt: body.prompt ?? body.question,
          choices: body.choices ?? [
            { id: 'continue', label: body.a ?? '進める' },
            { id: 'revise', label: body.b ?? '修正する' },
            { id: 'hold', label: body.c ?? '保留する' }
          ],
          timeoutSec: body.timeoutSec ?? 300
        });
        const result = bridge.publish(event, { deviceId: body.deviceId });
        return sendJson(response, 200, { ...result, event });
      }
      if (request.method === 'POST' && url.pathname === '/codex/pet') {
        const body = await readJsonBody(request);
        const event = createPetEvent(body.event ?? body);
        const result = bridge.publish(event, { deviceId: body.deviceId });
        return sendJson(response, 200, { ...result, event });
      }
      if (request.method === 'POST' && url.pathname === '/codex/display') {
        const body = await readJsonBody(request);
        const event = createDisplaySettingsEvent(body.event ?? body);
        const result = bridge.publish(event, { deviceId: body.deviceId });
        return sendJson(response, 200, { ...result, event });
      }
      if (request.method === 'GET' && url.pathname === '/codex/session/latest') {
        const latest = readLatestSessionExchange({
          sessionsRoot: options.sessionsRoot,
          phase: url.searchParams.get('phase') ?? 'any',
          mode: url.searchParams.get('mode') ?? 'assistant'
        });
        return sendJson(response, latest.ok ? 200 : 404, redactSessionLatest(latest));
      }
      if (request.method === 'POST' && url.pathname === '/codex/session/publish') {
        const body = await readJsonBody(request);
        const latest = readLatestSessionExchange({
          sessionsRoot: options.sessionsRoot,
          phase: body.phase ?? 'any',
          mode: body.mode ?? 'exchange'
        });
        if (!latest.ok) {
          return sendJson(response, 404, redactSessionLatest(latest));
        }
        const event = createAnswerEvent({
          body: latest.body,
          summary: body.summary ?? latest.summary,
          threadId: `codex-session:${latest.sessionName}`
        });
        const result = bridge.publish(event, { deviceId: body.deviceId });
        return sendJson(response, 200, { ...result, event, latest: redactSessionLatest(latest, { includeBody: false }) });
      }
      if (request.method === 'POST' && url.pathname === '/codex/replay-samples') {
        const body = await readJsonBody(request);
        return sendJson(response, 200, bridge.replaySamples(body));
      }
      if (request.method === 'GET' && url.pathname === '/events') {
        return sendJson(response, 200, bridge.safeEvents());
      }
      sendJson(response, 404, { ok: false, reason: 'not-found' });
    } catch (error) {
      sendJson(response, 500, { ok: false, reason: 'server-error', message: error.message });
    }
  });

  server.on('upgrade', (request, socket) => {
    const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
    if (url.pathname !== '/ws/device') {
      socket.destroy();
      return;
    }
    const key = request.headers['sec-websocket-key'];
    const auth = bridge.attachSocket(url.searchParams.get('deviceId'), url.searchParams.get('token'), socket);
    if (!key || !auth.ok) {
      socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');
      return;
    }
    const accept = crypto
      .createHash('sha1')
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest('base64');
    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '',
      ''
    ].join('\r\n'));
  });

  return server;
}

function sendJson(response, statusCode, payload) {
  const body = `${JSON.stringify(payload)}\n`;
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    ...corsHeaders()
  });
  response.end(body);
}

function sendOptions(response) {
  response.writeHead(204, {
    ...corsHeaders(),
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '600'
  });
  response.end();
}

function sendNoContent(response) {
  response.writeHead(204, {
    'cache-control': 'no-store',
    ...corsHeaders()
  });
  response.end();
}

function sendDashboardAsset(response, requestPath) {
  const relativePath = decodeURIComponent(requestPath.replace(/^\/dashboard\//, ''));
  const filePath = path.resolve(dashboardRoot, relativePath);
  const rootPrefix = `${dashboardRoot}${path.sep}`;
  if (filePath !== dashboardRoot && !filePath.startsWith(rootPrefix)) {
    return sendJson(response, 403, { ok: false, reason: 'forbidden' });
  }
  return sendStaticFile(response, filePath);
}

function sendStaticFile(response, filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return sendJson(response, 404, { ok: false, reason: 'not-found' });
  }
  const extension = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webp': 'image/webp'
  };
  const body = fs.readFileSync(filePath);
  response.writeHead(200, {
    'content-type': contentTypes[extension] ?? 'application/octet-stream',
    'content-length': body.length,
    'cache-control': 'no-store',
    ...corsHeaders()
  });
  response.end(body);
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-private-network': 'true'
  };
}

function buildCurrentPetManifest(selection = {}) {
  const petDir = resolveCurrentPetDirectory(selection);
  const petJsonPath = path.join(petDir, 'pet.json');
  if (!fs.existsSync(petJsonPath)) {
    return {
      ok: false,
      reason: 'pet-json-not-found',
      displayName: 'Fallback Pet',
      frameWidth: 192,
      frameHeight: 208,
      columns: 8,
      rows: 9,
      idleFrames: 4
    };
  }
  let pet;
  try {
    pet = JSON.parse(fs.readFileSync(petJsonPath, 'utf8'));
  } catch (error) {
    return {
      ok: false,
      reason: 'pet-json-parse-failed',
      message: error.message,
      displayName: path.basename(petDir),
      frameWidth: 192,
      frameHeight: 208,
      columns: 8,
      rows: 9,
      idleFrames: 4
    };
  }
  const spritesheetPath = path.resolve(petDir, pet.spritesheetPath ?? 'spritesheet.webp');
  const headerInfo = readLocalPetHeaderInfo();
  const packageName = path.basename(petDir);
  const packageQuery = new URLSearchParams({ package: packageName }).toString();
  return {
    ok: fs.existsSync(spritesheetPath),
    id: pet.id ?? path.basename(petDir),
    packageName,
    displayName: pet.displayName ?? pet.id ?? path.basename(petDir),
    description: pet.description ?? '',
    spritesheetUrl: `/pet/current/spritesheet.webp?${packageQuery}`,
    frameWidth: 192,
    frameHeight: 208,
    columns: 8,
    rows: 9,
    idleFrames: headerInfo.frameCount ?? 6,
    firmwareFrameWidth: headerInfo.frameWidth ?? null,
    firmwareFrameHeight: headerInfo.frameHeight ?? null
  };
}

function resolveCurrentPetSpritesheetPath(selection = {}) {
  const petDir = resolveCurrentPetDirectory(selection);
  const petJsonPath = path.join(petDir, 'pet.json');
  if (!fs.existsSync(petJsonPath)) {
    return null;
  }
  let pet;
  try {
    pet = JSON.parse(fs.readFileSync(petJsonPath, 'utf8'));
  } catch {
    return null;
  }
  const spritesheetPath = path.resolve(petDir, pet.spritesheetPath ?? 'spritesheet.webp');
  const rootPrefix = `${path.resolve(petDir)}${path.sep}`;
  if (!spritesheetPath.startsWith(rootPrefix) || !fs.existsSync(spritesheetPath)) {
    return null;
  }
  return spritesheetPath;
}

function petSelectionFromUrl(url) {
  return {
    packageName: url.searchParams.get('package') ?? url.searchParams.get('pet') ?? '',
    petDir: url.searchParams.get('petDir') ?? ''
  };
}

function resolveCurrentPetDirectory(selection = {}) {
  const root = localPetsRoot();
  if (selection.petDir) {
    const requested = path.resolve(expandPetDirectory(selection.petDir));
    if (isPathInside(requested, root) && fs.existsSync(path.join(requested, 'pet.json'))) {
      return requested;
    }
  }
  if (selection.packageName) {
    const requested = path.resolve(root, selection.packageName);
    if (isPathInside(requested, root) && fs.existsSync(path.join(requested, 'pet.json'))) {
      return requested;
    }
  }
  if (process.env.M5STACK_PET_PACKAGE) {
    return path.resolve(process.env.M5STACK_PET_PACKAGE);
  }
  return path.join(root, 'Mira');
}

function localPetsRoot() {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? '';
  return path.join(home, '.codex', 'pets');
}

function expandPetDirectory(value) {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? '';
  return value
    .replace(/^~/, home)
    .replace(/%USERPROFILE%/gi, process.env.USERPROFILE ?? home)
    .replace(/%HOME%/gi, process.env.HOME ?? home);
}

function isPathInside(candidatePath, rootPath) {
  const root = path.resolve(rootPath);
  const candidate = path.resolve(candidatePath);
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function listLocalPetPackages() {
  const root = localPetsRoot();
  if (!fs.existsSync(root)) {
    return { ok: true, root, packages: [] };
  }
  const packages = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const petDir = path.join(root, entry.name);
      const petJsonPath = path.join(petDir, 'pet.json');
      if (!fs.existsSync(petJsonPath)) {
        return null;
      }
      try {
        const pet = JSON.parse(fs.readFileSync(petJsonPath, 'utf8'));
        return {
          name: entry.name,
          id: pet.id ?? entry.name,
          displayName: pet.displayName ?? pet.id ?? entry.name,
          description: pet.description ?? ''
        };
      } catch {
        return {
          name: entry.name,
          id: entry.name,
          displayName: entry.name,
          description: 'pet.json parse failed'
        };
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  return { ok: true, root, packages };
}

function readLocalPetHeaderInfo() {
  const headerPath = path.join(repoRoot, 'firmware', 'include', 'pet_asset.local.h');
  if (!fs.existsSync(headerPath)) {
    return {};
  }
  const source = fs.readFileSync(headerPath, 'utf8');
  return {
    frameCount: Number(source.match(/PET_ASSET_FRAME_COUNT\s*=\s*(\d+)/)?.[1] ?? 0) || undefined,
    frameWidth: Number(source.match(/PET_ASSET_FRAME_WIDTH\s*=\s*(\d+)/)?.[1] ?? 0) || undefined,
    frameHeight: Number(source.match(/PET_ASSET_FRAME_HEIGHT\s*=\s*(\d+)/)?.[1] ?? 0) || undefined
  };
}

function summarizeDeviceEvent(event) {
  if (!event || typeof event !== 'object') {
    return {};
  }
  if (event.type === 'device.reply_selected') {
    return {
      requestEventId: event.requestEventId,
      choiceId: event.choiceId,
      input: event.input ?? null
    };
  }
  if (event.type === 'device.pet_interacted') {
    return {
      petId: event.petId,
      interaction: event.interaction,
      gesture: event.gesture ?? null,
      target: event.target ?? null,
      screen: event.screen ?? null,
      page: event.page ?? null,
      mood: event.mood ?? null
    };
  }
  if (event.type === 'device.heartbeat') {
    return {
      battery: event.battery ?? null,
      wifiRssi: event.wifiRssi ?? null,
      screen: event.screen ?? null,
      display: event.display ?? null,
      pet: event.pet ?? null
    };
  }
  return {};
}

function summarizeHostEvent(event) {
  if (!event || typeof event !== 'object') {
    return {};
  }
  if (event.type === 'display.settings_updated') {
    return { display: event.display ?? null };
  }
  if (event.type === 'pet.updated') {
    return {
      pet: event.pet ?? null,
      ...(event.display ? { display: event.display } : {})
    };
  }
  return {};
}

function redactSessionLatest(latest, options = {}) {
  if (!latest) {
    return { ok: false, reason: 'no-session-result' };
  }
  if (latest.ok === false) {
    return {
      ok: false,
      reason: latest.reason,
      ...(latest.sessionFile ? { sessionName: path.basename(latest.sessionFile) } : {}),
      ...(latest.message ? { message: latest.message } : {})
    };
  }
  return {
    ok: true,
    sessionName: latest.sessionName,
    phase: latest.phase,
    timestamp: latest.timestamp,
    summary: latest.summary,
    ...(options.includeBody === false ? {} : { body: latest.body }),
    ...(latest.user ? { user: { timestamp: latest.user.timestamp, text: latest.user.text } } : {}),
    signature: latest.signature
  };
}

function buildDebugCommands() {
  return {
    bridgeStartBackground: 'cmd.exe /d /s /c npm run bridge:start:bg -- --host=0.0.0.0 --port=8080',
    bridgeRestartBackground: `cmd.exe /d /s /c npm run bridge:restart:bg -- --host=0.0.0.0 --port=8080 --current-pid ${process.pid}`,
    bridgeStart: 'cmd.exe /d /s /c npm run bridge:start -- --host=0.0.0.0 --port=8080',
    petAsset: 'cmd.exe /d /s /c npm run pet:asset -- --pet-dir %USERPROFILE%\\.codex\\pets\\Mira --output firmware\\include\\pet_asset.local.h',
    petAssetAny: 'cmd.exe /d /s /c npm run pet:asset -- --pet-dir "<local-hatch-pet-package-dir>" --output firmware\\include\\pet_asset.local.h',
    core2Upload: 'cmd.exe /d /s /c npm run firmware:upload:core2',
    core2UploadExplicitPort: 'cmd.exe /d /s /c npm run firmware:upload:core2 -- -UploadPort COM3',
    codexAnswer: 'cmd.exe /d /s /c npm run codex:answer -- --summary "Codex返答表示" --text "Core2に表示するCodex返答本文"',
    codexSessions: 'cmd.exe /d /s /c npm run codex:sessions -- --phase any',
    codexHook: 'cmd.exe /d /s /c npm run codex:hook -- --bridge http://127.0.0.1:8080 --device-id m5stack-sample-001',
    codexChoice: 'cmd.exe /d /s /c npm run codex:choice -- --prompt "次の作業を選んでください" --choices yes:進める,no:止める,other:別案',
    codexDecision: 'cmd.exe /d /s /c npm run codex:decision -- --question "次の作業を選んでください" --a "進める" --b "修正する" --c "保留する"',
    codexDecisionWait: 'cmd.exe /d /s /c npm run codex:decision:wait -- --question "次の作業を選んでください" --a "進める" --b "修正する" --c "保留する" --wait-ms 300000',
    codexNotification: 'cmd.exe /d /s /c npm run codex:notification -- --title "Codex notification" --body "確認が必要な通知です。" --severity info',
    codexDisplay: 'cmd.exe /d /s /c npm run codex:display -- --pet-scale 8 --ui-text-scale 2 --body-text-scale 2 --animation-fps 12 --motion-step-ms 280 --screen-bg "#050b14ff" --pet-bg "#050b14ff" --text-color "#ffffffff" --text-bg "#000000b2" --pet-offset-x 0 --pet-offset-y 0 --text-border-enabled false --text-border-color "#ffffffff" --beep-on-answer true',
    codexClipboard: 'cmd.exe /d /s /c npm run codex:clipboard -- --summary "Codex clipboard answer"',
    codexWatch: 'cmd.exe /d /s /c npm run codex:watch -- --file dist\\codex-answer.txt --once'
  };
}

function buildRuntimeStatus() {
  const recorded = readRuntimeStatusFile();
  return {
    ok: true,
    product: productProfile.repo,
    version: productProfile.version,
    currentProcess: {
      pid: process.pid,
      ppid: process.ppid,
      uptimeSec: Math.round(process.uptime()),
      background: process.env.M5STACK_BRIDGE_BACKGROUND === '1'
    },
    recordedProcess: recorded
      ? {
          ...recorded,
          alive: isPidAlive(recorded.pid)
        }
      : null,
    commandExecution: {
      enabled: true,
      localOnly: true,
      runner: process.platform === 'win32' ? 'cmd-wrapper-v1' : 'direct-npm-v1'
    }
  };
}

function writeRuntimeStatusFile(status) {
  fs.mkdirSync(path.dirname(runtimeStatusPath), { recursive: true });
  fs.writeFileSync(runtimeStatusPath, `${JSON.stringify({
    product: productProfile.repo,
    version: productProfile.version,
    ...status
  }, null, 2)}\n`, 'utf8');
}

function readRuntimeStatusFile() {
  if (!fs.existsSync(runtimeStatusPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(runtimeStatusPath, 'utf8'));
  } catch {
    return null;
  }
}

function isPidAlive(pid) {
  const numericPid = Number(pid);
  if (!Number.isInteger(numericPid) || numericPid <= 0) {
    return false;
  }
  try {
    process.kill(numericPid, 0);
    return true;
  } catch {
    return false;
  }
}

function isLocalRequest(request) {
  const remote = request.socket.remoteAddress ?? '';
  return remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
}

function scheduleBridgeRestart(values) {
  const host = String(values.host || '0.0.0.0');
  const port = String(values.port || '8080');
  const helper = spawn(process.execPath, [
    'tools/restart-bridge-background.mjs',
    '--host', host,
    '--port', port,
    '--current-pid', String(process.pid)
  ], {
    cwd: repoRoot,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      M5STACK_BRIDGE_BACKGROUND: '1'
    }
  });
  helper.unref();
  const numericPort = Number(port);
  writeRuntimeStatusFile({
    pid: process.pid,
    helperPid: helper.pid,
    host,
    port: Number.isFinite(numericPort) ? numericPort : port,
    url: `http://${host}:${port}`,
    healthUrl: `http://127.0.0.1:${port}/health`,
    background: process.env.M5STACK_BRIDGE_BACKGROUND === '1',
    restarting: true,
    requestedAt: new Date().toISOString()
  });
  setTimeout(() => {
    process.exit(0);
  }, 900).unref();
  return {
    ok: true,
    restarting: true,
    currentPid: process.pid,
    helperPid: helper.pid,
    host,
    port: Number.isFinite(numericPort) ? numericPort : port,
    healthUrl: `http://127.0.0.1:${port}/health`,
    message: 'Bridge restart scheduled. Dashboard will reconnect after the background process starts.'
  };
}

function bridgeUrlFromRequest(request) {
  const host = request.headers.host ?? '127.0.0.1:8080';
  return `http://${host.replace(/^0\.0\.0\.0:/, '127.0.0.1:')}`;
}

function buildDashboardCommandDefinitions(request) {
  const bridgeUrl = bridgeUrlFromRequest(request);
  return {
    ok: true,
    localExecutionOnly: true,
    tabs: [
      { id: 'setup', label: '環境構築' },
      { id: 'debug', label: 'デバッグ送信' }
    ],
    commands: [
      {
        id: 'bridgeStartBackground',
        tab: 'setup',
        label: 'Bridge をバックグラウンド起動',
        description: 'PowerShell画面を残さずHost Bridgeを起動します。既に同portで動いている場合は状態確認だけ返します。',
        params: [
          { name: 'host', label: 'host', type: 'text', defaultValue: '0.0.0.0' },
          { name: 'port', label: 'port', type: 'number', defaultValue: '8080' }
        ]
      },
      {
        id: 'bridgeRestartBackground',
        tab: 'setup',
        label: 'Bridge を再起動',
        description: '現在のHost Bridgeを終了し、同じhost/portでバックグラウンド再起動します。Dashboardは数秒後に再接続します。',
        params: [
          { name: 'host', label: 'host', type: 'text', defaultValue: '0.0.0.0' },
          { name: 'port', label: 'port', type: 'number', defaultValue: '8080' }
        ]
      },
      {
        id: 'petAsset',
        tab: 'setup',
        label: 'pet asset 生成',
        description: 'local hatch-pet packageからfirmware/include/pet_asset.local.hを生成します。',
        params: [
          { name: 'petDir', label: 'petDir', type: 'text', defaultValue: '%USERPROFILE%\\.codex\\pets\\Mira' },
          { name: 'output', label: 'output', type: 'text', defaultValue: 'firmware\\include\\pet_asset.local.h' }
        ]
      },
      {
        id: 'core2Upload',
        tab: 'setup',
        label: 'Core2 firmware upload',
        description: 'USB serialを自動検出してCore2へfirmwareを書き込みます。必要な場合だけCOMを明示します。',
        params: [
          { name: 'uploadPort', label: 'uploadPort', type: 'text', defaultValue: '', placeholder: 'COM3' }
        ]
      },
      {
        id: 'codexAnswer',
        tab: 'debug',
        label: 'Answer を送信',
        description: '任意のCodex回答本文をM5Stackへ送ります。',
        params: [
          { name: 'bridge', label: 'bridge', type: 'text', defaultValue: bridgeUrl },
          { name: 'deviceId', label: 'deviceId', type: 'text', defaultValue: productProfile.sampleDeviceId },
          { name: 'summary', label: 'summary', type: 'text', defaultValue: 'GUI command answer' },
          { name: 'text', label: 'text', type: 'textarea', defaultValue: 'GUIから送信したCodex回答です。' }
        ]
      },
      {
        id: 'codexDecision',
        tab: 'debug',
        label: 'ABC Decision を送信',
        description: 'M5StackのA/B/CでCodex側の作業判断を返す三択を送ります。',
        params: [
          { name: 'bridge', label: 'bridge', type: 'text', defaultValue: bridgeUrl },
          { name: 'deviceId', label: 'deviceId', type: 'text', defaultValue: productProfile.sampleDeviceId },
          { name: 'question', label: 'question', type: 'textarea', defaultValue: '次の作業を選んでください。' },
          { name: 'a', label: 'A', type: 'text', defaultValue: '進める' },
          { name: 'b', label: 'B', type: 'text', defaultValue: '修正する' },
          { name: 'c', label: 'C', type: 'text', defaultValue: '保留する' }
        ]
      },
      {
        id: 'codexNotification',
        tab: 'debug',
        label: 'Notification を送信',
        description: '通知イベントをM5Stackへ送ります。Answer / Decision と同じデバッグ送信tabに統合しています。',
        params: [
          { name: 'bridge', label: 'bridge', type: 'text', defaultValue: bridgeUrl },
          { name: 'deviceId', label: 'deviceId', type: 'text', defaultValue: productProfile.sampleDeviceId },
          { name: 'title', label: 'title', type: 'text', defaultValue: 'Codex notification' },
          { name: 'severity', label: 'severity', type: 'select', defaultValue: 'info', options: ['info', 'warning', 'error'] },
          { name: 'body', label: 'body', type: 'textarea', defaultValue: '確認が必要な通知です。' }
        ]
      },
      {
        id: 'codexDisplay',
        tab: 'debug',
        label: '表示設定を送信',
        description: 'pet表示面積、文字サイズ、FPS、RGBA、beep設定をM5Stackへ送ります。',
        params: [
          { name: 'bridge', label: 'bridge', type: 'text', defaultValue: bridgeUrl },
          { name: 'deviceId', label: 'deviceId', type: 'text', defaultValue: productProfile.sampleDeviceId },
          { name: 'petScale', label: 'petScale', type: 'number', defaultValue: '8' },
          { name: 'uiTextScale', label: 'uiTextScale', type: 'number', defaultValue: '2' },
          { name: 'bodyTextScale', label: 'bodyTextScale', type: 'number', defaultValue: '2' },
          { name: 'animationFps', label: 'animationFps', type: 'number', defaultValue: '12' },
          { name: 'motionStepMs', label: 'motionStepMs', type: 'number', defaultValue: '280' },
          { name: 'screenBg', label: 'screenBg', type: 'text', defaultValue: '#050b14ff' },
          { name: 'petBg', label: 'petBg', type: 'text', defaultValue: '#050b14ff' },
          { name: 'textColor', label: 'textColor', type: 'text', defaultValue: '#ffffffff' },
          { name: 'textBg', label: 'textBg', type: 'text', defaultValue: '#000000b2' },
          { name: 'petOffsetX', label: 'petOffsetX', type: 'number', defaultValue: '0' },
          { name: 'petOffsetY', label: 'petOffsetY', type: 'number', defaultValue: '0' },
          { name: 'textBorderEnabled', label: 'textBorderEnabled', type: 'checkbox', defaultValue: false },
          { name: 'textBorderColor', label: 'textBorderColor', type: 'text', defaultValue: '#ffffffff' },
          { name: 'beepOnAnswer', label: 'beepOnAnswer', type: 'checkbox', defaultValue: true },
          { name: 'visualProbe', label: 'visualProbe', type: 'checkbox', defaultValue: true }
        ]
      },
      {
        id: 'codexSessions',
        tab: 'debug',
        label: '最近のCodex sessionを送信',
        description: '最近のCodex sessionの最新やり取りをone-shotでM5Stackへ送ります。',
        params: [
          { name: 'bridge', label: 'bridge', type: 'text', defaultValue: bridgeUrl },
          { name: 'deviceId', label: 'deviceId', type: 'text', defaultValue: productProfile.sampleDeviceId },
          { name: 'phase', label: 'phase', type: 'select', defaultValue: 'any', options: ['any', 'final'] }
        ]
      },
      {
        id: 'sampleReplay',
        tab: 'debug',
        label: 'sample replay',
        description: '代表sample eventをHost Bridge queueへ投入します。',
        params: [
          { name: 'deviceId', label: 'deviceId', type: 'text', defaultValue: productProfile.sampleDeviceId }
        ]
      }
    ]
  };
}

async function runDashboardCommand(commandId, params, request, bridge) {
  const id = String(commandId ?? '');
  const values = normalizeCommandParams(params);
  const bridgeUrl = values.bridge || bridgeUrlFromRequest(request);
  switch (id) {
    case 'bridgeStartBackground':
      return runNodeTool('tools/start-bridge-background.mjs', [
        '--host', values.host || '0.0.0.0',
        '--port', values.port || '8080'
      ], { timeoutMs: 10000 });
    case 'bridgeRestartBackground':
      return scheduleBridgeRestart(values);
    case 'petAsset':
      return runNpmScript('pet:asset', [
        '--pet-dir', expandUserPath(values.petDir || '%USERPROFILE%\\.codex\\pets\\Mira'),
        '--output', values.output || 'firmware\\include\\pet_asset.local.h'
      ], { timeoutMs: 120000 });
    case 'core2Upload': {
      const args = values.uploadPort ? ['-UploadPort', values.uploadPort] : [];
      return runNpmScript('firmware:upload:core2', args, { timeoutMs: 180000 });
    }
    case 'codexAnswer':
      return runNpmScript('codex:answer', [
        '--bridge', bridgeUrl,
        '--device-id', values.deviceId || productProfile.sampleDeviceId,
        '--summary', values.summary || 'GUI command answer',
        '--text', values.text || 'GUIから送信したCodex回答です。'
      ], { timeoutMs: 60000 });
    case 'codexDecision':
      return runNpmScript('codex:decision', [
        '--bridge', bridgeUrl,
        '--device-id', values.deviceId || productProfile.sampleDeviceId,
        '--question', values.question || '次の作業を選んでください。',
        '--a', values.a || '進める',
        '--b', values.b || '修正する',
        '--c', values.c || '保留する'
      ], { timeoutMs: 60000 });
    case 'codexNotification':
      return runNpmScript('codex:notification', [
        '--bridge', bridgeUrl,
        '--device-id', values.deviceId || productProfile.sampleDeviceId,
        '--title', values.title || 'Codex notification',
        '--severity', values.severity || 'info',
        '--body', values.body || '確認が必要な通知です。'
      ], { timeoutMs: 60000 });
    case 'codexDisplay':
      return runNpmScript('codex:display', [
        '--bridge', bridgeUrl,
        '--device-id', values.deviceId || productProfile.sampleDeviceId,
        '--pet-scale', values.petScale || '8',
        '--ui-text-scale', values.uiTextScale || '2',
        '--body-text-scale', values.bodyTextScale || '2',
        '--animation-fps', values.animationFps || '12',
        '--motion-step-ms', values.motionStepMs || '280',
        '--screen-bg', values.screenBg || '#050b14ff',
        '--pet-bg', values.petBg || '#050b14ff',
        '--text-color', values.textColor || '#ffffffff',
        '--text-bg', values.textBg || '#000000b2',
        '--pet-offset-x', values.petOffsetX || '0',
        '--pet-offset-y', values.petOffsetY || '0',
        '--text-border-enabled', String(values.textBorderEnabled ?? false),
        '--text-border-color', values.textBorderColor || '#ffffffff',
        '--beep-on-answer', String(values.beepOnAnswer ?? true),
        '--visual-probe', String(values.visualProbe ?? true)
      ], { timeoutMs: 60000 });
    case 'codexSessions':
      return runNpmScript('codex:sessions', [
        '--once',
        '--bridge', bridgeUrl,
        '--device-id', values.deviceId || productProfile.sampleDeviceId,
        '--phase', values.phase || 'any'
      ], { timeoutMs: 60000 });
    case 'sampleReplay':
      return {
        ok: true,
        command: 'bridge.replaySamples',
        result: bridge.replaySamples({ deviceId: values.deviceId || productProfile.sampleDeviceId })
      };
    default:
      return { ok: false, reason: 'unknown-command', commandId: id };
  }
}

function normalizeCommandParams(params) {
  const out = {};
  if (!params || typeof params !== 'object') {
    return out;
  }
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      out[key] = value.trim();
    } else {
      out[key] = value;
    }
  }
  return out;
}

function expandUserPath(value) {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? '';
  return String(value)
    .replace(/^~/, home)
    .replace(/%USERPROFILE%/gi, process.env.USERPROFILE ?? home)
    .replace(/%HOME%/gi, process.env.HOME ?? home);
}

function runNpmScript(script, args = [], options = {}) {
  if (process.platform === 'win32') {
    return runProcess('cmd.exe', ['/d', '/s', '/c', 'npm', 'run', script, '--', ...args], options);
  }
  return runProcess('npm', ['run', script, '--', ...args], options);
}

function runNodeTool(toolPath, args = [], options = {}) {
  return runProcess(process.execPath, [toolPath, ...args], options);
}

function runProcess(command, args = [], options = {}) {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 60000;
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, {
        cwd: repoRoot,
        env: process.env,
        windowsHide: true
      });
    } catch (error) {
      resolve({
        ok: false,
        command: renderCommand(command, args),
        message: error.message,
        stdout: '',
        stderr: '',
        durationMs: Date.now() - startedAt
      });
      return;
    }
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
      stdout = limitOutput(stdout);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
      stderr = limitOutput(stderr);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        command: renderCommand(command, args),
        message: error.message,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt
      });
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({
        ok: code === 0 && !timedOut,
        command: renderCommand(command, args),
        code,
        signal,
        timedOut,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt
      });
    });
  });
}

function limitOutput(value, maxLength = 12000) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.floor(maxLength / 2))}\n... output truncated ...\n${value.slice(-Math.floor(maxLength / 2))}`;
}

function renderCommand(command, args) {
  return [command, ...args].map((part) => (
    /\s|"/.test(String(part)) ? `"${String(part).replace(/"/g, '\\"')}"` : String(part)
  )).join(' ');
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('request body too large'));
      }
    });
    request.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sendWebSocketText(socket, text) {
  const payload = Buffer.from(text, 'utf8');
  const header = payload.length < 126
    ? Buffer.from([0x81, payload.length])
    : Buffer.from([0x81, 126, payload.length >> 8, payload.length & 0xff]);
  socket.write(Buffer.concat([header, payload]));
}

function decodeWebSocketText(buffer) {
  if (!buffer.length || (buffer[0] & 0x0f) === 0x08) {
    return null;
  }
  let offset = 2;
  let length = buffer[1] & 0x7f;
  if (length === 126) {
    length = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (length === 127) {
    return null;
  }
  const masked = Boolean(buffer[1] & 0x80);
  let mask;
  if (masked) {
    mask = buffer.subarray(offset, offset + 4);
    offset += 4;
  }
  const payload = buffer.subarray(offset, offset + length);
  if (!masked) {
    return payload.toString('utf8');
  }
  const decoded = Buffer.alloc(payload.length);
  for (let index = 0; index < payload.length; index += 1) {
    decoded[index] = payload[index] ^ mask[index % 4];
  }
  return decoded.toString('utf8');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const portArg = process.argv.find((arg) => arg.startsWith('--port='));
  const hostArg = process.argv.find((arg) => arg.startsWith('--host='));
  const port = Number(portArg?.split('=')[1] ?? process.env.PORT ?? 8080);
  const host = hostArg?.split('=')[1] ?? process.env.HOST ?? '0.0.0.0';
  const server = createBridgeHttpServer();
  server.on('error', async (error) => {
    if (error.code !== 'EADDRINUSE') {
      console.error(error);
      process.exit(1);
      return;
    }

    const dashboardUrl = `http://127.0.0.1:${port}/`;
    const health = await readExistingBridgeHealth(port);
    if (health?.ok && health.version === productProfile.version) {
      console.log(`m5stack-codex-pet-notifier bridge is already running on ${dashboardUrl}`);
      console.log(`version=${health.version}; pairedDevices=${health.pairedDevices?.length ?? 0}`);
      console.log('Open the dashboard URL above, or close the existing Bridge window before starting a foreground server.');
      process.exit(0);
      return;
    }

    console.error(`Port ${port} is already in use, so this foreground Bridge cannot start.`);
    if (health?.ok) {
      console.error(`Existing Bridge version: ${health.version ?? 'unknown'} at ${dashboardUrl}`);
      console.error(`Current repository version: ${productProfile.version}`);
    } else {
      console.error(`Another process is listening on ${dashboardUrl}, but it did not answer /health.`);
    }
    console.error('Use start-dashboard.bat to auto-select a beta fallback port, or run:');
    console.error('  cmd.exe /d /s /c npm run bridge:start:bg -- --host=127.0.0.1 --port=18081');
    process.exit(1);
  });
  server.listen(port, host, () => {
    writeRuntimeStatusFile({
      pid: process.pid,
      ppid: process.ppid,
      host,
      port,
      url: `http://${host}:${port}`,
      background: process.env.M5STACK_BRIDGE_BACKGROUND === '1',
      startedAt: new Date().toISOString()
    });
    console.log(`m5stack-codex-pet-notifier bridge listening on http://${host}:${port}`);
  });
}

async function readExistingBridgeHealth(port) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 750);
    const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}
