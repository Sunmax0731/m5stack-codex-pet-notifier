#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <M5Unified.h>
#include <WiFi.h>
#include <pgmspace.h>

#if __has_include("wifi_config.local.h")
#include "wifi_config.local.h"
#else
#include "wifi_config.example.h"
#endif

#if __has_include("pet_asset.local.h")
#include "pet_asset.local.h"
#define HAS_LOCAL_PET_ASSET 1
#else
#define HAS_LOCAL_PET_ASSET 0
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
constexpr uint32_t PET_ANIMATION_INTERVAL_MS = 320;
constexpr int ANSWER_CHARS_PER_PAGE = 90;
constexpr int BODY_TEXT_WIDTH = 304;
constexpr int BODY_LINE_HEIGHT = 18;
constexpr int BASE_HEADER_HEIGHT = 58;
constexpr int BASE_FOOTER_HEIGHT = 24;

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
uint8_t petFrame = 0;
uint32_t lastPoll = 0;
uint32_t lastHeartbeat = 0;
uint32_t lastStatus = 0;
uint32_t lastTouchEvent = 0;
uint32_t lastPetFrame = 0;
uint32_t petReactUntil = 0;
int petDisplayScale = 2;
int uiTextScale = 1;
int bodyTextScale = 1;

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

int clampDisplayScale(int value) {
  return max(1, min(2, value));
}

void applyDisplayFont(int scale = 1) {
  M5.Display.setFont(&fonts::efontJA_12);
  M5.Display.setTextSize(clampDisplayScale(scale));
}

void applyUiFont() {
  applyDisplayFont(uiTextScale);
}

void applyBodyFont() {
  applyDisplayFont(bodyTextScale);
}

int petAssetWidth() {
#if HAS_LOCAL_PET_ASSET
  return PET_ASSET_FRAME_WIDTH;
#else
  return 58;
#endif
}

int petAssetHeight() {
#if HAS_LOCAL_PET_ASSET
  return PET_ASSET_FRAME_HEIGHT;
#else
  return 52;
#endif
}

int petBoxWidth() {
  return (petAssetWidth() + 10) * petDisplayScale;
}

int petBoxHeight() {
  return (petAssetHeight() + 10) * petDisplayScale;
}

int headerHeight() {
  return max(BASE_HEADER_HEIGHT, petBoxHeight() + 12);
}

int footerHeight() {
  return BASE_FOOTER_HEIGHT * uiTextScale;
}

int footerTop() {
  return M5.Display.height() - footerHeight();
}

int contentTop() {
  return headerHeight() + 10;
}

int bodyLineHeight() {
  return BODY_LINE_HEIGHT * bodyTextScale;
}

int maxBodyLinesFrom(int y) {
  return max(1, (footerTop() - y - 4) / bodyLineHeight());
}

int answerCharsPerPage() {
  return max(36, ANSWER_CHARS_PER_PAGE / bodyTextScale);
}

int utf8CharBytes(const String& value, int index) {
  const int total = value.length();
  if (index >= total) {
    return 0;
  }
  const uint8_t lead = static_cast<uint8_t>(value[index]);
  int size = 1;
  if ((lead & 0x80) == 0x00) {
    size = 1;
  } else if ((lead & 0xE0) == 0xC0) {
    size = 2;
  } else if ((lead & 0xF0) == 0xE0) {
    size = 3;
  } else if ((lead & 0xF8) == 0xF0) {
    size = 4;
  }
  return index + size <= total ? size : 1;
}

int utf8CodepointCount(const String& value) {
  int count = 0;
  for (int index = 0; index < value.length();) {
    const int bytes = utf8CharBytes(value, index);
    if (bytes <= 0) {
      break;
    }
    index += bytes;
    count += 1;
  }
  return count;
}

String utf8SliceByCodepoints(const String& value, int start, int count) {
  int current = 0;
  int startByte = -1;
  int endByte = value.length();
  for (int index = 0; index < value.length();) {
    if (current == start && startByte < 0) {
      startByte = index;
    }
    if (current == start + count) {
      endByte = index;
      break;
    }
    const int bytes = utf8CharBytes(value, index);
    if (bytes <= 0) {
      break;
    }
    index += bytes;
    current += 1;
  }
  if (startByte < 0) {
    return "";
  }
  return value.substring(startByte, endByte);
}

String truncateUtf8ToWidth(const String& value, int maxWidth) {
  if (M5.Display.textWidth(value.c_str()) <= maxWidth) {
    return value;
  }
  const String ellipsis = "...";
  String out = "";
  for (int index = 0; index < value.length();) {
    const int bytes = utf8CharBytes(value, index);
    if (bytes <= 0) {
      break;
    }
    const String next = out + value.substring(index, index + bytes);
    if (M5.Display.textWidth((next + ellipsis).c_str()) > maxWidth) {
      return out.length() ? out + ellipsis : ellipsis;
    }
    out = next;
    index += bytes;
  }
  return out;
}

