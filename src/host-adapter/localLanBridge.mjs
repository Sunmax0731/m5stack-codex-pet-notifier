import { productProfile } from '../core/product-profile.mjs';
import { createChoiceEvent } from '../codex-adapter/eventFactory.mjs';
import { validateEvent } from '../protocol/validator.mjs';

export class LocalLanBridge {
  constructor(options = {}) {
    this.pairingCode = options.pairingCode ?? productProfile.defaultPairingCode;
    this.schemas = options.schemas;
    this.devices = new Map();
    this.outboundLog = [];
    this.inboundLog = [];
    this.securityLog = [];
  }

  attachDevice(device) {
    this.devices.set(device.deviceId, {
      device,
      token: null,
      paired: false
    });
  }

  pairDevice(deviceId, pairingCode) {
    const record = this.devices.get(deviceId);
    if (!record) {
      throw new Error(`device is not attached: ${deviceId}`);
    }
    if (pairingCode !== this.pairingCode) {
      this.securityLog.push({ kind: 'pairing-rejected', deviceId });
      return { ok: false, reason: 'invalid-pairing-code' };
    }
    const token = `paired-${deviceId}-local-token`;
    record.token = token;
    record.paired = true;
    return { ok: true, token };
  }

  publish(deviceId, event, token) {
    const auth = this.checkToken(deviceId, token);
    if (!auth.ok) {
      return auth;
    }

    const validation = validateEvent(event, this.schemas);
    if (!validation.valid) {
      return { ok: false, reason: 'invalid-event', validation };
    }

    const record = this.devices.get(deviceId);
    record.device.receive(event);
    this.outboundLog.push({ deviceId, type: event.type, eventId: event.eventId, warnings: validation.warnings });
    return { ok: true, validation };
  }

  receiveDeviceEvent(deviceId, event, token) {
    const auth = this.checkToken(deviceId, token);
    if (!auth.ok) {
      return auth;
    }

    const validation = validateEvent(event, this.schemas);
    if (!validation.valid) {
      return { ok: false, reason: 'invalid-event', validation };
    }

    const allowed = ['device.reply_selected', 'device.pet_interacted', 'device.heartbeat'];
    if (!allowed.includes(event.type)) {
      return { ok: false, reason: 'device-event-type-not-allowed' };
    }

    this.inboundLog.push({ deviceId, type: event.type, eventId: event.eventId, warnings: validation.warnings });
    if (event.type === 'device.pet_interacted' && ['long-press', 'button-long-press'].includes(event.interaction)) {
      const choiceEvent = createChoiceEvent({
        prompt: 'M5Stack から長押しされました。次のCodex作業を選んでください。',
        choices: 'continue:進める,revise:修正する,hold:保留する'
      });
      const choiceValidation = validateEvent(choiceEvent, this.schemas);
      if (choiceValidation.valid) {
        const record = this.devices.get(deviceId);
        record.device.receive(choiceEvent);
        this.outboundLog.push({ deviceId, type: choiceEvent.type, eventId: choiceEvent.eventId, warnings: choiceValidation.warnings });
      }
    }
    return { ok: true, validation };
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

  getEventLogSummary() {
    return {
      outboundEvents: this.outboundLog.length,
      inboundEvents: this.inboundLog.length,
      securityRejections: this.securityLog.length,
      persistentMessageBodies: false
    };
  }
}
