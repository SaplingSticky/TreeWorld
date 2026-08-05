# Show HN draft — TreeWorld

## Title (pick one)

- Show HN: TreeWorld – an infinite canvas where the AI is a co-editor, not a chatbot
- Show HN: I built an infinite canvas where the AI edits alongside you (delete/query/group, local-first)

## Body

TreeWorld is an infinite canvas where both you and an AI agent operate on the same surface. The AI doesn't reply with text — it creates real blocks on the canvas: markdown docs, notes, images, tables, collections.

Why not a chatbot? Chat is a lossy channel for thinking. Ideas branch and cluster; a canvas preserves that structure. Conversations are temporary, the canvas is permanent.

How the agent works:
- You press `/`, describe what you want, the agent proposes a **plan first** (which blocks, why each type) and only executes after you confirm.
- It runs a JSON command protocol against the canvas (create/update/move/resize/lock/delete/group/batch/query).
- Context is viewport-aware: only visible blocks' summaries go to the model (capped at 30 blocks/4KB). When it needs the full content of a truncated block, it issues `canvas.query` and the app feeds the content back — up to 3 rounds. It reads before it writes.
- **You can lock any block.** The agent physically cannot modify locked blocks — it leaves a note saying it must be unlocked first.

Stack: React 19 + TypeScript + Zustand + Vite, desktop shell in Tauri 2 (Rust + system WebView, 2.2MB Windows installer vs ~100MB when it ran on Electron). Local-first: everything in localStorage, three backends (Claude / OpenAI / Ollama), optional web search via Tavily.

Honest limitations:
- Single-machine, localStorage persistence (no sync, no cloud — by design for now).
- The agent is only as good as the model you point at it; small local models struggle with the JSON protocol.
- HTML blocks run sandboxed, but this is a v1 — treat agent-generated HTML with care.

Repo: https://github.com/SaplingSticky/TreeWorld (MIT)

I'd love feedback on the canvas-agent protocol itself — I think the query-before-write loop is the interesting part, and I'm curious if anyone has tried a similar handshake between an LLM and a persistent surface.

## Posting tips (for the human)

- Post between 9:00–11:00 UTC+8 evening US time? Actually: HN traffic peaks ~9–11am Pacific (0:00–2:00 UTC+8). Post then, or use a scheduler.
- First comment within 5 minutes with the demo GIF + "author here, happy to answer questions".
- Reply to every comment; HN ranks engagement hard.
- If it flops, it flops — HN is a lottery, the blog post and the repo outlive the post.
