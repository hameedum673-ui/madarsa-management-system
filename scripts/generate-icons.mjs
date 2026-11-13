// مرحلہ 76 — آئیکن کی PNG فائلیں بنائیں (base64 والی فائلوں سے)۔
// PNG براہِ راست GitHub پر نہیں جا سکتیں (push صرف UTF-8 text لیتا ہے)،
// اس لیے base64 والی text فائلیں commit ہوتی ہیں اور PNG build کے وقت
// بنتی ہیں۔ کوئی نئی dependency نہیں چاہیے — صرف Node کا Buffer۔
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "icons",
);
mkdirSync(dir, { recursive: true });
for (const size of [192, 512, 180]) {
  const b64 = readFileSync(join(dir, `icon-${size}.png.b64`), "utf-8").trim();
  writeFileSync(join(dir, `icon-${size}.png`), Buffer.from(b64, "base64"));
  console.log(`icon-${size}.png تیار`);
}
