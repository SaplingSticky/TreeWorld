# 🌳 TreeWorld

**[English](README.en.md)** | **中文**

**AI 驱动的无限画布，人类与 AI 共享创意空间。**

TreeWorld 是一个 Miro 风格的无限画布应用，集成了 AI Agent。你可以在画布上自由排列 Markdown 笔记、代码片段、图片、表格、HTML 组件等内容，然后与 AI Agent 协作——它可以搜索网页、规划多步任务、自动创建和修改画布模块。

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)
![Electron](https://img.shields.io/badge/Electron-42-47848F?logo=electron)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ 功能特性

### 🎨 画布系统

| 功能 | 说明 |
|------|------|
| **无限平移与缩放** | Alt+拖拽平移，滚轮缩放（0.1x ~ 3x），小地图导航 |
| **11 种模块类型** | Markdown、Note、Bubble、HTML、SVG、Image、Code、Table、Link、Canvas 2D、Collection |
| **拖拽与调整** | 标题栏拖拽移动，边角拖拽调整大小 |
| **右键菜单** | 锁定/解锁、复制、删除 |
| **撤销/重做** | Cmd+Z / Cmd+Shift+Z，50 步历史 |
| **搜索** | Cmd+F 按内容搜索模块，点击跳转 |
| **多画布** | 创建和切换多个独立画布 |
| **导出** | 支持 JSON、Markdown、HTML 三种格式 |
| **图片拖放** | 直接拖拽或粘贴图片文件到画布 |
| **画布主题** | 软木 Cork / 深色皮革 Leather / 浅色亚麻 Linen |

### 🤖 AI Agent

| 功能 | 说明 |
|------|------|
| **规划 → 确认 → 执行** | Agent 先展示计划卡片，用户确认后才执行操作 |
| **网页搜索** | 基于 Tavily API，Agent 自动检测搜索意图并联网搜索 |
| **多模型支持** | Anthropic (Claude)、OpenAI (GPT)、Ollama (本地模型) |
| **浮动聊天** | 按 `/` 或 `Cmd+K` 打开聊天浮层 |
| **画布命令** | Agent 可创建、更新、删除、查询、分组模块 |
| **安全锁定** | 被锁定的模块不会被 Agent 修改 |
| **IO 日志** | 设置面板可查看所有 Agent 请求/响应记录 |

### 🧩 模块类型详解

| 模块 | 说明 |
|------|------|
| **Markdown** | 富文本渲染，支持 `- [ ]` 交互式待办复选框 |
| **Note** | 便利贴风格，带随机微旋转，纸钉美学 |
| **Bubble** | 聊天气泡式简短消息，自动适应内容大小 |
| **HTML** | 沙盒 iframe 渲染，严格 CSP 隔离，无网络访问 |
| **SVG** | 内联 SVG 渲染，自动消毒（移除 script/foreignObject 等危险元素） |
| **Image** | 拍立得风格图片展示，带随机微旋转 |
| **Code** | highlight.js 语法高亮，按需懒加载语言包，支持 25+ 语言 |
| **Table** | 结构化数据表格，JSON 格式存储，支持行/列增删和单元格编辑 |
| **Link** | URL 预览卡片，显示域名、favicon 和页面预览 |
| **Canvas 2D** | 编程式 Canvas 2D 图形，执行原始 JavaScript，支持 requestAnimationFrame 动画 |
| **Collection** | 容器/分组模块，子模块跟随移动，可折叠，软木板美学 |

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm

### 安装与运行

```bash
cd treeworld
npm install
npm run dev
```

打开浏览器访问 [http://localhost:5173](http://localhost:5173)

### 配置 AI（可选）

1. 点击左下角齿轮图标打开设置
2. 选择 Provider（Anthropic / OpenAI / Ollama）
3. 输入 API Key 和模型 ID
4. 按 `/` 或 `Cmd+K` 开始与 Agent 对话

或复制环境变量模板：

```bash
cp .env.example .env
# 编辑 .env 填入你的 API Key
```

### 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_ANTHROPIC_API_KEY` | Anthropic (Claude) API Key |
| `VITE_OPENAI_API_KEY` | OpenAI API Key |
| `VITE_TAVILY_API_KEY` | Tavily 搜索 API Key（启用联网搜索） |

> 💡 API Key 也可以在应用内的设置面板中配置，无需 `.env` 文件。

---

## 🖥️ Electron 桌面版

TreeWorld 支持打包为 Electron 桌面应用。

### 开发模式

```bash
npm run electron:dev
```

同时启动 Vite 开发服务器和 Electron 窗口。

### 构建安装包

```bash
# Windows NSIS 安装包
npm run electron:build:win

# 通用构建
npm run electron:build
```

### 桌面版特性

- 最小化到系统托盘（不退出应用）
- 全局快捷键 `Cmd+Shift+T` 唤起窗口
- 原生文件保存/打开对话框
- 上下文隔离，安全的 preload 脚本

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `/` 或 `Cmd+K` | 打开 AI 聊天 |
| `Cmd+Z` | 撤销 |
| `Cmd+Shift+Z` | 重做 |
| `Cmd+F` | 搜索模块 |
| `Cmd+0` | 重置缩放 |
| `Cmd+1` | 适应全部 |
| `Escape` | 关闭菜单/取消选择 |
| `Delete` | 删除选中模块 |
| `Alt+拖拽` | 平移画布 |
| `滚轮` | 缩放画布 |
| 双击模块内容 | 编辑模块 |
| 点击标题栏 | 打开模块菜单 |

---

## 🏗️ 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | React + TypeScript | 19 / 6 |
| 构建 | Vite | 8 |
| 状态管理 | Zustand | 5 |
| LLM SDK | Anthropic SDK | 0.95 |
| LLM SDK | OpenAI SDK | 6.37 |
| 搜索 | Tavily API | — |
| 语法高亮 | highlight.js | 11 |
| Markdown | react-markdown | 10 |
| 桌面 | Electron + electron-builder | 42 / 26 |
| 测试 | Vitest | 4 |
| E2E | Playwright | 1.60 |

---

## 📁 项目结构

```
TreeWorld/
├── treeworld/                  # 应用主目录
│   ├── electron/               # Electron 主进程
│   │   ├── main.ts             #   窗口创建、托盘、全局快捷键
│   │   └── preload.ts          #   上下文桥接（文件对话框、系统信息）
│   ├── src/
│   │   ├── agent/              # AI Agent 系统
│   │   │   ├── anthropic.ts    #   Anthropic (Claude) 集成
│   │   │   ├── openai.ts       #   OpenAI / Ollama 集成
│   │   │   ├── commands.ts     #   画布命令执行引擎
│   │   │   ├── prompt.ts       #   系统提示词
│   │   │   ├── response.ts     #   响应解析
│   │   │   ├── search.ts       #   Tavily 网页搜索
│   │   │   ├── ioLog.ts        #   IO 日志记录
│   │   │   └── types.ts        #   类型定义
│   │   ├── blocks/             # 11 种模块组件
│   │   │   ├── MarkdownBlock.tsx
│   │   │   ├── CodeBlock.tsx
│   │   │   ├── HtmlBlock.tsx
│   │   │   ├── SvgBlock.tsx
│   │   │   ├── ImageBlock.tsx
│   │   │   ├── TableBlock.tsx
│   │   │   ├── LinkBlock.tsx
│   │   │   ├── BubbleBlock.tsx
│   │   │   ├── NoteBlock.tsx
│   │   │   ├── CollectionBlock.tsx
│   │   │   ├── Canvas2DBlock.tsx
│   │   │   ├── BlockMenu.tsx
│   │   │   └── ResizeHandle.tsx
│   │   ├── canvas/
│   │   │   ├── Canvas.tsx      # 主画布（平移/缩放/小地图/搜索）
│   │   │   └── camera.ts       # 坐标变换
│   │   ├── chat/
│   │   │   └── FloatingInput.tsx  # 浮动聊天面板
│   │   ├── home/
│   │   │   └── HomePage.tsx    # 首页（画布管理）
│   │   ├── settings/
│   │   │   └── SettingsPanel.tsx  # 设置面板
│   │   ├── __tests__/          # 单元测试
│   │   ├── store.ts            # Zustand 全局状态
│   │   ├── canvasFiles.ts      # 导出功能（JSON/MD/HTML）
│   │   ├── App.tsx             # 根组件
│   │   ├── main.tsx            # 入口文件
│   │   ├── index.css           # 全局样式
│   │   └── b3-physical.css     # 物理材质主题样式
│   ├── public/                 # 静态资源
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   └── tsconfig.json
├── LICENSE                     # MIT License
└── README.md
```

---

## 🎨 画布主题

TreeWorld 提供三种视觉主题，在设置面板的「画布」标签页切换：

| 主题 | 风格 |
|------|------|
| 🟤 **Cork（软木）** | 温暖的软木板纹理，默认主题 |
| ⚫ **Leather（皮革）** | 深色皮革质感 |
| ⚪ **Linen（亚麻）** | 浅色亚麻织物 |

---

## 📤 导出格式

从画布顶栏的导出菜单中选择：

- **JSON** — 完整画布文档，可重新导入
- **Markdown** — 按位置排序的模块内容，代码块使用围栏语法
- **HTML** — 自包含 HTML 文档，带内联样式

---

## 🧪 测试

```bash
# 运行所有单元测试
npm test

# 监听模式
npm run test:watch
```

测试覆盖：相机坐标变换、画布命令执行、AI 响应解析、Zustand Store 逻辑。

---

## 📄 License

[MIT](LICENSE) © 2026 CrazyLoveStudio
