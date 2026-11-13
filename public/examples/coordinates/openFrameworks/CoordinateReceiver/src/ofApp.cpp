#include "ofApp.h"
void ofApp::setup(){receiver.setup(9000);ofSetFrameRate(60);}
void ofApp::update(){
    while(receiver.hasWaitingMessages()){
        ofxOscMessage message;receiver.getNextMessage(message);
        if(message.getAddress()!="/platform/hand/8")continue;
        int count=message.getNumArgs();
        if(count!=2 && count!=3)continue;
        bool valid=true;
        for(int i=0;i<count;i++)valid=valid && message.getArgType(i)==OFXOSC_TYPE_FLOAT;
        if(!valid)continue;
        x=message.getArgAsFloat(0);y=message.getArgAsFloat(1);
        z=count==3?message.getArgAsFloat(2):0;
        received=ofGetElapsedTimef();
    }
}
void ofApp::draw(){
    ofBackground(245);ofSetColor(40);
    bool live=ofGetElapsedTimef()-received<.8f;
    ofDrawBitmapString(live?"Receiving coordinates":"Waiting for coordinates",20,30);
    if(live){
        ofSetColor(100,160,220);ofDrawCircle(x*ofGetWidth(),y*ofGetHeight(),18);
        ofSetColor(40);ofDrawBitmapString("x="+ofToString(x)+" y="+ofToString(y)+" z="+ofToString(z),20,55);
    }
}
