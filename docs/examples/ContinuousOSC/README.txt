openFrameworks 0.12.x / ofxOsc
Extract ContinuousOSC inside the SDK's apps/myApps folder. In Project Generator import this folder, select ofxOsc, and generate the project for your OS. Build and run it in your IDE.
Platform: select a continuous control or volume project, choose OSC, UDP 9000, /platform/value. Web edition: run the Platform bridge on the browser computer. Desktop builds use built-in OSC and do not need a separate bridge. The circle maps 0..1 to its radius. The number shows the original float.
Stop other examples listening on port 9000 before running this one.

The circle holds the last value when messages stop; no implicit zero is sent. Add a local receive timeout for your installation.
