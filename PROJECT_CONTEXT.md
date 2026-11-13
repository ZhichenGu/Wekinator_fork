# 项目交接

核对日期：2026-11-13。正式源码与桌面包版本 **0.79**（package 0.79.0）。本文件是现状导航，行为细节以代码为准；不要把旧阶段文档或聊天中的未来设想当作已完成。

## 先读什么
1. `AGENTS.md`：长期开发规则。
2. 本文件：架构、范围、风险与入口。
3. 当前任务涉及的模块与对应 `*.test.*`。不用先读整个 `docs/` 或整个 `src/main.tsx`。

## 定位与架构
Platform 是受 Wekinator 启发的摄像头/声音交互实验工具：输入 → 本地学习或 API 判断 → 状态灯、Serial、MQTT、OSC。

- React 18.3 + TypeScript 5.7 + Vite 6；Lucide 图标、普通 CSS；没有 UI 组件框架或前端路由库。
- MediaPipe Tasks Vision 0.10.35 检测关键点；浏览器执行动作算法，Worker 检测优先，主线程兼容回退。
- Node 原生 HTTP 服务处理登录、静态资源和固定上游 API；MQTT.js 5.16；没有 Express、云数据库、服务端项目存储或模型训练服务。
- 主页面由 `src/main.tsx` 的 page/state 切换：首页、创建、追踪、视觉、声音、教程。视觉与声音有独立工作台。

## 已实现
| 输入 | 模式及关键行为 |
| --- | --- |
| 动作追踪 | 手/脸/身体，单目标；动态动作匹配、姿态分类、连续控制、区域停留、动作关系、直接坐标输出 |
| 动态匹配 | DTW 模板匹配；可选增强特征、起止切分、多示范匹配；原版可切换，保留原始录制 |
| 示范管理 | 多次追加、负例、独立测试、提前保存、回放/裁切、删除、关注部位预设与自定义多点；每动作最多100次，最多12动作 |
| 规则 | 区域一个点、关系两个点；实时点击选点与红色高亮，数值/滑条联动，无需训练 |
| 视觉 API | 指定物体有无、计数、描述句条件；手动截图/导图/有限次数自动检测；可画送检区域并查看实际截图 |
| 声音 | OpenAI/讯飞关键词；OpenAI 声音事件（可用参考音频）；本地 RMS 音量映射；音频录制/导入/试听/裁切，最长10秒 |
| 输出 | 状态灯、USB Serial、MQTT、OSC；固定消息与连续值，连接设置/测试发送/接收端案例下载 |
| 界面 | 中英切换、项目改名/删除/导入导出、按输入分类、0.8秒悬停说明、可折叠 API/设置、拖动小预览 |
| 工作台 | 按交互目标创建项目。P 打开可调高度的设置面板，视觉和声音工作台按模式显示数值、识别与输出反馈 |
| 录制检查 | 动态与姿态训练的异常示例在列表和标签显示红点，支持回放和混淆对照。跨场次独立测试按轮查看触发结果或连续数值误差 |

面部有嘴部/眼睑/眉部组合和全点高级选项，密集显示与学习选点独立。内部 `pose` 是 MediaPipe PoseLandmarker，不是 PoseNet。增强只适用于动态动作；其余模式各自计算。进入未明确选过算法的动态项目可能启用增强并标记待训练，见 `enter()` 与 `labBaseline`。

视觉与声音工作台统一为自动保存，顶部显示保存结果。存储失败时常驻提示，完成写入后才显示已保存。仅保存项目白名单字段，声音事件仍保留用户明确设置的参考声音。

坐标输出已合入正式源码及 0.79 桌面包；线上是否更新以部署结果为准。手/脸/身体优先用 Worker 检测，初始化失败/超时后主线程兼容回退；直接读取原始关键点，不依赖学习特征有效性。最多四点，可勾选 X/Y/Z、配置平滑与 5–30 Hz 上限。丢失选中点或身体点低可信时整帧暂停，恢复从当前值继续，单在途不排队。新项目按点名称输出：Serial/MQTT 的 values 对象含 index_tip_x 等字段，OSC 以基础地址/点名称/轴逐条发 Float；旧项目应用命名设置前保留 points 数组和按点 OSC 向量。网页需新版桥接；0.79 桌面包内置对应输出，旧 v0.75 安装包不含坐标模式。五种软件接收代码、串口双端链路和实测边界见 public/examples/coordinates/README.md。

