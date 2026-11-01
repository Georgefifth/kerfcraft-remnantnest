# Stage 4 — Demo Video & Visual Presentation Evidence — KerfCraft (RemnantNest)

## 1. Visual Narrative Architecture & Design System

Following the **Visual Explanation → Real Demonstration → Actual Result** workflow, we authored a custom Swiss Architectural Grid live HTML slide deck (`demo/slides.html`) and a 6-scene narrated storyboard (`demo/scenes.js`) rendered at **1080p 30fps (`1920×1080`)** with floating macOS window framing, Bezier cursor trajectories, spotlight zoom, procedural Foley UI SFX, and sidechain-ducked `crisp-minimal` BGM.

### Scene-by-Scene Breakdown (`105.9s` / `1m 45.9s` total, well within the 2–3 minute Devpost limit)

| Scene # | Scene Name | Type / Visual Format | Key Content & Real Data Displayed | Duration |
|---|---|---|---|---:|
| **1** | `01-waste-problem-slide` | **Before / After Visual Diagram (`demo/slides.html#s1`)** | Side-by-side SVG comparison of the Status Quo (`36.4%` avg yield, discarding `600×400mm` perforated scrap skeletons, `Deepnest#196` Error 522, `SVGnest#15/#19` missing grain & remnant locks) vs. **KerfCraft Remnant-First Engine (`57.4%` avg yield, `1.33ms` offline parse, `0.0 mm²` overlap)** | `19.9s` |
| **2** | `02-architecture-pipeline-slide` | **4-Stage System Architecture Flowchart (`demo/slides.html#s2`)** | Visualizes the 4 client-side modules: `dxfSvgParser.ts` (Stage 1 Vector Ingest) → `remnantDetector.ts` (Stage 2 Scrap Contour & Hole Digitizer) → `nestingEngine.ts` (Stage 3 3-Pass Skyline + NFP Collision Solver) → `exporter.ts` (Stage 4 Offcut Loop & CAD Export) + mathematical invariant bar | `19.4s` |
| **3** | `03-live-remnant-first-nesting` | **Live Deployed App (`workbench` session)** | Executes `RUN REMNANT-FIRST NEST` on the 14-part FabLab FPV Drone kit; spotlights `0.0 mm² OVERLAP VERIFIED` badge (`56.5%` yield, `$26.61` saved); clicks `+ Save 396×115mm New Offcut to Remnant Bin` | `17.1s` |
| **4** | `04-live-dxf-import-and-scrap-tracer` | **Live Deployed App (`workbench` session)** | Opens local ASCII DXF/SVG parser drawer, parses `LWPOLYLINE` contours locally (`0` cloud requests), then opens the **Optical Scrap Contour Tracer** modal, selects `Perforated Laser Skeleton`, and digitizes a leftover board into the active solver queue | `14.1s` |
| **5** | `05-grain-lock-export-and-audit` | **Live Deployed App (`workbench` session)** | Switches to the *Baltic Birch Modular Synthesizer Case* preset (`0°/180°` wood-grain lock), exports a layered R12 `.DXF` cut sheet, and opens the **Quantitative Material Waste Benchmark & Verification Ledger** (`+23.2%` yield gain, `100% PASS`) | `14.3s` |
| **6** | `06-validation-proof-slide` | **Data Visualization & Benchmark Matrix (`demo/slides.html#s3`)** | Animated horizontal comparison bars across all 3 shop workloads + 4-quadrant KPI matrix from Stage 3.5 (`12/12` external MIT CAD files passed, `1.33ms` mean parse time, `3,641 cm²` scrap rescued, `0/2` false positives on negative cases) | `21.1s` |

---

## 2. Exported Video & Slide Artifacts

- **Narrated 1080p Demo Video**: `evidence/stage-4-demo/demo.mp4`
  - **Codec / Resolution / FPS**: `H.264 (High)`, `1920×1080`, `30 fps`, `AAC 48kHz` audio
  - **Duration**: `105.90 seconds` (`1m 45.9s` — fits Arbiter Hacks V1 `[2 to 3] minutes max` requirement)
  - **File Size**: `12,959,953 bytes` (`~12.4 MB`)
- **Editable Live HTML Slide Deck**: `demo/slides.html`
- **Exported 1080p Static Slide PNGs**:
  - `evidence/stage-4-demo/slides/s1.png`
  - `evidence/stage-4-demo/slides/s2.png`
  - `evidence/stage-4-demo/slides/s3.png`
- **Scene Specification**: `demo/scenes.js`

---

## 3. Frame-by-Frame Visual QA Verification (`evidence/stage-4-demo/qa/`)

All 6 extracted frames were visually inspected with `read`:
- `frame-5.png` (Scene 1 — Before/After Slide): Crisp typography, SVG scrap diagrams clearly legible, burned-in subtitle sits cleanly in the bottom 140px margin with zero overlap.
- `frame-25.png` (Scene 2 — 4-Stage Architecture Pipeline Slide): All 4 stage cards, code filenames (`dxfSvgParser.ts`, `remnantDetector.ts`, `nestingEngine.ts`, `exporter.ts`), and bottom geometric invariant bar render with zero clipping.
- `frame-46.png` (Scene 3 — Live Remnant-First Nesting): Floating macOS window frame on Swiss grid wallpaper; cursor clicks `+ Save 396×115mm New Offcut to Remnant Bin`; CAD canvas shows 14 placed parts and red hatched keep-out holes clearly.
- `frame-63.png` (Scene 4 — Local DXF Parser & Optical Scrap Tracer): Shows 16 placed instances after local DXF import + digitized `#R29` remnant sheet added to solver tabs.
- `frame-78.png` (Scene 5 — Grain-Lock Export & Benchmark Audit Ledger): Displays the full Quantitative Material Waste Benchmark table (`+23.2%` avg yield gain, `4380 cm²` scrap prevented, `$159.86 USD` saved, `100% PASS`).
- `frame-95.png` (Scene 6 — Stage 3.5 Validation Proof Slide): Animated emerald yield bars and 12/12 external CAD dataset verification cards match Stage 3.5 evidence.
