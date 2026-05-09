import crypto from 'node:crypto';

const maxAnswerBodyLength = 4000;
const maxNotificationBodyLength = 600;

function assertText(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }
  return value.trim();
}

function truncate(value, maxLength) {
  const text = assertText(value, 'text');
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function generatedId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

export function createAnswerEvent(options = {}) {
  const body = truncate(options.body ?? options.text, maxAnswerBodyLength);
  const summary = truncate(options.summary ?? firstLine(body), 120);
  return {
    type: 'answer.completed',
    eventId: options.eventId ?? generatedId('evt-answer'),
    createdAt: options.createdAt ?? new Date().toISOString(),
    threadId: options.threadId ?? 'thread-codex-relay',
    summary,
    body
  };
}

export function createNotificationEvent(options = {}) {
  return {
    type: 'notification.created',
    eventId: options.eventId ?? generatedId('evt-notification'),
    createdAt: options.createdAt ?? new Date().toISOString(),
    severity: options.severity ?? 'info',
    title: truncate(options.title ?? 'Codex notification', 80),
    body: truncate(options.body ?? options.text, maxNotificationBodyLength),
    ...(options.threadId ? { threadId: options.threadId } : {})
  };
}

export function createChoiceEvent(options = {}) {
  const choices = normalizeChoices(options.choices);
  return {
    type: 'prompt.choice_requested',
    eventId: options.eventId ?? generatedId('evt-choice'),
    createdAt: options.createdAt ?? new Date().toISOString(),
    threadId: options.threadId ?? 'thread-codex-relay',
    prompt: truncate(options.prompt ?? 'Choose a reply', 180),
    choices,
    timeoutSec: Number(options.timeoutSec ?? 300)
  };
}

export function createPetEvent(options = {}) {
  return {
    type: 'pet.updated',
    eventId: options.eventId ?? generatedId('evt-pet'),
    createdAt: options.createdAt ?? new Date().toISOString(),
    pet: {
      id: options.petId ?? 'codex-pet',
      name: options.name ?? 'Codex Pet',
      state: options.state ?? 'review',
      spriteRef: options.spriteRef ?? 'host://pet/codex-default',
      ...(options.fallbackState ? { fallbackState: options.fallbackState } : {})
    }
  };
}

export function createDisplaySettingsEvent(options = {}) {
  return {
    type: 'display.settings_updated',
    eventId: options.eventId ?? generatedId('evt-display'),
    createdAt: options.createdAt ?? new Date().toISOString(),
    display: {
      petScale: clampInteger(options.petScale, 1, 8, 2),
      uiTextScale: clampInteger(options.uiTextScale, 1, 8, 1),
      bodyTextScale: clampInteger(options.bodyTextScale, 1, 8, 1),
      animationFps: clampInteger(options.animationFps, 4, 20, 12),
      motionStepMs: clampInteger(options.motionStepMs, 120, 800, 280)
    }
  };
}

function firstLine(value) {
  return value.split(/\r?\n/).find((line) => line.trim().length > 0) ?? 'Codex answer';
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function normalizeChoices(value) {
  const raw = Array.isArray(value) ? value : String(value ?? 'yes:Yes,no:No,other:Other').split(',');
  return raw.slice(0, 3).map((entry, index) => {
    if (typeof entry === 'object' && entry !== null) {
      return {
        id: assertText(entry.id ?? `choice-${index + 1}`, 'choice.id'),
        label: assertText(entry.label ?? entry.id ?? `Choice ${index + 1}`, 'choice.label')
      };
    }
    const [id, ...labelParts] = String(entry).split(':');
    return {
      id: assertText(id || `choice-${index + 1}`, 'choice.id'),
      label: assertText(labelParts.join(':') || id || `Choice ${index + 1}`, 'choice.label')
    };
  });
}
