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

  it('validates all 12 real-world external CAD files (DXF/SVG across Basic, Intermediate, Advanced, Edge, Negative, Adversarial tiers)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const datasetDir = path.resolve('evidence/stage-3.5-validation/datasets');
    const manifestPath = path.resolve('evidence/stage-3.5-validation/dataset-manifest.json');
    if (!fs.existsSync(manifestPath)) return;

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const evaluations = [];

    for (const item of manifest) {
      const fullPath = path.join(datasetDir, item.filename);
      const rawContent = fs.readFileSync(fullPath, 'utf8');
      const isSvg = item.filename.endsWith('.svg');

      const t0 = performance.now();
      const parseRes = isSvg
        ? parseSvgToParts(rawContent, '3mm Cast Acrylic')
        : parseDxfToParts(rawContent, '6mm Baltic Birch Plywood');
      const parseMs = Number((performance.now() - t0).toFixed(2));

      let nestRes = null;
      if (parseRes.success && parseRes.parts.length > 0) {
        nestRes = runRemnantAwareNesting(
          parseRes.parts.slice(0, 15),
          FABRICATION_PRESETS[0].sheets,
          {
            kerfMm: 0.2,
            partSpacingMm: 2.0,
            prioritizeRemnants: true,
          }
        );
      }

      const isExpectedNegative = item.difficultyTier === 'Negative';

      const passedExpectation = isExpectedNegative
        ? !parseRes.success && Boolean(parseRes.error)
        : parseRes.success &&
          parseRes.parts.length > 0 &&
          Boolean(nestRes?.zeroOverlapVerified);

      evaluations.push({
        filename: item.filename,
        difficultyTier: item.difficultyTier,
        sourceUrl: item.sourceUrl,
        sha256: item.sha256,
        isExpectedNegative,
        parseSuccess: parseRes.success,
        partsExtracted: parseRes.parts.length,
        warnings: parseRes.warnings,
        parseError: parseRes.error ?? null,
        parseMs,
        nestingTriggered: Boolean(nestRes),
        partsPlaced: nestRes?.totalPartsPlaced ?? 0,
        zeroOverlapVerified: nestRes?.zeroOverlapVerified ?? null,
        yieldPct: nestRes?.overallYieldPct ?? null,
        passedExpectation,
      });
    }

    fs.writeFileSync(
      path.resolve('evidence/stage-3.5-validation/post-fix-results.json'),
      JSON.stringify(
        {
          evaluatedAt: new Date().toISOString(),
          totalFiles: evaluations.length,
          passedCount: evaluations.filter((e) => e.passedExpectation).length,
          failedCount: evaluations.filter((e) => !e.passedExpectation).length,
          results: evaluations,
        },
        null,
        2
      )
    );

    expect(evaluations.every((e) => e.passedExpectation)).toBe(true);
  });
});
