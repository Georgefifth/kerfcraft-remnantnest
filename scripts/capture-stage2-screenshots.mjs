import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('evidence/stage-2-build/frontend');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  const PORT = 4399;
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    stdio: 'pipe',
  });

  await new Promise((resolve) => setTimeout(resolve, 1800));

  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Desktop 1440x900
    const desktopCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await desktopCtx.newPage();
    const errors = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(OUT_DIR, '01-desktop-studio-initial.png'),
      fullPage: true,
    });

    // Click "Run Remnant-First Nest"
    await page.click('[data-testid="run-nest-btn"]');
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(OUT_DIR, '02-desktop-nest-solved.png'),
      fullPage: true,
    });

    // Open Scrap Contour Tracer Modal
    await page.click('[data-testid="open-scrap-tracer-btn"]');
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(OUT_DIR, '03-desktop-scrap-tracer-modal.png'),
      fullPage: false,
    });
    await page.click('[data-testid="confirm-add-remnant-btn"]');
    await page.waitForTimeout(200);

    // Switch to Waste Audit Ledger tab
    await page.click('[data-testid="nav-tab-benchmark"]');
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(OUT_DIR, '04-desktop-benchmark-audit.png'),
      fullPage: true,
    });

    // Switch back to Studio & test Empty State
    await page.click('[data-testid="nav-tab-studio"]');
    await page.click('[data-testid="clear-workspace-btn"]');
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(OUT_DIR, '05-desktop-empty-state.png'),
      fullPage: true,
    });

    // Restore preset
    await page.click('[data-testid="empty-restore-preset-btn"]');
    await page.waitForTimeout(200);

    // 2. Mobile 390x844
    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const mPage = await mobileCtx.newPage();
    await mPage.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
    await mPage.screenshot({
      path: path.join(OUT_DIR, '06-mobile-390px-studio.png'),
      fullPage: true,
    });

    console.log('Stage 2 screenshots captured. Console/page errors:', errors.length);
    if (errors.length > 0) {
      console.error('Errors:', errors);
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    preview.kill('SIGKILL');
    process.exit(0);
  }
}

main();