void drawLinePx(const String& value, int x, int y, int maxWidth) {
  M5.Display.drawString(truncateUtf8ToWidth(value, maxWidth).c_str(), x, y);
}

void drawLine(const String& value, int x, int y, int maxChars = 36) {
  const int maxWidth = min(M5.Display.width() - x - 4, maxChars * 8);
  drawLinePx(value, x, y, maxWidth);
}

void drawWrappedBlock(const String& value, int x, int y, int maxWidth, int lineHeight, int maxLines) {
  String line = "";
  int lineIndex = 0;
  int index = 0;
  while (index < value.length() && lineIndex < maxLines) {
    const int bytes = utf8CharBytes(value, index);
    if (bytes <= 0) {
      break;
    }

    if (bytes == 1 && value[index] == '\r') {
      index += bytes;
      continue;
    }
    if (bytes == 1 && value[index] == '\n') {
      drawLinePx(line, x, y + lineIndex * lineHeight, maxWidth);
      line = "";
      lineIndex += 1;
      index += bytes;
      continue;
    }

    const String token = value.substring(index, index + bytes);
    const String candidate = line + token;
    if (line.length() > 0 && M5.Display.textWidth(candidate.c_str()) > maxWidth) {
      if (lineIndex == maxLines - 1) {
        drawLinePx(line + "...", x, y + lineIndex * lineHeight, maxWidth);
        return;
      }
      drawLinePx(line, x, y + lineIndex * lineHeight, maxWidth);
      line = "";
      lineIndex += 1;
      continue;
    }

    if (line.length() == 0 && M5.Display.textWidth(token.c_str()) > maxWidth) {
      drawLinePx(token, x, y + lineIndex * lineHeight, maxWidth);
      lineIndex += 1;
      index += bytes;
      continue;
    }

    line = candidate;
    index += bytes;
  }

  if (lineIndex < maxLines && line.length()) {
    drawLinePx(index < value.length() ? line + "..." : line, x, y + lineIndex * lineHeight, maxWidth);
  }
}

String renderedPetState() {
  if (petReactUntil && millis() < petReactUntil) {
    return "reacting";
  }
  return petState;
}

uint16_t petAccentColor() {
  const String state = renderedPetState();
  if (state == "review") {
    return TFT_ORANGE;
  }
  if (state == "reacting") {
    return TFT_CYAN;
  }
  if (state == "celebrate") {
    return TFT_GREEN;
  }
  return TFT_SKYBLUE;
}

void drawLocalPetAsset(int x, int y, int scale) {
#if HAS_LOCAL_PET_ASSET
  const int frameIndex = petFrame % PET_ASSET_FRAME_COUNT;
  for (int row = 0; row < PET_ASSET_FRAME_HEIGHT; ++row) {
    for (int col = 0; col < PET_ASSET_FRAME_WIDTH; ++col) {
      const uint16_t color = pgm_read_word(&PET_ASSET_FRAMES[frameIndex][row * PET_ASSET_FRAME_WIDTH + col]);
      if (color != PET_ASSET_TRANSPARENT) {
        M5.Display.fillRect(x + col * scale, y + row * scale, scale, scale, color);
      }
    }
  }
#else
  (void)x;
  (void)y;
#endif
}

void drawVectorPetAvatar(int x, int y) {
  const int bounce = (petFrame % 4 == 1) ? -2 : ((petFrame % 4 == 3) ? 1 : 0);
  const bool blink = petFrame % 10 == 0;
  const String state = renderedPetState();
  const uint16_t accent = petAccentColor();
  const uint16_t shadow = TFT_DARKGREY;
  const int s = petDisplayScale;
  const int bodyY = y + (10 + bounce) * s;

  M5.Display.fillEllipse(x + 26 * s, y + 45 * s, 22 * s, 4 * s, shadow);
  M5.Display.fillTriangle(x + 9 * s, bodyY + 4 * s, x + 16 * s, bodyY - 8 * s, x + 22 * s, bodyY + 7 * s, accent);
  M5.Display.fillTriangle(x + 31 * s, bodyY + 7 * s, x + 39 * s, bodyY - 8 * s, x + 45 * s, bodyY + 6 * s, accent);
  M5.Display.fillRoundRect(x + 6 * s, bodyY + 4 * s, 42 * s, 32 * s, 12 * s, accent);
  M5.Display.drawRoundRect(x + 6 * s, bodyY + 4 * s, 42 * s, 32 * s, 12 * s, TFT_WHITE);

  const int tail = petFrame % 6 < 3 ? 0 : 3;
  M5.Display.fillCircle(x + (50 + tail) * s, bodyY + 23 * s, 4 * s, accent);

  if (blink) {
    M5.Display.drawFastHLine(x + 18 * s, bodyY + 18 * s, 6 * s, TFT_BLACK);
    M5.Display.drawFastHLine(x + 32 * s, bodyY + 18 * s, 6 * s, TFT_BLACK);
  } else {
    M5.Display.fillCircle(x + 21 * s, bodyY + 18 * s, 3 * s, TFT_BLACK);
    M5.Display.fillCircle(x + 35 * s, bodyY + 18 * s, 3 * s, TFT_BLACK);
  }

  if (state == "reacting" || state == "celebrate") {
    M5.Display.drawArc(x + 28 * s, bodyY + 23 * s, 8 * s, 5 * s, 15, 165, TFT_BLACK);
  } else if (state == "review") {
    M5.Display.drawFastHLine(x + 24 * s, bodyY + 26 * s, 10 * s, TFT_BLACK);
  } else {
    M5.Display.fillRect(x + 27 * s, bodyY + 26 * s, s, s, TFT_BLACK);
    M5.Display.fillRect(x + 28 * s, bodyY + 26 * s, s, s, TFT_BLACK);
  }
}