## 数据与账号
- 动作项目：IndexedDB `motion-studio` / `projects`，带项目ID及旧 `current` 兼容记录（`storage.ts`）。
- 视觉项目：localStorage `motion-object-projects`，迁移旧 `motion-object-project`（`objects.ts`）。声音：`motion-audio-projects`（`audio.ts`）。
- 数据属于当前浏览器与 origin，不跟账号同步；换域名/端口不会自动带过去，先导出 JSON 再导入。参考音频会增加 localStorage 占用。
- Key/密码不进入项目；普通图片、待测音频和识别历史不作项目持久化。白名单清理函数是存储边界。
- `config/users.json` 为服务端 scrypt 摘要账号文件，`server/users.mjs` 校验；`npm run users` 管理。不要在交接中复制账号摘要或会话密钥。
- 登录、访客均可获得12小时签名 HttpOnly/SameSite=Strict Cookie；退出撤销表与限流在进程内存。不是跨实例会话管理。

## API 与环境配置
所有以下接口均 POST JSON，同源且经访问门禁：

| 接口 | 用处 |
| --- | --- |
| `/api/objects/check`、`/api/objects/detect` | 视觉模型访问验证、截图识别 |
| `/api/audio/check`、`/api/audio/detect` | 声音凭证验证、录音识别 |

`/auth/login`、`/auth/guest`、`/auth/logout` 是表单 POST 路由。

当前代码白名单（不是已联网核实的供应商最新列表）：
- 视觉 DeepSeek：`deepseek-flash` → `api.deepseek.com/chat/completions`；默认平台 DeepSeek。
- 视觉 OpenAI：`gpt-4.1-mini`、`gpt-4o-mini` → `/v1/responses`。
- 声音 OpenAI：关键词固定 `gpt-transcribe` → `/v1/audio/transcriptions`；事件固定 `gpt-audio-1.5` → `/v1/chat/completions`。
- 讯飞：仅关键词；APPID/APIKey/APISecret，服务端签名连接 `iat-api.xfyun.cn/v2/iat`。签名连接成功不能证明 APPID、额度和识别服务权限。

运行环境变量：`HOST`、`PORT`、`SESSION_SECRET`、`AUTH_COOKIE_SECURE`。线上 `HOST=0.0.0.0`，HTTPS 使用 `AUTH_COOKIE_SECURE=true`；本地HTTP不可直接沿用Secure Cookie。`APP_PASSWORD` 不再是生产账号来源，代码的显式password模式用于旧测试。

## 目录与关键入口
| 文件/目录 | 职责 |
| --- | --- |
| `src/main.tsx` | 追踪工作台、录制/运行状态、摄像头生命周期、页面切换 |
| `src/core.ts`、`learning.ts`、`continuous.ts` | 项目类型/校验、DTW、分类与回归 |
| `src/lab-motion.ts`、`LabPanel.tsx`、`lab-compare.worker.ts` | 已合入正式版的增强与独立测试对比，Lab命名不表示未实现 |
| `src/vision.worker.ts`、`focus.ts` | MediaPipe检测、选点/特征重算 |
| `src/CoordinateStudio.tsx`、`coordinates.ts`、`coordinate-detector.ts` | 坐标选点、格式与限速、模型兼容回退 |
| `src/CoordinateOutputDialog.tsx`、`CameraPlaceholder.tsx` | 命名与选轴窗口、共用摄像头开启入口 |
| `src/Skeleton.tsx`、`PointPicker.tsx`、`face-visual.ts` | 骨骼渲染、选点和面部简洁显示 |
| `src/region.ts`、`relation.ts`及对应Controls | 规则计算、阈值/区域UI |
| `src/ObjectStudio.tsx`、`objects.ts`、`detection-region.ts` | 视觉工作台、项目、送检裁切 |
| `src/AudioStudio.tsx`、`audio.ts`、`AudioClipEditor.tsx`、`VolumeControls.tsx` | 声音工作台与音频处理 |
| `src/serial.ts`、`mqtt-output.ts`及对应Panel | 输出生命周期与状态 |
| `src/HistoryList.tsx`、`trim.ts`、`RecordingControls.tsx`、`CameraRecordingKeys.tsx` | 最新优先历史、裁切/快捷键、录制按钮 |
| `src/WorkspacePreview.tsx`、`preview.ts` | 浮动摄像头预览与坐标 |
| `src/CreateChoices.tsx`、`HoverHelp.tsx`、`method-help.ts`、`recognition-help.ts` | 创建选项和说明 |
| `src/style.css`、`i18n.ts`、`locales/en.json` | 全站样式与翻译 |
| `server/access.mjs`、`users.mjs` | 认证与账号校验 |
| `server/object-api.mjs`、`audio-api.mjs`、`xfyun.mjs` | 上游代理、校验、取消与限流 |
| `vite.config.ts`、`server/start.mjs` | 开发中间件、正式HTTP入口 |
| `public/models/*.task`、`public/wasm/` | 模型与WASM资源；主线程/Worker均按base加载 |
| `public/tutorials/`、`public/examples/`、`src/Learn.tsx`、`learn-content.ts` | Arduino/ESP32-S3 与五种创作软件接收案例、连接教程 |

