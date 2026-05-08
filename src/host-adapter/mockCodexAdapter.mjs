export class MockCodexAdapter {
  constructor(events = []) {
    this.events = events;
    this.replyLog = [];
    this.interactionLog = [];
  }

  enqueue(event) {
    this.events.push(event);
  }

  drainEvents() {
    const drained = [...this.events];
    this.events.length = 0;
    return drained;
  }

  acceptDeviceEvent(event) {
    if (event.type === 'device.reply_selected') {
      this.replyLog.push({
        requestEventId: event.requestEventId,
        choiceId: event.choiceId,
        deviceId: event.deviceId
      });
      return { ok: true, routedTo: 'replyLog' };
    }
    if (event.type === 'device.pet_interacted') {
      this.interactionLog.push({
        petId: event.petId,
        interaction: event.interaction,
        deviceId: event.deviceId
      });
      return { ok: true, routedTo: 'interactionLog' };
    }
    return { ok: false, reason: 'unsupported-device-event' };
  }
}
