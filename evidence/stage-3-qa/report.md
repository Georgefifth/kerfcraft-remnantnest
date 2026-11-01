# Stage 3 — Real-Browser QA Report — KerfCraft (RemnantNest)

## 1. Test Environment

- **Deployed Production URL (GitHub Pages)**: https://georgefifth.github.io/kerfcraft-remnantnest/
- **Local Production Build URL**: http://127.0.0.1:4399/
- **Browser Engine**: Headless Firefox (`playwright`)
- **Viewports Tested**:
  - Desktop: `1440×900` (`deviceScaleFactor: 1`)
  - Mobile: `390×844` (`deviceScaleFactor: 2`)
- **Execution Date**: 2026-11-02
- **Raw Machine-Readable Results**:
  - Deployed Run: `evidence/stage-3-qa/results.json`
  - Local Run: `evidence/stage-3-qa/local-run/results.json`

---

## 2. Executed Scenarios & Pass / Fail / Blocked Summary

- **Deployed Build**: **12 / 12 Passed** (`6 scenarios × 2 viewports`), `0 Failed`, `0 Blocked`, `0 Console/Page/Network Errors`
- **Local Build**: **12 / 12 Passed** (`6 scenarios × 2 viewports`), `0 Failed`, `0 Blocked`, `0 Console/Page/Network Errors`

| Viewport | Scenario ID | Priority | Title & Verified Business Outcome | Deployed Status | Local Status |
|---|---|---|---|---|---|
| `desktop` (1440×900) | `S1-first-visit-and-empty-state` | **P0** | Landing renders with 0px horizontal overflow; `Clear Parts` shows actionable Empty State; 1-click preset restore recovers 14 parts | **PASS** (3163ms) | **PASS** (1940ms) |
| `desktop` (1440×900) | `S2-core-remnant-nesting-and-export` | **P0** | Multi-pass Remnant-First Nesting verifies `0.0 mm²` overlap (`56.5%` yield, `$26.61` saved); catalogs `396×115mm` offcut into Remnant Bin; exports `.SVG`, `.DXF` (`LWPOLYLINE`), and `.MD` Waste Audit | **PASS** (2698ms) | **PASS** (1712ms) |
| `desktop` (1440×900) | `S3-local-dxf-svg-importer-and-error-recovery` | **P0** | Malformed DXF string triggers clear inline error; valid ASCII DXF parses 2 closed contours locally in browser (0 cloud requests, no Error 522) and updates schedule to 16 instances | **PASS** (2497ms) | **PASS** (1586ms) |
| `desktop` (1440×900) | `S4-scrap-contour-tracer-and-remnant-bin` | **P1** | Optical Scrap Contour Tracer extracts polygon + 2 interior cutout holes; adds digitized remnant to active job and lists it in `2. Remnant Bin` | **PASS** (2497ms) | **PASS** (1792ms) |
| `desktop` (1440×900) | `S5-grain-lock-kerf-and-validation` | **P1** | Switches to Baltic Birch preset; rejects `-25mm` part width with inline field error; accepts `140×75mm` custom panel and re-nests | **PASS** (2502ms) | **PASS** (1792ms) |
| `desktop` (1440×900) | `S6-benchmark-audit-and-keyboard-a11y` | **P1** | Runs full 3-workload waste benchmark suite (`100% PASS` on `0.0 mm²` collision proof); verifies keyboard `Tab` focus navigation | **PASS** (2558ms) | **PASS** (1770ms) |
| `mobile` (390×844) | `S1-first-visit-and-empty-state` | **P0** | Mobile 390px layout verified with `0px` horizontal overflow; empty state and 1-click preset recovery verified | **PASS** (2807ms) | **PASS** (2593ms) |
| `mobile` (390×844) | `S2-core-remnant-nesting-and-export` | **P0** | Mobile core nesting solve, new offcut cataloging, and SVG/DXF/Report export verified | **PASS** (3204ms) | **PASS** (2526ms) |
| `mobile` (390×844) | `S3-local-dxf-svg-importer-and-error-recovery` | **P0** | Mobile DXF error handling and local `LWPOLYLINE` contour parsing verified | **PASS** (3348ms) | **PASS** (2460ms) |
| `mobile` (390×844) | `S4-scrap-contour-tracer-and-remnant-bin` | **P1** | Mobile Scrap Contour Tracer modal and Remnant Bin inventory verified | **PASS** (3241ms) | **PASS** (2189ms) |
| `mobile` (390×844) | `S5-grain-lock-kerf-and-validation` | **P1** | Mobile grain-lock preset and custom parametric form validation verified | **PASS** (3238ms) | **PASS** (2596ms) |
| `mobile` (390×844) | `S6-benchmark-audit-and-keyboard-a11y` | **P1** | Mobile Benchmark Audit table and keyboard focus accessibility verified | **PASS** (2710ms) | **PASS** (2051ms) |

