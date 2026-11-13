# Platform coordinate receivers / 坐标接收案例

These are receiver source examples for the current coordinate feature. The published v0.75 desktop installers do not include coordinate mode. Web changes appear online only after deployment; changing this source folder does not update installed apps.
这些是当前坐标功能的接收源码示例。已发布的 0.75 桌面包没有坐标模式；网页需部署后才更新，源码修改也不会更新已安装的桌面应用。

## First connection / 先跑通一个连接

1. Create a hand coordinate project: tracking → hand → direct coordinates. Keep point 8, output name `index_tip`, X/Y, 10 Hz and light smoothing.
2. Run one desktop receiver below on UDP 9000. For the web edition, run the **updated** `platform_osc_bridge.mjs` on the browser computer; desktop builds that include coordinates use their built-in OSC sender.
3. In Platform press P → Output → OSC. Set the base address `/platform/hand`, open Connection and test, set receiver `127.0.0.1` and port `9000`, and apply any changed target.
4. Test send while the naming window is open: it sends the draft axes with X=0.5, Y=0.5, Z=0 as selected. The example dot briefly appears at the centre. This checks the connection, not camera recognition.
5. Apply and return, enable the camera, then Start output. On another receiving computer, use its private IPv4 instead of 127.0.0.1. Leave the web bridge on the browser computer.

先建手部坐标项目，保持默认食指尖点 8、名称 index_tip、X/Y、10 Hz。只开一个 UDP 9000 接收程序。网页版需在浏览器所在电脑启动新版桥接。按 P 选 OSC，基础地址 /platform/hand，展开连接参数，填写接收端 IP、端口并应用修改。先测试发送，再“应用并返回”、开启摄像头、开始输出。测试用中间值只检查链路。

The Processing, openFrameworks, Max Serial and p5.js examples start with **hand / index_tip / point 8**. For face, pose, other points or names, edit their mode checks, OSC paths or JSON keys accordingly. TouchDesigner’s JSON callback accepts all three modes. They are not automatic multi-point visualizers.
Processing、openFrameworks、Max Serial 和 p5.js 默认只演示 hand / index_tip / 点 8；改脸部、身体或点名称时须改接收代码。TouchDesigner JSON 回调支持三种 mode。示例不是自动显示所有点的通用工作台。

![Platform coordinate settings](screenshots/platform.jpg)

## Message contract / 消息格式

Press P → Output → Serial / OSC / MQTT to name points and select axes. Names use 1–16 ASCII letters, digits or underscores, start with a letter and must differ between points. Apply and return saves names and axes; Esc or the backdrop discards that draft. Connection controls have their own save/apply actions and are not rolled back by cancelling names. Test send uses the current naming draft, while running uses the applied configuration.
名称限 1–16 个英文字母、数字或下划线，以字母开头，各点不同。“应用并返回”保存名称与选轴；Esc 或点窗口外放弃该草稿，已保存的连接参数保留。测试用草稿，运行用已应用设置。

Serial: one UTF-8 JSON object per LF-terminated line, default 115200 baud. MQTT: the same JSON per message, default topic `platform/coordinates`. This is **not** the plain-number payload used by the Arduino numeric examples. Only selected axes appear:
Serial 每行一帧 JSON，以 LF 结束，默认 115200。MQTT 每条消息一帧，默认主题 platform/coordinates。不要用只收纯数字的 Arduino 示例接坐标 JSON。只包含勾选的轴：

```json
{"mode":"hand","t":12345,"values":{"index_tip_x":0.42,"index_tip_y":0.63,"wrist_x":0.51,"wrist_y":0.72}}
```

OSC: one Float per address, for example `/platform/hand/index_tip/x`, `/platform/hand/index_tip/y`, and `/platform/hand/index_tip/z` only if Z is selected. These are separate UDP datagrams, not an atomic frame. XY increases right/down in the mirrored preview, clamped to 0–1. Z is model-relative depth, not metres or camera distance. JSON `t` is sender-local monotonic milliseconds, not a shared clock.
OSC 每轴一个地址、一个 Float。多个轴是独立 UDP 包，不能保证同一时刻到达。XY 与镜像画面一致，右下递增，范围 0–1；Z 为相对深度，不是米或摄像头距离。t 是发送页的单调毫秒时钟，不是跨电脑统一时钟。

