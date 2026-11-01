import fs from 'node:fs';
import path from 'node:path';
import { parseDxfToParts, parseSvgToParts } from '../src/engine/dxfSvgParser.ts';
import { runRemnantAwareNesting } from '../src/engine/nestingEngine.ts';
import { FABRICATION_PRESETS } from '../src/data/presets.ts';

const DATASET_DIR = path.resolve('evidence/stage-3.5-validation/datasets');
const MANIFEST_PATH = path.resolve('evidence/stage-3.5-validation/dataset-manifest.json');
const outFile = process.argv[2] || 'evidence/stage-3.5-validation/initial-raw-results.json';

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

const fileEvaluations = [];

for (const item of manifest) {
  const fullPath = path.join(DATASET_DIR, item.filename);
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

  // Determine expected behavior:
  // Negative cases (10_negative_empty.dxf, 11_negative_texts_only.dxf) and Edge micro 1x1 (09_edge_1x1_micro_rect.dxf) SHOULD be rejected cleanly (parseRes.success === false with explicit error message).
  const isExpectedNegative =
    item.difficultyTier === 'Negative' || item.filename.includes('09_edge_1x1');

  const passedExpectation = isExpectedNegative
    ? !parseRes.success && Boolean(parseRes.error)
    : parseRes.success &&
      parseRes.parts.length > 0 &&
      Boolean(nestRes?.zeroOverlapVerified);

  fileEvaluations.push({
    filename: item.filename,
    difficultyTier: item.difficultyTier,
    sourceUrl: item.sourceUrl,
    sha256: item.sha256,
    isExpectedNegative,
    parseSuccess: parseRes.success,
    partsExtracted: parseRes.parts.length,
    parseError: parseRes.error ?? null,
    parseMs,
    nestingTriggered: Boolean(nestRes),
    partsPlaced: nestRes?.totalPartsPlaced ?? 0,
    zeroOverlapVerified: nestRes?.zeroOverlapVerified ?? null,
    yieldPct: nestRes?.overallYieldPct ?? null,
    passedExpectation,
  });
}

const passCount = fileEvaluations.filter((e) => e.passedExpectation).length;
console.log(`External File Evaluation: ${passCount}/${fileEvaluations.length} passed expectations.`);
for (const e of fileEvaluations) {
  console.log(
    `  [${e.passedExpectation ? 'PASS' : 'FAIL'}] (${e.difficultyTier}) ${e.filename} -> parts=${e.partsExtracted}, err=${e.parseError || 'none'}`
  );
}

fs.writeFileSync(
  outFile,
  JSON.stringify(
    {
      evaluatedAt: new Date().toISOString(),
      totalFiles: fileEvaluations.length,
      passedCount: passCount,
      failedCount: fileEvaluations.length - passCount,
      results: fileEvaluations,
    },
    null,
    2
  )
);
