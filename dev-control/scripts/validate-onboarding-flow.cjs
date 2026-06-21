// Multi-step deployment validation: walks the actual onboarding wizard
// (enter name, confirm default wake-time selects, pick the default yoga
// duration, finish setup) and asserts the resulting dashboard renders -
// not just "the page loaded". Records video throughout (not just a single
// frame) so there's durable evidence of the full flow, not just the first
// screen.
//
// Usage: node validate-onboarding-flow.cjs <url> <videoDir> <screenshotDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

if (process.argv.length < 5) {
  console.error('Usage: node validate-onboarding-flow.cjs <url> <videoDir> <screenshotDir>');
  process.exit(1);
}

const url = process.argv[2];
const videoDir = process.argv[3];
const screenshotDir = process.argv[4];

async function runValidation() {
  fs.mkdirSync(videoDir, { recursive: true });
  fs.mkdirSync(screenshotDir, { recursive: true });

  const results = { url, steps: [], allPassed: true, videoPath: null, screenshots: [] };
  let browser, context, page, video;

  try {
    browser = await chromium.launch();
    context = await browser.newContext({
      recordVideo: { dir: videoDir, size: { width: 390, height: 844 } },
      viewport: { width: 390, height: 844 },
    });
    page = await context.newPage();
    video = page.video(); // handle is available immediately; .path() only resolves after the context closes

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Step 1: enter name, advance
    try {
      await page.screenshot({ path: path.join(screenshotDir, '01-onboarding-name.png') });
      await page.fill('input[placeholder="Enter your name..."]', 'Test User');
      await page.screenshot({ path: path.join(screenshotDir, '02-name-entered.png') });
      await page.click('button:has-text("Continue →")');
      results.steps.push({ name: 'name-entry', passed: true });
    } catch (error) {
      results.steps.push({ name: 'name-entry', passed: false, error: error.message });
      results.allPassed = false;
    }

    // Step 2: confirm wake-time defaults, advance
    await page.waitForTimeout(500);
    try {
      await page.screenshot({ path: path.join(screenshotDir, '03-wake-time.png') });
      const hourSelect = page.locator('select').first();
      const minuteSelect = page.locator('select').nth(1);
      const hourVal = await hourSelect.inputValue();
      const minuteVal = await minuteSelect.inputValue();
      if (hourVal !== '03' || minuteVal !== '30') {
        throw new Error(`Unexpected default select values: hour=${hourVal} minute=${minuteVal}`);
      }
      await page.click('button:has-text("Continue →")');
      results.steps.push({ name: 'wake-time-step', passed: true });
    } catch (error) {
      results.steps.push({ name: 'wake-time-step', passed: false, error: error.message });
      results.allPassed = false;
    }

    // Step 3: explicitly select the default 60 min duration, finish setup
    await page.waitForTimeout(500);
    try {
      await page.screenshot({ path: path.join(screenshotDir, '04-yoga-duration.png') });
      await page.click('button:has-text("60 min")');
      await page.screenshot({ path: path.join(screenshotDir, '05-duration-selected.png') });
      await page.click('button:has-text("Start My Journey 🚀")');
      results.steps.push({ name: 'yoga-duration-step', passed: true });
    } catch (error) {
      results.steps.push({ name: 'yoga-duration-step', passed: false, error: error.message });
      results.allPassed = false;
    }

    // Step 4: dashboard actually rendered (both header subtitle and Day 1 indicator)
    try {
      // Unquoted text= is a substring match - the real DOM text is the combined
      // string "28-DAY TRANSFORMATION · Day 1" in one element, not two separate
      // ones, so an exact-match (quoted) selector would never find it.
      await page.waitForSelector('text=28-DAY TRANSFORMATION', { timeout: 10000 });
      await page.waitForSelector('text=Day 1', { timeout: 10000 });
      await page.screenshot({ path: path.join(screenshotDir, '06-dashboard-loaded.png') });
      results.steps.push({ name: 'dashboard-loaded', passed: true });
    } catch (error) {
      results.steps.push({ name: 'dashboard-loaded', passed: false, error: error.message });
      results.allPassed = false;
    }
  } catch (error) {
    results.allPassed = false;
    results.fatalError = error.message;
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});

    if (video) {
      try {
        const rawPath = await video.path();
        const urlSlug = url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const finalPath = path.join(videoDir, `${stamp}_onboarding-flow_${urlSlug}.webm`);
        fs.renameSync(rawPath, finalPath);
        results.videoPath = finalPath;
      } catch (e) {
        results.videoPath = null;
      }
    }

    if (fs.existsSync(screenshotDir)) {
      results.screenshots = fs.readdirSync(screenshotDir)
        .filter((f) => f.endsWith('.png'))
        .map((f) => path.join(screenshotDir, f));
    }

    console.log(JSON.stringify(results, null, 2));
    process.exit(results.allPassed ? 0 : 1);
  }
}

runValidation();
