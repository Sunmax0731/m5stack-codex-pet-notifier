import fs from 'node:fs';
import path from 'node:path';
import { productProfile } from './product-profile.mjs';
import { LocalLanBridge } from '../host-adapter/localLanBridge.mjs';
import { MockM5StackDevice } from '../simulator/mockDevice.mjs';
import { loadSchemas, validateEvent } from '../protocol/validator.mjs';

export function runSuite(suite, options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const schemas = options.schemas ?? loadSchemas();
  const scenarios = suite.scenarios.map((scenario) => runScenario(scenario, { repoRoot, schemas }));
  return {
    product: productProfile.repo,
    version: productProfile.version,
    status: scenarios.every((scenario) => scenario.status === 'passed' || scenario.status === 'expected-failure-detected')
      ? 'passed'
      : 'failed',
    scenarios
  };
}

export function runScenario(scenario, options) {
  const bridge = new LocalLanBridge({ schemas: options.schemas });
  const device = new MockM5StackDevice({
    deviceId: scenario.deviceId ?? productProfile.sampleDeviceId,
    profileId: scenario.profile ?? 'core2'
  });
  const pairing = device.pairWith(bridge);
  if (!pairing.ok) {
    throw new Error(`pairing failed for scenario ${scenario.id}`);
  }

  const resolvedEvents = scenario.events.map((entry) => resolveEvent(entry, options.repoRoot));
  let validEvents = 0;
  let invalidEvents = 0;
  let warningCount = 0;
  let unauthorizedRejected = 0;
  let maxScrollPages = 0;

  if (scenario.authProbe) {
    const probe = bridge.publish(device.deviceId, resolvedEvents[0], 'wrong-token');
    if (!probe.ok && probe.reason === 'invalid-token') {
      unauthorizedRejected += 1;
    }
  }

  for (const event of resolvedEvents) {
    const validation = validateEvent(event, options.schemas);
    warningCount += validation.warnings.length;
    if (!validation.valid) {
      invalidEvents += 1;
      continue;
    }

    validEvents += 1;
    if (event.type.startsWith('device.')) {
      bridge.receiveDeviceEvent(device.deviceId, event, device.token);
    } else {
      bridge.publish(device.deviceId, event, device.token);
      maxScrollPages = Math.max(maxScrollPages, device.answerPages.length);
    }
  }

  let replyCount = 0;
  let interactionCount = 0;
  let heartbeatCount = 0;
  for (const action of scenario.actions ?? []) {
    if (action === 'scroll-down') {
      device.scroll('down');
    }
    if (action === 'select-yes') {
      const result = bridge.receiveDeviceEvent(device.deviceId, device.selectChoice('yes'), device.token);
      if (result.ok) {
        replyCount += 1;
      }
    }
    if (action === 'pet-interact') {
      const result = bridge.receiveDeviceEvent(device.deviceId, device.interactWithPet(), device.token);
      if (result.ok) {
        interactionCount += 1;
      }
    }
    if (action === 'pet-long-press') {
      const result = bridge.receiveDeviceEvent(device.deviceId, device.interactWithPet({
        interaction: 'long-press',
        gesture: 'long-press',
        target: 'pet'
      }), device.token);
      if (result.ok) {
        interactionCount += 1;
      }
    }
    if (action === 'heartbeat') {
      const result = bridge.receiveDeviceEvent(device.deviceId, device.heartbeat(), device.token);
      if (result.ok) {
        heartbeatCount += 1;
      }
    }
  }

  const expectedInvalid = Boolean(scenario.expectInvalid);
  const status = invalidEvents > 0
    ? (expectedInvalid ? 'expected-failure-detected' : 'failed')
    : 'passed';

  return {
    id: scenario.id,
    status,
    profile: device.profile.id,
    profileCovered: Boolean(device.profile.inputMap.petInteract),
    validEvents,
    invalidEvents,
    warningCount,
    replyCount,
    interactionCount,
    heartbeatCount,
    unauthorizedRejected,
    finalScreen: device.screen,
    scrollPages: maxScrollPages || device.answerPages.length,
    securityBoundary: bridge.getEventLogSummary().persistentMessageBodies === false && unauthorizedRejected > 0,
    screenSnapshots: device.snapshots.length
  };
}

function resolveEvent(entry, repoRoot) {
  if (entry.sample) {
    return JSON.parse(fs.readFileSync(path.join(repoRoot, 'samples', entry.sample), 'utf8'));
  }
  return entry.event;
}
