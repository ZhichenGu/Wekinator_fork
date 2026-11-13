# Platform

[中文](#中文) · [English](#english)

## 中文

一个受 Wekinator 启发的小工具，用摄像头和麦克风做交互实验。可以录下动作示范，让它学习识别，也可以接入自己的 API 做图像和声音识别。结果通过 Serial、MQTT 或 OSC 发给 Arduino、ESP32 或其他程序。

### 在哪里使用 Platform？

| 版本 | 入口与状态 |
| --- | --- |
| 网页版 | **[打开 Platform](https://ml-play.onrender.com/)**。无需安装，点击「访客进入」即可开始，右上角可切换中英文。 |
| macOS | [下载 Apple Silicon 0.79（DMG）](https://github.com/ZhichenGu/ml-play/releases/download/v0.79.0/Platform-0.79.0-macOS-arm64.dmg)。打开后将 Platform 拖入「应用程序」。已在 macOS 15.7.5 测试，尚未经过 Apple 公证。 |
| Windows | [下载 Intel/AMD 64 位测试版（EXE）](https://github.com/ZhichenGu/ml-play/releases/download/v0.79.0/Platform-0.79.0-Windows-x64-Setup.exe)。安装包未签名，Windows 10 和 11 的真机安装与设备权限待测。 |

[查看 v0.79.0 发布说明和校验文件](https://github.com/ZhichenGu/ml-play/releases/tag/v0.79.0)。下文对应 0.94 正式源码，桌面安装包为 0.79。线上网页版本以实际部署为准。Windows 安装包供测试，尚未完成 Win10/Win11 真机验收。


### 手部交互范围（0.94）

动作匹配、姿态分类、连续控制、区域停留和动作关系使用单手，并保持当前控制手，另一只手入镜不抢占；持续丢失后才允许接替。录制中检测到换手会取消该次录制，不保存混合示范。仅“直接输出手部坐标”提供单手/双手选择；单手自动追踪一只可用的手，不要求选择左右。创建时固定项目手数，工作台不重复切换；双手项目可选单手输出或双手输出，左右手独立输出。自动单手输出优先保持当前手，短暂遮挡暂停，持续离开后才由另一只接替；原手回来不抢占。双手/混合动作学习暂缓开放，0.84 实验项目和录制保留，可导出备份，不自动转换为单手项目。本版源码已合入 main，网页以部署结果为准。桌面安装包仍为 0.79。

### 直接输出追踪坐标（0.94）

手部、面部和身体追踪均可选择“直接输出坐标”。手部支持单手 21 点、双手 42 点和推荐组合，面部/身体当前最多四点。开启摄像头后选择所需点，按 P 设置平滑与发送频率；在输出方式中选 Serial、MQTT 或 OSC，打开居中窗口，为点命名并勾选 X/Y/Z，完成连接和测试后“应用并返回”，再点击“开始输出”。XY 与镜像预览一致，Z 为相对深度。项目自动保存在当前浏览器。

本版“案例代码”已包含 Processing、openFrameworks、Max/MSP、p5.js 和 TouchDesigner 的教程、官方资料链接与下载。TouchDesigner 支持 OSC In CHOP、MQTT Client DAT 和 Serial DAT。接收项目、消息格式、串口链路说明与待验证项见[坐标案例说明](public/examples/coordinates/README.md)。网页版需下载新版 OSC 桥接。已发布的 0.79 桌面包支持原单手坐标模式；本版双手及录制保护需重新打包才会进入桌面应用。线上网页版本以部署结果为准。

### 可以做什么

| 类别 | 功能 |
| --- | --- |
| 动作追踪 | 手部、面部、身体；在本机运行 |
| 视觉识别 | 找物体、计数、判断画面条件；使用自己的 DeepSeek / OpenAI API Key |
| 声音识别 | 语音关键词：OpenAI / 科大讯飞；声音事件：OpenAI；音量控制：本机处理 |

动作追踪有六种处理方式：

- **动态动作匹配**：录下一次挥手，完成相似动作时触发一次。
- **姿态分类**：录下握拳等姿态，识别并稳定确认后触发一次。
- **连续控制**：给不同姿态设置数值，训练后持续输出中间值，例如 `0.12 → 0.45 → 0.83`。
- **区域与停留**：选一个点，进入指定区域并停留后触发，无需训练。
- **动作关系**：选两个点，判断距离或上下关系，无需训练。
- **坐标输出**：选检测点，直接输出命名的 X/Y/Z 数值，无需示范或训练。

新建项目时，把鼠标放在处理方式上可以查看具体例子。动作学习可以选择「关注部位」的推荐组合，或直接点击骨骼点自定义；修改后需要重新训练。左侧动作名可双击或点击铅笔重命名。按 P 可调整录制时间；学习工作台的大画面向上滚出约三分之一后会出现可拖动的小预览。坐标页目前没有浮动小预览。

动态动作可切换原版算法与实验增强，增强包含动作特征、起止切分和多示范匹配。切换后需重新训练，原始录制保留；用独立测试比较效果。面部新增嘴部、眼睑和眉部组合。视觉识别可选择送检区域，声音事件支持参考音频裁切，音量支持直接标定上下端点。

### 如何使用

1. 新建项目，选择输入和处理方式。
2. 动作学习先录制示范、再训练；区域与动作关系直接设置规则；坐标输出直接选点。视觉和声音 API 使用者需填写自己的凭证。
3. 选择状态灯、Serial、MQTT 或 OSC，测试后开始运行。

Serial 用 USB 连接设备，建议使用桌面 Chrome 或 Edge。MQTT 在网页中填写 Broker 的 WebSocket 地址，HTTPS 网站使用 `wss://`。首页有连接教程和 Arduino / ESP32-S3 案例下载。

### OSC 接收

网页版在浏览器所在电脑安装 Node.js 22.12 或更高版本，在下载目录运行 `node platform_osc_bridge.mjs`。首页「教程与示例 → OSC 入门」有分步说明和下载，「案例代码」也提供[本机桥接](public/examples/platform_osc_bridge.mjs)和 [Max 接收案例](public/examples/osc_receiver.maxpat)。下载 [Processing 动作触发草图](public/examples/processing_trigger.zip)（oscP5）或 [openFrameworks 连续数值工程](public/examples/openframeworks_value.zip)（ofxOsc）。一次只运行一个监听同一端口的案例。

按 P 选择 OSC 输出，填写接收端 IP（同机 `127.0.0.1`，跨设备填私有 IPv4）、UDP 监听端口（默认 9000）和 OSC 地址。触发默认向 `/platform/trigger` 发送动作名或 YES/NO 文本，可改为自定义 String、Integer（int32）或 Float（float32）。发送整数或命名坐标需下载并重启新版桥接。连续数值向 `/platform/value` 发送 float。点「应用目标」并测试，按浏览器提示允许本地网络访问，在接收软件中确认收到。

如果启动桥接时报 `EADDRINUSE`，表示本机桥接端口 8765 已被占用。先确认是否已经运行了 Platform 桥接；若是，直接复用。网页里的 9000 是接收软件的 UDP 端口，修改它不能解决桥接启动冲突。

已保存的项目在当前浏览器中，刷新后可以从首页重新打开。各类项目自动保存；请等待顶部显示「已保存在此浏览器」。若提示保存失败，先导出备份。MQTT、OSC 等连接参数的「保存配置／应用目标」仍需点击；这与项目自动保存是两件事。可导出备份，不会跟随账号同步。API Key 和 MQTT 密码不写入项目。动作追踪在本机处理；API 识别会把提交的图片或音频经网站服务发给所选平台，使用你自己的额度。

### 本地运行

需要 Node.js 22.12 或更高版本。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址。正式运行：

```sh
npm run build
npm start
```

检查代码用 `npm test`。账号管理用 `npm run users`。项目使用 React、TypeScript、Vite、Node.js 和 MediaPipe；视觉与声音 API 需要 Node 服务，不能只部署静态文件。

### 使用桌面版

桌面版内含运行环境及手、脸、身体模型。追踪、训练和音量控制在本机运行，OSC 可直接向接收端发送。云端识别需要联网和自己的 API 凭证，MQTT 需要可访问的 Broker。网页项目迁移到桌面版时，先在网页「导出项目」，再在应用首页「打开项目」。本地 Mac 测试包使用临时签名，尚未通过 Apple 公证。Windows 测试包尚未签名。构建命令与各平台验收记录见[发布说明](docs/RELEASING.md)。

## English

A small tool inspired by Wekinator, built for interactive experiments with a camera and microphone. Record examples to teach it gestures and poses, or use your own API credentials for image and audio recognition. Send results to Arduino, ESP32 or other software through Serial, MQTT or OSC.

### Where can I use Platform?

| Edition | Availability |
| --- | --- |
| Web | **[Open Platform](https://ml-play.onrender.com/)** and choose **Continue as guest**. No installation required. Switch languages in the top-right corner. |
| macOS | [Download for Apple Silicon (DMG, 0.79)](https://github.com/ZhichenGu/ml-play/releases/download/v0.79.0/Platform-0.79.0-macOS-arm64.dmg). Open it and drag Platform into Applications. Tested on macOS 15.7.5. This build has not been notarized by Apple. |
| Windows | [Download the Intel/AMD x64 preview (EXE)](https://github.com/ZhichenGu/ml-play/releases/download/v0.79.0/Platform-0.79.0-Windows-x64-Setup.exe). The installer is unsigned. Installation and device access on Windows 10 and 11 are awaiting real-device tests. |

[Read the v0.79.0 release notes and find the checksums](https://github.com/ZhichenGu/ml-play/releases/tag/v0.79.0). The steps below describe the 0.94 source. Desktop installers are version 0.79; the online web version depends on deployment. The Windows installer is for testing and still awaits Windows 10/11 real-device validation.


### Hand interaction scope (0.94)

Action matching, pose classification, continuous control, dwell and relation rules keep one active hand; a second hand does not preempt it. Handover follows sustained loss. A detected hand change during recording cancels the take instead of saving a mixed-hand example. Only direct coordinate output offers Single/Two hands. Single automatically tracks one available hand, without asking for left or right. Project capacity is fixed at creation. Two-hand projects offer single-hand or two-hand output, with independent channels. Automatic single-hand output keeps the current hand, pauses on brief occlusion and hands over only after sustained loss; the returning hand does not take control back. Two-hand/mixed learning is on hold. Existing 0.84 experimental projects and recordings remain exportable and are not converted into single-hand data. These changes are included in main. The website version depends on deployment. Desktop installers remain at 0.79.

### Direct tracking coordinates (0.94)

Hand, face and body projects can stream coordinates directly. Hands support all 21 landmarks on one hand or all 42 on both hands, plus presets. Face and body currently support four landmarks. Press P for smoothing and rate settings; choose Serial, MQTT or OSC to open the naming window, name each point, choose X/Y/Z, connect and test, then Apply and return and Start output. XY follows the mirrored preview and Z is relative depth. Project settings save automatically in the current browser.

The source version’s Examples section includes downloadable projects, guides and official references for Processing, openFrameworks, Max/MSP, p5.js and TouchDesigner. TouchDesigner supports OSC In CHOP, MQTT Client DAT and Serial DAT. See the [coordinate receiver guide](public/examples/coordinates/README.md) for formats, serial topology and pending receiver tests. Web OSC needs the updated bridge. Published v0.79 desktop installers include the original single-hand coordinate mode. The updated hand features require new desktop builds. Desktop changes require rebuilding; the online web version depends on deployment.

### What it does

| Category | Features |
| --- | --- |
| Motion tracking | Hands, face and body; runs locally |
| Visual recognition | Object detection, counting and visual conditions; your own DeepSeek / OpenAI API key |
| Audio recognition | Speech keywords: OpenAI / iFLYTEK; sound events: OpenAI; volume control: local |

Motion tracking offers six methods:

- **Dynamic action matching**: record a wave, then trigger once after a similar movement.
- **Pose classification**: record a held pose, such as a fist, and trigger after stable recognition.
- **Continuous control**: assign values to poses, train, then output intermediate values such as `0.12 → 0.45 → 0.83`.
- **Region and dwell**: choose one point and trigger when it stays in a region. No training needed.
- **Pose relationships**: choose two points and check their distance or vertical order. No training needed.
- **Coordinates**: select landmarks and stream named X/Y/Z values without demonstrations or training.

Hover over a method when creating a project to see examples. For motion learning, choose a focus preset or click landmarks to customize the points used. Retrain after changing them. Double-click an action name or click its pencil to rename it. Press P to adjust recording times; in the learning workspace, a draggable preview appears after about one third of the camera view scrolls above the viewport. The coordinate page does not currently have a floating preview.

### Getting started

1. Create a project and choose an input and processing method.
2. Record and train for gesture or pose learning, set rules for regions and relationships, or select points for direct coordinates. API recognition needs your own credentials.
3. Choose a status light, Serial, MQTT or OSC output, test it, then start.

For Serial, connect your device over USB and use desktop Chrome or Edge. For MQTT, enter the broker’s WebSocket address; HTTPS sites require `wss://`. The home page includes connection guides and Arduino / ESP32-S3 example downloads.

### Receiving OSC

For the web edition install Node.js 22.12 or later on the browser computer and run `node platform_osc_bridge.mjs` from the downloads folder. Get the [bridge](public/examples/platform_osc_bridge.mjs) and [Max patch](public/examples/osc_receiver.maxpat) under Learn & Connect → OSC quick start, or from Example code. Download the [Processing trigger sketch](public/examples/processing_trigger.zip) (oscP5) or [openFrameworks continuous example](public/examples/openframeworks_value.zip) (ofxOsc). Run one receiver per port.

Press P, select OSC, and enter the receiver IP (127.0.0.1 on the same machine, or a private IPv4 on the LAN), UDP port (default 9000), and OSC address. Triggers send a custom String, Integer (int32) or Float (float32) to `/platform/trigger` and continuous controls send floats to `/platform/value`. Download and restart the updated bridge for integer and named-coordinate support. Apply the target, test send, allow local network access if prompted, and check the receiver.

If the bridge reports `EADDRINUSE`, its local port (8765) is already in use. If Platform’s bridge is already running, use that instance. The UDP port in the web form (9000 by default) belongs to the receiving software; changing it will not fix a bridge startup conflict.

Saved projects stay in this browser and can be reopened from the home page after a refresh. All project types save automatically; wait for **Saved in this browser**. Export a backup if saving fails. Connection settings such as MQTT Save configuration or OSC Apply target still need their own action; those are separate from project autosave. Export projects for backup; signing in does not sync them. API keys and MQTT passwords are not included in project files. Motion tracking runs locally. API recognition sends submitted images or audio through the website’s server to your chosen provider and uses your own API credit.

### Running locally

Use Node.js 22.12 or later. Run `npm ci`, then `npm run dev` and open the address shown in the terminal. For production, run `npm run build`, then `npm start`.

Run checks with `npm test` and manage accounts with `npm run users`. Built with React, TypeScript, Vite, Node.js and MediaPipe. Image and audio API features need the Node server; static hosting alone is not enough.

### Using the desktop edition

The desktop app bundles its runtime and hand, face and body models. Tracking, training and volume control run locally. OSC sends directly to your receiver. Cloud recognition needs an internet connection and your own credentials. MQTT needs a reachable broker. To move a project from the web, choose **Export project** in the browser and **Open project** on the app’s home screen. The local Mac test build is ad hoc signed and has not been notarized. The Windows test installer is unsigned. See the [release notes and build instructions](docs/RELEASING.md).



维护教程与下载包时，见[当前交互与验收](docs/当前交互与验收.md)和[发布说明](docs/RELEASING.md)。

For tutorial verification and source/archive checks, see the [current validation notes](docs/当前交互与验收.md) and [release guide](docs/RELEASING.md).

全部当前说明与历史记录分类见[文档导航](docs/README.md)。

See the [documentation index](docs/README.md) for current guides and historical records.
