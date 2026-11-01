# KerfCraft (RemnantNest)

**Remnant-First 2D Sheet & Irregular Offcut Nesting Workbench for Makers, Woodworkers & FabLabs**

Built for **Arbiter Hacks V1 — Theme Track: Rethinking Waste**.

- **Live Web Workbench**: https://georgefifth.github.io/kerfcraft-remnantnest/
- **Repository**: https://github.com/Georgefifth/kerfcraft-remnantnest

---

## Why KerfCraft Exists (The Waste Problem)

Every laser-cutter, CNC router, or panel-saw job leaves behind partially cut irregular sheets ("skeletons" or offcuts). Because existing free nesting tools assume you start with a brand-new rectangular sheet, workshops routinely discard usable acrylic, Baltic birch plywood, and 6061 aluminum remnants—wasting **25%–45% of raw sheet stock**.

Meanwhile, open-source nesting tools suffer from documented reliability and workflow gaps:
- **Deepnest (`Jack000/Deepnest#196`)**: Fails with `Errorcode 522` when importing DXF files because its hardcoded external conversion server (`http://convert.deepnest.io`) is offline.
- **SVGnest (`Jack000/SVGnest#15`, `#19`)**: Lacks per-part **wood-grain orientation locks (`0°/180°`)** and **remnant/keep-out cutout zone nesting**.
- **opcut (`bozokopic/opcut#36`)**: Restricted to guillotine rectangular cuts and lacks annotated shop exports.

## Core Capabilities

1. **Remnant-First Multi-Pass 2D Nesting Engine (`src/engine/nestingEngine.ts`)**:
   - Prioritizes placing parts onto irregular leftover **Remnant Offcuts** (respecting interior cutout keep-out holes) before allocating any new **Fresh Stock Sheet**.
   - Evaluates 3 deterministic heuristic passes (Area-Descending, Longest-Edge-Descending, and Grain-Locked Priority) and verifies a strict **`0.0 mm²` polygon collision invariant**.
   - Enforces **Blade/Laser Kerf Compensation (`0.0–15.0 mm`)** and **Wood-Grain Orientation Locks (`0°/180°` vs. `90°` orthogonal rotation)**.
   - Automatically identifies **Salvageable New Offcut Zones** on used sheets so today's leftover strip can be saved back into the Remnant Bin with one click.
2. **100% Client-Side ASCII DXF & SVG Contour Parser (`src/engine/dxfSvgParser.ts`)**:
   - Parses `LWPOLYLINE` DXF files and SVG `<rect>`, `<polygon>`, `<path>` contours directly in the browser with zero cloud uploads and zero `Error 522` failures.
3. **Optical Scrap Contour Tracer (`src/components/ScrapTracerModal.tsx`)**:
   - Digitizes leftover L-shaped offcuts, perforated laser skeletons, and angled miter slabs into nestable polygon inventory.
4. **Shop-Floor Export & Quantitative Waste Audit (`src/engine/exporter.ts`)**:
   - One-click export of scale-accurate **Annotated `.SVG` Cut Sheets**, **AutoCAD R12/2000 `.DXF` (`CUT_PATHS`, `REMNANT_HOLES`, `SALVAGE_OFFCUTS` layers)**, and **Markdown/JSON Waste Audit Reports**.

## Local Development & Verification

```bash
npm install
npm test          # Runs Vitest computational geometry & 0-overlap invariant suite
npm run typecheck # TypeScript strict verification
npm run build     # Production bundle into dist/
npm run dev       # Local development workbench
```

## License

MIT
