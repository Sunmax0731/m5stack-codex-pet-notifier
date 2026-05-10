export const deviceProfiles = {
  core2: {
    id: 'core2',
    label: 'M5Stack Core2',
    releaseTarget: true,
    screen: { width: 320, height: 240 },
    touch: true,
    inputMap: {
      choiceA: 'touch-button-a',
      choiceB: 'touch-button-b',
      choiceC: 'touch-button-c',
      petInteract: 'touch-pet-area',
      scrollUp: 'swipe-down',
      scrollDown: 'swipe-up',
      back: 'top-left-touch'
    }
  },
  gray: {
    id: 'gray',
    label: 'GRAY reference profile (out of release scope)',
    releaseTarget: false,
    scope: 'reference-preview-only',
    screen: { width: 320, height: 240 },
    touch: false,
    inputMap: {
      choiceA: 'button-a',
      choiceB: 'button-b',
      choiceC: 'button-c',
      petInteract: 'button-b-long-press',
      scrollUp: 'button-a-in-scroll-mode',
      scrollDown: 'button-c-in-scroll-mode',
      back: 'button-b-long-press'
    }
  }
};

export function getDeviceProfile(profileId) {
  const profile = deviceProfiles[profileId];
  if (!profile) {
    throw new Error(`unknown device profile: ${profileId}`);
  }
  return profile;
}

export function releaseDeviceProfiles() {
  return Object.values(deviceProfiles).filter((profile) => profile.releaseTarget === true);
}
