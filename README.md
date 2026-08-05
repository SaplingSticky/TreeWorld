# 🌳 TreeWorld

**[English](README.en.md)** | **中文**

**把想法摊开在桌面上，和 AI 一起整理它们。**

TreeWorld 是一块无限大的桌面。你可以在上面随意铺开笔记、代码、图片、表格——像在真实桌面上摆弄纸片一样。然后叫来你的 AI 搭档，它会帮你搜索资料、规划方案，自动把内容整理到画布上。

你不需要画流程图，不需要写文档模板。打开 TreeWorld，说出你想要什么，看着它在画布上一点点成型。

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)
![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 它能做什么

### 画布

TreeWorld 的画布没有边界。你可以无限平移和缩放，用小地图随时找到自己的位置。所有内容以「模块」的形式存在——拖拽标题栏移动它们，拖拽边角调整大小，双击进入编辑。

画布上可以放很多种东西：Markdown 文档、便利贴、聊天气泡、代码块、数据表格、链接预览、SVG 图形、HTML 原型，甚至是可以运行 JavaScript 动画的 Canvas 2D 画板。还有 Collection，像一个软木板容器，把相关的模块归拢在一起。

你做的每一步都可以撤销，画布会自动保存。支持多个画布之间的切换，也可以把画布导出为 JSON、Markdown 或 HTML。

### AI Agent

按 `/` 或 `Cmd+K` 唤出聊天窗口，告诉 AI 你想做什么。

它不是直接往画布上扔东西。AI 会先给你一个计划——要创建哪些模块、放在哪里、为什么选这种类型。你确认之后，它才会动手。如果计划不对，你可以要求修改，直到满意为止。

AI 还能联网搜索。当你的问题涉及最新信息、技术文档、市场数据，它会自动搜索网页，把结果整合到回答中，并标注来源。

AI 不是只能"添加"内容。它可以移动、调整、锁定、删除画布上的模块；遇到内容被截断的长模块，它会先查询完整内容再继续操作，而不是凭猜测动手。所有生成内容会自动排列在视口附近的空地上，不会压住你已有的东西。

你可以在三种 AI 后端之间选择：Anthropic 的 Claude、OpenAI 的 GPT 系列，或者通过 Ollama 连接本地模型。被锁定的模块不会被 AI 修改——你始终拥有最终控制权。

### 视觉风格

TreeWorld 不是冷冰冰的网格。Markdown 模块看起来像纸张，便利贴有微微的随机倾斜和图钉，图片是拍立得风格，Collection 像一块软木板。三种画布主题——软木、皮革、亚麻——给你不同的桌面质感。

---

## 快速开始

### 桌面版（推荐）

从 [Releases](https://github.com/SaplingSticky/TreeWorld/releases) 下载最新安装包，运行即可。

### 从源码运行

```bash
cd treeworld
npm install
npm run dev
```

浏览器打开 [http://localhost:5173](http://localhost:5173)

### 配置 AI

点击左下角齿轮图标打开设置，选择 AI 提供商，填入 API Key。也可以在项目根目录创建 `.env` 文件：

```bash
VITE_ANTHROPIC_API_KEY=你的key
VITE_OPENAI_API_KEY=你的key
VITE_TAVILY_API_KEY=你的key    # 启用联网搜索
```

### 桌面版开发

```bash
npm run tauri:dev           # 开发模式（系统 WebView）
npm run tauri:build         # 打包 AppImage + deb
```

桌面壳是 [Tauri v2](https://tauri.app)（Rust + 系统 WebView，安装包仅 ~3.5MB，内存约为 Electron 一半），不再是 Electron。

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `/` 或 `Cmd+K` | 打开 AI 聊天 |
| `Cmd+Z` / `Cmd+Shift+Z` | 撤销 / 重做 |
| `Cmd+F` | 搜索模块 |
| `Cmd+0` / `Cmd+1` | 重置缩放 / 适应全部 |
| `Alt+拖拽` | 平移画布 |
| `滚轮` | 缩放画布 |
| 双击 | 编辑模块 |
| `Escape` | 关闭菜单 |

---

## 技术栈

React 19 · TypeScript · Vite · Zustand · Anthropic SDK · OpenAI SDK · Tavily · highlight.js · react-markdown · Tauri 2

---

## License

[MIT](LICENSE) © 2026 CrazyLoveStudio
