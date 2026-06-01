#!/usr/bin/env node
/**
 * Gắn mã [ACT-xxx] vào Phần 4 của docs/data/bang-kiem/canonical-36.md
 * Nguồn mã: supabase/migrations/20260528000005_gstt_part34_all51_seed.sql
 * Fallback: heuristic inferGsttActCodeFromText (giống parse-giamsat-markdown-forms.mjs)
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const CANONICAL_MD = path.join(repoRoot, "docs/data/bang-kiem/canonical-36.md");
const SEED_SQL = path.join(repoRoot, "supabase/migrations/20260528000005_gstt_part34_all51_seed.sql");

const ACT_CATALOG_BLOCK = `## Danh mục mã hành động khắc phục (ACT)

> Ghi nhận trên phiên **Không đạt** — phục vụ thống kê Pareto; **không** kích hoạt workflow tự động.

| Mã | Tên chuẩn | Khi áp dụng |
| --- | --- | --- |
| **ACT-100** | Nhắc nhở / hướng dẫn lại tại chỗ (Coaching) | NVYT sai kỹ thuật nhưng chưa gây hậu quả. Căn cứ QT.KSNK.28: góp ý, nhắc nhở ngay. |
| **ACT-200** | Yêu cầu khắc phục / làm lại ngay | Hành vi sai có thể sửa ngay (VD: quên VST trước khi mang găng → tháo găng, VST, mang găng mới). |
| **ACT-300** | Bổ sung phương tiện / vật tư | Thiếu nguồn lực tại điểm chăm sóc (cồn, N95, hộp sắc nhọn đầy…). Phần mềm chỉ **ghi nhận** đề xuất. |
| **ACT-400** | Đình chỉ / dừng hoạt động (Stop the line) | Vi phạm nghiêm trọng hạ tầng/thiết bị (rào ICRA rách, Bowie-Dick fail, dừng thi công…). |
| **ACT-500** | Lập biên bản / báo cáo sự cố | Lỗi đã xảy ra hoặc rủi ro cao (kim đâm → sơ cứu + BM.10.01; biên bản an toàn…). |

**Quy ước dòng Phần 4:** \`* [ ] [ACT-xxx] Nội dung can thiệp theo ngữ cảnh bảng kiểm\`* (song song với \`[101-SYS]\` ở Phần 3).

`;

function inferGsttActCodeFromText(noiDung) {
  const t = String(noiDung || "").toLowerCase();
  if (/stop the line|đình chỉ|dừng hoạt động|dừng mọi hoạt động|dừng thi công|đình chỉ máy/i.test(t)) return "ACT-400";
  if (/biên bản|báo cáo sự cố|bm\.10|tai nạn rủi ro|incident report/i.test(t)) return "ACT-500";
  if (/cấp phát|bổ sung.*vật tư|đề xuất cấp|hậu cần|khoa dược|báo cáo.*hậu cần/i.test(t)) return "ACT-300";
  if (/coaching|nhắc nhở|hướng dẫn lại|góp ý|chấn chỉnh/i.test(t)) return "ACT-100";
  return "ACT-200";
}

function stripMd(s) {
  return String(s || "")
    .replace(/\\([_\\[\]()])/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

function loadActionsFromSeed() {
  const sql = readFileSync(SEED_SQL, "utf8");
  const map = new Map();
  const blockRe =
    /-- (BM\.[^\n:]+)[\s\S]*?hanh_dong_khac_phuc_jsonb = \$jsonb\$([\s\S]*?)\$jsonb\$::jsonb/g;
  let m;
  while ((m = blockRe.exec(sql)) !== null) {
    const ma = m[1].trim();
    try {
      const actions = JSON.parse(m[2]);
      if (Array.isArray(actions) && actions.length) map.set(ma, actions);
    } catch {
      /* skip */
    }
  }
  return map;
}

function formatActionLine(action) {
  const code = action.action_code || inferGsttActCodeFromText(action.noi_dung);
  let text = String(action.noi_dung || "").trim();
  if (!text) return null;
  return `* \\[ \\] \\[${code}\\] ${text}`;
}

