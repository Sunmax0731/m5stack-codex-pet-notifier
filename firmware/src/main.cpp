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

#if !defined(DEVICE_PROFILE_GRAY) && __has_include("pet_asset.local.h")
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
constexpr int DEFAULT_PET_ANIMATION_FPS = 12;
constexpr int MIN_PET_ANIMATION_FPS = 4;
constexpr int MAX_PET_ANIMATION_FPS = 20;
constexpr int DEFAULT_PET_MOTION_STEP_MS = 280;
constexpr int MIN_PET_MOTION_STEP_MS = 120;
constexpr int MAX_PET_MOTION_STEP_MS = 800;
constexpr uint32_t PET_ANIMATION_INTERVAL_MS = 1000 / DEFAULT_PET_ANIMATION_FPS;
constexpr uint32_t LOOP_IDLE_DELAY_MS = 5;
constexpr int ANSWER_CHARS_PER_PAGE = 90;
constexpr int BODY_TEXT_WIDTH = 304;
constexpr int BODY_LINE_HEIGHT = 18;
constexpr int BASE_FOOTER_HEIGHT = 24;
constexpr int DISPLAY_SCALE_MIN = 1;
constexpr int DISPLAY_SCALE_MAX = 8;
constexpr int MIN_PET_SURFACE_HEIGHT = 52;

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
bool needsPetRedraw = true;
uint8_t petFrame = 0;
uint32_t lastPoll = 0;
uint32_t lastHeartbeat = 0;
uint32_t lastStatus = 0;
uint32_t lastTouchEvent = 0;
uint32_t lastPetFrame = 0;
uint32_t lastPetMotionStep = 0;
uint32_t petReactUntil = 0;
int petDisplayScale = 2;
int uiTextScale = 1;
int bodyTextScale = 1;
int petAnimationFps = DEFAULT_PET_ANIMATION_FPS;
int petMotionStepMs = DEFAULT_PET_MOTION_STEP_MS;
int petOffsetX = 0;
int petOffsetY = 0;

struct RgbaColor {
  uint8_t r;
  uint8_t g;
  uint8_t b;
  uint8_t a;
};

RgbaColor screenBackgroundRgba{5, 11, 20, 255};
RgbaColor petBackgroundRgba{5, 11, 20, 255};
RgbaColor textColorRgba{255, 255, 255, 255};
RgbaColor textBackgroundRgba{0, 0, 0, 178};
RgbaColor textBorderRgba{255, 255, 255, 255};
bool textBorderEnabled = false;
bool beepOnAnswer = true;

M5Canvas petSprite(&M5.Display);
bool petSpriteReady = false;
int petSpriteWidth = 0;
int petSpriteHeight = 0;

void pollHost();
void sendPetInteraction(const char* interaction);
int pageCount(const String& value, int charsPerPage);
int footerTop();
int bodyLineHeight();
void drawScreenContentOverlay(bool includeFooter);

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
  needsPetRedraw = true;
}

void markPetDraw() {
  needsPetRedraw = true;
}

int clampDisplayScale(int value) {
  return max(DISPLAY_SCALE_MIN, min(DISPLAY_SCALE_MAX, value));
}

int clampAnimationFps(int value) {
  return max(MIN_PET_ANIMATION_FPS, min(MAX_PET_ANIMATION_FPS, value));
}

int clampMotionStepMs(int value) {
  return max(MIN_PET_MOTION_STEP_MS, min(MAX_PET_MOTION_STEP_MS, value));
}

int clampPetOffsetX(int value) {
  return max(-M5.Display.width(), min(M5.Display.width(), value));
}

int clampPetOffsetY(int value) {
  return max(-M5.Display.height(), min(M5.Display.height(), value));
}

uint16_t rgb565(uint8_t r, uint8_t g, uint8_t b) {
  return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}

uint8_t rgb565R(uint16_t color) {
  return static_cast<uint8_t>((((color >> 11) & 0x1F) * 255) / 31);
}

uint8_t rgb565G(uint16_t color) {
  return static_cast<uint8_t>((((color >> 5) & 0x3F) * 255) / 63);
}

uint8_t rgb565B(uint16_t color) {
  return static_cast<uint8_t>(((color & 0x1F) * 255) / 31);
}

