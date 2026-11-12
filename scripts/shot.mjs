#!/usr/bin/env node
/**
 * Headless screenshot helper (dev tooling, not shipped).
 *
 * Usage:
 *   node scripts/shot.mjs <url> <out.png> [--w 1440] [--h 900] [--dpr 1]
 *                        [--wait 2500] [--selector "#id"] [--full]
 *                        [--eval "js expression run after load"]
 *                        [--click "css selector"] (repeatable)
 *
 * Prints browser console errors / page errors so runtime bugs surface in the
 * terminal. Exits 0 on success, 1 on navigation failure.
 */
import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
const positional = [];
const opts = { w: 1440, h: 900, dpr: 1, wait: 2500, full: false, clicks: [] };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--w") opts.w = Number(args[++i]);
  else if (a === "--h") opts.h = Number(args[++i]);
  else if (a === "--dpr") opts.dpr = Number(args[++i]);
  else if (a === "--wait") opts.wait = Number(args[++i]);
  else if (a === "--selector") opts.selector = args[++i];
  else if (a === "--eval") opts.evalExpr = args[++i];
  else if (a === "--click") opts.clicks.push(args[++i]);
  else if (a === "--full") opts.full = true;
  else positional.push(a);
}
const [url, out] = positional;
if (!url || !out) {
  console.error("usage: node scripts/shot.mjs <url> <out.png> [options]");
  process.exit(2);
}

const candidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) {
  console.error("No Chrome/Edge executable found. Set CHROME_PATH.");
  process.exit(2);
}

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=default", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: opts.w, height: opts.h },
  deviceScaleFactor: opts.dpr,
});
const page = await context.newPage();
const problems = [];
page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning") {
    problems.push(`[console.${msg.type()}] ${msg.text()}`);
  }
});
page.on("pageerror", (err) => problems.push(`[pageerror] ${err.message}`));

let code = 0;
try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  for (const sel of opts.clicks) {
    await page.click(sel, { timeout: 15000 });
    await page.waitForTimeout(600);
  }
  if (opts.evalExpr) {
    const result = await page.evaluate(opts.evalExpr);
    if (result !== undefined) console.log("[eval]", JSON.stringify(result));
  }
  await page.waitForTimeout(opts.wait);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  if (opts.selector) {
    await page.locator(opts.selector).screenshot({ path: out });
  } else {
    await page.screenshot({ path: out, fullPage: opts.full });
  }
  console.log(`saved ${out}`);
} catch (err) {
  console.error("[shot] failed:", err.message);
  code = 1;
}
if (problems.length) {
  console.log(`--- ${problems.length} console problem(s) ---`);
  for (const p of problems.slice(0, 40)) console.log(p);
}
await browser.close();
process.exit(code);
