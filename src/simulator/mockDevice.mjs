import { productProfile } from '../core/product-profile.mjs';
import { getDeviceProfile } from '../device-adapter/deviceProfiles.mjs';
import { moveScroll, paginateAnswer } from '../protocol/scrollModel.mjs';

export class MockM5StackDevice {
  constructor(options = {}) {
    this.deviceId = options.deviceId ?? productProfile.sampleDeviceId;
    this.profile = getDeviceProfile(options.profileId ?? 'core2');
    this.token = null;
    this.screen = 'Pairing';
    this.pet = null;
    this.unread = 0;
    this.answerPages = [];
    this.currentPage = 0;
    this.currentChoiceRequest = null;
    this.displaySettings = {
      petScale: 2,
      uiTextScale: 1,
      bodyTextScale: 1,
      animationFps: 12
    };
    this.snapshots = [];
  }

  pairWith(bridge, pairingCode = productProfile.defaultPairingCode) {
    bridge.attachDevice(this);
    const result = bridge.pairDevice(this.deviceId, pairingCode);
    if (result.ok) {
      this.token = result.token;
      this.screen = 'Idle';
      this.recordSnapshot('paired');
    }
    return result;
  }

  receive(event) {
    if (event.type === 'pet.updated') {
      this.pet = event.pet;
      this.screen = 'Idle';
    }
    if (event.type === 'notification.created') {
      this.unread += 1;
      this.screen = 'Notification';
    }
    if (event.type === 'answer.completed') {
      this.answerPages = paginateAnswer(event.body);
      this.currentPage = 0;
      this.screen = 'Answer';
    }
    if (event.type === 'prompt.choice_requested') {
      this.currentChoiceRequest = event;
      this.screen = 'Choice';
    }
    if (event.type === 'display.settings_updated') {
      this.displaySettings = event.display;
    }
    this.recordSnapshot(event.type);
  }

  selectChoice(choiceId = 'yes') {
    if (!this.currentChoiceRequest) {
      throw new Error('no choice request is active');
    }
    const choiceIndex = this.currentChoiceRequest.choices.findIndex((choice) => choice.id === choiceId);
    const input = ['choiceA', 'choiceB', 'choiceC'][Math.max(0, choiceIndex)];
    return {
      type: 'device.reply_selected',
      eventId: `evt-reply-${choiceId}`,
      createdAt: '2026-05-09T00:00:10+09:00',
      deviceId: this.deviceId,
      requestEventId: this.currentChoiceRequest.eventId,
      choiceId,
      input: this.profile.inputMap[input]
    };
  }

  interactWithPet() {
    const interaction = this.profile.touch ? 'touch' : 'button-long-press';
    return {
      type: 'device.pet_interacted',
      eventId: 'evt-pet-interacted-001',
      createdAt: '2026-05-09T00:00:11+09:00',
      deviceId: this.deviceId,
      petId: this.pet?.id ?? 'fallback-pet',
      interaction
    };
  }

  heartbeat() {
    return {
      type: 'device.heartbeat',
      eventId: 'evt-heartbeat-001',
      createdAt: '2026-05-09T00:00:12+09:00',
      deviceId: this.deviceId,
      battery: 88,
      wifiRssi: -48,
      screen: this.screen
    };
  }

  scroll(direction) {
    this.currentPage = moveScroll(this.currentPage, direction, this.answerPages.length);
    this.recordSnapshot(`scroll-${direction}`);
  }

  recordSnapshot(trigger) {
    this.snapshots.push({
      trigger,
      screen: this.screen,
      profile: this.profile.id,
      petId: this.pet?.id ?? null,
      unread: this.unread,
      answerPages: this.answerPages.length,
      currentPage: this.currentPage,
      displaySettings: this.displaySettings
    });
  }
}
