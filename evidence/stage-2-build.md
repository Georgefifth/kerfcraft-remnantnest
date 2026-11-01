# Stage 2 — Competitive Analysis, UX Contract, Implementation & Deployment Evidence

## 1. Competitor Comparison & Verified Sources

| Product | URL | Strengths (What They Do Well) | Verified Gaps & User Pain Points | How KerfCraft (RemnantNest) Improves |
|---|---|---|---|---|
| **SVGnest** (Open-Source, 2.6k★) | https://github.com/Jack000/SVGnest | Pioneered browser-based No-Fit Polygon (NFP) SVG nesting; MIT licensed | - No locked remnant / keep-out cutout regions (`SVGnest#19`: https://github.com/Jack000/SVGnest/issues/19)<br>- No per-part wood-grain orientation lock (`SVGnest#15`: https://github.com/Jack000/SVGnest/issues/15)<br>- Cannot import DXF files directly | Supports multi-hole irregular remnant sheets, per-part `0°/180°` wood-grain lock, and built-in local ASCII DXF + SVG parsing |
| **Deepnest / Deepnest-next** (1.1k★) | https://github.com/Jack000/Deepnest | Desktop Electron wrapper with common-line and laser kerf settings | - **DXF import fails with `Errorcode 522`** because its hardcoded conversion server `http://convert.deepnest.io` is dead (`Deepnest#196`: https://github.com/Jack000/Deepnest/issues/196)<br>- Unmaintained since 2020 (`Deepnest#123`: https://github.com/Jack000/Deepnest/issues/123) | 100% client-side DXF (`LWPOLYLINE`) and SVG parser running in-browser with zero external server dependency |
| **opcut** (Open-Source, 186★) | https://github.com/bozokopic/opcut | Clean guillotine panel-saw cutlist optimizer | - Only handles rectangles (no irregular CNC/laser polygons)<br>- Missing dimension annotations on exported sheets (`opcut#36`: https://github.com/bozokopic/opcut/issues/36) | Handles both irregular polygons (chamfered plates, L-brackets, drone arms) and rectangular cutlists; exports annotated SVG, R12 DXF, and Markdown audit reports |
| **CutList Optimizer** (Commercial Web) | https://www.cutlistoptimizer.com/ | Popular tabular cutlist entry and stock sheet summary | - Free tier limits and no irregular vector polygon nesting or optical scrap contour tracing | Zero-paywall browser workbench with optical scrap silhouette tracing and automatic salvageable offcut detection |

---

## 2. Prioritized Problems & Implemented Optimizations

| Priority | Problem Identified | Concrete Optimization Implemented | Verification & Measured Impact |
|---|---|---|---|
| **P0** | Makers discard irregular partially-cut sheets ("skeletons") because tools assume fresh rectangular stock (`SVGnest#19`) | Built **Remnant-First Multi-Pass Nesting Solver (`src/engine/nestingEngine.ts`)** that prioritizes placing parts onto irregular remnants (avoiding interior cutout keep-out holes) before touching fresh stock | Rescues **100% (14/14)** of the FabLab FPV Drone kit onto a single 600×400mm perforated acrylic remnant (**771.9 cm² rescued, $26.70 saved, 0 fresh sheets consumed**) |
| **P0** | Deepnest fails on DXF files with `Errorcode 522` due to dead cloud server (`Deepnest#196`) | Built **100% Client-Side ASCII DXF & SVG Parser (`src/engine/dxfSvgParser.ts`)** supporting `LWPOLYLINE` and SVG `<rect>`, `<polygon>`, `<path>` | Parses DXF and SVG files in **<5 ms** offline in the browser with actionable line/element error messages on malformed files |
| **P1** | Woodworkers ruin structural strength and grain continuity when parts rotate 90° (`SVGnest#15`) | Added per-part **Grain Lock (`0°/180°` only)** toggle (`grain_locked` vs `orthogonal_90`) with visual cyan grain-direction vectors on the CAD canvas | Verified via unit test and visual inspection on the *Baltic Birch Modular Synthesizer Case* preset: all visible face/cheek panels strictly maintain `0°/180°` alignment while achieving **57.5% yield (+25.4% over naive)** |
| **P1** | Newly created offcut strips on partially used sheets are forgotten instead of cataloged | Added **Salvageable New Offcut Detector** + **1-Click "+ Save New Offcut to Remnant Bin"** button + **Optical Scrap Contour Tracer Modal** | Identifies a **396×121mm (479 cm², ~$3.89)** reusable offcut rectangle on the drone job and catalogs it directly into the Remnant Bin |
| **P1** | Exported cut sheets lack dimension callouts or CAD layer separation (`opcut#36`) | Built **Multi-Format Shop Exporter (`src/engine/exporter.ts`)** generating annotated `.SVG`, layered R12 `.DXF` (`SHEET_BORDER`, `REMNANT_HOLES`, `CUT_PATHS`, `SALVAGE_OFFCUTS`), and `.MD`/`.JSON` waste audits | Verified round-trip export and in-app code preview across all 3 formats |

