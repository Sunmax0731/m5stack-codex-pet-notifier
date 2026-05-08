export const deviceProfiles = {
  core2: {
    id: 'core2',
    label: 'M5Stack Core2',
    screen: { width: 320, height: 240 },
    touch: true,
    imuTap: false,
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
    label: 'M5Stack GRAY',
    screen: { width: 320, height: 240 },
    touch: false,
    imuTap: true,
    inputMap: {
      choiceA: 'button-a',
      choiceB: 'button-b',
      choiceC: 'button-c',
      petInteract: 'button-b-long-press-or-imu-tap',
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
