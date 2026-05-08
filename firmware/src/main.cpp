#include <M5Unified.h>

struct DeviceProfile {
  const char* name;
  bool touch;
  bool imuTap;
};

#if defined(DEVICE_PROFILE_GRAY)
DeviceProfile profile = {"gray", false, true};
#else
DeviceProfile profile = {"core2", true, false};
#endif

void setup() {
  auto cfg = M5.config();
  M5.begin(cfg);
  M5.Display.setRotation(1);
  M5.Display.fillScreen(TFT_BLACK);
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5.Display.setTextSize(2);
  M5.Display.drawString("Codex Pet", 12, 20);
  M5.Display.setTextSize(1);
  M5.Display.drawString(profile.name, 12, 52);
  M5.Display.drawString("Pairing required", 12, 76);
}

void loop() {
  M5.update();
  if (profile.touch && M5.Touch.getCount() > 0) {
    M5.Display.fillRect(12, 104, 220, 24, TFT_DARKGREEN);
    M5.Display.drawString("pet touched", 16, 110);
  }
  if (M5.BtnA.wasPressed()) {
    M5.Display.fillRect(12, 136, 220, 24, TFT_NAVY);
    M5.Display.drawString("choice A", 16, 142);
  }
  if (M5.BtnB.wasPressed()) {
    M5.Display.fillRect(12, 136, 220, 24, TFT_NAVY);
    M5.Display.drawString("choice B", 16, 142);
  }
  if (M5.BtnC.wasPressed()) {
    M5.Display.fillRect(12, 136, 220, 24, TFT_NAVY);
    M5.Display.drawString("choice C", 16, 142);
  }
  delay(16);
}