Old 0.77 coordinate projects retain `/platform/hand/8` with XY/XYZ Float vectors and JSON `points` arrays until names and axes are applied. Processing, openFrameworks and the JSON parsers support that legacy format. The supplied Max OSC patch demonstrates **named axes only**; edit its route/unpack objects to receive a legacy vector, or apply named axes in Platform.
旧 0.77 项目应用名称前保留按点编号的 OSC 向量和 points 数组。随附解析代码兼容旧格式，但 Max OSC 工程仅展示新命名轴；可在 Platform 应用命名设置，或自行调整 route/unpack 接旧向量。

If any selected point is missing or low-confidence, the sender pauses the entire frame. Recovery restarts smoothing from current coordinates. No zero reset or loss message is sent. Use the receiver’s local receipt time to expire values after about 0.8 seconds (increase for slower imported rates). Drawing examples retain the last/default values of omitted axes; start with X/Y selected. Max number boxes hold their values on loss, so add a receiver timeout for an installation.
选中任一点丢失或低可信时整帧暂停，恢复后从当前位置重新平滑，不自动发零或丢失消息。接收端用本机接收时间做约 0.8 秒超时，导入低频项目可加长。绘图示例对未发送轴保留上次值或初值，首次建议选 X/Y。Max 数框丢失后保留最后值，装置自行加入超时。

## Processing

Open `Processing/CoordinateReceiver/CoordinateReceiver.pde` in Java mode and install oscP5 via the library manager. Run, then use the first-connection settings above. The dot moves with the fingertip and disappears after timeout. Serial parsing is optional: set `USE_SERIAL=true` and choose a receiving port from `Serial.list()`. It needs the two-ended serial link described below.
用 Java 模式打开 PDE 并安装 oscP5，运行后按上方设置发送。Serial 为可选路径，改 USE_SERIAL 与接收端口，需要真实双端链路。

