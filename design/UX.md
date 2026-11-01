# UX Contract — KerfCraft (RemnantNest)

> Fill this before writing UI code. It is the acceptance contract for the
> frontend: if the implementation does not match this file, the implementation
> is wrong. Keep it short and specific.

## 1. Product

- **One-liner**: Remnant-first 2D sheet & irregular offcut nesting workbench that packs laser, CNC, and woodworking parts onto leftover workshop scrap before cutting into new sheets.
- **Primary user**: Makerspace / FabLab operators, laser-cutter & CNC router users, woodworkers, and student hardware teams cutting plywood, acrylic, MDF, and sheet metal.
- **Job to be done**: Fit a kit of irregular SVG/DXF parts or rectangular cut-list panels onto leftover irregular scrap offcuts (and standard stock sheets) while respecting blade/laser kerf and wood-grain orientation, then export ready-to-cut SVG/DXF/Shop PDF files with verifiable material waste savings.
- **Core success action**: Run the **Remnant-First Nesting Solver** on a part kit + remnant bin and export a zero-overlap cut sheet that rescues scrap offcuts and reduces new sheet consumption.
- **What the user should never have to guess**:
  1. Whether parts overlap or violate kerf clearance (`0.0 mm² overlap verified` badge is always visible).
  2. Which parts are locked to wood-grain direction (`0°/180° Grain Lock` vs `Free 90°/45° Rotation`).
  3. How much physical material area (`cm²` / `in²`), sheet percentage (`Yield %`), and money (`$ USD`) was saved by nesting into remnants vs. naive bounding-box layout on fresh sheets.
  4. Why a DXF/SVG file failed or succeeded (100% local client-side parser with line-level diagnostics—no cloud conversion server or `Error 522`).

## 2. Core flow

| # | Step | User action | System feedback | Next step is obvious? |
|---|---|---|---|---|
| 1 | **Load Kit or Import DXF/SVG** | Click a real-world fabrication preset (e.g., *FPV Drone Frame on Acrylic Remnant*, *Baltic Birch Bookshelf Cutlist*, *FabLab Enclosure Kit*) or drop a `.dxf` / `.svg` / CSV cutlist file | Parts table and vector preview populate immediately (<50ms) with part dimensions, area, quantity, and grain-lock badges | Yes — primary CTA **"Run Remnant-First Nest"** pulses in the studio header & control rail |
| 2 | **Select / Capture Remnant Offcuts & Kerf Rules** | Toggle available leftover workshop remnants in the **Remnant Bin** (or trace a custom irregular scrap board via the **Scrap Contour Tracer** modal) and set **Kerf / Blade Width** (`0.15 mm` laser to `3.2 mm` saw) | Canvas updates stock/remnant boundaries, forbidden hole cutouts, and kerf offset rings in real time | Yes — solver status banner indicates ready state and estimated part area vs. remnant capacity |
| 3 | **Execute Multi-Pass Nesting & Export Shop Sheet** | Click **"Run Remnant-First Nest"** (or press `Cmd/Ctrl + Enter`), inspect the placed parts + reusable offcut bounding boxes on the CAD drafting canvas, and click **"Export Cut Sheet (SVG / DXF / Shop PDF)"** | Live progress bar shows multi-pass NFP/Skyline optimization, updates **Material Yield %**, **Scrap Rescued (cm² & $)**, **0 Overlap Verification**, and downloads the annotated fabrication file | Yes — export drawer provides instant 1-click download and saves newly created leftover offcuts back to the Remnant Bin |

Target: **≤ 3 steps** and **≤ 45 seconds** from landing to a verified, downloadable fabrication cut sheet.

## 3. Pages & Workspace Views

