/* Numeric Serial receiver. Platform: 115200 baud, plain number, LF.
   Receives decimal or negative values and prints them; no actuator control.
   Both complete numbers and line endings are checked; overlong lines discarded.
*/
#include <Arduino.h>
#include <stdlib.h>
#include <math.h>
char line[64];
size_t used = 0;
bool overflow = false;
void setup() { Serial.begin(115200); }
void loop() {
  while (Serial.available()) {
    const char c = static_cast<char>(Serial.read());
    if (c == '\n') {
      if (!overflow && used > 0) {
        line[used] = '\0';
        char* end = nullptr;
        const double value = strtod(line, &end);
        if (end != line && *end == '\0' && isfinite(value)) {
          Serial.print("value="); Serial.println(value, 3);
          // Use value here. No received data does not mean zero.
        }
      }
      used = 0; overflow = false;
    } else if (c != '\r') {
      if (c == '\0') overflow = true;
      if (used < sizeof(line) - 1) line[used++] = c;
      else overflow = true;
    }
  }
}
