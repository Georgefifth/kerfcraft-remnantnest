# Stage 3 QA Scenario Matrix — KerfCraft (RemnantNest)

## Target URLs
- **Deployed Site (GitHub Pages)**: `https://georgefifth.github.io/kerfcraft-remnantnest/`
- **Local Production Build**: `http://127.0.0.1:4399/`
- **Browser Engine**: Headless Firefox (`playwright`)
- **Viewports**: Desktop (`1440×900`) and Mobile (`390×844`)

## Prioritized User Scenarios

| ID | Priority | Title | User Action & Flow | Expected Business Outcome & Assertions |
|---|---|---|---|---|
| `S1-first-visit-and-empty-state` | **P0** | First Visit, Responsive Check & Empty State Recovery | Load landing workbench → check 0 horizontal overflow → click `Clear Parts` → verify actionable Empty State → click `Load Default FabLab Drone Kit` | Workbench renders with active preset; clearing workspace shows `No Parts Loaded in Current Job` and restores 14 parts on 1-click recovery |
| `S2-core-remnant-nesting-and-export` | **P0** | End-to-End Core Task: Remnant-First Nesting, Offcut Cataloging & Multi-Format Export | Switch across all 3 workshop presets → run `RUN REMNANT-FIRST NEST` → verify `0.0 mm² OVERLAP VERIFIED` & positive `$ USD` saved → click `+ Save New Offcut to Remnant Bin` → export `.SVG`, `.DXF`, and `.MD` Waste Audit | All parts placed with `0.0 mm²` overlap; salvageable offcut saved to Remnant Bin (remnant count increments from 1 to 2); SVG, DXF (`LWPOLYLINE`), and Markdown exports generated and previewed |
| `S3-local-dxf-svg-importer-and-error-recovery` | **P0** | Client-Side DXF/SVG Vector Parser & Malformed Input Recovery | Open `Import DXF / SVG (Local Parser)` → enter invalid string → assert clear error message → click `Sample ASCII DXF` → click `Parse & Add Contours to Job` | Invalid input displays explicit error (`Invalid ASCII DXF: missing ENTITIES...`); valid ASCII DXF parses 2 closed `LWPOLYLINE` contours locally in browser (zero cloud requests, no Error 522) and increments part schedule from 14 to 16 instances |
| `S4-scrap-contour-tracer-and-remnant-bin` | **P1** | Optical Scrap Contour Tracer & Remnant Inventory Management | Click `Trace Leftover Scrap Board` → switch silhouette to `Perforated Laser Skeleton` → adjust threshold → click `Add Digitized Remnant to Active Job` → navigate to `2. Remnant Bin` tab | Modal extracts polygon & interior cutout holes; adding remnant places it at the top of the solver queue and renders it in the Remnant Bin inventory |
| `S5-grain-lock-kerf-and-validation` | **P1** | Wood-Grain Orientation Lock, Kerf Clearance & Form Validation | Switch to `Baltic Birch Modular Synthesizer Case` → toggle grain lock → test invalid parametric part width (`-10`) → assert inline field error → enter valid `150×80mm` panel and add | Invalid dimension shows explicit validation message (`Part Width must be between 5 mm and 2400 mm`); valid parametric part adds cleanly and re-nests |
| `S6-benchmark-audit-and-keyboard-a11y` | **P1** | Quantitative Waste Benchmark Suite & Keyboard Navigation | Navigate to `3. Waste Audit Ledger` → click `Re-Run Full Benchmark Suite` → verify all 3 workloads pass `0.0 mm²` collision proof and positive yield gain → verify keyboard `Tab` focus & `Enter` activation | Benchmark table displays verified metrics (`+21.0%` avg yield gain, `$152.77 USD` saved, `100% PASS`); keyboard navigation focuses interactive controls cleanly |
