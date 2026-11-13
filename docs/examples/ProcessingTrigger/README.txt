Processing 4 / Java mode
Extract the folder, open ProcessingTrigger.pde in Processing, and install oscP5 from the library manager. Click Run.
In Platform select OSC in a trigger project. Use UDP 9000, /platform/trigger, then send a test. Web edition: run the Platform bridge on the browser computer. Desktop builds use built-in OSC and do not need a separate bridge. Each received String, Integer or Float pulses the circle and displays its value.
Stop other examples listening on port 9000 before running this one.