## 启动与部署
Node >=22.12；`npm ci` → `npm run dev`，使用终端实际端口；Vite插件同时提供访问门禁和API，不需要另开代理。

正式运行：`npm run build` → `npm start`，Node提供dist和API；默认127.0.0.1:5173，部署读取PORT。检查：`npm test`、`npm run build`。

GitHub仓库：https://github.com/ZhichenGu/ml-play 。Render使用Node Web Service，构建 `npm ci --include=dev && npm run build`，启动 `npm start`；推送后仍须确认Render实际部署提交。正式访问地址 https://ml-play.onrender.com/ 已通过访客入口核实。桌面安装包和各平台验证状态见 README；发布说明模板见 [docs/RELEASING.md](docs/RELEASING.md)。

当前仓库没有 `.github/` 工作流或 Render blueprint。GitHub Pages纯静态托管不能提供账号与API代理；不要将Pages失败当作Render失败。未配置自动发布桌面安装包。

## 待办与已知限制
- **桌面版 0.79**：`desktop/` 内的 Electron 应用复用工作台和 Node API，独立保存项目。模型随包、桌面 OSC 内置；Mac arm64 DMG 和 Windows x64 NSIS 安装包由 electron-builder 生成。发布、系统验证与签名情况见 `docs/RELEASING.md`。
- **OSC 已实现**：通过本机 Node 桥接向本机或私有 IPv4 发送 OSC/UDP 文本、int32 或 float32，可设置目标端口及地址。双手融合、YOLO自训练、语义分割、云端同步也未实现，不当作既定下一阶段承诺。
- **效果未充分验证**：真人跨光线/距离/速度的准确率、误触发率；增强开关不保证提高所有动作。应使用单独录制的测试集，不靠提高阈值冒充改进。
- **上游兼容性待实测**：模型ID与账户可用性会变化，新增/修复API时核对官方文档；不要把代码白名单或mock测试当成真实调用成功。
- **硬件验收限制**：Serial写入与MQTT确认不代表设备执行；下载案例不代表已为用户板卡编译/烧录。浏览器Serial支持受浏览器/安全上下文限制。
- **存储/运行限制**：浏览器清理数据会丢本地项目；参考音频受localStorage配额约束；进程内限流/撤销不跨实例共享。
- `src/main.tsx` 与 `style.css` 体积较大，改动要检查相邻模式；不要在小任务中顺手重构全站。

## 验证与文档优先级

当前源码及预览的实际验证见 [当前交互与验收](docs/当前交互与验收.md)。历史 0.74/0.75 的安装与线上检查不能替代当前版本验证；当前桌面包为 v0.79；Windows 真机待验，线上部署须单独核对。

当前行为以用户要求、AGENTS、实际代码与测试为准；本文用于导航。README 是中英文使用入口，教程内容在 src/learn-content.ts，英文在 src/locales/en.json。下载源码改动后运行 `python3 scripts/package-examples.py`，再 `--check` 核对全部 ZIP 与源码一致。旧版本规格与验收记录保留为历史资料，不作为重新创建项目或撤销现有功能的指令。
