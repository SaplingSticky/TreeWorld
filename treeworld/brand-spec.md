# TreeWorld B3 Brand Spec

Source files:
- `src/b3-physical.css`
- `src/home/HomePage.tsx`
- `src/App.tsx`

## Tokens

```css
:root {
  --bg:      oklch(68% 0.072 73);
  --surface: oklch(96% 0.025 86);
  --fg:      oklch(22% 0.038 67);
  --muted:   oklch(43% 0.054 70);
  --border:  oklch(84% 0.039 82);
  --accent:  oklch(39% 0.088 29);

  --font-display: 'Lora', Georgia, serif;
  --font-body:    'Lora', Georgia, serif;
  --font-mono:    'Special Elite', 'Courier New', monospace;
  --font-hand:    'Caveat', 'Segoe Print', cursive;
}
```

## Supporting Colors

- Cork field: `#b7894f`, `#c59b63`, `#a87d45`
- Paper: `#f8f3e6`, edge `#dfd6be`, rule `#d8c39b`
- Ink: `#2e2010`, deep button `#3e2600`
- Pin/accent: `#8b3a3a`
- CRT shell/status: `#ece7de`, `#72d272`
- Note colors: yellow `#fff176`, pale blue `#eef2f8`

## Layout Posture

- Treat the UI as a physical creator desk: cork board canvas, pinned paper, tactile notes, labels, cards, and exposed grid texture.
- Use low radii, usually 2-4px. Avoid polished SaaS pills except where existing block chrome requires round controls.
- Buttons and cards should feel stamped or raised with offset brown shadows, not soft floating glass.
- Use typewriter uppercase labels for controls, metadata, and compact status chips; use serif display/body for narrative copy.
- Keep accent budget tight: wine-red pin color for destructive/primary emphasis, CRT green only for live state, success, focus, or generated output feedback.
```
