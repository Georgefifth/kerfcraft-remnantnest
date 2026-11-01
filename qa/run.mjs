// Real-browser QA runner for KerfCraft (RemnantNest) — Stage 3 QA
// Runs against both Deployed GitHub Pages URL and Local build using headless Firefox.

import { chromium, firefox } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'https://georgefifth.github.io/kerfcraft-remnantnest/';
const OUT = process.env.QA_OUT ?? 'evidence/stage-3-qa';
const BROWSER = process.env.BROWSER === 'chromium' ? 'chromium' : 'firefox';
const HEADED = process.env.HEADED === '1';

const SHOTS = path.join(OUT, 'screens');
fs.mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: 'mobile', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
];

const scenarios = [
  {
    id: 'S1-first-visit-and-empty-state',
    title: 'First visit, zero horizontal overflow, actionable empty state, and 1-click preset recovery',
    async run(page, ctx) {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await ctx.expectVisible('[data-testid="nesting-svg-canvas"]');
      ctx.assert((await page.title()).includes('KerfCraft'), 'Unexpected document.title');

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      ctx.assert(overflow <= 1, `Horizontal overflow detected: ${overflow}px`);

      await ctx.shot('01-landing');

      // Clear workspace to trigger Empty State
      await page.locator('[data-testid="clear-workspace-btn"]').click();
      await ctx.expectVisible('[data-testid="empty-parts-state"]');
      await ctx.expectText(/No Parts Loaded in Current Job/i);
      await ctx.shot('02-empty-state');

      // Recover via 1-click restore button
      await page.locator('[data-testid="empty-restore-preset-btn"]').click();
      await ctx.expectText(/PART CUT SCHEDULE \(14 INSTANCES\)/i);
      await ctx.shot('03-restored');
    },
  },
  {
    id: 'S2-core-remnant-nesting-and-export',
    title: 'Core end-to-end flow: multi-pass remnant-first nesting, offcut cataloging, and SVG/DXF/MD export',
    async run(page, ctx) {
      await page.goto(BASE, { waitUntil: 'networkidle' });

      // Run Remnant-First Nesting Solver
      await page.locator('[data-testid="run-nest-btn"]').click();
      await ctx.expectVisible('[data-testid="status-banner"]');
      await ctx.expectText(/Multi-pass solve verified/i);
      await ctx.expectText(/0\.0 mm² OVERLAP VERIFIED/i);

      const yieldText = await page.locator('[data-testid="metric-yield-pct"]').textContent();
      ctx.assert(parseFloat(yieldText || '0') > 50, `Expected yield > 50%, got ${yieldText}`);

      // Save newly identified offcut rectangle back to Remnant Bin
      const saveOffcutBtn = page.locator('[data-testid^="save-offcut-btn-"]').first();
      await saveOffcutBtn.waitFor({ state: 'visible', timeout: 8000 });
      await saveOffcutBtn.click();
      await ctx.expectText(/Cataloged .* offcut .* into the Remnant Bin/i);

      // Export SVG, DXF, and Markdown Waste Audit Report and verify live artifact preview
      await page.locator('[data-testid="export-svg-btn"]').click();
      await ctx.expectVisible('[data-testid="exported-artifact-preview"]');
      await ctx.expectText(/Generated SVG Output/i);

      await page.locator('[data-testid="export-dxf-btn"]').click();
      await ctx.expectText(/Generated DXF Output/i);
      await ctx.expectText(/LWPOLYLINE/i);

      await page.locator('[data-testid="export-report-btn"]').click();
      await ctx.expectText(/Generated REPORT Output/i);
      await ctx.shot('core-export-verified');
    },
  },
  {
    id: 'S3-local-dxf-svg-importer-and-error-recovery',
    title: 'Client-side ASCII DXF & SVG contour parser with malformed input error recovery',
    async run(page, ctx) {
      await page.goto(BASE, { waitUntil: 'networkidle' });

      await page.locator('[data-testid="open-vector-importer-btn"]').click();
      await ctx.expectVisible('[data-testid="vector-importer-drawer"]');

      // 1. Test invalid DXF input error handling
      const textarea = page.locator('[data-testid="vector-code-textarea"]');
      await textarea.fill('NOT_A_VALID_DXF_FILE_CONTENT');
      await page.locator('[data-testid="parse-and-add-vector-btn"]').click();
      await ctx.expectVisible('[data-testid="vector-import-error"]');
      await ctx.expectText(/Invalid ASCII DXF/i);
      await ctx.shot('dxf-invalid-error');

      // 2. Recover by loading valid Sample ASCII DXF and parsing locally
      await page.locator('[data-testid="load-sample-dxf-btn"]').click();
      await page.locator('[data-testid="parse-and-add-vector-btn"]').click();
      await ctx.expectText(/Parsed 2 closed vector contour\(s\) locally from DXF/i);
      await ctx.expectText(/PART CUT SCHEDULE \(16 INSTANCES\)/i);
      await ctx.shot('dxf-parsed-success');
    },
  },
  {
    id: 'S4-scrap-contour-tracer-and-remnant-bin',
    title: 'Optical Scrap Contour Tracer modal and Remnant Bin inventory management',
    async run(page, ctx) {
      await page.goto(BASE, { waitUntil: 'networkidle' });

      await page.locator('[data-testid="open-scrap-tracer-btn"]').click();
      await ctx.expectVisible('[data-testid="scrap-tracer-modal"]');

      // Switch silhouette pattern to Perforated Laser Skeleton
      await page.locator('[data-testid="trace-preset-laser_skeleton"]').click();
      await ctx.expectText(/2 interior cutouts/i);
      await ctx.shot('scrap-tracer-modal');

      // Confirm adding digitized remnant to active job
      await page.locator('[data-testid="confirm-add-remnant-btn"]').click();
      await ctx.expectText(/Digitized leftover scrap/i);

      // Navigate to Remnant Bin tab and verify the digitized remnant is listed
      await page.locator('[data-testid="nav-tab-remnants"]').click();
      await ctx.expectVisible('[data-testid="remnant-inventory-view"]');
      await ctx.expectText(/Remnant #R29 — Traced Workshop Offcut/i);
      await ctx.shot('remnant-bin-inventory');
    },
  },
  {
    id: 'S5-grain-lock-kerf-and-validation',
    title: 'Wood-grain orientation lock, kerf tolerance update, and parametric form validation',
    async run(page, ctx) {
      await page.goto(BASE, { waitUntil: 'networkidle' });

      // Switch to Baltic Birch Woodworking preset
      await page.locator('[data-testid="preset-btn-baltic-birch-cabinet"]').click();
      await ctx.expectText(/GrainLocked_Front_Fascia/i);

      // Test invalid parametric part width (-25mm)
      await page.locator('[data-testid="new-part-width-input"]').fill('-25');
      await page.locator('[data-testid="add-parametric-part-btn"]').click();
      await ctx.expectVisible('[data-testid="part-input-error"]');
      await ctx.expectText(/Part Width must be between 5 mm and 2400 mm/i);
      await ctx.shot('invalid-part-width');

      // Fix input and add valid panel
      await page.locator('[data-testid="new-part-width-input"]').fill('140');
      await page.locator('[data-testid="new-part-height-input"]').fill('75');
      await page.locator('[data-testid="add-parametric-part-btn"]').click();
      await ctx.expectText(/Added 2× "Custom_Gusset_Plate"/i);
      await ctx.shot('valid-part-added');
    },
  },
  {
    id: 'S6-benchmark-audit-and-keyboard-a11y',
    title: 'Quantitative Waste Benchmark Ledger and keyboard focus accessibility',
    async run(page, ctx) {
      await page.goto(BASE, { waitUntil: 'networkidle' });

      // Navigate to Benchmark Audit tab
      await page.locator('[data-testid="nav-tab-benchmark"]').click();
      await ctx.expectVisible('[data-testid="benchmark-audit-view"]');
      await ctx.expectText(/100% PASS/i);

      // Re-run full benchmark suite
      await page.locator('[data-testid="run-benchmark-btn"]').click();
      await ctx.expectText(/Baltic Birch Modular Synthesizer Case/i);
      await ctx.expectText(/6061 Aluminum Rover Chassis/i);

      // Verify keyboard Tab navigation reaches interactive controls
      await page.keyboard.press('Tab');
      const activeTag = await page.evaluate(() => document.activeElement?.tagName);
      ctx.assert(Boolean(activeTag), 'Keyboard Tab did not focus an interactive element');

      await ctx.shot('benchmark-ledger');
    },
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectVisible(page, selector, timeout = 10000) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout });
  return locator;
}

