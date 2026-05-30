# 🌳 TreeWorld

An infinite canvas app where humans and AI agents share a workspace.

TreeWorld lets you freely arrange markdown notes, code snippets, images, tables, HTML widgets, and more on an infinite canvas — then collaborate with an AI agent that can search the web, plan multi-step tasks, and create or modify canvas blocks for you.

![TreeWorld](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### Canvas
- **Infinite pan & zoom** — navigate freely with mouse/touchpad, minimap, and keyboard shortcuts
- **11 block types** — Markdown, Note, Bubble, HTML, SVG, Image, Code, Table, Link, Canvas 2D, Collection
- **Drag & resize** — move blocks by title bar, resize from corners
- **Block menus** — lock, duplicate, delete, bring-to-front via click menu
- **Undo/redo** — Cmd+Z / Cmd+Shift+Z with 50-step history
- **Search** — Cmd+F to find blocks by content, click to jump
- **Multi-canvas** — create and switch between separate canvases
- **Export** — JSON, Markdown, or HTML formats
- **Drag & drop images** — drop or paste image files directly onto the canvas

### AI Agent
- **Plan → Confirm → Execute** — agent shows a plan card first, you confirm before it acts
- **Web search** — powered by Tavily API, agent searches before answering
- **Multi-provider** — supports Anthropic (Claude), OpenAI (GPT), and Ollama (local models)
- **Floating chat** — press `/` or `Cmd+K` to open the chat overlay
- **Canvas commands** — agent can create, update, delete, query, and group blocks

### UI
- **Physical materialization** — MD blocks look like paper, notes like sticky notes, collections like cork boards
- **Responsive design** — blocks auto-height to fit content
- **Settings panel** — configure API keys, model IDs, and base URLs in-app
- **Keyboard shortcuts** — extensive shortcut reference built into Settings

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Install & Run

```bash
cd treeworld
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Configure AI (optional)

1. Open Settings (gear icon, bottom-left)
2. Choose a provider (Anthropic / OpenAI / Ollama)
3. Enter your API key and model ID
4. Start chatting with the agent via `/` or `Cmd+K`

Or copy the env template:

```bash
cp .env.example .env
# Edit .env with your API keys
```

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| State | Zustand |
| LLM | Anthropic SDK, OpenAI SDK |
| Search | Tavily API |
| Syntax | highlight.js |
| Markdown | react-markdown |

## 📁 Project Structure

```
treeworld/
├── src/
│   ├── agent/          # LLM integration (Anthropic, OpenAI, Ollama)
│   │   ├── anthropic.ts
│   │   ├── openai.ts
│   │   ├── commands.ts   # Canvas command execution
│   │   ├── prompt.ts     # System prompts
│   │   ├── response.ts   # Response parsing
│   │   ├── search.ts     # Tavily web search
│   │   └── types.ts
│   ├── blocks/         # 11 block components
│   │   ├── MarkdownBlock.tsx
│   │   ├── CodeBlock.tsx
│   │   ├── HtmlBlock.tsx
│   │   ├── SvgBlock.tsx
│   │   ├── ImageBlock.tsx
│   │   ├── TableBlock.tsx
│   │   ├── LinkBlock.tsx
│   │   ├── BubbleBlock.tsx
│   │   ├── CollectionBlock.tsx
│   │   ├── Canvas2DBlock.tsx
│   │   ├── BlockMenu.tsx
│   │   ├── ResizeHandle.tsx
│   │   └── useBlockInteractions.ts
│   ├── canvas/
│   │   └── Canvas.tsx    # Main canvas with pan/zoom/minimap
│   ├── chat/
│   │   └── FloatingInput.tsx
│   ├── home/
│   │   └── HomePage.tsx
│   ├── settings/
│   │   └── SettingsPanel.tsx
│   ├── store.ts        # Zustand store (all state & actions)
│   ├── App.tsx         # Root component
│   └── main.tsx
└── package.json
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` or `Cmd+K` | Open AI chat |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Cmd+F` | Search blocks |
| `Cmd+0` | Reset zoom |
| `Cmd+1` | Zoom to fit |
| `Escape` | Close menus / deselect |
| `Delete` | Delete selected block |

## 📄 License

MIT
