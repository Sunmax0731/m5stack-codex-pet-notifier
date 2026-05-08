#include <M5Unified.h>
#include <WiFi.h>

#if __has_include("wifi_config.local.h")
#include "wifi_config.local.h"
#else
#include "wifi_config.example.h"
#endif

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

namespace {
constexpr uint32_t WIFI_TIMEOUT_MS = 20000;

void drawStatus(const char* line1, const char* line2 = "") {
  M5.Display.fillRect(0, 76, 320, 92, TFT_BLACK);
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5.Display.setTextSize(1);
  M5.Display.drawString(line1, 12, 84);
  M5.Display.drawString(line2, 12, 104);
}

bool ssidLooksRelated(const String& scannedSsid) {
  const String configured = String(WIFI_SSID);
  const int lastDash = configured.lastIndexOf('-');
  if (scannedSsid == configured) {
    return true;
  }
  if (lastDash >= 0) {
    const String suffix = configured.substring(lastDash + 1);
    if (suffix.length() >= 3 && scannedSsid.indexOf(suffix) >= 0) {
      return true;
    }
  }
  return false;
}

void printWifiScanHints() {
  Serial.println("wifi_scan_start");
  WiFi.disconnect(true, true);
  delay(500);
  WiFi.mode(WIFI_STA);
  const int count = WiFi.scanNetworks(false, true);
  Serial.printf("wifi_scan_count=%d\n", count);
  for (int index = 0; index < count; ++index) {
    const String ssid = WiFi.SSID(index);
    if (ssidLooksRelated(ssid)) {
      Serial.printf("wifi_scan_candidate ssid=%s rssi=%d channel=%d\n", ssid.c_str(), WiFi.RSSI(index), WiFi.channel(index));
    }
  }
  WiFi.scanDelete();
}

void connectWifi() {
  if (String(WIFI_SSID).length() == 0 || String(WIFI_SSID) == "your-ssid") {
    drawStatus("Wi-Fi config missing", "create wifi_config.local.h");
    Serial.println("wifi_config_missing");
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  drawStatus("Connecting Wi-Fi", WIFI_SSID);
  Serial.printf("wifi_connecting ssid=%s\n", WIFI_SSID);

  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(250);
    M5.update();
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    const String ip = WiFi.localIP().toString();
    drawStatus("Wi-Fi connected", ip.c_str());
    Serial.printf("wifi_connected ip=%s rssi=%d host=%s\n", ip.c_str(), WiFi.RSSI(), HOST_BRIDGE_URL);
  } else {
    drawStatus("Wi-Fi failed", "check SSID/password");
    Serial.printf("wifi_failed status=%d\n", WiFi.status());
    printWifiScanHints();
  }
}
}

void setup() {
  Serial.begin(115200);
  auto cfg = M5.config();
  M5.begin(cfg);
  M5.Display.setRotation(1);
  M5.Display.fillScreen(TFT_BLACK);
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5.Display.setTextSize(2);
  M5.Display.drawString("Codex Pet", 12, 20);
  M5.Display.setTextSize(1);
  M5.Display.drawString(profile.name, 12, 52);
  connectWifi();
}

void loop() {
  M5.update();
  static uint32_t lastStatus = 0;
  if (millis() - lastStatus > 5000) {
    lastStatus = millis();
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("wifi_status connected ip=%s rssi=%d profile=%s\n", WiFi.localIP().toString().c_str(), WiFi.RSSI(), profile.name);
    } else {
      Serial.printf("wifi_status disconnected status=%d profile=%s\n", WiFi.status(), profile.name);
    }
  }
  if (WiFi.status() != WL_CONNECTED) {
    static uint32_t lastReconnect = 0;
    if (millis() - lastReconnect > 10000) {
      lastReconnect = millis();
      WiFi.reconnect();
      Serial.println("wifi_reconnect_requested");
    }
  }
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
