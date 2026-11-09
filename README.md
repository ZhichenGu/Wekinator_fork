# Platform

[中文](#中文) · [English](#english)

## 中文

一个受 Wekinator 启发的小工具，用摄像头和麦克风做交互实验。可以录下动作示范，让它学习识别，也可以接入自己的 API 做图像和声音识别。结果通过 Serial 或 MQTT 发给 Arduino、ESP32 或其他程序。

[打开网站](https://wekinator-fork.onrender.com/) → 点击「访客进入」，或使用账号登录。右上角可以切换中英文。

### 可以做什么

| 类别 | 功能 |
| --- | --- |
| 动作追踪 | 手部、面部、身体；在本机运行 |
| 视觉识别 | 找物体、计数、判断画面条件；使用自己的 DeepSeek / OpenAI API Key |
| 声音识别 | 语音关键词：OpenAI / 科大讯飞；声音事件：OpenAI；音量控制：本机处理 |

动作追踪有五种处理方式：

- **动态动作匹配**：录下一次挥手，完成相似动作时触发一次。
- **姿态分类**：录下握拳等姿态，识别并稳定确认后触发一次。
- **连续控制**：给不同姿态设置数值，训练后持续输出中间值，例如 `0.12 → 0.45 → 0.83`。
- **区域与停留**：选一个点，进入指定区域并停留后触发，无需训练。
- **动作关系**：选两个点，判断距离或上下关系，无需训练。

新建项目时，把鼠标放在处理方式上可以查看具体例子。动作学习可以选择「关注部位」的推荐组合，或直接点击骨骼点自定义；修改后需要重新训练。左侧动作名支持双击重命名。

### 如何使用

1. 新建项目，选择输入和处理方式。
2. 动作学习先录制示范、再训练；区域与动作关系直接设置规则。视觉和声音 API 使用者需填写自己的凭证。
3. 选择状态灯、Serial 或 MQTT，测试后开始运行。

Serial 用 USB 连接设备，建议使用桌面 Chrome 或 Edge。MQTT 在网页中填写 Broker 的 WebSocket 地址，HTTPS 网站使用 `wss://`。首页有连接教程和 Arduino / ESP32-S3 案例下载。OSC 规划中。

项目保存在当前浏览器，可导出备份，不会跟随账号同步。API Key 和 MQTT 密码不写入项目。动作追踪在本机处理；API 识别会把提交的图片或音频经网站服务发给所选平台，使用你自己的额度。

### 本地运行

需要 Node.js 22.12 或更高版本。

```sh
npm install
npm run dev
```

打开终端显示的本地地址。正式运行：

```sh
npm run build
npm start
```

检查代码用 `npm test`。账号管理用 `npm run users`。项目使用 React、TypeScript、Vite、Node.js 和 MediaPipe；视觉与声音 API 需要 Node 服务，不能只部署静态文件。

## English

A small tool inspired by Wekinator, built for interactive experiments with a camera and microphone. Record examples to teach it gestures and poses, or use your own API credentials for image and audio recognition. Send results to Arduino, ESP32 or other software through Serial or MQTT.

[Open the website](https://wekinator-fork.onrender.com/) → choose **Continue as guest**, or sign in. Switch languages in the top-right corner.

### What it does

| Category | Features |
| --- | --- |
| Motion tracking | Hands, face and body; runs locally |
| Visual recognition | Object detection, counting and visual conditions; your own DeepSeek / OpenAI API key |
| Audio recognition | Speech keywords: OpenAI / iFLYTEK; sound events: OpenAI; volume control: local |

Motion tracking offers five methods:

- **Dynamic action matching**: record a wave, then trigger once after a similar movement.
- **Pose classification**: record a held pose, such as a fist, and trigger after stable recognition.
- **Continuous control**: assign values to poses, train, then output intermediate values such as `0.12 → 0.45 → 0.83`.
- **Region and dwell**: choose one point and trigger when it stays in a region. No training needed.
- **Pose relationships**: choose two points and check their distance or vertical order. No training needed.

Hover over a method when creating a project to see examples. For motion learning, choose a focus preset or click landmarks to customize the points used. Retrain after changing them. Double-click an action name to rename it.

### Getting started

1. Create a project and choose an input and processing method.
2. Record and train for gesture or pose learning, or set rules for regions and relationships. API recognition needs your own credentials.
3. Choose a status light, Serial or MQTT output, test it, then start.

For Serial, connect your device over USB and use desktop Chrome or Edge. For MQTT, enter the broker’s WebSocket address; HTTPS sites require `wss://`. The home page includes connection guides and Arduino / ESP32-S3 example downloads. OSC is planned.

Projects stay in the current browser. Export them for backup; signing in does not sync them. API keys and MQTT passwords are not included in project files. Motion tracking runs locally. API recognition sends submitted images or audio through the website’s server to your chosen provider and uses your own API credit.

### Running locally

Use Node.js 22.12 or later. Run `npm install`, then `npm run dev` and open the address shown in the terminal. For production, run `npm run build`, then `npm start`.

Run checks with `npm test` and manage accounts with `npm run users`. Built with React, TypeScript, Vite, Node.js and MediaPipe. Image and audio API features need the Node server; static hosting alone is not enough.
