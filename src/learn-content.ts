export const LEARN_GUIDES = [
  {
    "id": "serial",
    "title": "Serial 串口入门",
    "description": "连接 Arduino，完成第一次测试发送。",
    "sections": [
      {
        "title": "需要准备",
        "steps": [
          "一块 Arduino、可传输数据的 USB 线、Arduino IDE，以及支持 Web Serial 的桌面版 Chrome 或 Edge。"
        ]
      },
      {
        "title": "安装与上传",
        "steps": [
          "安装 Arduino IDE，接入开发板，在 IDE 中选择对应板型和端口。",
          "下载下方 Serial 点灯案例，用 Arduino IDE 打开并上传。该案例的板载灯仅用于确认收到指令。",
          "上传完成后关闭 IDE 的串口监视器和其他占用串口的程序，再回到 Platform。"
        ]
      },
      {
        "title": "网页如何填写",
        "steps": [
          "打开项目，按 P → 输出方式 → Serial；点击“选择设备”，授权正确的开发板，再点击“连接”。",
          "波特率填写 115200，发送内容填写 /success，结束符选择 LF（换行）。连接后点击“测试发送”。"
        ]
      },
      {
        "title": "怎样确认成功",
        "steps": [
          "案例收到 /success 后板载灯亮起，约 3 秒后熄灭。网页显示“已写入”只能证明串口写入，仍需观察开发板确认执行。",
          "连续控制或音量映射使用“Serial 数值接收”，消息填 {value}，结束符 LF。案例在设备内解析数值，并向串口回传 value=…；Platform 当前不显示这些回传日志。不要同时用 IDE 监视器占用该串口；可在接收代码的注释位置加入自己的效果。"
        ]
      }
    ],
    "links": [
      {
        "label": "安装 Arduino IDE",
        "url": "https://www.arduino.cc/en/software/"
      },
      {
        "label": "官方上传教程",
        "url": "https://docs.arduino.cc/software/ide-v2/tutorials/getting-started/ide-v2-uploading-a-sketch/"
      }
    ]
  },
  {
    "id": "mqtt",
    "title": "MQTT 连接入门",
    "description": "创建 Broker，把消息发送给 ESP32-S3。",
    "sections": [
      {
        "title": "连接关系",
        "steps": [
          "Platform → MQTT Broker → ESP32-S3。网页发布消息，ESP32 订阅同一个 Topic。"
        ]
      },
      {
        "title": "创建 Broker",
        "steps": [
          "打开下方 EMQX 官方创建教程，在控制台注册并创建 Serverless 部署。免费额度和可用区域以服务商当前说明为准。",
          "只想使用免费额度时，把 Spend Limit 保持为 0。到访问控制／身份认证中新建 MQTT 用户，记录主机、端口和证书信息。MQTT 用户名密码不一定是网站登录账号。"
        ]
      },
      {
        "title": "配置网页",
        "steps": [
          "按 P → 输出方式 → MQTT，填写 Broker 的 wss:// WebSocket URL、MQTT 用户名密码和 Topic（例如 project/action）。URL 包含端口和路径。不同课堂小组请各用一个 Topic，并同步修改接收程序，避免互相触发。",
          "EMQX Serverless 当前通常提供 WSS 8084 与 MQTT TLS 8883；始终以自己的部署控制台为准。保存配置后再点击连接。",
          "地址示例：网页 wss://YOUR_HOST:8084/mqtt；ESP32 主机 YOUR_HOST、TLS 端口 8883。替换自己的主机，端口与路径以控制台为准。"
        ]
      },
      {
        "title": "配置 ESP32-S3",
        "steps": [
          "安装 Arduino-ESP32 3.x 开发板包和 PubSubClient 库，下载 MQTT 案例并选择自己的 ESP32-S3 板型。",
          "在 .ino 中填写 Wi-Fi 和 MQTT 配置。MQTT_HOST 只填主机名，不含 wss://、端口或 /mqtt；MQTT_PORT 使用设备的 TCP／TLS 端口。",
          "使用云端 TLS 时设置 MQTT_USE_TLS=true，填写可信根证书；Topic 和触发内容要与网页完全一致。点灯案例默认接收 project/action 下的 YES。"
        ]
      },
      {
        "title": "先测试，再接识别",
        "steps": [
          "声音项目默认发到 project/audio，两个示例默认订阅 project/action。将网页 Topic 改成示例主题并保存，或修改固件订阅主题后上传。",
          "先用 MQTTX 订阅同一 Topic，确认网页“测试发送”的消息能到达 Broker，再检查 ESP32 的串口日志。这样能判断问题在网页、Broker 还是设备。",
          "固定触发发 YES，点灯约 3 秒。NO 会被忽略。连续控制选择数值案例，消息模板填 {value}；例如 0.650 会在设备串口显示为 value=0.650。带文字前缀的消息会被忽略。"
        ]
      }
    ],
    "links": [
      {
        "label": "EMQX 注册与控制台",
        "url": "https://cloud-intl.emqx.com/"
      },
      {
        "label": "官方 Serverless 创建教程",
        "url": "https://docs.emqx.com/en/cloud/latest/create/serverless.html"
      },
      {
        "label": "MQTTX 连接测试工具",
        "url": "https://mqttx.app/"
      },
      {
        "label": "EMQX 视频入门（旧版界面）",
        "url": "https://www.youtube.com/watch?v=-30Au69XBd4"
      }
    ]
  },
  {
    "id": "osc",
    "title": "OSC 入门",
    "description": "用动作触发或连续数值控制创作软件。",
    "sections": [
      {
        "title": "准备 OSC 输出",
        "steps": [
          "桌面版内置 OSC，无需另开桥接。网页版需在浏览器所在电脑安装 Node.js 22.12 或更高版本，下载“OSC 本机桥接”，在该文件所在目录运行 node platform_osc_bridge.mjs，并保持终端打开。已有桥接报端口占用时先复用或停止旧实例，换成新版文件后重新启动。"
        ]
      },
      {
        "title": "打开一个接收案例",
        "steps": [
          "打开下方 Max 案例，或在 Processing（oscP5）、openFrameworks（ofxOsc）中监听 UDP 9000。",
          "Processing：解压后用 Java 模式打开草图，安装 oscP5 并运行。openFrameworks：解压至 apps/myApps，在 Project Generator 导入工程并选择 ofxOsc，再编译运行。一次运行一个监听 9000 的案例。"
        ]
      },
      {
        "title": "发送第一条消息",
        "steps": [
          "按 P → 输出方式 → OSC。同机填 127.0.0.1，跨设备填接收电脑的私有 IPv4。端口要与接收程序一致。",
          "默认路径是 /platform/trigger（动作触发）和 /platform/value（连续数值）。在网页和接收软件中使用相同的路径。",
          "触发可选 String、Integer 或 Float，自定义触发或 YES/NO 的值。连续控制和音量始终发送 Float。接收端的地址和类型须一致。",
          "点击应用目标，再测试发送。按浏览器提示允许本地网络访问，到接收软件核对消息。跨设备时检查防火墙与访客 Wi-Fi 隔离。"
        ]
      },
      {
        "title": "TouchDesigner 坐标接收",
        "steps": [
          "新建 OSC In CHOP，UDP 9000，先保持 OSC Address Scope 为 *。Platform 基础地址填 /platform/hand，名称用 index_tip。测试发送后，从实际通道列表选择 X/Y（斜杠可能显示为下划线），再按需筛选。未勾选 Z 就不会出现 Z 通道。下载包包含操作说明与 MQTT/Serial 回调，不含 .toe 或 .tox 工程。"
        ]
      }
    ],
    "links": []
  },
  {
    "id": "examples",
    "title": "案例代码",
    "description": "按动作触发、连续数值或坐标输出选择接收程序。",
    "sections": [
      {
        "title": "如何选择案例",
        "steps": [
          "动作触发或 YES/NO 判断：先用点灯案例核对连接，再替换成自己的交互逻辑。Serial 默认 /success，MQTT 默认 YES，两者发送内容不同。",
          "连续控制或音量映射：使用数值接收案例。发送纯数字，Serial 选择 LF；默认支持小数和负数，不把停止输出当作收到零值。",
          "下载前查看文件名与说明。MQTT 的 Wi-Fi、主机、证书和账号密码需要在自己的程序中填写，不会从网站自动写入。",
          "这些代码是接收示例，不代表已在你的开发板上编译或烧录。不同板卡的 LED 引脚、串口和 USB 设置可能不同。"
        ]
      },
      {
        "title": "坐标输出入门",
        "steps": [
          "新建手部、面部或身体坐标项目，最多选择四个检测点。按 P → 输出方式 → Serial、OSC 或 MQTT，填写输出名称、勾选所需轴；展开“连接参数与测试”完成连接，先测试，再“应用并返回”。开启摄像头并点击“开始输出”后才会持续发送。"
        ]
      },
      {
        "title": "Processing 与 openFrameworks",
        "steps": [
          "下载对应坐标工程。Processing 用 Java 模式打开 PDE 并安装 oscP5；openFrameworks 用 Project Generator 导入并启用 ofxOsc。先用手部点 8、名称 index_tip、X/Y、UDP 9000、基础地址 /platform/hand。改用脸部、身体或其他名称时，须同步修改接收代码中的 mode、地址或字段。"
        ]
      },
      {
        "title": "Max / MSP 坐标工程",
        "steps": [
          "打开 CoordinateOSC.maxpat，udpreceive → route 按 /platform/hand/index_tip/x、/y、/z 分别显示数值。另附 Serial 工程。只读取勾选的轴；停止后数框保留最后值，装置需加入超时。"
        ]
      },
      {
        "title": "TouchDesigner 坐标接收",
        "steps": [
          "新建 OSC In CHOP，UDP 9000，先保持 OSC Address Scope 为 *。Platform 基础地址填 /platform/hand，名称用 index_tip。测试发送后，从实际通道列表选择 X/Y（斜杠可能显示为下划线），再按需筛选。未勾选 Z 就不会出现 Z 通道。下载包包含操作说明与 MQTT/Serial 回调，不含 .toe 或 .tox 工程。"
        ]
      },
      {
        "title": "p5.js 坐标工程",
        "steps": [
          "下载 HTML 与 sketch.js，用本地服务器打开或复制到 p5 Web Editor。示例通过 MQTT/WSS 接收，和 Platform 填同一 Broker 与 Topic，使用不同 Client ID。库首次加载需联网。"
        ]
      },
      {
        "title": "Serial 链路与丢失处理",
        "steps": [
          "Serial 每行一帧 JSON、115200、LF。两个软件各需使用虚拟串口对的一端或设备转发，不能同时占用同一 USB 串口。追踪丢失时暂停发包，接收端应按本机接收时间判断超时。"
        ]
      },
      {
        "title": "三种消息不要混用",
        "steps": [
          "动作触发发送一条文本或数值；连续控制发送单个数值；坐标输出发送命名的多个轴。对应下载已分组，坐标 JSON 不能交给只收纯数字的 Arduino 示例。",
          "新坐标项目的 OSC 每轴一条消息，例如 /platform/hand/index_tip/x 带一个 Float；Serial/MQTT 的 JSON 使用 values.index_tip_x。旧项目应用命名设置前仍用点编号及 points 数组，按接收案例说明选择格式。",
          "点名称和选轴窗口中的“测试发送”使用当前草稿；“应用并返回”后，运行才使用这些新名称。取消窗口会放弃未应用的名称与选轴，已保存的连接配置仍保留。"
        ]
      }
    ],
    "links": [
      {
        "label": "ESP32 Arduino 安装教程",
        "url": "https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html"
      },
      {
        "label": "Processing 官方文档",
        "url": "https://processing.org/reference/"
      },
      {
        "label": "openFrameworks OSC 文档",
        "url": "https://openframeworks.cc/documentation/ofxOsc/ofxOscReceiver/"
      },
      {
        "label": "Max / MSP OSC 文档",
        "url": "https://docs.cycling74.com/userguide/OSC/"
      },
      {
        "label": "p5.js 官方文档",
        "url": "https://p5js.org/reference/"
      },
      {
        "label": "TouchDesigner OSC In CHOP",
        "url": "https://docs.derivative.ca/OSC_In_CHOP"
      },
      {
        "label": "TouchDesigner MQTT Client DAT",
        "url": "https://docs.derivative.ca/MQTT_Client_DAT"
      },
      {
        "label": "TouchDesigner Serial DAT",
        "url": "https://docs.derivative.ca/Serial_DAT"
      }
    ]
  },
  {
    "id": "troubleshooting",
    "title": "连接与排错",
    "description": "检查 Serial、MQTT 和 OSC 的连接与接收。",
    "sections": [
      {
        "title": "找不到串口",
        "steps": [
          "检查 USB 线是否支持数据传输，确认板卡驱动和端口可被 Arduino IDE 识别；使用支持 Web Serial 的桌面 Chrome 或 Edge。",
          "关闭其他占用该串口的程序。选择设备后核对 USB 标识，波特率须与 Serial.begin 一致。"
        ]
      },
      {
        "title": "MQTT 连接失败",
        "steps": [
          "检查网页是否使用 wss:// 地址、正确的 WebSocket 端口与路径。设备的 8883 等 TCP／TLS 端口不能直接作为网页 WebSocket 地址。",
          "核对 MQTT 用户名密码、服务是否运行、免费额度以及 Topic 的发布／订阅权限。不要把网站登录密码当成 MQTT 密码。"
        ]
      },
      {
        "title": "OSC 接收不到消息",
        "steps": [
          "先在同一台电脑用 127.0.0.1 测试，只打开一个监听目标 UDP 端口的案例。网页版还需保持桥接终端打开，并允许浏览器访问本地网络。",
          "同机成功后再改为接收电脑的私有 IPv4。若仍无数据，检查 UDP 入站防火墙和访客网络隔离。",
          "有消息但没有反应时，核对 OSC 地址和参数类型。选择 Integer 时请使用新版桥接。"
        ]
      },
      {
        "title": "已连接但设备没有反应",
        "steps": [
          "核对 Topic 的大小写、斜杠与发送内容。Serial 案例需要 /success 加 LF，MQTT 案例需要 YES。连接后先点测试发送。",
          "用 MQTTX 或设备日志检查实际收到的内容，再核对程序订阅与处理逻辑。网页写入或 Broker 确认不等于设备已执行。"
        ]
      },
      {
        "title": "灯不亮或数值不对",
        "steps": [
          "ESP32-S3 板载 RGB 灯的引脚因板型不同；先确认自己的板卡资料。连续数值必须使用数值接收案例，不能用固定 YES 指令的点灯案例。",
          "音量输入是 RMS 电平而非分贝；校准输入低高点，再检查输出映射范围。接收程序只收到实际发送的值，停止不会自动复位。"
        ]
      },
      {
        "title": "坐标收到了但显示不动",
        "steps": [
          "先测试发送，再检查接收端是否使用相同 mode、输出名称、轴和基础地址。默认桌面绘图案例使用 hand / index_tip，脸部与身体需修改接收代码。",
          "只有勾选的轴会发送；未勾选的轴不会自动补零。停止、丢失目标或选中点不可见都会暂停发包，接收端按本机收到消息的时间做超时，不用 JSON 的 t 作为跨电脑时钟。",
          "网页提示需要新版桥接时，停止旧桥接，再到“OSC 入门”下载并启动新版文件。当前已发布的 0.75 桌面安装包没有坐标模式，不能直接导入含坐标模式的新项目。"
        ]
      }
    ],
    "links": []
  }
] as const;
export type GuideId = typeof LEARN_GUIDES[number]['id'];
export const EXAMPLE_DOWNLOADS = [
  {
    "file": "processing_coordinates.zip",
    "title": "Processing 坐标工程",
    "detail": "OSC / Serial · XY / XYZ",
    "guides": [
      "serial",
      "osc"
    ],
    "group": "坐标输出"
  },
  {
    "file": "openframeworks_coordinates.zip",
    "title": "openFrameworks 坐标工程",
    "detail": "ofxOsc · XY / XYZ",
    "guides": [
      "osc"
    ],
    "group": "坐标输出"
  },
  {
    "file": "max_coordinates.zip",
    "title": "Max / MSP 坐标工程",
    "detail": "OSC / Serial · XY / XYZ",
    "guides": [
      "serial",
      "osc"
    ],
    "group": "坐标输出"
  },
  {
    "file": "p5js_coordinates.zip",
    "title": "p5.js 坐标工程",
    "detail": "MQTT / WSS · XY / XYZ",
    "guides": [
      "mqtt"
    ],
    "group": "坐标输出"
  },
  {
    "file": "touchdesigner_coordinates.zip",
    "title": "TouchDesigner 接收脚本",
    "detail": "OSC 教程 · MQTT / Serial 回调",
    "guides": [
      "serial",
      "mqtt",
      "osc"
    ],
    "group": "坐标输出"
  },
  {
    "file": "coordinate_receivers.zip",
    "title": "全部坐标接收案例",
    "detail": "五种软件 · 中英设置说明",
    "guides": [
      "serial",
      "mqtt",
      "osc"
    ],
    "group": "坐标输出"
  },
  {
    "file": "serial_success_led.ino",
    "title": "Serial 点灯接收",
    "detail": "115200 · /success · LF",
    "guides": [
      "serial"
    ],
    "group": "动作触发"
  },
  {
    "file": "esp32s3_mqtt_led.ino",
    "title": "ESP32-S3 MQTT 点灯接收",
    "detail": "project/action · YES",
    "guides": [
      "mqtt"
    ],
    "group": "动作触发"
  },
  {
    "file": "serial_numeric_receiver.ino",
    "title": "Serial 数值接收",
    "detail": "115200 · 纯数字 · LF",
    "guides": [
      "serial"
    ],
    "group": "连续数值"
  },
  {
    "file": "esp32s3_mqtt_numeric.ino",
    "title": "ESP32-S3 MQTT 数值接收",
    "detail": "project/action · 纯数字",
    "guides": [
      "mqtt"
    ],
    "group": "连续数值"
  },
  {
    "file": "platform_osc_bridge.mjs",
    "title": "OSC 本机桥接",
    "detail": "Node.js · 网页到 OSC/UDP",
    "guides": [
      "osc"
    ],
    "group": "连接工具"
  },
  {
    "file": "osc_receiver.maxpat",
    "title": "Max 接收案例",
    "detail": "UDP 9000 · 触发与浮点数",
    "guides": [
      "osc"
    ],
    "group": "动作触发"
  },
  {
    "file": "processing_trigger.zip",
    "title": "Processing 动作触发",
    "detail": "收到消息时圆形跳动，显示参数类型与值。",
    "guides": [
      "osc"
    ],
    "group": "动作触发"
  },
  {
    "file": "openframeworks_value.zip",
    "title": "openFrameworks 连续数值",
    "detail": "浮点数控制圆的大小，显示原始数值。",
    "guides": [
      "osc"
    ],
    "group": "连续数值"
  }
] as const;
