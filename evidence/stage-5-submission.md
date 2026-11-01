# Stage 5 — Devpost Submission Package Evidence — KerfCraft (RemnantNest)

## 1. Submission Package Contents (`submission/`)

- **Fields Document**: `submission/fields.md`
  - Contains single, final, ready-to-paste values for:
    - **Track Selection**: `Theme Track — Rethinking Waste`
    - **Project name**: `KerfCraft (RemnantNest)`
    - **Elevator pitch**: `Remnant-first 2D CAD nesting workbench that packs laser, CNC, and woodworking parts onto leftover irregular scrap offcuts before cutting fresh sheets.`
    - **Theme Track Requirement Paragraph**: Dedicated one-paragraph statement detailing the specific digital-fabrication sheet-waste problem targeted and the 4 reproducible metrics used to measure impact.
    - **About the project**: Complete Devpost-safe Markdown (`## Inspiration`, `## What it does`, `## How we built it`, `## Challenges we ran into`, `## Accomplishments that we're proud of`, `## What we learned`, `## What's next for KerfCraft (RemnantNest)`), with all XML/SVG tags and formulas wrapped in backticks and all numbers verified against Stage 3 and Stage 3.5 evidence.
    - **Built with**: 11 tags (`react`, `typescript`, `tailwindcss`, `vite`, `svg`, `dxf`, `computational-geometry`, `cad`, `playwright`, `vitest`, `github-pages`).
    - **"Try it out" links**: Live GitHub Pages URL and public GitHub repository URL.
    - **Image gallery captions**: 6 concise captions (`<= 150` characters) mapped 1-to-1 to `submission/assets/01-...` through `06-...`.
- **Human Step-by-Step Checklist**: `submission/checklist.md`

---

## 2. Asset Verification (`submission/assets/`)

All image assets were verified for format (`PNG`), aspect ratio (`3:2`), resolution (`1200×800` / `1500×1000`), and file size (`< 5 MB` limit):

| Asset File | Role | Format & Resolution | Aspect Ratio | Size | Status |
|---|---|---|---|---:|---|
| `submission/assets/00-thumbnail.png` | Custom-Generated Project Thumbnail (Not Cropped) | PNG `1200 × 800` | `3:2` | `0.11 MB` | **VERIFIED** |
| `submission/assets/01-waste-problem-comparison.png` | Gallery #1 — Status Quo vs. Remnant-First Comparison | PNG `1500 × 1000` | `3:2` | `0.18 MB` | **VERIFIED** |
| `submission/assets/02-architecture-pipeline.png` | Gallery #2 — 4-Stage Computational Geometry Pipeline | PNG `1500 × 1000` | `3:2` | `0.17 MB` | **VERIFIED** |
| `submission/assets/03-live-remnant-nesting-studio.png` | Gallery #3 — Live CAD Workbench & Salvaged Offcut | PNG `1500 × 1000` | `3:2` | `0.26 MB` | **VERIFIED** |
| `submission/assets/04-optical-scrap-contour-tracer.png` | Gallery #4 — Optical Scrap Contour Tracer Modal | PNG `1500 × 1000` | `3:2` | `0.21 MB` | **VERIFIED** |
| `submission/assets/05-grain-lock-and-dxf-export.png` | Gallery #5 — Wood-Grain Lock & R12 DXF Export | PNG `1500 × 1000` | `3:2` | `0.21 MB` | **VERIFIED** |
| `submission/assets/06-validation-benchmark-proof.png` | Gallery #6 — Stage 3.5 External CAD Dataset Proof | PNG `1500 × 1000` | `3:2` | `0.19 MB` | **VERIFIED** |
| `submission/assets/demo.mp4` | Narrated 1080p Demo Video (`1m 45.9s`, 30fps) | MP4 (`H.264` + `AAC`) `1920 × 1080` | `16:9` | `12.36 MB` | **VERIFIED** |

---

## 3. Live Link Accessibility Verification

- **Live Deployed Application (`https://georgefifth.github.io/kerfcraft-remnantnest/`)**: Verified `HTTP/2 200 OK` and end-to-end interactive functionality in headless Firefox & Chromium.
- **Public GitHub Repository (`https://github.com/Georgefifth/kerfcraft-remnantnest`)**: Verified `HTTP/2 200 OK`, clean commit history, zero secrets or `.env` files.