void drawPetAvatar(int x, int y) {
#if HAS_LOCAL_PET_ASSET
  const int bounce = (petFrame % 4 == 1) ? -1 : ((petFrame % 4 == 3) ? 1 : 0);
  const int s = petDisplayScale;
  M5.Display.fillRoundRect(x, y, petBoxWidth(), petBoxHeight(), 10 * s, petAccentColor());
  M5.Display.drawRoundRect(x, y, petBoxWidth(), petBoxHeight(), 10 * s, TFT_WHITE);
  drawLocalPetAsset(x + 5 * s, y + (5 + bounce) * s, s);
#else
  drawVectorPetAvatar(x, y);
#endif
}

String pageText(const String& value, int page, int charsPerPage) {
  int start = page * charsPerPage;
  if (start >= utf8CodepointCount(value)) {
    return "";
  }
  return utf8SliceByCodepoints(value, start, charsPerPage);
}

int pageCount(const String& value, int charsPerPage) {
  const int codepoints = utf8CodepointCount(value);
  return max(1, (codepoints + charsPerPage - 1) / charsPerPage);
}

void drawHeader() {
  const int h = headerHeight();
  const int petX = M5.Display.width() - petBoxWidth() - 44;
  M5.Display.fillRect(0, 0, 320, h, TFT_DARKGREY);
  M5.Display.setTextColor(TFT_WHITE, TFT_DARKGREY);
  applyUiFont();
  drawLinePx(petName, 8, 8, max(96, petX - 16));
  drawLinePx(String("state: ") + renderedPetState() + " / " + profile.name, 8, 34 * uiTextScale, max(96, petX - 16));
  drawPetAvatar(petX, 6);
  drawLinePx((WiFi.status() == WL_CONNECTED ? "LAN" : "NO LAN"), 272, 8, 46);
  drawLinePx(String("U:") + unreadCount, 272, 34 * uiTextScale, 46);
}

void drawFooter(const char* a, const char* b, const char* c) {
  const int y = footerTop();
  M5.Display.fillRect(0, y, 320, footerHeight(), TFT_NAVY);
  M5.Display.setTextColor(TFT_WHITE, TFT_NAVY);
  applyUiFont();
  M5.Display.drawString(a, 14, y + 8);
  M5.Display.drawString(b, 132, y + 8);
  M5.Display.drawString(c, 242, y + 8);
}

