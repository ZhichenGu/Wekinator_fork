// Processing Java mode. Install oscP5 via Sketch > Import Library.
import oscP5.*;

OscP5 receiver;
volatile int lastTrigger = -2000;
volatile String lastMessage = "Waiting for a trigger";

void setup() {
  size(560, 320);
  receiver = new OscP5(this, 9000);
  textAlign(CENTER, CENTER);
}

void draw() {
  background(22, 29, 38);
  float pulse = constrain(1 - (millis() - lastTrigger) / 450.0, 0, 1);
  noStroke();
  fill(80 + 150 * pulse, 175, 210);
  circle(width / 2, height / 2 - 20, 64 + 100 * pulse);
  fill(245);
  text(lastMessage, width / 2, height - 48);
}

void oscEvent(OscMessage message) {
  if (!message.checkAddrPattern("/platform/trigger")) return;
  String value;
  if (message.checkTypetag("s")) value = message.get(0).stringValue();
  else if (message.checkTypetag("i")) value = str(message.get(0).intValue());
  else if (message.checkTypetag("f")) value = str(message.get(0).floatValue());
  else return;
  lastMessage = message.typetag() + "   " + value;
  lastTrigger = millis();
}
