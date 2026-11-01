import { describe, it, expect } from 'vitest';
import { FABRICATION_PRESETS, SAMPLE_DXF_SNIPPET, SAMPLE_SVG_SNIPPET } from '../data/presets';
import { runRemnantAwareNesting } from './nestingEngine';
import { parseDxfToParts, parseSvgToParts } from './dxfSvgParser';
import { doPolygonsCollide } from './geometry';
import { exportSheetToDxf, exportSheetToSvg, generateShopAuditReport } from './exporter';

describe('KerfCraft Computational Geometry & Remnant Nesting Engine', () => {
  it('places all parts with 0.0 mm² overlap across all 3 workshop presets', () => {
    for (const preset of FABRICATION_PRESETS) {
      const result = runRemnantAwareNesting(preset.parts, preset.sheets, {
        kerfMm: preset.kerfMm,
        partSpacingMm: preset.partSpacingMm,
        prioritizeRemnants: true,
      });

      expect(result.zeroOverlapVerified).toBe(true);
      expect(result.maxCollisionAreaMm2).toBe(0);
      expect(result.totalPartsPlaced).toBe(result.totalPartsRequested);
      expect(result.remnantPartsPlaced).toBeGreaterThan(0);
      expect(result.overallYieldPct).toBeGreaterThan(result.naiveFreshSheetYieldPct);
      expect(result.estimatedCostSavedUsd).toBeGreaterThan(0);

      // Pairwise polygon collision check on every sheet
      for (const sheetLayout of result.sheetsUsed) {
        const placed = sheetLayout.placements;
        for (let i = 0; i < placed.length; i++) {
          for (let j = i + 1; j < placed.length; j++) {
            expect(
              doPolygonsCollide(placed[i].worldPolygon, placed[j].worldPolygon, 0)
            ).toBe(false);
          }
        }
      }
    }
  });

  it('strictly enforces wood-grain orientation lock (0° or 180° only) on grain_locked parts', () => {
    const birchPreset = FABRICATION_PRESETS.find((p) => p.id === 'baltic-birch-cabinet')!;
    const result = runRemnantAwareNesting(birchPreset.parts, birchPreset.sheets, {
      kerfMm: birchPreset.kerfMm,
      partSpacingMm: birchPreset.partSpacingMm,
      prioritizeRemnants: true,
    });

    const grainLockedPlacements = result.sheetsUsed
      .flatMap((s) => s.placements)
      .filter((p) => p.grainLocked);

    expect(grainLockedPlacements.length).toBeGreaterThan(0);
    for (const p of grainLockedPlacements) {
      expect([0, 180]).toContain(p.rotationDeg);
    }
  });

  it('parses ASCII DXF LWPOLYLINE and SVG elements locally without external servers', () => {
    const dxfRes = parseDxfToParts(SAMPLE_DXF_SNIPPET);
    expect(dxfRes.success).toBe(true);
    expect(dxfRes.parts.length).toBe(2);
    expect(dxfRes.parts[0].width).toBe(130);
    expect(dxfRes.parts[0].height).toBe(95);

    const svgRes = parseSvgToParts(SAMPLE_SVG_SNIPPET);
    expect(svgRes.success).toBe(true);
    expect(svgRes.parts.length).toBe(2);
    expect(svgRes.parts[0].rotationConstraint).toBe('grain_locked');
  });

  it('exports valid scale-accurate SVG, R12 DXF, and Markdown Waste Audit reports', () => {
    const preset = FABRICATION_PRESETS[0];
    const result = runRemnantAwareNesting(preset.parts, preset.sheets, {
      kerfMm: preset.kerfMm,
      partSpacingMm: preset.partSpacingMm,
      prioritizeRemnants: true,
    });

    const svgOut = exportSheetToSvg(result.sheetsUsed[0], preset.kerfMm, true);
    expect(svgOut).toContain('<svg');
    expect(svgOut).toContain('width="600mm"');

    const dxfOut = exportSheetToDxf(result.sheetsUsed[0]);
    expect(dxfOut).toContain('LWPOLYLINE');
    expect(dxfOut).toContain('CUT_PATHS');

    const mdReport = generateShopAuditReport(result, preset.title);
    expect(mdReport).toContain('PASSED (0.0 mm² collision)');
  });
});
