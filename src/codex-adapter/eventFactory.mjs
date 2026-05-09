import crypto from 'node:crypto';
import { moodFromPetState, normalizePetMood, normalizePetState } from '../core/pet-mood.mjs';

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
  const display = options.display && typeof options.display === 'object'
    ? normalizeDisplaySettings(options.display)
    : null;
  const state = normalizePetState(options.state ?? 'review', 'review');
  const mood = normalizePetMood(options.mood, moodFromPetState(state));
  return {
    type: 'pet.updated',
    eventId: options.eventId ?? generatedId('evt-pet'),
    createdAt: options.createdAt ?? new Date().toISOString(),
    pet: {
      id: options.petId ?? 'codex-pet',
      name: options.name ?? 'Codex Pet',
      state,
      mood,
      spriteRef: options.spriteRef ?? 'host://pet/codex-default',
      ...(options.fallbackState ? { fallbackState: options.fallbackState } : {})
    },
    ...(display ? { display } : {})
  };
}

export function createDisplaySettingsEvent(options = {}) {
  return {
    type: 'display.settings_updated',
    eventId: options.eventId ?? generatedId('evt-display'),
    createdAt: options.createdAt ?? new Date().toISOString(),
    display: normalizeDisplaySettings(options)
  };
}

function normalizeDisplaySettings(options = {}) {
  return {
    petScale: clampInteger(options.petScale, 1, 32, 2),
    uiTextScale: clampInteger(options.uiTextScale, 1, 8, 1),
    bodyTextScale: clampInteger(options.bodyTextScale, 1, 8, 1),
    animationFps: clampInteger(options.animationFps, 4, 20, 12),
    motionStepMs: clampInteger(options.motionStepMs, 120, 800, 280),
    screenBackgroundRgba: normalizeRgba(options.screenBackgroundRgba ?? options.screenBg ?? options.screenBackground, {
      r: 5,
      g: 11,
      b: 20,
      a: 255
    }),
    petBackgroundRgba: normalizeRgba(options.petBackgroundRgba ?? options.petBg ?? options.petBackground, {
      r: 5,
      g: 11,
      b: 20,
      a: 255
    }),
    textColorRgba: normalizeRgba(options.textColorRgba ?? options.textColor, {
      r: 255,
      g: 255,
      b: 255,
      a: 255
    }),
    textBackgroundRgba: normalizeRgba(options.textBackgroundRgba ?? options.textBg ?? options.textBackground, {
      r: 0,
      g: 0,
      b: 0,
      a: 178
    }),
    petOffsetX: clampInteger(options.petOffsetX ?? options.petX, -1280, 1280, 0),
    petOffsetY: clampInteger(options.petOffsetY ?? options.petY, -960, 960, 0),
    textBorderEnabled: normalizeBoolean(options.textBorderEnabled ?? options.textBorder, false),
    textBorderRgba: normalizeRgba(options.textBorderRgba ?? options.textBorderColor, {
      r: 255,
      g: 255,
      b: 255,
      a: 255
    }),
    beepOnAnswer: normalizeBoolean(options.beepOnAnswer, true),
    visualProbe: normalizeBoolean(options.visualProbe, false)
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

function normalizeRgba(value, fallback) {
  if (typeof value === 'string') {
    const parsed = parseRgbaString(value);
    return parsed ?? fallback;
  }
  if (value && typeof value === 'object') {
    return {
      r: clampInteger(value.r, 0, 255, fallback.r),
      g: clampInteger(value.g, 0, 255, fallback.g),
      b: clampInteger(value.b, 0, 255, fallback.b),
      a: clampInteger(value.a, 0, 255, fallback.a)
    };
  }
  return fallback;
}

function parseRgbaString(value) {
  const text = value.trim();
  const hex = text.startsWith('#') ? text.slice(1) : text;
  if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) : 255
    };
  }
  const channels = text.split(',').map((part) => Number(part.trim()));
  if (channels.length >= 3 && channels.every(Number.isFinite)) {
    return {
      r: clampInteger(channels[0], 0, 255, 0),
      g: clampInteger(channels[1], 0, 255, 0),
      b: clampInteger(channels[2], 0, 255, 0),
      a: clampInteger(channels[3], 0, 255, 255)
    };
  }
  return null;
}

function normalizeBoolean(value, fallback) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (/^(true|1|yes|on)$/i.test(value.trim())) {
      return true;
    }
    if (/^(false|0|no|off)$/i.test(value.trim())) {
      return false;
    }
  }
  return fallback;
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
