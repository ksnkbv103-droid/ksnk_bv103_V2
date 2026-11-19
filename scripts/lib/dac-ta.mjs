// Đọc đặc tả M01…M15 (nằm ngoài repo): dùng chung cho trace-dac-ta.mjs, dac-ta-test.mjs, so-loi.mjs.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const specDir =
  process.env.KSNK_DAC_TA ?? join(homedir(), "Desktop/KSNK_BENH_VIEN_103/09_DOMAIN_PHAN_MEM/02_DAC_TA");

// Hàng bảng đặc tả: ô đầu bắt đầu bằng mã R/T, có thể kèm ngoặc như `| T3.01 (TH3.01) | vào | ra |` (M03, M12).
const ROW = /^\|\s*((?:R|T)\d+\.\d+[a-z]?)\s*(?:\([^)]*\))?\s*\|(.*)$/;

/** Mọi hàng R/T của đặc tả: [{ ma, module, file, cells }] (cells = các ô sau ô mã). null nếu không có thư mục đặc tả. */
export function readSpec() {
  if (!existsSync(specDir)) return null;
  const rows = [];
  for (const file of readdirSync(specDir).filter((n) => /^M\d{2}_.*\.md$/.test(n)).sort()) {
    for (const line of readFileSync(join(specDir, file), "utf8").split("\n")) {
      const m = line.match(ROW);
      if (!m) continue;
      const cells = m[2].replace(/\\\|/g, "\u0001").replace(/\|\s*$/, "").split("|").map((c) => c.replace(/\u0001/g, "|").trim());
      rows.push({ ma: m[1], module: file.slice(0, 3), file, cells });
    }
  }
  return rows;
}