uint16_t blendRgbaOver(RgbaColor color, uint16_t backdrop) {
  if (color.a >= 255) {
    return rgb565(color.r, color.g, color.b);
  }
  const uint16_t inv = 255 - color.a;
  const uint8_t r = static_cast<uint8_t>(((color.r * color.a) + (rgb565R(backdrop) * inv)) / 255);
  const uint8_t g = static_cast<uint8_t>(((color.g * color.a) + (rgb565G(backdrop) * inv)) / 255);
  const uint8_t b = static_cast<uint8_t>(((color.b * color.a) + (rgb565B(backdrop) * inv)) / 255);
  return rgb565(r, g, b);
}

uint16_t screenBackgroundColor() {
  return blendRgbaOver(screenBackgroundRgba, TFT_BLACK);
}

uint16_t petBackgroundColor() {
  return blendRgbaOver(petBackgroundRgba, screenBackgroundColor());
}

uint16_t textBackgroundColor() {
  return blendRgbaOver(textBackgroundRgba, screenBackgroundColor());
}

uint16_t textPanelFillColor() {
  return textBackgroundRgba.a > 0 ? textBackgroundColor() : screenBackgroundColor();
}

uint16_t textBorderColor() {
  return blendRgbaOver(textBorderRgba, textPanelFillColor());
}

uint16_t textForegroundColor() {
  return blendRgbaOver(textColorRgba, textPanelFillColor());
}

uint8_t readColorChannel(JsonVariant source, const char* key, uint8_t fallback) {
  if (!source[key].is<int>()) {
    return fallback;
  }
  return static_cast<uint8_t>(constrain(source[key].as<int>(), 0, 255));
}

int hexNibble(char value) {
  if (value >= '0' && value <= '9') {
    return value - '0';
  }
  if (value >= 'a' && value <= 'f') {
    return value - 'a' + 10;
  }
  if (value >= 'A' && value <= 'F') {
    return value - 'A' + 10;
  }
  return -1;
}

bool readHexByte(const String& value, int offset, uint8_t& out) {
  if (offset + 1 >= value.length()) {
    return false;
  }
  const int hi = hexNibble(value[offset]);
  const int lo = hexNibble(value[offset + 1]);
  if (hi < 0 || lo < 0) {
    return false;
  }
  out = static_cast<uint8_t>((hi << 4) | lo);
  return true;
}

bool parseRgbaString(const String& value, RgbaColor& target) {
  String text = value;
  text.trim();
  if (text.startsWith("#")) {
    text.remove(0, 1);
  }
  if (text.length() == 6 || text.length() == 8) {
    uint8_t r = target.r;
    uint8_t g = target.g;
    uint8_t b = target.b;
    uint8_t a = target.a;
    if (!readHexByte(text, 0, r) || !readHexByte(text, 2, g) || !readHexByte(text, 4, b)) {
      return false;
    }
    if (text.length() == 8 && !readHexByte(text, 6, a)) {
      return false;
    }
    target = RgbaColor{r, g, b, a};
    return true;
  }

  int channels[4] = {target.r, target.g, target.b, target.a};
  int channelIndex = 0;
  int start = 0;
  while (channelIndex < 4 && start <= text.length()) {
    int comma = text.indexOf(',', start);
    if (comma < 0) {
      comma = text.length();
    }
    String part = text.substring(start, comma);
    part.trim();
    if (!part.length()) {
      return false;
    }
    channels[channelIndex] = constrain(part.toInt(), 0, 255);
    channelIndex += 1;
    start = comma + 1;
    if (comma == text.length()) {
      break;
    }
  }
  if (channelIndex < 3) {
    return false;
  }
  target = RgbaColor{
    static_cast<uint8_t>(channels[0]),
    static_cast<uint8_t>(channels[1]),
    static_cast<uint8_t>(channels[2]),
    static_cast<uint8_t>(channels[3])
  };
  return true;
}