void drawScreen() {
  if (!needsRedraw) {
    return;
  }
  needsRedraw = false;
  M5.Display.fillScreen(TFT_BLACK);
  drawHeader();
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  applyUiFont();
  const int y0 = contentTop();
  const int uiLine = BODY_LINE_HEIGHT * uiTextScale;

  if (screenState == SCREEN_PAIRING) {
    drawLine("Pairing with Host Bridge", 8, y0, 36);
    drawLine(String(HOST_BRIDGE_HOST) + ":" + HOST_BRIDGE_PORT, 8, y0 + uiLine, 36);
    drawLine(authToken.length() ? "paired" : "waiting token", 8, y0 + uiLine * 2, 36);
    drawFooter("A poll", "B pet", "C idle");
    return;
  }

  if (screenState == SCREEN_IDLE) {
    drawLine("Idle", 8, y0, 36);
    drawLine(title.length() ? title : "Waiting for Codex event", 8, y0 + uiLine, 36);
    drawLine(body.length() ? body : "Use Host Bridge replay.", 8, y0 + uiLine * 2, 36);
    drawFooter("A prev", "B pet", "C next");
    return;
  }

  if (screenState == SCREEN_NOTIFICATION) {
    drawLine("Notification", 8, y0, 36);
    drawLine(title, 8, y0 + uiLine, 42);
    applyBodyFont();
    const int bodyY = y0 + uiLine * 2 + 6;
    drawWrappedBlock(body, 8, bodyY, BODY_TEXT_WIDTH, bodyLineHeight(), maxBodyLinesFrom(bodyY));
    drawFooter("A ack", "B pet", "C idle");
    return;
  }

  if (screenState == SCREEN_ANSWER) {
    const int charsPerPage = answerCharsPerPage();
    answerPage = min(answerPage, pageCount(body, charsPerPage) - 1);
    drawLine(String("Answer page ") + (answerPage + 1) + "/" + pageCount(body, charsPerPage), 8, y0, 36);
    drawLine(summary, 8, y0 + uiLine, 42);
    applyBodyFont();
    const int bodyY = y0 + uiLine * 2 + 6;
    drawWrappedBlock(pageText(body, answerPage, charsPerPage), 8, bodyY, BODY_TEXT_WIDTH, bodyLineHeight(), maxBodyLinesFrom(bodyY));
    drawFooter("A up", "B idle", "C down");
    return;
  }

  if (screenState == SCREEN_CHOICE) {
    drawLine("Choice requested", 8, y0, 36);
    drawWrappedBlock(title, 8, y0 + uiLine, BODY_TEXT_WIDTH, BODY_LINE_HEIGHT * uiTextScale, 2);
    for (int i = 0; i < choiceCount; ++i) {
      drawLine(String(static_cast<char>('A' + i)) + ": " + choiceLabels[i], 8, y0 + uiLine * 3 + i * 24 * uiTextScale, 42);
    }
    drawFooter("A send", "B send", "C send");
    return;
  }

  drawLine("Error", 8, y0, 36);
  drawLine(lastError, 8, y0 + uiLine, 42);
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
      answerPage = min(pageCount(body, answerCharsPerPage()) - 1, answerPage + 1);
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
  petReactUntil = millis() + 2500;
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
  } else if (type == "display.settings_updated") {
    petDisplayScale = clampDisplayScale(event["display"]["petScale"] | petDisplayScale);
    uiTextScale = clampDisplayScale(event["display"]["uiTextScale"] | uiTextScale);
    bodyTextScale = clampDisplayScale(event["display"]["bodyTextScale"] | bodyTextScale);
    answerPage = min(answerPage, pageCount(body, answerCharsPerPage()) - 1);
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
    const String reason = String(doc["reason"] | "unknown");
    if (reason == "invalid-token" || reason == "unpaired-device") {
      Serial.printf("pairing_token_reset reason=%s\n", reason.c_str());
      authToken = "";
      screenState = SCREEN_PAIRING;
      markDraw();
      return;
    }
    setError(String("poll failed: ") + reason);
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
      answerPage = min(pageCount(body, answerCharsPerPage()) - 1, answerPage + 1);
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
    if (detail.y >= footerTop()) {
      handleFooterTouch(detail.x);
    } else if (screenState == SCREEN_CHOICE && detail.y >= contentTop() + BODY_LINE_HEIGHT * uiTextScale * 3) {
      const int row = min(choiceCount - 1, max(0, (detail.y - (contentTop() + BODY_LINE_HEIGHT * uiTextScale * 3)) / (24 * uiTextScale)));
      Serial.printf("touch_choice_row index=%d\n", row);
      sendReply(row, "touch-row");
    } else if (screenState == SCREEN_ANSWER && abs(detail.deltaY()) > 20) {
      if (detail.deltaY() < 0) {
        answerPage = min(pageCount(body, answerCharsPerPage()) - 1, answerPage + 1);
      } else {
        answerPage = max(0, answerPage - 1);
      }
      Serial.printf("touch_answer_swipe page=%d\n", answerPage);
      markDraw();
    } else if (detail.y < headerHeight()) {
      sendPetInteraction("touch");
    }
  }
}

void updatePetAnimation() {
  if (millis() - lastPetFrame >= PET_ANIMATION_INTERVAL_MS) {
    lastPetFrame = millis();
    petFrame = (petFrame + 1) % 30;
    markDraw();
  }
  if (petReactUntil && millis() > petReactUntil && petState == "reacting") {
    petReactUntil = 0;
    petState = "idle";
    markDraw();
  }
}

void applyLocalPetAssetName() {
#if HAS_LOCAL_PET_ASSET
  if (petName == "Codex Pet") {
    petName = PET_ASSET_NAME;
  }
#endif
}
}

void setup() {
  Serial.begin(115200);
  auto cfg = M5.config();
  M5.begin(cfg);
  M5.Display.setRotation(1);
  M5.Display.fillScreen(TFT_BLACK);
  applyLocalPetAssetName();
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
  updatePetAnimation();

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
