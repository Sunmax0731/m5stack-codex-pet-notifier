import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAnswerEvent, createNotificationEvent } from '../codex-adapter/eventFactory.mjs';
import { productProfile } from '../core/product-profile.mjs';
import { loadSchemas, validateEvent } from '../protocol/validator.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const hostToDeviceTypes = new Set([
  'pet.updated',
  'notification.created',
  'answer.completed',
  'prompt.choice_requested'
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
      target.queue.push(event);
      this.outboundLog.push({
        deviceId: target.deviceId,
        type: event.type,
        eventId: event.eventId,
        warnings: validation.warnings
      });
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
    return { ok: true, validation };
  }

  replaySamples(options = {}) {
    const sampleNames = options.samples ?? [
      'pet-update-event.json',
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

export function createBridgeHttpServer(bridge = new LanHostBridge()) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
      if (request.method === 'GET' && url.pathname === '/health') {
        return sendJson(response, 200, { ok: true, ...bridge.summary() });
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
      if (request.method === 'POST' && url.pathname === '/codex/replay-samples') {
        const body = await readJsonBody(request);
        return sendJson(response, 200, bridge.replaySamples(body));
      }
      if (request.method === 'GET' && url.pathname === '/events') {
        return sendJson(response, 200, {
          ok: true,
          outbound: bridge.outboundLog,
          inbound: bridge.inboundLog.map((entry) => ({
            deviceId: entry.deviceId,
            type: entry.type,
            eventId: entry.eventId
          })),
          security: bridge.securityLog
        });
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
    'content-length': Buffer.byteLength(body)
  });
  response.end(body);
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
  server.listen(port, host, () => {
    console.log(`m5stack-codex-pet-notifier bridge listening on http://${host}:${port}`);
  });
}
