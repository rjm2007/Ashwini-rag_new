/**
 * Capture warranty platform UI screenshots for design handoff.
 * Output: C:\Users\rudra\Desktop\images
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const BASE = process.env.UI_BASE_URL || "http://localhost:3000";
const OUT_DIR = process.env.UI_SCREENSHOT_DIR || "C:\\Users\\rudra\\Desktop\\images";
// Defaults from Postgres (run_005 corpus + in-progress doc) — override via env if DB changes
const DOC_ID = process.env.UI_SAMPLE_DOC_ID || "a0c9c2d0-3ff1-44d9-8e79-8a71088b995b"; // 1169 WARRENTY.pdf (certified)
const FAILED_DOC_ID = process.env.UI_FAILED_DOC_ID || "b2a0450d-1d5d-4f20-953b-985dc61f352c"; // 1167 WARRENTY.pdf (parsing)

const VIEWPORT = { width: 1440, height: 900 };

mkdirSync(OUT_DIR, { recursive: true });

async function shot(page, name, opts = {}) {
  const file = join(OUT_DIR, name);
  await page.screenshot({ path: file, ...opts });
  console.log(`  saved ${file}`);
  return file;
}

async function login(page, email = "admin@demo.com", password = "admin123") {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/documents**", { timeout: 30000 });
  await page.waitForTimeout(800);
}

async function waitForDocumentReady(page) {
  await page.waitForSelector("text=1169 WARRENTY", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme: "dark"
  });
  const page = await context.newPage();
  const captured = [];

  console.log(`Capturing UI from ${BASE} -> ${OUT_DIR}`);

  // 1) Login (unauthenticated)
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  captured.push(await shot(page, "01-login-page.png"));

  // 2) Documents list
  await login(page);
  await page.goto(`${BASE}/documents`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  captured.push(await shot(page, "02-documents-list.png"));

  // 3) Upload page
  await page.goto(`${BASE}/upload`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  captured.push(await shot(page, "03-upload-page.png"));

  // 4) Document detail — Summary tab (default when complete)
  await page.goto(`${BASE}/documents/${DOC_ID}`, { waitUntil: "networkidle" });
  await waitForDocumentReady(page);
  const summaryTab = page.getByRole("button", { name: "Summary", exact: true });
  const pipelineTab = page.getByRole("button", { name: "Pipeline", exact: true });
  await summaryTab.click().catch(() => {});
  await page.waitForTimeout(1500);
  captured.push(await shot(page, "04-document-summary-tab.png"));

  // 5) Pipeline tab (was "Pipeline log" in older UI)
  await pipelineTab.click({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  captured.push(await shot(page, "05-document-pipeline-log-tab.png"));

  // 6) Chat sidebar (empty) — back to summary for richer left panel
  await summaryTab.click();
  await page.waitForTimeout(800);
  captured.push(await shot(page, "06-document-chat-sidebar.png"));

  // 7) Chat with a sample question + response (design reference)
  const chatInput = page.locator('textarea, input[placeholder*="Ask"]').last();
  if (await chatInput.count()) {
    await chatInput.fill("What is the coverage for U030 on this vehicle?");
    await page.waitForTimeout(400);
    captured.push(await shot(page, "07-document-chat-question-typed.png"));
    const sendBtn = page.locator('button').filter({ has: page.locator("svg") }).last();
    await chatInput.press("Enter").catch(async () => {
      await sendBtn.click().catch(() => {});
    });
    await page.waitForTimeout(45000);
    captured.push(await shot(page, "08-document-chat-with-answer.png"));
  }

  // 8) Failed document — pipeline/error state
  await page.goto(`${BASE}/documents/${FAILED_DOC_ID}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  captured.push(await shot(page, "09-document-failed-state.png"));

  const manifest = {
    capturedAt: new Date().toISOString(),
    baseUrl: BASE,
    viewport: VIEWPORT,
    sampleDocumentId: DOC_ID,
    inProgressDocumentId: FAILED_DOC_ID,
    files: [
      { file: "01-login-page.png", screen: "Login / sign-in" },
      { file: "02-documents-list.png", screen: "Documents list with sidebar" },
      { file: "03-upload-page.png", screen: "Upload document drop zone" },
      { file: "04-document-summary-tab.png", screen: "Document detail — Summary tab + AI summary" },
      { file: "05-document-pipeline-log-tab.png", screen: "Document detail — Pipeline tab (Act 1/2 steps)" },
      { file: "06-document-chat-sidebar.png", screen: "Document detail — chat sidebar (doc-scoped)" },
      { file: "07-document-chat-question-typed.png", screen: "Chat input with sample question" },
      { file: "08-document-chat-with-answer.png", screen: "Chat with AI response (if completed in time)" },
      { file: "09-document-failed-state.png", screen: "In-progress document (1167 WARRENTY.pdf, parsing)" }
    ],
    notes: [
      "Sample doc: 1169 WARRENTY.pdf (certified, processing_complete).",
      "Screenshot 09 uses 1167 WARRENTY.pdf (parsing) — no failed docs in DB currently.",
      "Dark theme as rendered in browser."
    ]
  };

  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\nDone. ${captured.length} screenshots + manifest.json`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
