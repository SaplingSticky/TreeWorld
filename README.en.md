# 🌳 TreeWorld

**AI-powered infinite canvas — a shared creative space for humans and AI.**

TreeWorld is a Miro-style infinite canvas app with an integrated AI Agent. Freely arrange markdown notes, code snippets, images, tables, HTML widgets, and more on the canvas — then collaborate with an AI Agent that can search the web, plan multi-step tasks, and automatically create or modify canvas blocks.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)
![Electron](https://img.shields.io/badge/Electron-42-47848F?logo=electron)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

### 🎨 Canvas System

| Feature | Description |
|---------|-------------|
| **Infinite pan & zoom** | Alt+drag to pan, scroll wheel to zoom (0.1x ~ 3x), minimap navigation |
| **11 block types** | Markdown, Note, Bubble, HTML, SVG, Image, Code, Table, Link, Canvas 2D, Collection |
| **Drag & resize** | Drag by title bar to move, drag corners to resize |
| **Context menu** | Lock/unlock, duplicate, delete |
| **Undo / redo** | Cmd+Z / Cmd+Shift+Z, 50-step history |
| **Search** | Cmd+F to search blocks by content, click to jump |
| **Multi-canvas** | Create and switch between multiple independent canvases |
| **Export** | JSON, Markdown, or HTML formats |
| **Image drag & drop** | Drag or paste image files directly onto the canvas |
| **Canvas themes** | Cork / Leather / Linen |

### 🤖 AI Agent

| Feature | Description |
|---------|-------------|
| **Plan → Confirm → Execute** | Agent shows a plan card first, user confirms before execution |
| **Web search** | Powered by Tavily API, auto-detects search intent and searches the web |
| **Multi-provider** | Anthropic (Claude), OpenAI (GPT), Ollama (local models) |
| **Floating chat** | Press `/` or `Cmd+K` to open the chat overlay |
| **Canvas commands** | Agent can create, update, delete, query, and group blocks |
| **Lock safety** | Locked blocks cannot be modified by the agent |
| **IO logs** | View all agent request/response records in Settings |

### 🧩 Block Types

| Block | Description |
|-------|-------------|
| **Markdown** | Rich text rendering, supports `- [ ]` interactive todo checkboxes |
| **Note** | Sticky note style with random micro-rotation, pin & cork aesthetic |
| **Bubble** | Chat-bubble style short messages, auto-sizes to content |
| **HTML** | Sandboxed iframe rendering, strict CSP isolation, no network access |
| **SVG** | Inline SVG rendering, auto-sanitized (removes script/foreignObject etc.) |
| **Image** | Polaroid-style image display with random micro-rotation |
| **Code** | highlight.js syntax highlighting, lazy-loads language packs, 25+ languages |
| **Table** | Structured data table, JSON storage, add/delete rows & columns, inline editing |
| **Link** | URL preview card showing domain, favicon, and page preview |
| **Canvas 2D** | Programmatic Canvas 2D graphics, executes raw JavaScript, supports requestAnimationFrame |
| **Collection** | Container/group block, children follow movement, collapsible, cork board aesthetic |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
cd treeworld
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Configure AI (optional)

1. Click the gear icon (bottom-left) to open Settings
2. Choose a provider (Anthropic / OpenAI / Ollama)
3. Enter your API Key and Model ID
4. Press `/` or `Cmd+K` to start chatting with the Agent

Or copy the environment variable template:

```bash
cp .env.example .env
# Edit .env with your API keys
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_ANTHROPIC_API_KEY` | Anthropic (Claude) API Key |
| `VITE_OPENAI_API_KEY` | OpenAI API Key |
| `VITE_TAVILY_API_KEY` | Tavily Search API Key (enables web search) |

> 💡 API Keys can also be configured in the app's Settings panel — no `.env` file needed.

---

## 🖥️ Electron Desktop App

TreeWorld can be packaged as an Electron desktop application.

### Development Mode

```bash
npm run electron:dev
```

Starts both the Vite dev server and Electron window simultaneously.

### Build Installer

```bash
# Windows NSIS installer
npm run electron:build:win

# Generic build
npm run electron:build
```

### Desktop Features

- Minimize to system tray (doesn't exit the app)
- Global shortcut `Cmd+Shift+T` to bring up the window
- Native file save/open dialogs
- Context isolation with secure preload script

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` or `Cmd+K` | Open AI chat |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Cmd+F` | Search blocks |
| `Cmd+0` | Reset zoom |
| `Cmd+1` | Fit all blocks |
| `Escape` | Close menu / deselect |
| `Delete` | Delete selected block |
| `Alt+Drag` | Pan canvas |
| `Scroll` | Zoom canvas |
| Double-click content | Edit block |
| Click title bar | Open block menu |

---

## 🏗️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React + TypeScript | 19 / 6 |
| Build | Vite | 8 |
| State Management | Zustand | 5 |
| LLM SDK | Anthropic SDK | 0.95 |
| LLM SDK | OpenAI SDK | 6.37 |
| Search | Tavily API | — |
| Syntax Highlighting | highlight.js | 11 |
| Markdown | react-markdown | 10 |
| Desktop | Electron + electron-builder | 42 / 26 |
| Testing | Vitest | 4 |
| E2E | Playwright | 1.60 |

---

## 📁 Project Structure

```
TreeWorld/
├── treeworld/                  # Main application directory
│   ├── electron/               # Electron main process
│   │   ├── main.ts             #   Window creation, tray, global shortcuts
│   │   └── preload.ts          #   Context bridge (file dialogs, system info)
│   ├── src/
│   │   ├── agent/              # AI Agent system
│   │   │   ├── anthropic.ts    #   Anthropic (Claude) integration
│   │   │   ├── openai.ts       #   OpenAI / Ollama integration
│   │   │   ├── commands.ts     #   Canvas command execution engine
│   │   │   ├── prompt.ts       #   System prompts
│   │   │   ├── response.ts     #   Response parsing
│   │   │   ├── search.ts       #   Tavily web search
│   │   │   ├── ioLog.ts        #   IO log recording
│   │   │   └── types.ts        #   Type definitions
│   │   ├── blocks/             # 11 block components
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
│   │   │   ├── Canvas.tsx      # Main canvas (pan/zoom/minimap/search)
│   │   │   └── camera.ts       # Coordinate transforms
│   │   ├── chat/
│   │   │   └── FloatingInput.tsx  # Floating chat panel
│   │   ├── home/
│   │   │   └── HomePage.tsx    # Home page (canvas management)
│   │   ├── settings/
│   │   │   └── SettingsPanel.tsx  # Settings panel
│   │   ├── __tests__/          # Unit tests
│   │   ├── store.ts            # Zustand global state
│   │   ├── canvasFiles.ts      # Export (JSON/MD/HTML)
│   │   ├── App.tsx             # Root component
│   │   ├── main.tsx            # Entry point
│   │   ├── index.css           # Global styles
│   │   └── b3-physical.css     # Physical material theme styles
│   ├── public/                 # Static assets
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   └── tsconfig.json
├── LICENSE                     # MIT License
└── README.md
```

---

## 🎨 Canvas Themes

TreeWorld offers three visual themes, switchable in Settings → Canvas:

| Theme | Style |
|-------|-------|
| 🟤 **Cork** | Warm cork board texture, default theme |
| ⚫ **Leather** | Dark leather texture |
| ⚪ **Linen** | Light linen fabric |

---

## 📤 Export Formats

From the canvas top bar export menu:

- **JSON** — Full canvas document, can be re-imported
- **Markdown** — Blocks sorted by position, code blocks use fenced syntax
- **HTML** — Self-contained HTML document with inline styles

---

## 🧪 Testing

```bash
# Run all unit tests
npm test

# Watch mode
npm run test:watch
```

Test coverage: camera coordinate transforms, canvas command execution, AI response parsing, Zustand store logic.

---

## 📄 License

[MIT](LICENSE) © 2026 CrazyLoveStudio
