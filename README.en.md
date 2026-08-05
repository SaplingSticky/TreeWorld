# 🌳 TreeWorld

**Spread your ideas across an infinite surface. Let AI help you organize them.**

TreeWorld is an infinite canvas with no boundaries. Lay out notes, code, images, and tables freely — like shuffling papers on a real desk. Then bring in your AI collaborator: it searches the web, drafts a plan, and assembles content on the canvas for you.

No flowchart templates. No document frameworks. Open TreeWorld, describe what you want, and watch it take shape.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)
![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri)
![License](https://img.shields.io/badge/License-MIT-green)

---

## What it does

### The canvas

Pan infinitely. Zoom from 0.1x to 3x. A minimap keeps you oriented.

Everything lives in **blocks** — drag by the title bar to move, drag corners to resize, double-click to edit. There are 11 types: rich Markdown notes, sticky notes with a pin-and-cork aesthetic, chat bubbles, code with syntax highlighting for 25+ languages, data tables, link preview cards, SVG graphics, sandboxed HTML prototypes, polaroid-style images, programmatic Canvas 2D animations, and Collections that group related blocks on a cork board.

Every action is undoable. The canvas auto-saves. Manage multiple canvases from the home page. Export your work as JSON, Markdown, or a self-contained HTML file.

### The AI Agent

Press `/` or `Cmd+K` to open the chat. Tell the AI what you need.

It doesn't dump blocks onto your canvas blindly. The agent presents a **plan** first — what blocks to create, where to place them, why each type was chosen. You review it, confirm, and only then does it execute. If the plan isn't right, ask for revisions until it is.

The agent can **search the web**. When your question involves recent information, technical docs, or market data, it searches automatically, weaves the results into its answer, and cites sources.

The agent doesn't just add content — it can move, resize, lock, and delete blocks. When a long block's content is truncated in its context, it **queries the full content first** before acting on it, instead of guessing. Generated content is auto-arranged into empty space near your viewport, never on top of what you already have.

Choose between three AI backends: Anthropic's Claude, OpenAI's GPT models, or local models via Ollama. Lock any block to prevent the agent from modifying it — you always have the final say.

### The look and feel

TreeWorld isn't a sterile grid. Markdown blocks look like paper. Sticky notes tilt slightly, held by pins. Images appear as polaroids. Collections are cork boards. Three canvas themes — Cork, Leather, Linen — set the mood of your workspace.

---

## Getting started

### Desktop app (recommended)

Download the latest installer from [Releases](https://github.com/SaplingSticky/TreeWorld/releases).

### Run from source

```bash
cd treeworld
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Configure AI

Click the gear icon (bottom-left) to open Settings. Choose your AI provider and enter your API key. Or create a `.env` file in the project root:

```bash
VITE_ANTHROPIC_API_KEY=your-key
VITE_OPENAI_API_KEY=your-key
VITE_TAVILY_API_KEY=your-key    # enables web search
```

### Desktop development

```bash
npm run tauri:dev           # dev mode (system WebView)
npm run tauri:build         # build AppImage + deb
```

The desktop shell is [Tauri v2](https://tauri.app) (Rust + system WebView, ~3.5MB package, roughly half the memory of Electron) — no more Electron.

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `/` or `Cmd+K` | Open AI chat |
| `Cmd+Z` / `Cmd+Shift+Z` | Undo / Redo |
| `Cmd+F` | Search blocks |
| `Cmd+0` / `Cmd+1` | Reset zoom / Fit all |
| `Alt+Drag` | Pan canvas |
| `Scroll` | Zoom |
| Double-click | Edit block |
| `Escape` | Close menu |

---

## Tech stack

React 19 · TypeScript · Vite · Zustand · Anthropic SDK · OpenAI SDK · Tavily · highlight.js · react-markdown · Tauri 2

---

## License

[MIT](LICENSE) © 2026 CrazyLoveStudio
