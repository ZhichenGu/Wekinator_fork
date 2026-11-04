const int LED_PIN = LED_BUILTIN;

unsigned long ledStartTime = 0;
const unsigned long ledDuration = 3000; // 3秒
bool ledOn = false;

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(50);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
}

void loop() {
  // 接收网页串口指令
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "/success") {
      digitalWrite(LED_PIN, HIGH);
      ledStartTime = millis();
      ledOn = true;

      Serial.println("LED ON");
    }
  }

  // 3秒后自动熄灭
  if (ledOn && millis() - ledStartTime >= ledDuration) {
    digitalWrite(LED_PIN, LOW);
    ledOn = false;

    Serial.println("LED OFF");
  }
}
