import fs from 'node:fs';

const schemaRoot = new URL('../../schemas/events/', import.meta.url);

export function loadSchemas(rootUrl = schemaRoot) {
  const schemas = new Map();
  for (const entry of fs.readdirSync(rootUrl, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }
    const schema = JSON.parse(fs.readFileSync(new URL(entry.name, rootUrl), 'utf8'));
    schemas.set(schema.$id, schema);
  }
  return schemas;
}

export function validateEvent(event, schemas = loadSchemas()) {
  const errors = [];
  const warnings = [];
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return { valid: false, errors: ['event must be an object'], warnings };
  }

  const eventType = event.type;
  const schema = schemas.get(eventType);
  if (!schema) {
    return { valid: false, errors: [`unknown event type: ${eventType ?? '(missing)'}`], warnings };
  }

  validateAgainstSchema(event, schema, '$', errors);
  addProtocolWarnings(event, warnings);
  return { valid: errors.length === 0, errors, warnings };
}

function validateAgainstSchema(value, schema, location, errors) {
  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${location} must be ${JSON.stringify(schema.const)}`);
    return;
  }

  if (schema.type) {
    const actual = jsonType(value);
    if (actual !== schema.type) {
      errors.push(`${location} must be ${schema.type}, got ${actual}`);
      return;
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${location} must be one of ${schema.enum.join(', ')}`);
  }

  if (schema.type === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${location} must have length >= ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${location} must have length <= ${schema.maxLength}`);
    }
  }

  if (schema.type === 'integer') {
    if (!Number.isInteger(value)) {
      errors.push(`${location} must be an integer`);
    }
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${location} must be >= ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${location} must be <= ${schema.maximum}`);
    }
  }

  if (schema.type === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${location} must have at least ${schema.minItems} item(s)`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${location} must have at most ${schema.maxItems} item(s)`);
    }
    if (schema.items) {
      value.forEach((item, index) => validateAgainstSchema(item, schema.items, `${location}[${index}]`, errors));
    }
  }

  if (schema.type === 'object') {
    for (const key of schema.required ?? []) {
      if (!(key in value)) {
        errors.push(`${location}.${key} is required`);
      }
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (key in value) {
        validateAgainstSchema(value[key], childSchema, `${location}.${key}`, errors);
      }
    }
  }
}

function addProtocolWarnings(event, warnings) {
  if (event.type === 'answer.completed' && String(event.body ?? '').length > 140) {
    warnings.push('long-answer-scroll-required');
  }
  if (event.type === 'notification.created' && String(event.body ?? '').length > 120) {
    warnings.push('notification-body-will-be-paged');
  }
  if (event.type === 'pet.updated' && String(event.pet?.spriteRef ?? '').startsWith('http://')) {
    warnings.push('insecure-external-sprite-ref');
  }
}

function jsonType(value) {
  if (Array.isArray(value)) {
    return 'array';
  }
  if (Number.isInteger(value)) {
    return 'integer';
  }
  return typeof value;
}
