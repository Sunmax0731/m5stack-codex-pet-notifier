export const petMoodValues = [
  'idle',
  'listening',
  'thinking',
  'happy',
  'surprised',
  'confused',
  'sleepy',
  'worried',
  'alert',
  'proud'
];

export const petStateValues = [
  'idle',
  'waiting',
  'running',
  'failed',
  'review',
  'reacting',
  'celebrate',
  'listening',
  'thinking',
  'happy',
  'surprised',
  'confused',
  'sleepy',
  'worried',
  'alert',
  'proud'
];

const stateMoodMap = new Map([
  ['idle', 'idle'],
  ['waiting', 'listening'],
  ['running', 'thinking'],
  ['failed', 'alert'],
  ['review', 'confused'],
  ['reacting', 'happy'],
  ['celebrate', 'proud']
]);

const hostEventMoodMap = new Map([
  ['pet.updated', 'idle'],
  ['notification.created', 'surprised'],
  ['answer.completed', 'happy'],
  ['prompt.choice_requested', 'confused'],
  ['display.settings_updated', 'proud']
]);

export function normalizePetMood(value, fallback = 'idle') {
  const text = String(value ?? '').trim().toLowerCase();
  return petMoodValues.includes(text) ? text : fallback;
}

export function normalizePetState(value, fallback = 'idle') {
  const text = String(value ?? '').trim().toLowerCase();
  return petStateValues.includes(text) ? text : fallback;
}

export function moodFromPetState(state = 'idle') {
  const normalized = normalizePetState(state, 'idle');
  return stateMoodMap.get(normalized) ?? normalizePetMood(normalized, 'idle');
}

export function moodFromHostEventType(type = '') {
  return hostEventMoodMap.get(String(type)) ?? 'idle';
}
