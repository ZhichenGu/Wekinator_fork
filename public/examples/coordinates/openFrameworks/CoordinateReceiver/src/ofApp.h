#pragma once
#include "ofMain.h"
#include "ofxOsc.h"
class ofApp : public ofBaseApp {
public:
    void setup() override;
    void update() override;
    void draw() override;
    ofxOscReceiver receiver;
    float x=.5f, y=.5f, z=0;
    float received=-100;
};