void applyRgbaSetting(JsonVariant source, RgbaColor& target) {
  if (source.isNull()) {
    return;
  }
  if (source.is<const char*>()) {
    parseRgbaString(String(source.as<const char*>()), target);
    return;
  }
  if (source.is<JsonArray>()) {
    JsonArray channels = source.as<JsonArray>();
    target.r = static_cast<uint8_t>(constrain(channels[0] | target.r, 0, 255));
    target.g = static_cast<uint8_t>(constrain(channels[1] | target.g, 0, 255));
    target.b = static_cast<uint8_t>(constrain(channels[2] | target.b, 0, 255));
    target.a = static_cast<uint8_t>(constrain(channels[3] | target.a, 0, 255));
    return;
  }
  if (!source.is<JsonObject>()) {
    return;
  }
  target.r = readColorChannel(source, "r", target.r);
  target.g = readColorChannel(source, "g", target.g);
  target.b = readColorChannel(source, "b", target.b);
  target.a = readColorChannel(source, "a", target.a);
}

uint32_t petAnimationIntervalMs() {
  const uint32_t computed = 1000 / max(1, petAnimationFps);
  return computed < 50 ? 50 : computed;
}

uint32_t petMotionStepIntervalMs() {
  return static_cast<uint32_t>(clampMotionStepMs(petMotionStepMs));
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

int petBaseAssetWidth() {
#if HAS_LOCAL_PET_ASSET
  return PET_ASSET_FRAME_WIDTH;
#else
  return 58;
#endif
}

int petBaseAssetHeight() {
#if HAS_LOCAL_PET_ASSET
  return PET_ASSET_FRAME_HEIGHT;
#else
  return 52;
#endif
}

bool hasScaleSpecificPetAsset() {
#if HAS_LOCAL_PET_ASSET && !defined(DEVICE_PROFILE_GRAY) && defined(PET_ASSET_HAS_SCALE_FRAMES)
  return PET_ASSET_HAS_SCALE_FRAMES;
#else
  return false;
#endif
}

int petScaleLevelIndex() {
#if HAS_LOCAL_PET_ASSET && !defined(DEVICE_PROFILE_GRAY) && defined(PET_ASSET_HAS_SCALE_FRAMES)
  return max(0, min(PET_ASSET_SCALE_LEVELS - 1, petDisplayScale - 1));
#else
  return 0;
#endif
}

int petAssetWidth() {
#if HAS_LOCAL_PET_ASSET && !defined(DEVICE_PROFILE_GRAY) && defined(PET_ASSET_HAS_SCALE_FRAMES)
  if (hasScaleSpecificPetAsset()) {
    return pgm_read_word(&PET_ASSET_SCALE_WIDTHS[petScaleLevelIndex()]);
  }
#endif
  return petBaseAssetWidth();
}

int petAssetHeight() {
#if HAS_LOCAL_PET_ASSET && !defined(DEVICE_PROFILE_GRAY) && defined(PET_ASSET_HAS_SCALE_FRAMES)
  if (hasScaleSpecificPetAsset()) {
    return pgm_read_word(&PET_ASSET_SCALE_HEIGHTS[petScaleLevelIndex()]);
  }
#endif
  return petBaseAssetHeight();
}

int petBoxPadding() {
  return petDisplayScale >= DISPLAY_SCALE_MAX ? 0 : 10;
}

bool petFullscreenMode() {
  return petDisplayScale >= DISPLAY_SCALE_MAX && screenState == SCREEN_IDLE;
}

int petSurfaceHeight() {
  return max(MIN_PET_SURFACE_HEIGHT, footerTop());
}

int petPixelScale() {
  const int areaWidth = M5.Display.width();
  const int areaHeight = max(1, petSurfaceHeight() - 8);
  const int baseWidth = petBaseAssetWidth() + petBoxPadding();
  const int baseHeight = petBaseAssetHeight() + petBoxPadding();
  const int scaleByWidth = max(1, areaWidth / max(1, baseWidth));
  const int scaleByHeight = max(1, areaHeight / max(1, baseHeight));
  return max(1, min(DISPLAY_SCALE_MAX, min(scaleByWidth, scaleByHeight)));
}

int petAssetRenderScale() {
  return hasScaleSpecificPetAsset() ? 1 : petPixelScale();
}

int petBoxWidth() {
  return petAssetWidth() + petBoxPadding() * petAssetRenderScale();
}

int petBoxHeight() {
  return petAssetHeight() + petBoxPadding() * petAssetRenderScale();
}

int headerHeight() {
  return petSurfaceHeight();
}

int footerHeight() {
  if (petFullscreenMode()) {
    return 0;
  }
  return min(96, max(BASE_FOOTER_HEIGHT, 18 + uiTextScale * 10));
}

int footerTop() {
  return M5.Display.height() - footerHeight();
}

int contentTop() {
  const int uiLine = BODY_LINE_HEIGHT * uiTextScale;
  const int overlayHeight = min(150, max(92, uiLine * 2 + bodyLineHeight() * 4 + 8));
  return max(8, footerTop() - overlayHeight);
}

int bodyLineHeight() {
  return BODY_LINE_HEIGHT * bodyTextScale;
}

int maxBodyLinesFrom(int y) {
  return max(1, (footerTop() - y - 4) / bodyLineHeight());
}

int answerCharsPerPage() {
  return max(6, ANSWER_CHARS_PER_PAGE / bodyTextScale);
}

void applyDisplaySettings(JsonVariant display) {
  if (display.isNull()) {
    return;
  }
  petDisplayScale = clampDisplayScale(display["petScale"] | petDisplayScale);
  uiTextScale = clampDisplayScale(display["uiTextScale"] | uiTextScale);
  bodyTextScale = clampDisplayScale(display["bodyTextScale"] | bodyTextScale);
  petAnimationFps = clampAnimationFps(display["animationFps"] | petAnimationFps);
  petMotionStepMs = clampMotionStepMs(display["motionStepMs"] | petMotionStepMs);
  petOffsetX = clampPetOffsetX(display["petOffsetX"] | petOffsetX);
  petOffsetY = clampPetOffsetY(display["petOffsetY"] | petOffsetY);
  applyRgbaSetting(display["screenBackgroundRgba"], screenBackgroundRgba);
  applyRgbaSetting(display["petBackgroundRgba"], petBackgroundRgba);
  applyRgbaSetting(display["textColorRgba"], textColorRgba);
  applyRgbaSetting(display["textBackgroundRgba"], textBackgroundRgba);
  textBorderEnabled = display["textBorderEnabled"] | textBorderEnabled;
  applyRgbaSetting(display["textBorderRgba"], textBorderRgba);
  beepOnAnswer = display["beepOnAnswer"] | beepOnAnswer;
  answerPage = min(answerPage, pageCount(body, answerCharsPerPage()) - 1);
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

template <typename Target>
void drawScaleSpecificLocalPetAssetTo(Target& target, int x, int y) {
#if HAS_LOCAL_PET_ASSET && !defined(DEVICE_PROFILE_GRAY) && defined(PET_ASSET_HAS_SCALE_FRAMES)
  const int levelIndex = petScaleLevelIndex();
  const int frameIndex = petFrame % PET_ASSET_FRAME_COUNT;
  const int width = pgm_read_word(&PET_ASSET_SCALE_WIDTHS[levelIndex]);
  const int height = pgm_read_word(&PET_ASSET_SCALE_HEIGHTS[levelIndex]);
  const uint32_t offset = pgm_read_dword(&PET_ASSET_SCALE_OFFSETS[levelIndex][frameIndex]);
  for (int row = 0; row < height; ++row) {
    int runStart = -1;
    uint16_t runColor = PET_ASSET_TRANSPARENT;
    for (int col = 0; col < width; ++col) {
      const uint16_t color = pgm_read_word(&PET_ASSET_SCALED_PIXELS[offset + row * width + col]);
      if (color == PET_ASSET_TRANSPARENT) {
        if (runStart >= 0) {
          target.drawFastHLine(x + runStart, y + row, col - runStart, runColor);
          runStart = -1;
        }
        continue;
      }
      if (runStart < 0) {
        runStart = col;
        runColor = color;
      } else if (color != runColor) {
        target.drawFastHLine(x + runStart, y + row, col - runStart, runColor);
        runStart = col;
        runColor = color;
      }
    }
    if (runStart >= 0) {
      target.drawFastHLine(x + runStart, y + row, width - runStart, runColor);
    }
  }
#else
  (void)x;
  (void)y;
#endif
}

void drawScaleSpecificLocalPetAsset(int x, int y) {
  drawScaleSpecificLocalPetAssetTo(M5.Display, x, y);
}

template <typename Target>
void drawLocalPetAssetTo(Target& target, int x, int y, int scale) {
#if HAS_LOCAL_PET_ASSET
  if (hasScaleSpecificPetAsset()) {
    drawScaleSpecificLocalPetAssetTo(target, x, y);
    return;
  }
  const int frameIndex = petFrame % PET_ASSET_FRAME_COUNT;
  for (int row = 0; row < PET_ASSET_FRAME_HEIGHT; ++row) {
    for (int col = 0; col < PET_ASSET_FRAME_WIDTH; ++col) {
      const uint16_t color = pgm_read_word(&PET_ASSET_FRAMES[frameIndex][row * PET_ASSET_FRAME_WIDTH + col]);
      if (color != PET_ASSET_TRANSPARENT) {
        target.fillRect(x + col * scale, y + row * scale, scale, scale, color);
      }
    }
  }
#else
  (void)x;
  (void)y;
#endif
}

void drawLocalPetAsset(int x, int y, int scale) {
  drawLocalPetAssetTo(M5.Display, x, y, scale);
}

template <typename Target>
void drawVectorPetAvatarTo(Target& target, int x, int y) {
  const int bounce = (petFrame % 4 == 1) ? -2 : ((petFrame % 4 == 3) ? 1 : 0);
  const bool blink = petFrame % 10 == 0;
  const String state = renderedPetState();
  const uint16_t accent = petAccentColor();
  const uint16_t shadow = TFT_DARKGREY;
  const int s = petPixelScale();
  const int bodyY = y + (10 + bounce) * s;

  target.fillEllipse(x + 26 * s, y + 45 * s, 22 * s, 4 * s, shadow);
  target.fillTriangle(x + 9 * s, bodyY + 4 * s, x + 16 * s, bodyY - 8 * s, x + 22 * s, bodyY + 7 * s, accent);
  target.fillTriangle(x + 31 * s, bodyY + 7 * s, x + 39 * s, bodyY - 8 * s, x + 45 * s, bodyY + 6 * s, accent);
  target.fillRoundRect(x + 6 * s, bodyY + 4 * s, 42 * s, 32 * s, 12 * s, accent);
  target.drawRoundRect(x + 6 * s, bodyY + 4 * s, 42 * s, 32 * s, 12 * s, TFT_WHITE);

  const int tail = petFrame % 6 < 3 ? 0 : 3;
  target.fillCircle(x + (50 + tail) * s, bodyY + 23 * s, 4 * s, accent);

  if (blink) {
    target.drawFastHLine(x + 18 * s, bodyY + 18 * s, 6 * s, TFT_BLACK);
    target.drawFastHLine(x + 32 * s, bodyY + 18 * s, 6 * s, TFT_BLACK);
  } else {
    target.fillCircle(x + 21 * s, bodyY + 18 * s, 3 * s, TFT_BLACK);
    target.fillCircle(x + 35 * s, bodyY + 18 * s, 3 * s, TFT_BLACK);
  }

  if (state == "reacting" || state == "celebrate") {
    target.drawArc(x + 28 * s, bodyY + 23 * s, 8 * s, 5 * s, 15, 165, TFT_BLACK);
  } else if (state == "review") {
    target.drawFastHLine(x + 24 * s, bodyY + 26 * s, 10 * s, TFT_BLACK);
  } else {
    target.fillRect(x + 27 * s, bodyY + 26 * s, s, s, TFT_BLACK);
    target.fillRect(x + 28 * s, bodyY + 26 * s, s, s, TFT_BLACK);
  }
}

void drawVectorPetAvatar(int x, int y) {
  drawVectorPetAvatarTo(M5.Display, x, y);
}

template <typename Target>
void drawPetAvatarTo(Target& target, int x, int y) {
#if HAS_LOCAL_PET_ASSET
  const int bounce = (petFrame % 4 == 1) ? -1 : ((petFrame % 4 == 3) ? 1 : 0);
  const int s = petAssetRenderScale();
  const int inset = (petBoxPadding() / 2) * s;
  drawLocalPetAssetTo(target, x + inset, y + inset + bounce * s, s);
#else
  drawVectorPetAvatarTo(target, x, y);
#endif
}

void drawPetAvatar(int x, int y) {
  drawPetAvatarTo(M5.Display, x, y);
}

bool ensurePetSprite(int width, int height) {
  if (width <= 0 || height <= 0) {
    return false;
  }
  if (petSpriteReady && petSpriteWidth == width && petSpriteHeight == height) {
    return true;
  }
  if (petSpriteReady) {
    petSprite.deleteSprite();
    petSpriteReady = false;
  }
  petSprite.setColorDepth(16);
  petSprite.createSprite(width, height);
  petSpriteReady = petSprite.width() == width && petSprite.height() == height;
  petSpriteWidth = petSpriteReady ? width : 0;
  petSpriteHeight = petSpriteReady ? height : 0;
  return petSpriteReady;
}

int petDrawX(int width) {
  return ((width - petBoxWidth()) / 2) + petOffsetX;
}

int petDrawY(int height) {
  return ((height - petBoxHeight()) / 2) + petOffsetY;
}

void drawTextPanel(int x, int y, int width, int height, int radius) {
  if (height <= 0 || width <= 0) {
    return;
  }
  const uint16_t fill = textPanelFillColor();
  if (radius > 0) {
    M5.Display.fillRoundRect(x, y, width, height, radius, fill);
    if (textBorderEnabled && textBorderRgba.a > 0) {
      M5.Display.drawRoundRect(x, y, width, height, radius, textBorderColor());
    }
  } else {
    M5.Display.fillRect(x, y, width, height, fill);
    if (textBorderEnabled && textBorderRgba.a > 0) {
      M5.Display.drawRect(x, y, width, height, textBorderColor());
    }
  }
}

void drawPetSurfaceSprite() {
  const int width = M5.Display.width();
  const int height = headerHeight();
  const uint16_t screenBackground = screenBackgroundColor();
  const uint16_t petBackground = petBackgroundColor();
  if (!ensurePetSprite(width, height)) {
    M5.Display.fillRect(0, 0, width, height, screenBackground);
    const int petX = petDrawX(width);
    const int petY = petDrawY(height);
    M5.Display.fillRect(petX, petY, petBoxWidth(), petBoxHeight(), petBackground);
    drawPetAvatar(petX, petY);
    needsPetRedraw = false;
    return;
  }

  petSprite.fillSprite(screenBackground);
  const int petX = petDrawX(width);
  const int petY = petDrawY(height);
  petSprite.fillRect(petX, petY, petBoxWidth(), petBoxHeight(), petBackground);
  drawPetAvatarTo(petSprite, petX, petY);
  petSprite.pushSprite(0, 0);
  needsPetRedraw = false;
}

void drawPetSurfaceIfNeeded() {
  if (!needsRedraw && needsPetRedraw) {
    drawPetSurfaceSprite();
    drawScreenContentOverlay(false);
  }
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
  drawPetSurfaceSprite();
}

void drawFooterLabel(const char* label, int left, int width, int y, int align) {
  int x = left + 8;
  const int textWidth = M5.Display.textWidth(label);
  if (align == 1) {
    x = left + max(0, (width - textWidth) / 2);
  } else if (align == 2) {
    x = left + max(0, width - textWidth - 8);
  }
  M5.Display.drawString(label, x, y);
}

void drawFooter(const char* a, const char* b, const char* c) {
  if (footerHeight() <= 0) {
    return;
  }
  const int y = footerTop();
  drawTextPanel(0, y, M5.Display.width(), footerHeight(), 0);
  M5.Display.setTextColor(textForegroundColor(), textPanelFillColor());
  applyUiFont();
  const int third = M5.Display.width() / 3;
  drawFooterLabel(a, 0, third, y + 8, 0);
  drawFooterLabel(b, third, third, y + 8, 1);
  drawFooterLabel(c, third * 2, M5.Display.width() - third * 2, y + 8, 2);
}

void drawScreen() {
  if (!needsRedraw) {
    return;
  }
  needsRedraw = false;
  M5.Display.fillScreen(screenBackgroundColor());
  drawHeader();
  drawScreenContentOverlay(true);
}

void drawScreenContentOverlay(bool includeFooter) {
  applyUiFont();
  const int y0 = contentTop();
  const int uiLine = BODY_LINE_HEIGHT * uiTextScale;
  if (!petFullscreenMode()) {
    const int overlayY = max(0, y0 - 6);
    const int overlayHeight = max(0, footerTop() - overlayY);
    if (overlayHeight > 0) {
      drawTextPanel(4, overlayY, M5.Display.width() - 8, overlayHeight, 6);
    }
  }
  M5.Display.setTextColor(textForegroundColor(), textPanelFillColor());

  if (screenState == SCREEN_PAIRING) {
    drawLine("Pairing with Host Bridge", 8, y0, 36);
    drawLine(String(HOST_BRIDGE_HOST) + ":" + HOST_BRIDGE_PORT, 8, y0 + uiLine, 36);
    drawLine(authToken.length() ? "paired" : "waiting token", 8, y0 + uiLine * 2, 36);
    if (includeFooter) {
      drawFooter("A poll", "B pet", "C idle");
    }
    return;
  }

  if (screenState == SCREEN_IDLE) {
    if (petFullscreenMode()) {
      return;
    }
    drawLine("Idle", 8, y0, 36);
    drawLine(title.length() ? title : "Waiting for Codex event", 8, y0 + uiLine, 36);
    drawLine(body.length() ? body : "Use Host Bridge replay.", 8, y0 + uiLine * 2, 36);
    if (includeFooter) {
      drawFooter("A prev", "B pet", "C next");
    }
    return;
  }

  if (screenState == SCREEN_NOTIFICATION) {
    drawLine("Notification", 8, y0, 36);
    drawLine(title, 8, y0 + uiLine, 42);
    applyBodyFont();
    const int bodyY = y0 + uiLine * 2 + 6;
    drawWrappedBlock(body, 8, bodyY, BODY_TEXT_WIDTH, bodyLineHeight(), maxBodyLinesFrom(bodyY));
    if (includeFooter) {
      drawFooter("A ack", "B pet", "C idle");
    }
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
    if (includeFooter) {
      drawFooter("A up", "B idle", "C down");
    }
    return;
  }

  if (screenState == SCREEN_CHOICE) {
    drawLine("Choice requested", 8, y0, 36);
    drawWrappedBlock(title, 8, y0 + uiLine, BODY_TEXT_WIDTH, BODY_LINE_HEIGHT * uiTextScale, 2);
    for (int i = 0; i < choiceCount; ++i) {
      drawLine(String(static_cast<char>('A' + i)) + ": " + choiceLabels[i], 8, y0 + uiLine * 3 + i * 24 * uiTextScale, 42);
    }
    if (includeFooter) {
      drawFooter("A send", "B send", "C send");
    }
    return;
  }

  drawLine("Error", 8, y0, 36);
  drawLine(lastError, 8, y0 + uiLine, 42);
  if (includeFooter) {
    drawFooter("A retry", "B pet", "C idle");
  }
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

void notifyAnswerBeep() {
  if (!beepOnAnswer) {
    return;
  }
  M5.Speaker.tone(1760, 90);
}

void handleHostEvent(JsonVariant event) {
  const String type = event["type"] | "";
  Serial.printf("host_event type=%s\n", type.c_str());

  if (type == "pet.updated") {
    petName = String(event["pet"]["name"] | "Codex Pet");
    petState = String(event["pet"]["state"] | "idle");
    title = "Pet updated";
    body = String(event["pet"]["spriteRef"] | "fallback");
    applyDisplaySettings(event["display"]);
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
    notifyAnswerBeep();
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
    applyDisplaySettings(event["display"]);
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
  const uint32_t now = millis();
  const uint32_t interval = max(petAnimationIntervalMs(), petMotionStepIntervalMs());
  if (now - lastPetMotionStep >= interval) {
    lastPetMotionStep = now;
    lastPetFrame = now;
    petFrame = (petFrame + 1) % 30;
    markPetDraw();
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
  M5.Speaker.setVolume(128);
  M5.Display.fillScreen(screenBackgroundColor());
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
  drawPetSurfaceIfNeeded();
  delay(LOOP_IDLE_DELAY_MS);
}
