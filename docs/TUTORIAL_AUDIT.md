# 教程与案例审阅

2026-11-13 · 本地预览与源码 0.79。教程修改先在预览副本验证，随后按用户授权合入正式本地仓库。安装包与最终发布状态另见 RELEASING.md。

## 已修正

| 问题 | 当前处理 |
| --- | --- |
| 连续控制/音量的 Serial 下载仍给点灯代码 | 按实际模式提供点灯、纯数值或坐标 ZIP；用音量工作台 P 设置核对实际链接，并对三种模式做组件检查 |
| 数值模式的默认消息看起来仍是 YES 或 /success | 新音量项目与未设置消息的连续 Serial 默认显示 {value}；旧项目保留原值，并解释无占位符时只发数值 |
| README 要求点击已取消的保存项目按钮 | 改为项目自动保存；明确 MQTT 保存配置、OSC 应用目标仍是独立操作 |
| 新坐标逐轴命名与旧按点消息混写 | 网页教程、坐标 README、项目交接统一列出新 values/命名轴与旧 points/向量格式及迁移时机 |
| 接收案例默认范围不明确 | 明确绘图案例默认 hand / index_tip / 点 8；改脸、身体或名称须改接收代码，不能把示例当通用多点播放器 |
| MQTT-only p5.js 出现在 OSC 下载下 | 移至 MQTT 对应下载；按连接工具、触发、连续数值、坐标分组，相应协议只列适用案例 |
| TouchDesigner 被写成必须使用 TCP/TLS | 按官方文档改为支持当前软件/Broker 可用的 tcp/ssl/ws/wss URI，保留证书校验 |
| TouchDesigner 通道名称与过滤路径被写死 | 先以 * 测试，再从实际通道列表选择；解释斜杠、下划线、前缀设置及未选轴不会出现 |
| Processing/Max Serial 收到其他点也刷新状态 | 仅命中示例所选点/名称才刷新；增加非法数值检查，Max 丢弃整条超长行 |
| p5.js 未等订阅确认便报告成功，旧连接回调覆盖新状态 | 等待订阅回执，失败保留原因，忽略被替换连接、无关主题与保留消息 |
| TouchDesigner 非法 JSON 可能清空表或触发未处理异常 | 完整校验 mode、轴字段及有限数值后才替换表，失败保留原值与时间；TOPIC 可修改，忽略非当前主题与保留消息 |
| 串口示例日志在何处看不清楚 | 说明 Platform 不展示设备回传日志、串口不能双占用，坐标需双端链路；点灯/纯数字案例不能当 JSON 转发器 |
| 桌面包与网页/源码能力混在一起 | README、发布说明与交接区分来源：0.79 包已重建并包含坐标模式；0.75 保留为历史版本，验证按包区分 |
| 下载源码更新后 ZIP 容易落后 | 新增可重建和逐字节检查的打包脚本，同步八个 ZIP；不把凭据或缓存打入包 |
| 旧启动 Prompt 要求不使用 OSC/重新实现应用 | 更新为阅读当前规则和代码继续开发；旧 0.43 验收移至 archive，当前验收入口改为本版状态 |

## 已执行验证

- `npm test`：147 项前端、算法、教程、示例解析检查 + 30 项服务端检查通过。包括实际 OSC 数据包、旧格式兼容及停止后失效检查。
- `npm run build`：TypeScript 与正式构建通过。
- `python3 scripts/test-coordinate-callbacks.py`：3 项受控输入测试通过（命名/旧格式、非法帧保留上次状态、主题和保留消息）。这些是 Python 回调测试，不是 TouchDesigner 运行结果。
- `python3 scripts/package-examples.py --check`：全部八个 ZIP 与源码、README 和配图一致。修改源码后先不带 --check 重建，再核对。
- 从本地预览读取 14 个下载和中英文视频/封面共 4 个资源，HTTP 正常且下载内容与源码一致；从页面点击下载 Serial 数值文件，落盘内容也一致。
- 浏览器从首页进入五种教程，切换中英文；视频随语言切换，下载分组和协议过滤正确。音量模式按 P → 输出方式 → Serial 的实际下载指向 numeric 文件。案例页在 390px 下检查中英文，下载卡片与文字无横向溢出；恢复桌面宽度后配图加载正常。开发服务器热更新导致旧会话失效时，重新访客进入后复查了图片。
- 两段 MQTT 视频各 30 秒，检查中英文四段消息说明：Topic 差异、YES 点灯、{value} 纯数字、Broker/设备确认边界与接收代码相符。保留视频，增补“消息格式示意，非界面录屏或实机验收”。
- 通过 GitHub 公共 Release 元数据核对：v0.75.0 仍为预发布，两个安装包与 SHA256SUMS.txt 的文件名和 README 链接一致；未重新下载安装或修改发布。

## 文档维护范围

本轮更新 README（中英）、AGENTS、PROJECT_CONTEXT、RELEASING、当前交互与验收、开发启动 Prompt、坐标接收 README、两个旧 OSC 包内说明及网页中英文教程。0.43 验收保留到 archive，0.77–0.78 坐标开发记录标明历史。其他已有旧版规格继续只供追溯，不重写成当前承诺。

Python 只用于维护 ZIP 和测试下载的 Python 回调；Platform 使用和 Node 构建不新增 Python 运行依赖。

## 验证边界

未在 Processing、openFrameworks、Max/MSP、TouchDesigner 中完成真实安装、编译与运行；未用真实 Broker 或物理 Serial 链路验收；未新增真人识别准确率或付费 API 调用结论。本轮范围内的示例解析与页面检查不代表外接设备已经执行。0.79 最终安装包的检查另见 RELEASING.md：Mac 已验证启动、保存重开及命名轴 OSC；Windows 10/11 真机仍待测。

## 官方资料核对

- [TouchDesigner MQTT URI 与设置](https://docs.derivative.ca/MQTT_Client_DAT)、[回调签名](https://docs.derivative.ca/MqttclientDAT_Class)
- [TouchDesigner OSC 通道与 Scope](https://docs.derivative.ca/OSC_In_CHOP)
- [Max udpreceive 解码方式](https://docs.cycling74.com/reference/udpreceive/)
- [Processing Serial](https://processing.org/reference/libraries/serial/)、[openFrameworks ofxOscReceiver](https://openframeworks.cc/documentation/ofxOsc/ofxOscReceiver/)
- [MQTT.js 订阅确认](https://github.com/mqttjs/MQTT.js)、[EMQX Serverless 部署](https://docs.emqx.com/en/cloud/latest/create/serverless.html)
- [0.79 桌面发布与验证范围](https://github.com/ZhichenGu/ml-play/releases/tag/v0.79.0)