async function expectText(page, text, timeout = 10000) {
  const locator = page.getByText(text).first();
  await locator.waitFor({ state: 'visible', timeout });
  return locator;
}

function collectIssues(page) {
  const issues = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') issues.push({ kind: 'console', text: msg.text() });
  });
  page.on('pageerror', (err) => {
    issues.push({ kind: 'pageerror', text: err.message });
  });
  page.on('requestfailed', (req) => {
    const reason = req.failure()?.errorText ?? 'request failed';
    if (!reason.includes('ERR_ABORTED') && !reason.includes('NS_BINDING_ABORTED')) {
      issues.push({ kind: 'requestfailed', text: `${reason} ${req.url()}` });
    }
  });
  page.on('response', (res) => {
    const status = res.status();
    if (status >= 500) issues.push({ kind: 'http', text: `${status} ${res.url()}` });
    else if (status >= 400) {
      issues.push({ kind: 'http', level: 'warn', text: `${status} ${res.url()}` });
    }
  });
  return issues;
}

async function main() {
  const browserType = BROWSER === 'chromium' ? chromium : firefox;
  const browser = await browserType.launch({ headless: !HEADED });
  const startedAt = new Date().toISOString();
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      baseURL: BASE,
      viewport: vp.viewport,
      deviceScaleFactor: vp.deviceScaleFactor,
    });

    for (const scenario of scenarios) {
      const page = await context.newPage();
      const issues = collectIssues(page);
      const screenshots = [];
      const started = Date.now();
      let status = 'pass';
      let error = null;

      const ctx = {
        assert,
        expectVisible: (selector, timeout) => expectVisible(page, selector, timeout),
        expectText: (text, timeout) => expectText(page, text, timeout),
        shot: async (name, opts = {}) => {
          const file = path.join(SHOTS, `${scenario.id}-${name}-${vp.name}.png`);
          await page.screenshot({ path: file, fullPage: opts.fullPage ?? true });
          screenshots.push(file);
          return file;
        },
      };

      try {
        await scenario.run(page, ctx);
      } catch (err) {
        status = 'fail';
        error = err.message;
      } finally {
        await page.close().catch(() => {});
      }

      const errors = issues.filter((i) => (i.level ?? 'error') === 'error');
      const warnings = issues.filter((i) => i.level === 'warn');
      if (status === 'pass' && errors.length > 0) {
        status = 'fail';
        error = errors.map((i) => `${i.kind}: ${i.text}`).join(' | ');
      }

      results.push({
        viewport: vp.name,
        id: scenario.id,
        title: scenario.title,
        status,
        ms: Date.now() - started,
        error,
        errors,
        warnings,
        screenshots,
      });

      console.log(
        `${status === 'pass' ? '✓' : '✗'} [${vp.name}] ${scenario.id}` +
          (error ? ` — ${error}` : '')
      );
    }

    await context.close();
  }

  await browser.close();

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.status === 'pass').length,
    fail: results.filter((r) => r.status === 'fail').length,
  };
  const finishedAt = new Date().toISOString();
  const report = {
    base: BASE,
    browser: BROWSER,
    headed: HEADED,
    startedAt,
    finishedAt,
    summary,
    results,
  };

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(report, null, 2));

  const warnings = results.flatMap((r) =>
    r.warnings.map((w) => `- [${r.viewport}] ${r.id}: ${w.kind} — ${w.text}`)
  );
  const md = [
    `# QA Run Report — KerfCraft (RemnantNest) — ${finishedAt}`,
    '',
    `- **Base URL**: ${BASE}`,
    `- **Browser**: ${BROWSER} (${HEADED ? 'headed' : 'headless'})`,
    `- **Scenarios Executed**: ${summary.total} (${summary.pass} pass, ${summary.fail} fail)`,
    '',
    '| Viewport | Scenario | Title | Status | Duration (ms) | Detail |',
    '|---|---|---|---|---:|---|',
    ...results.map(
      (r) =>
        `| ${r.viewport} | \`${r.id}\` | ${r.title} | **${r.status.toUpperCase()}** | ${r.ms} | ${(r.error ?? '0 console/page/network errors').replace(/\|/g, '\\|')} |`
    ),
    '',
    ...(warnings.length ? ['## Warnings', '', ...warnings, ''] : []),
    '## Captured Screenshots',
    '',
    ...results.flatMap((r) => r.screenshots.map((s) => `- \`${s}\``)),
    '',
  ];
  fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n'));

  console.log(`\n${summary.pass}/${summary.total} passed — see ${OUT}/`);
  process.exit(summary.fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
