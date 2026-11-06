/* ESP32-S3 numeric MQTT receiver (Arduino-ESP32 3.x + PubSubClient).
   Set Wi-Fi, broker TCP/TLS host and port, credentials and trusted root CA.
   Match Platform topic; send a plain numeric payload. Browser WSS and device
   MQTT TCP/TLS ports differ. Prints values; does not control hardware.
*/
#include <Arduino.h>
#include <WiFi.h>
#include <NetworkClientSecure.h>
#include <PubSubClient.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>
#include <math.h>

// ---------- 在这里填写自己的配置 ----------
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* MQTT_HOST = "YOUR_MQTT_HOST";
const uint16_t MQTT_PORT = 1883;  // 普通 TCP 示例；TLS 常用 8883，以 Broker 配置为准
const bool MQTT_USE_TLS = false;
const char* MQTT_USERNAME = "";  // 无需认证时留空
const char* MQTT_PASSWORD = "";

const char* MQTT_TOPIC = "project/action";

// MQTT_USE_TLS=true 时，将 Broker 对应的可信根证书粘贴在这里。
// 证书校验保持开启；没有填写证书时，程序会停止尝试 TLS 连接。
const char* MQTT_ROOT_CA = R"PEM(
)PEM";

WiFiClient plainClient;
NetworkClientSecure secureClient;
Client& transport = MQTT_USE_TLS ? static_cast<Client&>(secureClient) : static_cast<Client&>(plainClient);
PubSubClient mqtt(transport);

bool configReady = true;
unsigned long ledStartTime = 0;
unsigned long lastWifiAttempt = 0;
unsigned long lastMqttAttempt = 0;
bool firstMqttAttempt = true;

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  if (strcmp(topic, MQTT_TOPIC) != 0 || length == 0 || length >= 64) return;
  for (unsigned int i = 0; i < length; ++i) if (payload[i] == 0) return;
  char text[64]; memcpy(text, payload, length); text[length] = 0;
  char* end = nullptr; const double value = strtod(text, &end);
  if (end == text || *end != 0 || !isfinite(value)) return;
  Serial.print("value="); Serial.println(value, 3);
  // Use the received value here. No messages does not mean zero.
}

void setup() {
  Serial.begin(115200);

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
    if (!firstMqttAttempt && now - lastMqttAttempt < 5000) return;
    firstMqttAttempt = false;
    lastMqttAttempt = now;

    const uint64_t chip = ESP.getEfuseMac();
    char clientId[40];
    snprintf(clientId, sizeof(clientId), "esp32s3-value-%04x%08x",
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