[oscP5](https://sojamo.de/libraries/oscP5/) · [Processing Serial](https://processing.org/reference/libraries/serial/index.html)

## openFrameworks

Copy `openFrameworks/CoordinateReceiver` into your SDK’s `apps/myApps`. Import/update it in Project Generator with `ofxOsc`, then compile for your OS. The package contains source, not a compiled application. UDP 9000 and the named hand paths match Processing; the dot expires after 0.8 seconds.
复制工程至 SDK 的 apps/myApps，用 Project Generator 导入并启用 ofxOsc，再编译。下载的是源码，不是可直接运行的应用。

[ofxOsc receiver](https://openframeworks.cc/documentation/ofxOsc/ofxOscReceiver/)

## Max / MSP

Open `Max/CoordinateOSC.maxpat`: built-in `udpreceive 9000 → route /platform/hand/index_tip/x /platform/hand/index_tip/y /platform/hand/index_tip/z → number boxes`. No extra OSC external is required. Only selected axes update; the Z box is unused in XY mode. The patch holds its last values on loss.
打开 Max 坐标工程即可接命名轴，只更新勾选的轴。无需额外 OSC 外部对象，XY 时忽略 Z 数框。停止后数框保留最后值。

`Max/CoordinateSerial.maxpat` uses `serial` and `coordinate_serial.js`. Click `print` to list ports, edit `serial a 115200` to the receiving port, then enable polling. Four outputs are X, Y, Z, point ID. Keep the JS file beside the patch. This also requires a separate receiving end, not the same USB port already open in Platform.
Serial 工程点 print 列端口，修改接收端口再开轮询。四路为 X、Y、Z、点编号，JS 与工程同目录。不能与 Platform 同时打开同一个 USB 串口。

[Max udpreceive](https://docs.cycling74.com/reference/udpreceive/) · [Max serial](https://docs.cycling74.com/reference/serial/)

## p5.js (MQTT / WSS)

Serve the `p5js` folder locally, for example `python3 -m http.server 8000`, then open `http://localhost:8000`. Alternatively copy sketch.js into p5 Web Editor and add the MQTT.js script from index.html. CDN libraries need internet on first load. This browser example uses **MQTT, not OSC/UDP**.
本地服务器打开 p5js 文件夹，或复制到 p5 Web Editor 并加入 MQTT.js。首次加载 CDN 库需联网。本例走 MQTT，不直接收 OSC/UDP。

Fill the same broker WSS URL and topic in Platform and the receiver; authenticate each with an account allowed to publish or subscribe. Client IDs must differ (automatic IDs are fine). Connect the example, wait for subscription confirmation, connect Platform and start output. Credentials remain in memory. Retained messages and unrelated topics do not refresh coordinates.
两端使用同一 Broker、Topic 和各自可用的账号，Client ID 不同。接收端等待订阅确认，再让 Platform 连接并输出。密码只留内存；保留消息或无关主题不作为当前坐标。

[p5.js](https://p5js.org/reference/) · [MQTT.js](https://github.com/mqttjs/MQTT.js)

## TouchDesigner

This download contains callbacks and instructions, **not** a ready-made `.toe` or `.tox`.
下载包包含回调与说明，不含现成 .toe/.tox 工程。

### OSC

Create OSC In CHOP, enable Active, UDP, Network Port 9000. Initially leave OSC Address Scope at `*`. Test send using base `/platform/hand` and name `index_tip`; inspect the channel names actually received before filtering with Select CHOP. Slashes may be converted to underscores or removed by prefix-stripping settings. Do not assume that a literal `/platform/hand/*` filter will match every build’s resulting channel names. Z exists only when selected. Use Rename CHOP as needed. For a centred TOP with Y upward, map X to `x-0.5` and Y to `0.5-y` before exporting to Transform TOP. OSC In CHOP can hold old values when packets stop; add an arrival/timeout check for your installation.
先保持范围 *，测试后从实际通道列表选择。通道名可能将斜杠转成下划线，也受前缀去除设置影响。未选 Z 就没有 Z。TOP 位移可用 x-0.5、0.5-y 转换。停止后 CHOP 可能保留旧值，装置需检查消息新鲜度。

### MQTT

MQTT Client DAT Network Address accepts a URI such as `ssl://YOUR_HOST:8883` or a broker-supported `wss://YOUR_HOST:8084/mqtt`, depending on TouchDesigner build and broker support. Use the actual endpoint and leave certificate verification enabled. It is not restricted to TCP/TLS. Create a sibling Table DAT named `coordinates`; paste `coordinate_callbacks.py` into the receiver’s callbacks DAT. Set `TOPIC` to match Platform. `onConnect` subscribes; `onMessage` accepts current messages on that topic and fills the table. Named JSON produces `channel, value, received_seconds` columns; legacy JSON produces point rows. Use DAT to CHOP or expressions. Compare the final timestamp with Python `time.monotonic()` for expiry, not the timeline or JSON t.
MQTT Client DAT 支持软件与 Broker 可用的 tcp/ssl/ws/wss 地址，不必强制换成 TCP。填写真实地址、账号，保留证书校验；建立同级 coordinates Table DAT 并设置回调，脚本 TOPIC 与网页一致。最后一列是 Python 单调接收时间，超时用同一时钟比较。

### Serial

Create Serial DAT on the receiving port at 115200, set one message per LF-terminated line, add the same coordinates table and callbacks. `onReceive(dat, rowIndex, message, bytes)` parses each complete JSON line. If your version generates a different callback signature, keep its template and call `write_frame(dat, message)` from it. The serial link still needs two ends.
按完整 LF 行接收，指定回调与 coordinates 表。若版本的回调签名不同，保留其自动模板，在其中调用 write_frame(dat, message)。串口链路仍须双端连通。

[OSC In CHOP](https://docs.derivative.ca/OSC_In_CHOP) · [MQTT Client DAT](https://docs.derivative.ca/MQTT_Client_DAT) · [MQTT callbacks](https://docs.derivative.ca/MqttclientDAT_Class) · [Serial DAT](https://docs.derivative.ca/Serial_DAT)

## Serial topology / 串口链路

A USB serial port is normally exclusive. Platform and the receiver cannot both open it. Use a configured virtual serial pair (one end per application) or a device forwarding between two ports. Web Serial may not expose every virtual port on every OS/driver. For a direct same-computer desktop connection, start with OSC. Arduino numeric and LED sketches do not forward coordinate JSON.
同一 USB 口通常只能被一个程序占用。虚拟串口对各用一端，或设备在两个端口间转发；浏览器是否能列出虚拟口依系统驱动。桌面软件同机优先试 OSC，Arduino 点灯/数值示例不转发坐标 JSON。

## Verification / 验证范围

Coordinate math and OSC bytes are tested with synthetic points and local UDP receivers. JS parsers, MQTT subscription-state handling and TouchDesigner callbacks have automated tests using controlled inputs; this is not a running Processing, openFrameworks, Max or TouchDesigner installation. Source packages are checked against their source files. Camera model loading was checked with a synthetic image, not a human accuracy study. Real camera quality, external receiver compilation, real broker permissions and physical Serial links remain to be verified in your setup.
已检查坐标算法、本机 UDP 数据、受控输入下的 JS/Python 回调与下载包一致性。软件工程未冒充在 Processing、openFrameworks、Max、TouchDesigner 中完成实机运行；真人效果、实际 Broker 权限与物理串口仍待验证。
