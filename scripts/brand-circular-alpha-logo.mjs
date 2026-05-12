#!/usr/bin/env node
/**
 * Logo BV103 thường là PNG vuông với nền đen ở bốn góc quanh huy hiệu tròn.
 * Next/Image không tự xóa pixel — script này đặt alpha = 0 cho pixel ngoài vòng tròn
 * nội tiếp (tâm ảnh, bán kính min(w,h)/2 − inset), giữ nguyên phần huy hiệu.
 *
 * Chạy: node scripts/brand-circular-alpha-logo.mjs
 * Hoặc: npm run brand:logo-circular-alpha
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const defaultInput = path.join(repoRoot, "public", "brand", "logo-bv103.png");

const inputPath = path.resolve(process.argv[2] || defaultInput);
const outputPath = path.resolve(process.argv[3] || inputPath);
const insetPx = parseInt(process.argv[4] || "2", 10); // thu nhẹ bán kính để tránh viền đen còn sót

if (!fs.existsSync(inputPath)) {
  console.error("[brand:logo] Không thấy file:", inputPath);
  process.exit(1);
}

const img = sharp(inputPath).ensureAlpha();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels } = info;
if (channels !== 4) {
  console.error("[brand:logo] Cần ảnh 4 kênh (RGBA), hiện có:", channels);
  process.exit(1);
}

const cx = w / 2;
const cy = h / 2;
const r = Math.min(w, h) / 2 - insetPx;

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const dx = x + 0.5 - cx;
    const dy = y + 0.5 - cy;
    const dist = Math.hypot(dx, dy);
    const idx = (y * w + x) * 4;
    if (dist > r) {
      data[idx + 3] = 0;
    }
  }
}

await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .png({ compressionLevel: 9, effort: 10 })
  .toFile(outputPath + ".tmp");

fs.renameSync(outputPath + ".tmp", outputPath);
const st = fs.statSync(outputPath);
console.log("[brand:logo] Đã ghi:", outputPath, "(" + Math.round(st.size / 1024) + " KB)", `w=${w} h=${h} r≈${r.toFixed(1)}`);
