// Renders public/assets/personas/portraits/<id>-{bust,full}.webp with the
// production character runtime. Needs `npm run dev` on 5190 and a local
// Chrome; playwright-core is a one-off tool, not an app dependency:
//   npx -y -p playwright-core node scripts/render-persona-portraits.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PERSONAS } from "../src/shared/personas.mjs";

let chromium;
try { ({ chromium } = await import(process.env.PLAYWRIGHT_CORE ? new URL("file:///" + process.env.PLAYWRIGHT_CORE.replace(/\\/g, "/")).href : "playwright-core")); }
catch { console.error("需要 playwright-core：npm i -g playwright-core，或设置 PLAYWRIGHT_CORE=<path>/playwright-core/index.mjs"); process.exit(1); }
const base = process.env.STUDIO_URL || "http://127.0.0.1:5190/tools/portrait-studio.html";
const out = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/personas/portraits");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
for (const persona of PERSONAS) {
  for (const kind of ["bust", "full"]) {
    await page.goto(`${base}?persona=${persona.id}&kind=${kind}`);
    await page.waitForFunction(() => window.__studioReady === true);
    const dataUrl = await page.evaluate(() => window.__renderPortrait());
    const file = join(out, `${persona.id}-${kind}.webp`);
    writeFileSync(file, Buffer.from(dataUrl.split(",")[1], "base64"));
    console.log(file);
  }
}
await browser.close();