| Page / View | Purpose | Primary action | Secondary actions |
|---|---|---|---|
| **1. Drafting & Nesting Studio (Main Workspace)** | Pack irregular SVG/DXF polygons and rectangular cutlists onto irregular remnants and stock sheets; inspect kerf, grain direction, and reusable offcut zones | **Run Remnant-First Nest (`#run-nest-btn`)** | Switch fabrication preset, upload `.svg`/`.dxf`, toggle grain lock, adjust kerf/spacing, inspect waste heatmap, export SVG/DXF/Shop Report |
| **2. Remnant Bin & Scrap Tracer (`Remnant Inventory` Drawer/Tab)** | Manage leftover workshop offcuts (irregular polygons or sheets with previously cut holes) and extract new scrap contours from photos or manual polygon points | **Add Remnant to Active Job (`#add-remnant-btn`)** | Trace scrap photo/silhouette via threshold slider, edit polygon vertices, delete consumed scrap |
| **3. Waste Impact & Benchmark Ledger (`Benchmark Audit` Tab)** | Compare Naive/Unnested Layout vs. Standard Fresh-Sheet Nesting vs. Remnant-First Nesting across fabrication jobs with mathematical proof | **Run Full Benchmark Suite (`#run-benchmark-btn`)** | Inspect per-sheet SVG layouts, download JSON/CSV waste audit report, copy Devpost impact metrics |

One primary action per view. The studio never hides the primary nesting canvas behind marketing fluff.

## 4. Required states

For every view and interactive component:

- [x] **Empty / first visit**: Loads with an active, realistic fabrication kit (*FabLab Acrylic Sensor Enclosure + Leftover Remnant Sheet*) AND provides a clear **"Clear Workspace"** button that reveals an actionable Empty State with 1-click sample loaders and drag-and-drop DXF/SVG instructions.
- [x] **Loading / Solving**: Determinate progress indicator showing current optimization pass, fitness yield curve, and elapsed milliseconds without freezing the UI.
- [x] **Success**: Green engineering verification banner confirming `0 Collisions Verified`, exact `Yield %`, `Remnant Area Rescued (cm²)`, `Cost Saved ($)`, and highlighted reusable remnant rectangles.
- [x] **Error**: Explicit recovery banner when a part is larger than all available stock/remnants ("Part `Side_Panel_A (620×400mm)` exceeds available remnant dimensions — click **Auto-Add Standard 1220×610mm Stock Sheet** to fit all parts").
- [x] **Invalid input**: Inline field validation on custom part dimensions, kerf (`0.0–15.0 mm`), and malformed DXF/SVG uploads pointing to the exact line/attribute and offering a 1-click fix or valid sample.
- [x] **Mobile 390px layout**: Responsive single-column CAD inspector where the interactive SVG drafting canvas sits at the top, followed by segmented tabs (`Parts & Rules`, `Remnants`, `Impact & Export`) and a sticky 48px-tall bottom action bar.

## 5. Design tokens

- **Font family and scale**:
  - Headings & UI Labels: `'Space Grotesk', 'IBM Plex Sans', system-ui, sans-serif` (`24px` display, `16px` section header, `13px` control label, `12px` compact table).
  - Numeric Telemetry, Coordinates, Dimensions & Code: `'JetBrains Mono', 'IBM Plex Mono', monospace` (`tabular-nums` enforced everywhere).
- **Spacing scale**: High-density CAD 4px grid (`4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`).
- **Colors (Workshop Blueprint & Precision Drafting Palette)**:
  - `bg-canvas`: `#0C1014` (Deep Anodized Slate — machine bed background)
  - `bg-panel`: `#131920` (Drafting Instrument Panel)
  - `bg-elevated`: `#1A222C` (Inspector Card / Hover Surface)
  - `border-hairline`: `#263240` (1px CAD technical grid & panel divider)
  - `text-primary`: `#F0F4F8` (Chalk White)
  - `text-muted`: `#8A99AD` (Micrometer Steel Gray)
  - `accent-primary`: `#F59E0B` (Industrial Laser Amber / Safety Brass — primary CTA, active cut paths)
  - `accent-remnant`: `#10B981` (Rescued Remnant Emerald — placed parts on salvaged scrap & reusable offcut zones)
  - `accent-grain`: `#38BDF8` (Cyan Blueprint Vector — grain direction arrows & kerf offset rings)
  - `danger`: `#EF4444` (Laser Collision / Unplaced Part / Kerf Violation Crimson)
- **Radius and borders**: Crisp industrial `4px`–`6px` radius (`rounded`), `1px solid #263240` technical borders with corner tick marks on the main CAD viewport.
- **Button and input height**: Primary buttons `44px` height; compact CAD toolbar buttons `36px` desktop / `44px` mobile touch target.
- **Icon style and stroke**: `1.75px` technical vector icons (Lucide / custom SVG CAD crosshairs, grain arrows, kerf rings) — **zero emojis in UI**.

