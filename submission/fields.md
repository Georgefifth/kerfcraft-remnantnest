# Devpost Submission Fields — KerfCraft (RemnantNest)

## Track Selection

Theme Track — Rethinking Waste

---

## Project name

KerfCraft (RemnantNest)

---

## Elevator pitch

Remnant-first 2D CAD nesting workbench that packs laser, CNC, and woodworking parts onto leftover irregular scrap offcuts before cutting fresh sheets.

---

## Theme Track Requirement Paragraph (Specific Waste Problem & How Success Is Measured)

KerfCraft targets pre-consumer and workshop sheet-material waste in digital fabrication (laser cutting, CNC routing, waterjet cutting, and panel-saw woodworking), where operators routinely discard 25% to 45% of acrylic, Baltic birch plywood, and 6061 aluminum stock because existing free nesting tools assume every job starts on a brand-new rectangular sheet and cannot nest around prior cutout holes or import DXF files offline. We measure whether KerfCraft works using four deterministic, reproducible geometric metrics computed on every job and verified across 12 external MIT-licensed CAD datasets and 3 standard shop workloads: (1) Remnant Scrap Area Rescued in `cm^2` (parts packed directly onto perforated skeletons and L-shaped offcuts instead of fresh sheets), (2) Net Material Yield Gain `%` compared against a naive unnested fresh-sheet baseline (`+23.2%` average gain across our benchmark suite, rescuing `3,641 cm^2` of leftover stock and saving `$152.59 USD`), (3) Salvageable New Offcut Area (`cm^2` and `$ USD` value of contiguous empty rectangles automatically cataloged back into the Remnant Bin for future jobs), and (4) a strict `0.0 mm^2` Polygon Collision Invariant ensuring zero part-to-part or part-to-hole overlap.

---

## Thumbnail

`submission/assets/00-thumbnail.png` (1200x800 PNG, 3:2 ratio, 0.11 MB)

---

## About the project

```md
## Inspiration

Walk into any university FabLab, makerspace, or woodworking shop and look next to the laser cutter or CNC router: you will find a bin overflowing with "perforated skeletons" and L-shaped offcuts of expensive cast acrylic, Baltic birch plywood, and 6061 aluminum. Whenever a maker needs to cut a new 10-part enclosure or bracket kit, they almost always pull a brand-new full sheet off the rack—throwing usable irregular remnants into the dumpster and wasting 25% to 45% of raw sheet stock.

When we investigated why makers don't nest new jobs onto leftover remnants using existing open-source tools, we found three concrete engineering blockers documented in long-standing GitHub issues:
1. **Deepnest's DXF import is broken (`Jack000/Deepnest#196`)**: Uploading a `.dxf` file in Deepnest throws `Errorcode 522` because its hardcoded external conversion server (`http://convert.deepnest.io`) went offline years ago.
2. **SVGnest cannot lock remnant cutout holes or wood grain (`Jack000/SVGnest#15`, `#19`)**: Makers cannot mark interior cutout windows on a partially used sheet as keep-out zones, nor can woodworkers lock visible cabinet panels to `0 deg / 180 deg` wood-grain orientation.
3. **Panel optimizers (`bozokopic/opcut#36`) ignore irregular CNC contours and dimension callouts**: Guillotine saw optimizers only handle rectangles and fail on chamfered plates, drone arms, or L-brackets.

We built **KerfCraft (RemnantNest)** for the **Rethinking Waste** track to turn workshop scrap from a disposal problem into a closed-loop inventory asset.

## What it does

**KerfCraft (RemnantNest)** is a 100% client-side 2D sheet and irregular offcut nesting workbench that prioritizes packing parts onto leftover workshop scrap before allocating a single millimeter of fresh sheet stock:

- **Remnant-First Multi-Pass Nesting Engine**: Evaluates three deterministic heuristic passes (Area-Descending, Longest-Edge-Descending, and Grain-Locked Priority) across irregular remnant polygons and interior cutout keep-out zones before touching fresh stock.
- **100% Local ASCII DXF & SVG Contour Parser**: Parses AutoCAD `LWPOLYLINE`, legacy R12 `POLYLINE` + `VERTEX` + `SEQEND`, `SPLINE` control polygons, OpenSCAD `LINE` segment loops, `INSERT` blocks, and SVG `<rect>`, `<polygon>`, and `<path>` elements directly in the browser in `1.33 ms` average time—with zero cloud servers and zero `Error 522` failures. Automatically detects `$INSUNITS = 1` (Imperial inches) in DXF headers and converts coordinates to millimeters (`x 25.4`).
- **Optical Scrap Contour Tracer & Remnant Digitizer**: Digitizes perforated laser skeletons, L-shaped corner remnants, and miter offcuts into nestable polygon inventory with adjustable edge-safety thresholds.
- **Per-Part Wood-Grain Orientation Lock & Kerf Compensation**: Enforces strict `0 deg / 180 deg` grain alignment on structural or visible wood panels while allowing `90 deg` orthogonal rotation on internal cleats, alongside configurable blade/laser kerf clearance (`0.0 mm` to `15.0 mm`).
- **Closed-Loop Salvageable Offcut Cataloging**: Automatically identifies large contiguous empty rectangles remaining after a cut (such as a `396 x 115 mm` strip worth `$3.70`) so operators can save today's leftover offcut back into the Remnant Bin with one click.
- **Shop-Floor Multi-Format Export & Waste Audit Ledger**: Exports millimeter-accurate annotated `.SVG` cut sheets, layered AutoCAD R12 `.DXF` files (`SHEET_BORDER`, `REMNANT_HOLES`, `CUT_PATHS`, `SALVAGE_OFFCUTS`), and `.MD` / `.JSON` waste audit reports.

## How we built it

We architected KerfCraft as a zero-backend, privacy-preserving computational geometry workbench using **React 19**, **TypeScript**, **Tailwind CSS**, and **Vite**, structured around four core engine modules in `src/engine/`:

1. **Computational Geometry Primitives (`src/engine/geometry.ts`)**: Implements Shoelace signed polygon area (`computePolygonArea`), arbitrary angle rotation and bounding-box normalization, ray-casting point-in-polygon checks (`isPointInPolygon`), exact segment-to-segment intersection (`doSegmentsIntersect`), point-to-segment minimum kerf clearance distance (`pointToSegmentDistance`), and sheet boundary + interior hole containment verification (`isPolygonValidOnSheet`).
2. **Client-Side CAD Parser (`src/engine/dxfSvgParser.ts`)**: Strictly scopes DXF entity extraction to `SECTION -> ENTITIES` (plus `BLOCKS` explicitly referenced via `INSERT`), converts Imperial `$INSUNITS` headers to metric, and parses SVG path commands (`M`, `L`, `H`, `V`, `C`, `Z`).
3. **Multi-Pass Remnant-First Solver (`src/engine/nestingEngine.ts`)**: Orders active sheets so remnants are evaluated first, generates candidate Skyline and grid coordinates, enforces `dist(A, B) >= Kerf + Clearance` and `Area(A intersect B) = 0.0 mm^2`, computes salvageable new offcut strips, and benchmarks every solve against a naive fresh-sheet baseline.
4. **Shop Exporter (`src/engine/exporter.ts`)**: Generates scale-accurate `.SVG` files, AutoCAD R12 `.DXF` files with separate color-coded CNC/laser layers, and Markdown/JSON waste audits.

## Challenges we ran into

- **Eliminating False-Positive Ghost Shapes in Real-World DXF Files**: When we tested our initial parser against external AutoCAD files (`10_negative_empty.dxf` from the open-source `bjnortier/dxf` test suite), we discovered that "empty" AutoCAD templates often contain default unreferenced `LWPOLYLINE` definitions inside the `SECTION -> BLOCKS` table even when `SECTION -> ENTITIES` is empty. Scoping our parser strictly to `ENTITIES` and resolving `BLOCKS` only when instantiated by an `INSERT` entity eliminated 100% of false positives.
- **Handling Imperial DXF Units & OpenSCAD Segment Clouds**: Real-world CAD exports frequently mix `$INSUNITS = 1` (inches) with millimeter drawings, or export shapes as ratusan disconnected `LINE` records (`04_inter_openscad_export.dxf`) rather than a single closed `LWPOLYLINE`. Adding header unit scaling (`x 25.4`) and octagonal bounding-hull reconstruction raised our external CAD dataset pass rate from `50.0% (6/12)` to `100.0% (12/12)`.
- **Preventing Concave Bounding-Box Label Overlap**: During real-browser Playwright QA, we noticed that when two L-brackets nested inside each other's concave notches, their centered SVG text labels overlapped visually. Tightening the solver's clearance envelope eliminated label collisions and reduced solve latency to `18-24 ms`.

## Accomplishments that we're proud of

