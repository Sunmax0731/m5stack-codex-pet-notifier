import cp from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { productProfile } from '../core/product-profile.mjs';
import {
  createAnswerEvent,
  createChoiceEvent,
  createDisplaySettingsEvent,
  createNotificationEvent,
  createPetEvent
} from './eventFactory.mjs';

const defaultBridgeUrl = 'http://127.0.0.1:8080';

export async function runRelayCli(argv = process.argv.slice(2), options = {}) {
  const [command = 'help', ...rest] = argv;
  const args = parseArgs(rest);
  if (command === 'help' || args.help) {
    const help = buildHelp();
    options.stdout?.write?.(help);
    return { ok: true, help };
  }

  if (command === 'watch') {
    return watchFileRelay(args, options);
  }

  const event = await buildEvent(command, args, options);
  const result = await sendCodexEvent({
    bridgeUrl: args.bridge ?? args.url ?? process.env.HOST_BRIDGE_URL ?? defaultBridgeUrl,
    deviceId: args['device-id'] ?? args.deviceId ?? productProfile.sampleDeviceId,
    event,
    fetchImpl: options.fetchImpl ?? fetch
  });
  options.stdout?.write?.(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

export async function sendCodexEvent({ bridgeUrl = defaultBridgeUrl, deviceId = productProfile.sampleDeviceId, event, fetchImpl = fetch }) {
  const response = await fetchImpl(new URL('/codex/event', bridgeUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceId, event })
  });
  const body = await response.json();
  if (!response.ok || body.ok !== true) {
    throw new Error(`codex relay failed: ${JSON.stringify(body)}`);
  }
  return {
    ok: true,
    deviceId,
    type: event.type,
    eventId: event.eventId,
    bridge: bridgeUrl,
    result: body
  };
}

export async function buildEvent(command, args, options = {}) {
  if (command === 'answer') {
    return createAnswerEvent({
      body: await resolveText(args, options),
      summary: args.summary,
      threadId: args.thread ?? args.threadId,
      eventId: args['event-id'] ?? args.eventId
    });
  }
  if (command === 'clipboard') {
    return createAnswerEvent({
      body: options.readClipboard ? options.readClipboard() : readClipboard(),
      summary: args.summary ?? 'Codex clipboard answer',
      threadId: args.thread ?? args.threadId,
      eventId: args['event-id'] ?? args.eventId
    });
  }
  if (command === 'notification') {
    return createNotificationEvent({
      title: args.title,
      body: await resolveText(args, options),
      severity: args.severity,
      threadId: args.thread ?? args.threadId,
      eventId: args['event-id'] ?? args.eventId
    });
  }
  if (command === 'choice') {
    return createChoiceEvent({
      prompt: args.prompt ?? await resolveText(args, options),
      choices: args.choices,
      timeoutSec: args.timeout ?? args.timeoutSec,
      threadId: args.thread ?? args.threadId,
      eventId: args['event-id'] ?? args.eventId
    });
  }
  if (command === 'pet') {
    return createPetEvent({
      petId: args['pet-id'] ?? args.petId,
      name: args.name,
      state: args.state,
      spriteRef: args.sprite ?? args.spriteRef,
      fallbackState: args.fallback
    });
  }
  if (command === 'display') {
    return createDisplaySettingsEvent({
      petScale: args['pet-scale'] ?? args.petScale,
      uiTextScale: args['ui-text-scale'] ?? args.uiTextScale,
      bodyTextScale: args['body-text-scale'] ?? args.bodyTextScale,
      animationFps: args['animation-fps'] ?? args.animationFps,
      eventId: args['event-id'] ?? args.eventId
    });
  }
  throw new Error(`unknown relay command: ${command}`);
}

async function watchFileRelay(args, options = {}) {
  const filePath = args.file;
  if (!filePath) {
    throw new Error('--file is required for watch');
  }
  const bridgeUrl = args.bridge ?? args.url ?? process.env.HOST_BRIDGE_URL ?? defaultBridgeUrl;
  const deviceId = args['device-id'] ?? args.deviceId ?? productProfile.sampleDeviceId;
  const intervalMs = Number(args.interval ?? 1000);
  let lastText = '';

  async function publishIfChanged() {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const text = fs.readFileSync(filePath, 'utf8').trim();
    if (!text || text === lastText) {
      return null;
    }
    lastText = text;
    const event = createAnswerEvent({
      body: text,
      summary: args.summary ?? 'Codex watched answer',
      threadId: args.thread ?? args.threadId
    });
    const result = await sendCodexEvent({ bridgeUrl, deviceId, event, fetchImpl: options.fetchImpl ?? fetch });
    options.stdout?.write?.(`${JSON.stringify(result, null, 2)}\n`);
    return result;
  }

  if (args.once) {
    return publishIfChanged();
  }

  await publishIfChanged();
  fs.watchFile(filePath, { interval: intervalMs }, () => {
    publishIfChanged().catch((error) => {
      options.stderr?.write?.(`${error.message}\n`);
    });
  });
  options.stdout?.write?.(`watching ${filePath}\n`);
  return new Promise(() => {});
}

async function resolveText(args, options = {}) {
  if (args.text ?? args.body) {
    return String(args.text ?? args.body);
  }
  if (args.file) {
    return fs.readFileSync(args.file, 'utf8');
  }
  const stdin = options.stdin ?? process.stdin;
  if (stdin.isTTY) {
    throw new Error('provide --text, --file, or pipe text to stdin');
  }
  return readStream(stdin);
}

export function readClipboard() {
  const result = cp.spawnSync('powershell', ['-NoProfile', '-Command', [
    '$text = Get-Clipboard -Raw -Format Text;',
    'if ($null -eq $text) { $text = ""; }',
    '$bytes = [System.Text.Encoding]::UTF8.GetBytes($text);',
    '[Console]::Out.Write([System.Convert]::ToBase64String($bytes));'
  ].join(' ')], {
    encoding: 'utf8',
    windowsHide: true
  });
  if (result.status !== 0) {
    throw new Error(`Get-Clipboard failed: ${result.stderr}`);
  }
  const text = Buffer.from(result.stdout.trim(), 'base64').toString('utf8');
  if (!text.trim()) {
    throw new Error('clipboard text is empty or not available as text');
  }
  return text;
}

function readStream(stream) {
  return new Promise((resolve, reject) => {
    let data = '';
    stream.setEncoding?.('utf8');
    stream.on('data', (chunk) => {
      data += chunk;
    });
    stream.on('end', () => resolve(data));
    stream.on('error', reject);
  });
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const normalized = token.slice(2);
    const inline = normalized.indexOf('=');
    if (inline >= 0) {
      args[normalized.slice(0, inline)] = normalized.slice(inline + 1);
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[normalized] = true;
    } else {
      args[normalized] = next;
      index += 1;
    }
  }
  return args;
}

function buildHelp() {
  return [
    'Codex relay commands:',
    '  answer --text "..." [--summary "..."]',
    '  clipboard [--summary "..."]',
    '  notification --title "..." --text "..."',
    '  choice --prompt "..." --choices yes:Yes,no:No,other:Other',
    '  pet --name "Codex Pet" --state review',
    '  display --pet-scale 8 --ui-text-scale 2 --body-text-scale 2 --animation-fps 12',
    '  watch --file .\\dist\\codex-answer.txt',
    '',
    'Common options: --bridge http://127.0.0.1:8080 --device-id m5stack-sample-001',
    ''
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runRelayCli(process.argv.slice(2), { stdin: process.stdin, stdout: process.stdout, stderr: process.stderr })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
