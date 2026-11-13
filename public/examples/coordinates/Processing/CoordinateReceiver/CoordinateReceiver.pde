// Processing Java mode. Install oscP5 using Sketch > Import Library > Manage Libraries.
// Platform OSC target 127.0.0.1:9000, base address /platform/hand, point 8.
import oscP5.*;
import processing.serial.*;
OscP5 osc;
Serial serial;
final boolean USE_SERIAL = false;
float x = 0.5, y = 0.5, z = 0;
long received = -10000;
void setup() {
  size(720, 480);
  if (USE_SERIAL) {
    printArray(Serial.list());
    // Select a real receiving port. A virtual pair or device relay is needed
    // when Platform sends from another port. Never open the same port twice.
    serial = new Serial(this, Serial.list()[0], 115200);
    serial.bufferUntil('\n');
  } else osc = new OscP5(this, 9000);
}
void draw() {
  background(245);
  fill(40);
  boolean live = millis() - received < 800;
  text(live ? "Receiving XY / XYZ" : "Waiting for coordinates", 20, 30);
  if (live) {
    fill(100, 160, 220);
    ellipse(x * width, y * height, 36, 36);
    fill(40); text("x=" + x + " y=" + y + " z=" + z, 20, 55);
  }
}
void oscEvent(OscMessage message) {
  if (message.checkAddrPattern("/platform/hand/8") &&
      (message.checkTypetag("ff") || message.checkTypetag("fff"))) {
    x = message.get(0).floatValue(); y = message.get(1).floatValue();
    z = message.checkTypetag("fff") ? message.get(2).floatValue() : 0;
    received = millis();
  }
}
void serialEvent(Serial port) {
  String line = port.readStringUntil('\n');
  if (line == null) return;
  try {
    JSONObject frame = parseJSONObject(line.trim());
    if (!frame.getString("mode").equals("hand")) return;
    JSONArray points = frame.getJSONArray("points");
    for (int i=0; i<points.size(); i++) {
      JSONObject p = points.getJSONObject(i);
      if (p.getInt("id") != 8) continue;
      x = p.getFloat("x"); y = p.getFloat("y");
      z = p.hasKey("z") ? p.getFloat("z") : 0;
      received = millis();
    }
  } catch (Exception error) { println("Invalid coordinate JSON"); }
}