function formatActionLineFromMarkdownBullet(line) {
  let text = stripMd(line);
  text = text.replace(/^\[\s*\\?\]?\s*\]?\s*/i, "");
  text = text.replace(/\[ACT-\d{3}\]/gi, "").trim();
  if (!text || text.length < 4) return null;
  const code = inferGsttActCodeFromText(text);
  return `* \\[ \\] \\[${code}\\] ${text}`;
}

function enrichPart4(part4Body, maBk, seedMap) {
  const lines = part4Body.split("\n");
  const out = [];
  let i = 0;
  const introRe = /^\*\(/;

  while (i < lines.length) {
    const line = lines[i];
    if (introRe.test(line.trim()) || line.trim() === "") {
      out.push(line);
      i++;
      continue;
    }
    if (/^\* \\\[\s*\\\]/.test(line)) break;
    out.push(line);
    i++;
  }

  const bullets = [];
  while (i < lines.length) {
    const line = lines[i];
    if (/^\* \\\[\s*\\\]/.test(line)) bullets.push(line);
    else if (bullets.length && line.trim() !== "") break;
    i++;
  }
  const afterBullets = i;

  const seed = seedMap.get(maBk);
  if (seed?.length) {
    for (const a of seed) {
      const formatted = formatActionLine(a);
      if (formatted) out.push(formatted);
    }
  } else {
    for (const b of bullets) {
      const formatted = formatActionLineFromMarkdownBullet(b);
      if (formatted) out.push(formatted);
    }
  }

  // Bỏ qua dòng bullet gốc (đã thay bằng dòng có [ACT-xxx])
  i = afterBullets;
  while (i < lines.length) {
    out.push(lines[i]);
    i++;
  }

  if (!out.some((l) => /ACT-\d{3}/.test(l))) {
    return part4Body;
  }

  const hasIntro = out.some((l) => /Chọn.*ACT/i.test(l));
  if (!hasIntro) {
    const headerIdx = out.findIndex((l) => /^\*\*PHẦN 4/i.test(l));
    if (headerIdx >= 0) {
      out.splice(
        headerIdx + 1,
        0,
        "",
        "*(Chọn ≥1 hành động khi phiên Không đạt; mã **[ACT-xxx]** dùng thống kê Pareto — chỉ ghi nhận, không workflow.)*",
      );
    }
  }

  return out.join("\n");
}

function processFile() {
  const seedMap = loadActionsFromSeed();
  let md = readFileSync(CANONICAL_MD, "utf8");

  if (!md.includes("## Danh mục mã hành động khắc phục (ACT)")) {
    const insertAt = md.indexOf("## Mục lục");
    const before = md.slice(0, insertAt);
    const after = md.slice(insertAt);
    md = `${before}\n${ACT_CATALOG_BLOCK}\n${after}`;
  }

  const formRe =
    /(```yaml[\s\S]*?ma_bk:\s*(BM\.[^\n]+)[\s\S]*?```\n\n## [^\n]+\n\n)([\s\S]*?)(\n\n---\n\n<!-- BANG_KIEM_END -->)/g;

  let count = 0;
  let fromSeed = 0;
  let inferred = 0;

  md = md.replace(formRe, (full, prefix, maBk, body, suffix) => {
    const ma = maBk.trim();
    const p4split = body.split(/\*\*PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC\*\*/i);
    if (p4split.length < 2) return full;
    const beforeP4 = p4split[0] + "**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**";
    const afterP4 = p4split[1];
    const sigMatch = afterP4.match(/\n\*\*Chữ ký[\s\S]*$/i);
    const part4 = sigMatch ? afterP4.slice(0, sigMatch.index) : afterP4;
    const sig = sigMatch ? sigMatch[0].trimStart() : "";

    const enriched = enrichPart4(part4, ma, seedMap).trimEnd();
    if (seedMap.has(ma)) fromSeed++;
    else inferred++;

    count++;
    const sigBlock = sig ? `\n\n${sig}` : "";
    return prefix + beforeP4 + enriched + sigBlock + suffix;
  });

  writeFileSync(CANONICAL_MD, md, "utf8");
  console.log(`Enriched ${count} forms (seed: ${fromSeed}, infer-only: ${inferred}) → ${CANONICAL_MD}`);
}

processFile();
