/*
  ESP32-S3 MQTT 点灯案例（Arduino-ESP32 3.x）
  Arduino IDE：选择自己的 ESP32-S3 板型；库管理器安装 PubSubClient。

  1. 填写下面 Wi-Fi、MQTT 主机、端口和账号密码。
  2. MQTT_TOPIC、MQTT_TRIGGER 必须与网页一致。
  3. 收到触发内容后，板载 RGB 灯亮绿灯，3 秒后自动熄灭。

  网页使用 ws:// 或 wss://；本程序使用同一 Broker 的 MQTT TCP/TLS。
  MQTT_HOST 不包含协议前缀、端口或 /mqtt 路径。
  端口以 Broker 控制台提供的 TCP/TLS 端口为准，不要照抄 WebSocket 端口。
*/

#include <Arduino.h>
#include <WiFi.h>
#include <NetworkClientSecure.h>
#include <PubSubClient.h>
#include <time.h>
#include <string.h>

// ---------- 在这里填写自己的配置 ----------
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* MQTT_HOST = "YOUR_MQTT_HOST";
const uint16_t MQTT_PORT = 1883;  // 普通 TCP 示例；TLS 常用 8883，以 Broker 配置为准
const bool MQTT_USE_TLS = false;
const char* MQTT_USERNAME = "";  // 无需认证时留空
const char* MQTT_PASSWORD = "";

const char* MQTT_TOPIC = "project/action";
const char* MQTT_TRIGGER = "YES";  // 也可以改成 0、/success 等，与网页发送内容完全一致

// MQTT_USE_TLS=true 时，将 Broker 对应的可信根证书粘贴在这里。
// 证书校验保持开启；没有填写证书时，程序会停止尝试 TLS 连接。
const char* MQTT_ROOT_CA = R"PEM(
)PEM";

// -1：使用所选板型的 RGB_BUILTIN；若未定义，默认 GPIO48。
// 不同 ESP32-S3 板卡可能使用 GPIO38 或其他引脚，请以自己的板卡资料为准。
const int CUSTOM_RGB_LED_PIN = -1;
const uint8_t LED_BRIGHTNESS = 32;
const unsigned long LED_DURATION_MS = 3000;
// ---------- 配置结束 ----------

#ifdef RGB_BUILTIN
const int BOARD_RGB_LED_PIN = RGB_BUILTIN;
#else
const int BOARD_RGB_LED_PIN = 48;
#endif
const int RGB_LED_PIN = CUSTOM_RGB_LED_PIN >= 0 ? CUSTOM_RGB_LED_PIN : BOARD_RGB_LED_PIN;

WiFiClient plainClient;
NetworkClientSecure secureClient;
Client& transport = MQTT_USE_TLS ? static_cast<Client&>(secureClient) : static_cast<Client&>(plainClient);
PubSubClient mqtt(transport);

bool ledOn = false;
bool configReady = true;
unsigned long ledStartTime = 0;
unsigned long lastWifiAttempt = 0;
unsigned long lastMqttAttempt = 0;
bool firstMqttAttempt = true;

void setLed(bool on) {
  rgbLedWrite(RGB_LED_PIN, 0, on ? LED_BRIGHTNESS : 0, 0);
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  if (strcmp(topic, MQTT_TOPIC) != 0) return;
  const size_t expectedLength = strlen(MQTT_TRIGGER);
  if (length != expectedLength || memcmp(payload, MQTT_TRIGGER, expectedLength) != 0) return;

  setLed(true);
  ledOn = true;
  ledStartTime = millis();  // 再次收到触发时，从最后一次触发重新计时
  Serial.println("LED ON");
}

void setup() {
  Serial.begin(115200);
  setLed(false);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiAttempt = millis();
  Serial.println("Connecting to Wi-Fi...");

  if (MQTT_USE_TLS) {
    if (strstr(MQTT_ROOT_CA, "-----BEGIN CERTIFICATE-----") == nullptr) {
      Serial.println("TLS: paste the broker root CA into MQTT_ROOT_CA first.");
      configReady = false;
      return;
    }
    secureClient.setCACert(MQTT_ROOT_CA);
    // TLS 证书有效期校验需要正确时间；联网后自动同步。
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  }

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setSocketTimeout(1);
  if (!mqtt.setBufferSize(8192)) {
    Serial.println("MQTT buffer allocation failed.");
    configReady = false;
  }
}

void loop() {
  const unsigned long now = millis();
  if (ledOn && now - ledStartTime >= LED_DURATION_MS) {
    setLed(false);
    ledOn = false;
    Serial.println("LED OFF");
  }
  if (!configReady) return;

  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiAttempt >= 10000) {
      lastWifiAttempt = now;
      WiFi.reconnect();
    }
    return;
  }
  if (MQTT_USE_TLS && time(nullptr) < 1700000000) return;

  if (!mqtt.connected()) {
    // 灯亮时不进入可能阻塞的重连，先完成熄灯计时。
    if (ledOn || (!firstMqttAttempt && now - lastMqttAttempt < 5000)) return;
    firstMqttAttempt = false;
    lastMqttAttempt = now;

    const uint64_t chip = ESP.getEfuseMac();
    char clientId[40];
    snprintf(clientId, sizeof(clientId), "esp32s3-led-%04x%08x",
             static_cast<unsigned int>((chip >> 32) & 0xffff),
             static_cast<unsigned int>(chip & 0xffffffff));
    const bool connected = (strlen(MQTT_USERNAME) > 0 || strlen(MQTT_PASSWORD) > 0)
      ? mqtt.connect(clientId, MQTT_USERNAME, MQTT_PASSWORD)
      : mqtt.connect(clientId);
    if (connected) {
      if (mqtt.subscribe(MQTT_TOPIC, 1)) Serial.println("MQTT subscribed.");
      else Serial.println("MQTT subscribe request failed.");
    } else {
      Serial.print("MQTT connect failed, state=");
      Serial.println(mqtt.state());
    }
    return;
  }
  mqtt.loop();
}