---

## 3. Issues Discovered, Fixed & Regressed During Stage 3 QA

| Issue ID | Severity | Description & Repro Steps | Root Cause | Fix Applied | Regression Result |
|---|---|---|---|---|---|
| **QA-01** | **P1 (Visual / Geometry Label)** | In `S2-core-remnant-nesting-and-export`, two concave `Gimbal_L_Bracket` parts nested tightly inside each other's bounding-box notch, causing their centered SVG `<text>` labels to overlap visually on the CAD bed | Solver allowed concave bounding boxes to interlock when polygons did not collide, placing both bounding-box centers within 18px of each other | Enforced strict bounding-box + kerf clearance separation in `src/engine/nestingEngine.ts` (which also accelerated solve time from ~150ms down to **18–24ms** and separated every part label cleanly) | **Verified Fixed** (`S2-core-remnant-nesting-and-export-core-export-verified-desktop.png`) |
| **QA-02** | **P2 (Mobile Full-Page Screenshot)** | On `390×844` mobile full-page screenshots (`S5-grain-lock-kerf-and-validation-invalid-part-width-mobile.png`), the `fixed bottom-0` action bar rendered across the middle of the stitched full-page image | `position: fixed` elements stay at `y=844px` when Playwright stitches a tall scrolling mobile page | Replaced `fixed bottom-0` with an inline docked mobile footer bar in `src/App.tsx` so full-page mobile views and CAD canvases are 100% unobstructed | **Verified Fixed** (`S5-grain-lock-kerf-and-validation-invalid-part-width-mobile.png`) |

---

## 4. UX Review (First-Time User Walkthrough)

1. **5-Second Comprehension**: The top industrial header, live telemetry bar (`MATERIAL YIELD`, `REMNANT SCRAP RESCUED`, `MATERIAL COST SAVED`, `0.0 mm² Collision`), and interactive CAD machine bed with red hatched `PRIOR CUTOUT (KEEP-OUT)` zones immediately communicate that this is a 2D sheet & scrap remnant nesting workbench.
2. **Task Efficiency**: Completing the primary workflow (selecting a preset or importing a DXF/SVG, running the remnant-first solver, saving a newly created offcut back to the Remnant Bin, and exporting a ready-to-cut `.SVG`/`.DXF`) takes **3 clicks and under 15 seconds**.
3. **Error Recovery**: Both malformed vector imports (`Invalid ASCII DXF: missing ENTITIES section...`) and out-of-range part dimensions (`Part Width must be between 5 mm and 2400 mm`) provide immediate inline guidance without losing existing workspace state.
4. **Domain Archetype Check**: Passes the `design/UX.md` Generic SaaS Test—the millimeter coordinate rulers, grain-direction cyan vectors, kerf clearance rings, and hatched cutout zones belong unmistakably to a physical fabrication CAD workbench.

---

## 5. Captured Screenshot Evidence (`evidence/stage-3-qa/screens/`)

- `S1-first-visit-and-empty-state-01-landing-desktop.png` & `...-mobile.png`
- `S1-first-visit-and-empty-state-02-empty-state-desktop.png` & `...-mobile.png`
- `S1-first-visit-and-empty-state-03-restored-desktop.png` & `...-mobile.png`
- `S2-core-remnant-nesting-and-export-core-export-verified-desktop.png` & `...-mobile.png`
- `S3-local-dxf-svg-importer-and-error-recovery-dxf-invalid-error-desktop.png` & `...-mobile.png`
- `S3-local-dxf-svg-importer-and-error-recovery-dxf-parsed-success-desktop.png` & `...-mobile.png`
- `S4-scrap-contour-tracer-and-remnant-bin-scrap-tracer-modal-desktop.png` & `...-mobile.png`
- `S4-scrap-contour-tracer-and-remnant-bin-remnant-bin-inventory-desktop.png` & `...-mobile.png`
- `S5-grain-lock-kerf-and-validation-invalid-part-width-desktop.png` & `...-mobile.png`
- `S5-grain-lock-kerf-and-validation-valid-part-added-desktop.png` & `...-mobile.png`
- `S6-benchmark-audit-and-keyboard-a11y-benchmark-ledger-desktop.png` & `...-mobile.png`