## 6. References

| Reference | What to borrow | What not to copy |
|---|---|---|
| **LightBurn / Shaper Origin Studio** (https://lightburnsoftware.com/) | High-contrast machine-bed coordinate ruler, layer color-coding (cut vs. remnant vs. kerf offset), live bounding-box telemetry in header | Dated Windows95 dockable toolbars and cluttered 40-icon ribbons |
| **SVGnest / Deepnest** (https://github.com/Jack000/SVGnest) | Direct manipulation of vector parts and live iteration fitness progress during nesting | Full-screen marketing splash page, lack of dimension annotations, dead cloud DXF converter |
| **CutList Optimizer** (https://www.cutlistoptimizer.com/) | Clear tabular summary of stock sheets, placed panel counts, cut lengths, and leftover offcut dimensions | Generic Material-UI blue theme and inability to nest irregular non-rectangular polygons |

## 7. Mobile (390px)

- **390px layout**: Top technical telemetry bar → Full-width interactive SVG Machine Bed Canvas (`320px` height with pinch/zoom & sheet switcher) → Segmented Control (`Parts (8)`, `Remnants (3)`, `Rules & Kerf`, `Export & Audit`) → Sticky bottom action bar with primary **"Run Remnant-First Nest"** + **"Export SVG/DXF"** buttons.
- **Primary action reachable without horizontal scroll**: Yes (`overflow-x: hidden` verified at `390×844`).
- **What is collapsed or hidden**: Secondary coordinate rulers and multi-column telemetry condense into a compact 2×2 metric strip; full parts & remnant tables switch via segmented tabs instead of 3-column desktop split panes.
- **Keyboard behavior**: Numeric inputs use `inputmode="decimal"` and apply immediately with clear unit suffixes (`mm`).

## 8. Visual direction

- **Three adjectives**: **Calibrated, Industrial, High-Density**.
- **Product archetype**: **CAD Canvas & Engineering Workbench** (opens directly into the active drafting bed, part inspector, and waste ledger—no SaaS marketing landing page).
- **Palette and why it fits the domain**: Inspired by anodized aluminum CNC beds (`#0C1014`), laser-safety amber (`#F59E0B`), blueprint cyan dimension lines (`#38BDF8`), and salvaged material emerald (`#10B981`). Color directly encodes physical fabrication semantics: **Amber = Fresh Stock Cut**, **Emerald = Rescued Remnant Offcut Placement**, **Cyan Dashed = Kerf Compensation & Grain Vector**, **Crimson Hatch = Forbidden Scrap Hole / Unplaced Overflow**.
- **Type pairing**: `Space Grotesk` for crisp geometric industrial headers + `JetBrains Mono` (`tabular-nums`) for millimeter coordinates, kerf tolerances, yield percentages, and DXF/SVG code inspection.
- **Density**: **Dense** — makers and CNC operators need to see the parts list, remnant inventory, kerf/grain constraints, and live nesting canvas simultaneously without scrolling through empty whitespace.
- **Signature element**: **The Interactive Remnant-vs-Fresh Sheet Split Blueprint Canvas** featuring millimeter coordinate rulers, diagonal hatched "already-cut scrap holes", cyan grain-direction vectors on each part, dashed emerald "Salvageable New Offcut" zones, and a live Naive-vs-Remnant Waste Comparison bar.
- **Motion rules**: Smooth `220ms` SVG part-placement transitions when switching between *Naive Layout* and *Remnant-Optimized Layout*; zero decorative floating blobs or background animations.
- **Rejected clichés**: No purple/indigo gradients, no glassmorphism blur cards, no three-card SaaS hero, no generic KPI dashboard, no emoji icons, no fake AI chat widget.

## 9. UX acceptance

- [x] A first-time user can explain the product's purpose within 5 seconds
- [x] The core task is reachable from the landing page without reading docs
- [x] Every action produces visible feedback within 100ms, or a loading state
- [x] Every error says what happened and what to do next
- [x] Empty states are actionable, not blank
- [x] No dead ends; no unlabeled icon-only buttons
- [x] Desktop and mobile screenshots reviewed side by side
- [x] The flow still works after connecting the real backend
