#include "ofMain.h"
#include "ofxOsc.h"

class ContinuousOSC : public ofBaseApp {
public:
    void setup() override {
        receiver.setup(9000);
        ofSetWindowTitle("Platform - continuous OSC");
    }

    void update() override {
        ofxOscMessage message;
        while (receiver.getNextMessage(message)) {
            if (message.getAddress() == "/platform/value" &&
                message.getNumArgs() == 1 && message.getArgType(0) == OFXOSC_TYPE_FLOAT) {
                value = message.getArgAsFloat(0);
                received = true;
            }
        }
    }

    void draw() override {
        ofBackground(22, 29, 38);
        ofSetColor(80, 175, 210);
        const float radius = ofMap(value, 0, 1, 18, 115, true);
        ofDrawCircle(ofGetWidth() / 2, ofGetHeight() / 2, radius);
        ofSetColor(245);
        ofDrawBitmapString(received ? ofToString(value, 3) : "Waiting for /platform/value", 20, 30);
    }

private:
    ofxOscReceiver receiver;
    float value = 0;
    bool received = false;
};

int main() {
    ofSetupOpenGL(560, 320, OF_WINDOW);
    ofRunApp(std::make_shared<ContinuousOSC>());
}