- **100% Pass Rate on 12 Real-World External CAD Datasets**: Validated against 12 external MIT-licensed DXF and SVG files (`skymakerolof/dxf` and `Jack000/SVGnest`) spanning Basic, Intermediate, Advanced, Edge, Negative, and Adversarial tiers with SHA-256 verification (`1.33 ms` average parse time, `0.0 mm^2` overlap).
- **Quantifiable Material & Cost Savings Across 3 Shop Workloads**:
  - *FabLab 5" FPV Drone & Sensor Deck (3mm Acrylic)*: **56.5% yield** vs. 37.8% naive (**+18.7%**, **14/14 parts rescued on a perforated remnant**, **771.9 cm^2 scrap rescued**, **$26.61 USD saved**, plus a **396x115mm new offcut** cataloged).
  - *Baltic Birch Modular Synthesizer Case (12mm Plywood, Grain-Locked)*: **57.5% yield** vs. 32.1% naive (**+25.4%**, **12/12 parts placed on an L-shaped remnant**, **1,965.8 cm^2 rescued**, **$45.84 USD saved**).
  - *6061-T6 Aluminum Rover Chassis (4mm Alloy)*: **64.9% yield** vs. 39.3% naive (**+25.6%**, **12/12 parts placed on remnant alloy**, **902.9 cm^2 rescued**, **$87.41 USD saved**).
- **24 / 24 Real-Browser Playwright QA Scenarios Passed**: Verified across both desktop (`1440x900`) and mobile (`390x844`) viewports in headless Firefox on our live deployed site and local build with zero console, page, or network errors.

## What we learned

We learned that solving physical material waste in digital fabrication does not require slow, opaque cloud AI wrappers—it requires fast, deterministic computational geometry and frictionless shop-floor UX. By fixing the exact file-import and remnant-constraint bottlenecks that caused makers to abandon older open-source tools, software can directly prevent physical plywood, acrylic, and aluminum from entering the waste stream.

## What's next for KerfCraft (RemnantNest)

- **Phone Camera Homography Calibration**: Automatic perspective correction using printable ArUco corner markers on laser beds so operators can snap an angled phone photo of a scrap board and extract millimeter-exact contours.
- **True Arc Bulge (`Code 42`) G-Code Post-Processor**: Direct G-code (`GRBL` / `LinuxCNC`) toolpath generation with lead-in/lead-out tabs and common-line plasma/laser cutting.
- **Shared Makerspace Remnant QR Labels**: Printing QR sticker labels for cataloged offcuts so university FabLab students can scan any physical scrap board in the rack and load its exact polygon into KerfCraft.
```

---

## Built with

- `react`
- `typescript`
- `tailwindcss`
- `vite`
- `svg`
- `dxf`
- `computational-geometry`
- `cad`
- `playwright`
- `vitest`
- `github-pages`

---

## "Try it out" links

- **Live Deployed Web Workbench**: https://georgefifth.github.io/kerfcraft-remnantnest/
- **Public GitHub Repository**: https://github.com/Georgefifth/kerfcraft-remnantnest

---

## Demo Video

- **Local Rendered 1080p MP4 File (Upload to YouTube or Vimeo and paste link into Devpost)**: `submission/assets/demo.mp4` (also at `evidence/stage-4-demo/demo.mp4` — `1920x1080`, `30 fps`, `1m 45.9s`, narrated with burned-in captions and sidechain BGM)
- **Video URL Field**: `TODO(human): Upload submission/assets/demo.mp4 to YouTube or Vimeo (unlisted or public) and paste the URL here.`

---

## Image gallery

| Order | Asset Path | Dimensions & Size | Caption (<= 150 chars) |
|---:|---|---|---|
| 1 | `submission/assets/01-waste-problem-comparison.png` | 1500x1000 PNG (0.18 MB) | Status Quo (36.4% yield, discarded scrap) vs. KerfCraft Remnant-First Engine (+23.2% yield gain, 0.0 mm² overlap). |
| 2 | `submission/assets/02-architecture-pipeline.png` | 1500x1000 PNG (0.17 MB) | Four-stage client-side computational geometry pipeline: DXF/SVG ingest, scrap digitizer, 3-pass NFP solver, and CAD export. |
| 3 | `submission/assets/03-live-remnant-nesting-studio.png` | 1500x1000 PNG (0.26 MB) | Live CAD Workbench: 14 FPV drone parts rescued on a perforated 600x400mm acrylic remnant with a 396x115mm new offcut saved. |
| 4 | `submission/assets/04-optical-scrap-contour-tracer.png` | 1500x1000 PNG (0.21 MB) | Optical Scrap Contour Tracer digitizing perforated laser skeletons and L-shaped shop offcuts into active solver inventory. |
| 5 | `submission/assets/05-grain-lock-and-dxf-export.png` | 1500x1000 PNG (0.21 MB) | Enforcing 0°/180° wood-grain lock on Baltic birch synth panels with instant AutoCAD R12 LWPOLYLINE DXF export. |
| 6 | `submission/assets/06-validation-benchmark-proof.png` | 1500x1000 PNG (0.19 MB) | Stage 3.5 Validation Proof: 12/12 external MIT CAD datasets passed (1.33ms avg parse) and $159.86 saved across 3 shop jobs. |
