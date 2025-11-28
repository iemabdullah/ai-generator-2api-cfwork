# 🎨 AI Generator Flux Pure (v2.4.0)

<div align="center">

![版本](https://img.shields.io/badge/版本-v2.4.0-f59e0b?style=for-the-badge&logo=star&logoColor=white)
![许可证](https://img.shields.io/badge/许可证-Apache_2.0-3b82f6?style=for-the-badge&logo=apache&logoColor=white)
![部署](https://img.shields.io/badge/部署-Cloudflare_Workers-orange?style=for-the-badge&logo=cloudflare&logoColor=white)
![模型](https://img.shields.io/badge/模型-Flux_Schnell-brightgreen?style=for-the-badge&logo=ai&logoColor=white)

**极简纯粹的 AI 绘画 API 转换器 · 专为 Flux Schnell 模型打造 · 单文件部署奇迹**

> 🧠 **哲学思考**: 在这个代码即思想的时代，我们不仅是程序员，更是思想的建筑师。这个项目是一次减法的艺术实践——剥离繁杂，回归核心，让你与 AI 创造力之间，只隔一个 API 的距离。

[![部署到 Cloudflare](https://img.shields.io/badge/🚀_一键部署-Cloudflare_Workers-ff6900?style=for-the-badge&logo=cloudflare&logoColor=white)](https://deploy.workers.cloudflare.com/?url=https://github.com/lza6/ai-generator-2api-cfwork)
[![在线演示](https://img.shields.io/badge/🎮_在线演示-开发者驾驶舱-00d26a?style=for-the-badge&logo=google-chrome&logoColor=white)](https://github.com/lza6/ai-generator-2api-cfwork)

</div>

---

## ✨ 核心特性

<div align="center">

| 🚀 极致性能 | 🎯 精准专注 | 🔧 智能调试 |
|:---:|:---:|:---|
| **单文件架构**<br>极致精简，高效运行 | **专为 Flux**<br>深度优化，最佳体验 | **透明日志**<br>完整追踪，轻松排查 |

</div>

### 🎨 功能亮点

- **🚀 纯粹体验**: 专注文生图，移除所有冗余功能，性能最大化
- **🎯 模型锁定**: 专为 `flux-schnell` 深度优化，无需选择困难
- **🔍 深度透视**: 全新开发者驾驶舱，实时监控请求全链路
- **⚡️ 一键部署**: Cloudflare Workers 零配置部署，5分钟上线
- **💎 成本优化**: 智能利用上游服务，实现近乎零成本 AI 绘画

---

## 🏗️ 架构总览

<div align="center">

```mermaid
flowchart TD
    A[🖥️ 用户/第三方应用] --> B{🔄 Cloudflare Worker}
    
    B --> C[🎭 身份伪装]
    C --> D[💳 积分扣除]
    D --> E[🎨 图像生成]
    E --> F[📦 结果解析]
    
    F --> G[🔼 上游服务<br/>ai-image-generator.co]
    G --> H[🖼️ 返回图像数据]
    
    H --> I[✨ 格式转换]
    I --> J[📤 返回用户]
    
    B --> K[🌐 Web UI]
    K --> L[📊 实时监控面板]
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style G fill:#fff3e0
    style K fill:#e8f5e8
```

</div>

---

## 🚀 快速开始

### 方案一：一键部署（推荐）

<div align="center">

[![部署到 Cloudflare Workers](https://img.shields.io/badge/点击部署-Cloudflare_Workers-ff6900?style=for-the-badge&logo=cloudflare&logoColor=white&labelColor=2d2d2d)](https://deploy.workers.cloudflare.com/?url=https://github.com/lza6/ai-generator-2api-cfwork)

</div>

**部署步骤:**

1. **点击上方按钮** → 登录 Cloudflare 账户
2. **项目命名** → 例如 `my-ai-painter`
3. **配置环境变量**:
   - 进入 Worker 设置 → 变量
   - 添加 `API_MASTER_KEY` (你的访问密钥)
   - **重要**: 点击 🔒 加密按钮
4. **保存部署** → 完成！🎉

你的 API 地址: `https://my-ai-painter.your-subdomain.workers.dev`

### 方案二：手动部署

```bash
# 克隆项目
git clone https://github.com/lza6/ai-generator-2api-cfwork.git
cd ai-generator-2api-cfwork

# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署项目
wrangler deploy
```

---

## 🎮 使用指南

### 1. 🌐 开发者驾驶舱（Web UI）

直接访问你的 Worker 地址体验完整功能：

```
https://你的项目名.你的子域名.workers.dev
```

**功能特色:**
- 🎛️ **实时参数调整** - 提示词、图片比例一键配置
- 👁️ **请求透明化** - 完整追踪从伪装到生成的每一步
- 🎨 **即时预览** - 生成结果实时展示
- 📝 **智能日志** - 详细调试信息，问题定位无忧

### 2. 🤖 对接第三方应用

以 **ChatGPT-Next-Web** 为例：

```yaml
# 配置示例
接口地址: https://你的项目名.你的子域名.workers.dev/v1
API密钥: 你在环境变量中设置的 API_MASTER_KEY
模型选择: flux-schnell
```

**配置步骤:**
1. 打开 ChatGPT-Next-Web 设置
2. 填入上述配置信息
3. 选择 `flux-schnell` 模型
4. 输入提示词如"宇航服猫在月球喝咖啡" 🐱👨‍🚀🌕☕

---

## 🔧 技术深度解析

### 核心架构流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant W as Worker
    participant S as 上游服务
    
    U->>W: 📨 OpenAI 格式请求
    Note over W: 🎭 身份伪装阶段
    W->>W: generateFingerprint()
    W->>W: generateRandomIP()
    W->>W: getFakeHeaders()
    
    Note over W: 🔄 上游交互阶段
    W->>S: 💳 扣除积分请求
    S-->>W: 积分确认
    W->>S: 🎨 发送绘画指令
    S-->>W: 返回图片数据
    
    Note over W: ✨ 格式转换
    W->>W: 转换为 OpenAI 格式
    W-->>U: 📤 返回标准化响应
```

### 🧩 核心模块详解

| 模块 | 技术实现 | 难度 | 功能描述 |
|------|----------|------|----------|
| **🎭 身份伪造** | `generateFingerprint()`<br>`generateRandomIP()` | ⭐⭐☆ | 模拟真实用户指纹和IP地址，绕过基础风控 |
| **💳 积分管理** | `/api/credits/deduct` | ⭐☆☆ | 预扣积分机制，确保服务可用性 |
| **🎨 图像生成** | `FormData` + Multipart | ⭐⭐☆ | 构造上游服务所需的表单数据格式 |
| **📊 日志系统** | `Logger` 类 + 实时流 | ⭐⭐⭐ | 面向对象日志记录，支持实时调试展示 |
| **🔄 流式响应** | `TransformStream` API | ⭐⭐⭐⭐ | 实现类ChatGPT的流式输出体验 |

### 💻 代码结构

```
ai-generator-flux-pure.js
├── 🏗️ 核心配置 (CONFIG)
│   ├── 上游服务端点
│   ├── 模型参数预设
│   └── 响应模板定义
├── 🔀 请求路由 (fetch)
│   ├── CORS 预处理
│   ├── Web UI 路由
│   └── API 端点分发
├── 🎯 业务逻辑
│   ├── Logger 类 📝
│   ├── performUpstreamGeneration 🚀
│   ├── handleChatCompletions 💬
│   └── handleImageGenerations 🖼️
├── 🛠️ 工具函数
│   ├—— 认证验证
│   ├—— 错误处理
│   └—— 响应构造
└── 🌐 Web 界面
    └── 服务端渲染 UI
```

---

## 🚀 进阶功能

### 🔐 安全配置

```javascript
// 环境变量配置示例
API_MASTER_KEY = "sk-your-secret-key-here"  // 访问密钥
ENABLE_RATE_LIMIT = true                    // 速率限制
MAX_REQUESTS_PER_MINUTE = 10               // 频率控制
```

### 📊 监控指标

- ✅ 请求成功率监控
- ⏱️ 响应时间追踪  
- 🖼️ 生成图片数量统计
- 🔄 上游服务状态检查

---

## 🛠️ 故障排除

### 常见问题解决方案

| 问题现象 | 可能原因 | 解决方案 |
|---------|----------|----------|
| 🚫 401 认证失败 | API密钥错误 | 检查环境变量 `API_MASTER_KEY` 配置 |
| 🐢 响应超时 | 上游服务延迟 | 调整超时设置或重试机制 |
| 💸 积分不足 | 上游额度耗尽 | 等待额度重置或更换账户 |
| 🔄 格式错误 | 请求格式不匹配 | 验证 OpenAI 兼容性设置 |

### 🔍 调试技巧

1. **使用开发者驾驶舱** - 实时查看完整请求链路
2. **检查网络日志** - 分析上游服务响应
3. **验证环境变量** - 确认配置正确性
4. **监控资源用量** - 确保 Worker 配额充足

---

## 🌟 项目演进路线

<div align="center">

| 版本 | 状态 | 核心特性 | 技术突破 |
|:---:|:---:|:---|:---|
| **v1.0** | ✅ 完成 | 基础 API 转发 | 概念验证 |
| **v2.0** | ✅ 完成 | 多模型支持 | 功能扩展 |
| **v2.4** | 🎯 **当前** | **Flux 纯净版** | 架构精简 |
| **v3.0** | 🚧 规划 | 智能容错 + 动态配置 | 健壮性提升 |
| **v4.0** | 🌌 愿景 | 多源适配 + 插件化 | 生态扩展 |

</div>

### 🎯 未来规划

- **🔧 智能容错机制** - 上游异常自动恢复
- **📈 动态配置系统** - 热更新无需重新部署  
- **🌐 多源支持** - 适配更多 AI 绘画服务
- **🔌 插件化架构** - 模块化扩展能力

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！无论是代码改进、文档完善，还是创意想法。

### 💡 如何参与

1. **Fork 项目** - 创建你的个人副本
2. **功能开发** - 实现新功能或修复问题
3. **测试验证** - 确保代码质量
4. **提交 PR** - 分享你的改进

### 🎯 急需贡献

- 🔧 错误处理优化
- 📚 文档完善
- 🧪 测试用例编写
- 🌍 多语言支持

> **开源精神**: 每一次贡献，无论大小，都在为技术社区增添价值。让我们一起构建更美好的开源生态！✨

---

## 📄 许可证

本项目采用 **Apache License 2.0** 开源协议。

**你可以自由地:**
- ✅ 商业使用
- ✅ 修改代码  
- ✅ 分发副本
- ✅ 专利使用

**你需要:**
- 📝 保留版权声明
- 📝 声明代码变更

这是一个对商业友好的开源协议，鼓励广泛采用和创新。

---

## 📞 支持与联系

- 🐛 **问题反馈**: [GitHub Issues](https://github.com/lza6/ai-generator-2api-cfwork/issues)
- 📚 **使用文档**: [项目 Wiki](https://github.com/lza6/ai-generator-2api-cfwork/wiki)  
- 💬 **技术讨论**: [Discussions](https://github.com/lza6/ai-generator-2api-cfwork/discussions)

---

<div align="center">

## 🎉 开始创造吧！

**让代码指引你的创意，让 AI 赋能你的想象。**

[![开始使用](https://img.shields.io/badge/🎯_立即体验-生成你的第一幅AI画作-00b894?style=for-the-badge&logo=ai&logoColor=white)](https://deploy.workers.cloudflare.com/?url=https://github.com/lza6/ai-generator-2api-cfwork)

*星辰大海，代码为舟，创意作帆。🚀*

</div>