---

## 3. Before vs. After Quantitative Comparison (3 Real Fabrication Workloads)

| Workload | Naive Fresh-Sheet Yield | KerfCraft Remnant-First Yield | Yield Improvement | Remnant Scrap Rescued | Material Cost Saved | Collision Overlap |
|---|---:|---:|---:|---:|---:|---:|
| **1. FabLab 5" FPV Drone & Sensor Deck (3mm Acrylic)** | 37.8% | **63.1%** | **+25.3%** | 771.9 cm² (14/14 parts) | **$26.70 USD** | `0.0 mm²` (Verified) |
| **2. Baltic Birch Modular Synth Case (12mm Plywood, Grain-Locked)** | 32.1% | **57.5%** | **+25.4%** | 1,965.8 cm² (12/12 parts) | **$45.84 USD** | `0.0 mm²` (Verified) |
| **3. 6061 Aluminum Rover Chassis & Gearbox Plates (4mm Alloy)** | 39.3% | **51.6%** | **+12.3%** | 902.9 cm² (12/12 parts) | **$80.23 USD** | `0.0 mm²` (Verified) |
| **Aggregate / Average** | **36.4%** | **57.4%** | **+21.0% avg** | **3,640.6 cm²** | **$152.77 USD** | **100% Pass (`0.0 mm²`)** |

---

## 4. UX Contract & Frontend Visual Verification

- **UX Contract**: `design/UX.md` completed prior to UI implementation.
- **Visual Direction**: **Calibrated, Industrial, High-Density** CAD Drafting Workbench (`#0C1014` anodized bed, `#F59E0B` laser safety amber, `#10B981` rescued remnant emerald, `#38BDF8` blueprint cyan vectors, `Space Grotesk` + `JetBrains Mono` tabular numerals).
- **Frontend Screenshots (`evidence/stage-2-build/frontend/`)**:
  - `01-desktop-studio-initial.png` — 1440×900 Desktop CAD Drafting & Nesting Studio
  - `02-desktop-nest-solved.png` — Multi-pass solve verification banner & salvageable offcut detection
  - `03-desktop-scrap-tracer-modal.png` — Optical Scrap Contour Tracer & Remnant Digitizer modal
  - `04-desktop-benchmark-audit.png` — Quantitative Material Waste Benchmark & Verification Ledger
  - `05-desktop-empty-state.png` — Actionable Empty State with 1-click preset restoration
  - `06-mobile-390px-studio.png` — 390×844 Mobile responsive layout with sticky bottom action bar
  - `07-deployed-github-pages.png` — Live verification screenshot from `https://georgefifth.github.io/kerfcraft-remnantnest/`

---

## 5. Build, Test, Repository & Live Deployment Verification

- **Typecheck (`npm run typecheck`)**: `tsc --noEmit` — **0 errors**.
- **Unit & Geometry Invariant Tests (`npm test`)**: `vitest run` — **4/4 tests passed** (verifying `0.0 mm²` collision overlap, `0°/180°` grain lock enforcement, offline DXF/SVG parsing, and SVG/DXF/Markdown export).
- **Production Build (`npm run build`)**: Vite production build succeeded in `886ms` (`dist/index.html`, `dist/assets/`).
- **GitHub Repository**: https://github.com/Georgefifth/kerfcraft-remnantnest (Public, scanned for secrets prior to push — 0 secrets/tokens).
- **Live Deployed URL (GitHub Pages)**: https://georgefifth.github.io/kerfcraft-remnantnest/
  - Verified via headless Chromium Playwright: **HTTP 200**, interactive solver verified (`63.1%` yield, `$26.70 USD` saved), **0 console/page errors**.

## 6. Known Limitations & Next Steps

- Current DXF parser focuses on `LWPOLYLINE` closed contours in millimeters (the standard export format from Fusion 360, SolidWorks, OnShape, and LightBurn); spline (`SPLINE`) entities are approximated as polylines on export from CAD.
- Next stage (Stage 3) will execute full end-to-end Playwright real-browser QA across all user journeys, boundary conditions, invalid inputs, and mobile viewports.
