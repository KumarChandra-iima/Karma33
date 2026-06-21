// Launches a real browser via Playwright, records a video of the page load,
// and takes a screenshot — used by verify-deployment.sh so deployment checks
// produce durable local evidence (video) Kumar can review later, not just a
// one-line pass/fail.
//
// Usage: node capture-deployment.cjs <url> <videoDir> <screenshotPath>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function main() {
  const [url, videoDir, screenshotPath] = process.argv.slice(2);
  if (!url || !videoDir || !screenshotPath) {
    console.error('Usage: capture-deployment.cjs <url> <videoDir> <screenshotPath>');
    process.exit(1);
  }
  fs.mkdirSync(videoDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: videoDir, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();

  let status = null;
  let navError = null;
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    status = response ? response.status() : null;
    await page.waitForTimeout(2000);
  } catch (e) {
    navError = e.message;
  }

  try {
    await page.screenshot({ path: screenshotPath });
  } catch (e) {
    // page may have failed to load at all; still try to finalize the video below
  }

  const video = page.video();
  await context.close();
  await browser.close();

  let videoPath = null;
  if (video) {
    try {
      videoPath = await video.path();
      // Rename to a stable, readable filename instead of Playwright's random hash.
      const urlSlug = url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const finalPath = path.join(videoDir, `${stamp}_${urlSlug}.webm`);
      fs.renameSync(videoPath, finalPath);
      videoPath = finalPath;
    } catch (e) {
      // leave videoPath as whatever Playwright reported if rename fails
    }
  }

  console.log(JSON.stringify({ status, navError, videoPath }));
}

main();
