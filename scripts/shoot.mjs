// Optional dev/verification helper: screenshots the running app.
// Requires Playwright (not a project dependency): `npm i -D playwright`.
// Uses the environment's preinstalled Chromium; override with CHROMIUM_PATH.
import { chromium } from "playwright";

const url = process.env.URL || "http://127.0.0.1:3100/";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1700 },
  deviceScaleFactor: 2,
});
await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForSelector("svg[role=img]", { timeout: 10000 });
await page.waitForTimeout(2800); // let fonts + animations settle

await page.screenshot({ path: "/tmp/astro-home.png", fullPage: true });

const wheel = await page.$("svg[role=img]");
if (wheel) await wheel.screenshot({ path: "/tmp/astro-wheel.png" });

console.log("shot ok");
await browser.close();
