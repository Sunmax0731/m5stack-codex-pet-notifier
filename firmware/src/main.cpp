#include <ArduinoJson.h>
#include <HTTPClient.h>
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

enum ScreenState {
  SCREEN_PAIRING,
  SCREEN_IDLE,
  SCREEN_NOTIFICATION,
  SCREEN_ANSWER,
  SCREEN_CHOICE,
  SCREEN_ERROR
};

namespace {
constexpr uint32_t WIFI_TIMEOUT_MS = 20000;
constexpr uint32_t POLL_INTERVAL_MS = 1200;
constexpr uint32_t HEARTBEAT_INTERVAL_MS = 10000;
constexpr uint32_t STATUS_INTERVAL_MS = 5000;

String authToken;
ScreenState screenState = SCREEN_PAIRING;
String petName = "Codex Pet";
String petState = "idle";
String title = "";
String body = "";
String summary = "";
String currentRequestEventId = "";
String choiceIds[3];
String choiceLabels[3];
int choiceCount = 0;
int unreadCount = 0;
int answerPage = 0;
String lastError = "";
bool needsRedraw = true;
uint32_t lastPoll = 0;
uint32_t lastHeartbeat = 0;
uint32_t lastStatus = 0;
uint32_t lastTouchEvent = 0;

void pollHost();
void sendPetInteraction(const char* interaction);

String screenName() {
  switch (screenState) {
    case SCREEN_PAIRING: return "Pairing";
    case SCREEN_IDLE: return "Idle";
    case SCREEN_NOTIFICATION: return "Notification";
    case SCREEN_ANSWER: return "Answer";
    case SCREEN_CHOICE: return "Choice";
    case SCREEN_ERROR: return "Error";
  }
  return "Unknown";
}

String bridgeUrl(const String& path) {
  return String("http://") + HOST_BRIDGE_HOST + ":" + String(HOST_BRIDGE_PORT) + path;
}

String queryPath(const String& path) {
  return path + "?deviceId=" + DEVICE_ID + "&token=" + authToken;
}

void markDraw() {
  needsRedraw = true;
}

void drawLine(const String& value, int x, int y, int maxChars = 36) {
  String out = value;
  if (out.length() > maxChars) {
    out = out.substring(0, maxChars - 3) + "...";
  }
  M5.Display.drawString(out.c_str(), x, y);
}

String pageText(const String& value, int page, int charsPerPage = 120) {
  int start = page * charsPerPage;
  if (start >= value.length()) {
    return "";
  }
  return value.substring(start, min(start + charsPerPage, static_cast<int>(value.length())));
}

int pageCount(const String& value, int charsPerPage = 120) {
  return max(1, (static_cast<int>(value.length()) + charsPerPage - 1) / charsPerPage);
}

void drawHeader() {
  M5.Display.fillRect(0, 0, 320, 58, TFT_DARKGREY);
  M5.Display.setTextColor(TFT_WHITE, TFT_DARKGREY);
  M5.Display.setTextSize(2);
  drawLine(petName, 8, 8, 20);
  M5.Display.setTextSize(1);
  drawLine(String("state: ") + petState + " / " + profile.name, 8, 34, 38);
  M5.Display.drawString((WiFi.status() == WL_CONNECTED ? "LAN" : "NO LAN"), 258, 8);
  M5.Display.drawString((String("U:") + unreadCount).c_str(), 258, 34);
}

void drawFooter(const char* a, const char* b, const char* c) {
  M5.Display.fillRect(0, 216, 320, 24, TFT_NAVY);
  M5.Display.setTextColor(TFT_WHITE, TFT_NAVY);
  M5.Display.setTextSize(1);
  M5.Display.drawString(a, 14, 224);
  M5.Display.drawString(b, 132, 224);
  M5.Display.drawString(c, 242, 224);
}

void drawScreen() {
  if (!needsRedraw) {
    return;
  }
  needsRedraw = false;
  M5.Display.fillScreen(TFT_BLACK);
  drawHeader();
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5.Display.setTextSize(1);

  if (screenState == SCREEN_PAIRING) {
    drawLine("Pairing with Host Bridge", 8, 76, 36);
    drawLine(String(HOST_BRIDGE_HOST) + ":" + HOST_BRIDGE_PORT, 8, 96, 36);
    drawLine(authToken.length() ? "paired" : "waiting token", 8, 116, 36);
    drawFooter("A poll", "B pet", "C idle");
    return;
  }

  if (screenState == SCREEN_IDLE) {
    drawLine("Idle", 8, 76, 36);
    drawLine(title.length() ? title : "Waiting for Codex event", 8, 96, 36);
    drawLine(body.length() ? body : "Use Host Bridge replay.", 8, 116, 36);
    drawFooter("A prev", "B pet", "C next");
    return;
  }

  if (screenState == SCREEN_NOTIFICATION) {
    drawLine("Notification", 8, 68, 36);
    M5.Display.setTextSize(2);
    drawLine(title, 8, 88, 22);
    M5.Display.setTextSize(1);
    drawLine(body, 8, 122, 42);
    drawFooter("A ack", "B pet", "C idle");
    return;
  }

  if (screenState == SCREEN_ANSWER) {
    drawLine(String("Answer page ") + (answerPage + 1) + "/" + pageCount(body), 8, 68, 36);
    drawLine(summary, 8, 88, 42);
    drawLine(pageText(body, answerPage), 8, 112, 42);
    drawLine(pageText(body, answerPage).substring(42), 8, 132, 42);
    drawLine(pageText(body, answerPage).substring(84), 8, 152, 42);
    drawFooter("A up", "B idle", "C down");
    return;
  }

  if (screenState == SCREEN_CHOICE) {
    drawLine("Choice requested", 8, 68, 36);
    drawLine(title, 8, 88, 42);
    for (int i = 0; i < choiceCount; ++i) {
      drawLine(String(static_cast<char>('A' + i)) + ": " + choiceLabels[i], 8, 116 + i * 24, 42);
    }
    drawFooter("A send", "B send", "C send");
    return;
  }

  drawLine("Error", 8, 76, 36);
  drawLine(lastError, 8, 96, 42);
  drawFooter("A retry", "B pet", "C idle");
}

bool httpPostJson(const String& path, const String& payload, String& response) {
  WiFiClient client;
  HTTPClient http;
  const String url = bridgeUrl(path);
  if (!http.begin(client, url)) {
    lastError = "http begin failed";
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  const int code = http.POST(payload);
  response = http.getString();
  http.end();
  if (code < 200 || code >= 300) {
    lastError = String("HTTP POST ") + code;
    return false;
  }
  return true;
}

bool httpGetJson(const String& path, String& response) {
  WiFiClient client;
  HTTPClient http;
  const String url = bridgeUrl(path);
  if (!http.begin(client, url)) {
    lastError = "http begin failed";
    return false;
  }
  const int code = http.GET();
  response = http.getString();
  http.end();
  if (code < 200 || code >= 300) {
    lastError = String("HTTP GET ") + code;
    return false;
  }
  return true;
}

bool pairDevice() {
  JsonDocument doc;
  doc["deviceId"] = DEVICE_ID;
  doc["pairingCode"] = PAIRING_CODE;
  String payload;
  serializeJson(doc, payload);
  String response;
  if (!httpPostJson("/pair", payload, response)) {
    return false;
  }
  JsonDocument reply;
  if (deserializeJson(reply, response)) {
    lastError = "pair json error";
    return false;
  }
  if (!reply["ok"]) {
    lastError = String("pair failed: ") + (reply["reason"] | "unknown");
    return false;
  }
  authToken = String(reply["token"] | "");
  screenState = SCREEN_IDLE;
  markDraw();
  Serial.printf("pair_ok device=%s\n", DEVICE_ID);
  return true;
}

void setError(const String& message) {
  lastError = message;
  screenState = SCREEN_ERROR;
  markDraw();
  Serial.printf("device_error %s\n", message.c_str());
}

void sendDeviceEvent(JsonDocument& doc) {
  if (!authToken.length()) {
    return;
  }
  String payload;
  serializeJson(doc, payload);
  String response;
  const bool ok = httpPostJson(queryPath("/device/event"), payload, response);
  Serial.printf("device_event_post type=%s ok=%d\n", doc["type"].as<const char*>(), ok ? 1 : 0);
}

void sendHeartbeat() {
  JsonDocument doc;
  doc["type"] = "device.heartbeat";
  doc["eventId"] = String("evt-heartbeat-") + millis();
  doc["createdAt"] = String("device-ms-") + millis();
  doc["deviceId"] = DEVICE_ID;
  doc["battery"] = 100;
  doc["wifiRssi"] = WiFi.RSSI();
  doc["screen"] = screenName();
  sendDeviceEvent(doc);
}

void sendReply(int index, const char* inputOverride = nullptr) {
  if (screenState != SCREEN_CHOICE || index < 0 || index >= choiceCount) {
    return;
  }
  JsonDocument doc;
  doc["type"] = "device.reply_selected";
  doc["eventId"] = String("evt-reply-") + millis();
  doc["createdAt"] = String("device-ms-") + millis();
  doc["deviceId"] = DEVICE_ID;
  doc["requestEventId"] = currentRequestEventId;
  doc["choiceId"] = choiceIds[index];
  doc["input"] = inputOverride ? inputOverride : (String("button-") + static_cast<char>('a' + index));
  sendDeviceEvent(doc);
  title = String("Reply sent: ") + choiceLabels[index];
  body = "Waiting for next Codex event.";
  screenState = SCREEN_IDLE;
  markDraw();
}

int touchChoiceIndex(int x) {
  if (x < 107) {
    return 0;
  }
  if (x < 214) {
    return 1;
  }
  return 2;
}

void handleFooterTouch(int x) {
  const int index = touchChoiceIndex(x);
  if (screenState == SCREEN_CHOICE) {
    char inputName[] = "touch-a";
    inputName[6] = static_cast<char>('a' + index);
    Serial.printf("touch_choice index=%d\n", index);
    sendReply(index, inputName);
    return;
  }
  if (screenState == SCREEN_ANSWER) {
    if (index == 0) {
      answerPage = max(0, answerPage - 1);
    } else if (index == 1) {
      screenState = SCREEN_IDLE;
    } else {
      answerPage = min(pageCount(body) - 1, answerPage + 1);
    }
    Serial.printf("touch_answer_nav index=%d page=%d\n", index, answerPage);
    markDraw();
    return;
  }
  if (index == 0) {
    pollHost();
  } else if (index == 1) {
    sendPetInteraction("touch");
  } else {
    screenState = SCREEN_IDLE;
    markDraw();
  }
}

void sendPetInteraction(const char* interaction) {
  JsonDocument doc;
  doc["type"] = "device.pet_interacted";
  doc["eventId"] = String("evt-pet-interacted-") + millis();
  doc["createdAt"] = String("device-ms-") + millis();
  doc["deviceId"] = DEVICE_ID;
  doc["petId"] = petName.length() ? petName : "fallback-pet";
  doc["interaction"] = interaction;
  sendDeviceEvent(doc);
  petState = "reacting";
  markDraw();
}

void handleHostEvent(JsonVariant event) {
  const String type = event["type"] | "";
  Serial.printf("host_event type=%s\n", type.c_str());

  if (type == "pet.updated") {
    petName = String(event["pet"]["name"] | "Codex Pet");
    petState = String(event["pet"]["state"] | "idle");
    title = "Pet updated";
    body = String(event["pet"]["spriteRef"] | "fallback");
    screenState = SCREEN_IDLE;
  } else if (type == "notification.created") {
    title = String(event["title"] | "Notification");
    body = String(event["body"] | "");
    unreadCount += 1;
    screenState = SCREEN_NOTIFICATION;
  } else if (type == "answer.completed") {
    summary = String(event["summary"] | "Answer completed");
    body = String(event["body"] | "");
    answerPage = 0;
    screenState = SCREEN_ANSWER;
  } else if (type == "prompt.choice_requested") {
    title = String(event["prompt"] | "Choose");
    currentRequestEventId = String(event["eventId"] | "");
    choiceCount = 0;
    JsonArray choices = event["choices"].as<JsonArray>();
    for (JsonObject choice : choices) {
      if (choiceCount >= 3) {
        break;
      }
      choiceIds[choiceCount] = String(choice["id"] | "");
      choiceLabels[choiceCount] = String(choice["label"] | "");
      choiceCount += 1;
    }
    screenState = SCREEN_CHOICE;
  } else {
    lastError = String("unknown event: ") + type;
    screenState = SCREEN_ERROR;
  }
  markDraw();
}

void pollHost() {
  if (!authToken.length()) {
    return;
  }
  String response;
  if (!httpGetJson(queryPath("/device/poll"), response)) {
    setError(lastError);
    return;
  }
  JsonDocument doc;
  if (deserializeJson(doc, response)) {
    setError("poll json error");
    return;
  }
  if (!doc["ok"]) {
    setError(String("poll failed: ") + (doc["reason"] | "unknown"));
    return;
  }
  if (!doc["event"].isNull()) {
    handleHostEvent(doc["event"]);
  }
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
    setError("Wi-Fi config missing");
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  screenState = SCREEN_PAIRING;
  markDraw();
  Serial.printf("wifi_connecting ssid=%s\n", WIFI_SSID);

  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(250);
    M5.update();
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("wifi_connected ip=%s rssi=%d host=%s:%u\n", WiFi.localIP().toString().c_str(), WiFi.RSSI(), HOST_BRIDGE_HOST, HOST_BRIDGE_PORT);
  } else {
    Serial.printf("wifi_failed status=%d\n", WiFi.status());
    printWifiScanHints();
    setError("Wi-Fi failed");
  }
}

void handleButtons() {
  if (M5.BtnA.wasPressed()) {
    if (screenState == SCREEN_CHOICE) {
      sendReply(0);
    } else if (screenState == SCREEN_ANSWER) {
      answerPage = max(0, answerPage - 1);
      markDraw();
    } else {
      pollHost();
    }
  }

  if (M5.BtnB.wasPressed()) {
    if (screenState == SCREEN_CHOICE) {
      sendReply(1);
    } else if (screenState == SCREEN_ANSWER) {
      screenState = SCREEN_IDLE;
      markDraw();
    } else {
      sendPetInteraction(profile.touch ? "touch" : "button-long-press");
    }
  }

  if (M5.BtnC.wasPressed()) {
    if (screenState == SCREEN_CHOICE) {
      sendReply(2);
    } else if (screenState == SCREEN_ANSWER) {
      answerPage = min(pageCount(body) - 1, answerPage + 1);
      markDraw();
    } else {
      screenState = SCREEN_IDLE;
      markDraw();
    }
  }

  if (!profile.touch && M5.BtnB.wasHold()) {
    sendPetInteraction("button-long-press");
  }
}

void handleTouch() {
  if (!profile.touch || !M5.Touch.getCount()) {
    return;
  }
  auto detail = M5.Touch.getDetail();
  if (detail.wasReleased() && millis() - lastTouchEvent > 600) {
    lastTouchEvent = millis();
    if (detail.y >= 206) {
      handleFooterTouch(detail.x);
    } else if (screenState == SCREEN_CHOICE && detail.y >= 108) {
      const int row = min(choiceCount - 1, max(0, (detail.y - 108) / 24));
      Serial.printf("touch_choice_row index=%d\n", row);
      sendReply(row, "touch-row");
    } else if (screenState == SCREEN_ANSWER && abs(detail.deltaY()) > 20) {
      if (detail.deltaY() < 0) {
        answerPage = min(pageCount(body) - 1, answerPage + 1);
      } else {
        answerPage = max(0, answerPage - 1);
      }
      Serial.printf("touch_answer_swipe page=%d\n", answerPage);
      markDraw();
    } else if (detail.y < 100) {
      sendPetInteraction("touch");
    }
  }
}
}

void setup() {
  Serial.begin(115200);
  auto cfg = M5.config();
  M5.begin(cfg);
  M5.Display.setRotation(1);
  M5.Display.fillScreen(TFT_BLACK);
  connectWifi();
  if (WiFi.status() == WL_CONNECTED) {
    if (!pairDevice()) {
      setError(lastError);
    }
  }
  drawScreen();
}

void loop() {
  M5.update();
  handleButtons();
  handleTouch();

  if (millis() - lastStatus > STATUS_INTERVAL_MS) {
    lastStatus = millis();
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("wifi_status connected ip=%s rssi=%d profile=%s screen=%s\n", WiFi.localIP().toString().c_str(), WiFi.RSSI(), profile.name, screenName().c_str());
    } else {
      Serial.printf("wifi_status disconnected status=%d profile=%s\n", WiFi.status(), profile.name);
    }
  }

  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(1000);
    markDraw();
  } else if (!authToken.length()) {
    pairDevice();
  } else {
    if (millis() - lastPoll > POLL_INTERVAL_MS) {
      lastPoll = millis();
      pollHost();
    }
    if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
      lastHeartbeat = millis();
      sendHeartbeat();
    }
  }

  drawScreen();
  delay(20);
}
