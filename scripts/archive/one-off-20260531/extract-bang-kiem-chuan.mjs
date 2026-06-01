#!/usr/bin/env node
/**
 * Trích xuất nguyên văn 36 bảng kiểm (4 phần) từ SSOT → file chuẩn hóa để hiệu chỉnh.
 * Không sửa nội dung thân form — chỉ bọc metadata + mục lục.
 *
 * Usage: node scripts/extract-bang-kiem-chuan.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const SRC_MD = path.join(repoRoot, "docs/data/bang-kiem/raw-forms-full.md");
const OUT_MD = path.join(repoRoot, "docs/data/bang-kiem/canonical-36.md");
const OUT_REPORT = path.join(repoRoot, "scripts/bang-kiem-chuan-extract-report.json");

/** Mã BM.* theo đúng thứ tự xuất hiện trong thân file (37 lần; lần 19 trùng SUDs). */
const ORDERED_MA_BY_APPEARANCE = [
  "BM.03.03",
  "BM.07.02",
  "BM.07.03",
  "BM.08.01",
  "BM.09.01",
  "BM.10.01",
  "BM.14.01",
  "BM.31.03",
  "BM.17.01",
  "BM.15.01",
  "BM.16.01",
  "BM.18.02",
  "BM.19.01",
  "BM.19.02",
  "BM.20.02",
  "BM.22.04",
  "BM.QĐ.19.03",
  "BM.21.04",
  "BM.QĐ.19.03", // bản lặp trong nguồn (dòng ~1345)
  "BM.25.01",
  "BM.25.03",
  "BM.27.01",
  "BM.27.02",
  "BM.26.01",
  "BM.24.02",
  "BM.11.01",
  "BM.QĐ.12.01",
  "BM.QĐ.20.01",
  "BM.13.01",
  "BM.12.01",
  "BM.QĐ.08.01",
  "BM.QĐ.02.01",
  "BM.QĐ.03.01",
  "BM.QĐ.09.01",
  "BM.QĐ.17.01",
  "BM.QĐ.16.01",
  "BM.QĐ.18.02",
];

function parseCsvLine(line) {
  const parts = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  return parts;
}

function loadCatalog() {
  const raw = readFileSync(SRC_MD, "utf8");
  const catalog = new Map();
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!/^BM\./.test(t) || !t.includes(",")) continue;
    const parts = parseCsvLine(t);
    if (!parts[0]?.startsWith("BM.")) continue;
    const code = parts[0].trim();
    catalog.set(code, {
      ma_bk: code,
      ten_catalog: parts[1]?.trim() || "",
      domain: parts[2]?.trim() || "",
      jci: parts[3]?.trim() || "",
    });
  }
  // BM.19.02 / BM.24.02 có trong DB nhưng thiếu dòng CSV cuối file
  if (!catalog.has("BM.19.02")) {
    catalog.set("BM.19.02", {
      ma_bk: "BM.19.02",
      ten_catalog: "Bảng kiểm giám sát tuân thủ kiểm tra và bảo dưỡng dụng cụ phẫu thuật",
      domain: "Tái xử lý dụng cụ (CSSD)",
      jci: "PCI.03.00",
    });
  }
  if (!catalog.has("BM.24.02")) {
    catalog.set("BM.24.02", {
      ma_bk: "BM.24.02",
      ten_catalog: "Bảng kiểm giám sát tuân thủ gói phòng ngừa nhiễm khuẩn vết mổ (SSI)",
      domain: "Gói can thiệp lâm sàng (Care Bundles)",
      jci: "PCI.02.00 ME 3",
    });
  }
  return catalog;
}

function stripMdTitle(s) {
  return String(s || "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/\\-/g, "-")
    .trim();
}

function validateFormBody(body, lineStart) {
  const issues = [];
  for (const part of ["PHẦN 1", "PHẦN 2", "PHẦN 3", "PHẦN 4"]) {
    if (!body.includes(`**${part}`)) issues.push(`Thiếu ${part}`);
  }
  if (!/Chữ ký/i.test(body)) issues.push("Thiếu dòng Chữ ký");
  return issues.map((m) => ({ line: lineStart + 1, message: m }));
}

function extractForms() {
  const raw = readFileSync(SRC_MD, "utf8");
  const lines = raw.split("\n");
  const endIdx = lines.findIndex((l) => /^\*\*BẢN XÁC THỰC/i.test(l.trim()));
  const scanUntil = endIdx >= 0 ? endIdx : lines.length;

  const titleLines = [];
  for (let i = 0; i < scanUntil; i++) {
    // Chỉ tiêu đề form in hoa: **BẢNG KIỂM ...** (bỏ dòng phụ **Bảng Kiểm ...** giữa các mẫu)
    if (/^\*\*BẢNG KIỂM /.test(lines[i])) titleLines.push(i);
  }

  if (titleLines.length !== ORDERED_MA_BY_APPEARANCE.length) {
    throw new Error(
      `Số form trong nguồn (${titleLines.length}) ≠ danh sách mã (${ORDERED_MA_BY_APPEARANCE.length}). Cần cập nhật ORDERED_MA_BY_APPEARANCE.`,
    );
  }

  const forms = [];
  const seenMa = new Set();
  const skipped = [];

  for (let i = 0; i < titleLines.length; i++) {
    const start = titleLines[i];
    const end = i + 1 < titleLines.length ? titleLines[i + 1] : scanUntil;
    let chunk = lines.slice(start, end);

    // Dừng ngay sau dòng Chữ ký — không kéo tiêu đề phụ / phân cách giữa hai mẫu trong nguồn
    let cutAt = chunk.length;
    for (let j = 0; j < chunk.length; j++) {
      if (/^\*\*Chữ ký/i.test(chunk[j])) {
        cutAt = j + 1;
        break;
      }
    }
    chunk = chunk.slice(0, cutAt);

    const body = chunk.join("\n").trimEnd();
    const lineEnd = start + chunk.length;
    const titleLine = lines[start];
    const ten_trong_form = stripMdTitle(titleLine);
    const ma_bk = ORDERED_MA_BY_APPEARANCE[i];

    if (seenMa.has(ma_bk)) {
      skipped.push({
        ma_bk,
        dong_nguon: `${start + 1}-${end}`,
        ly_do: "Trùng mã với bản trước trong file nguồn (SUDs)",
      });
      continue;
    }
    seenMa.add(ma_bk);

    const issues = validateFormBody(body, start);
    forms.push({
      stt: forms.length + 1,
      ma_bk,
      ten_trong_form,
      dong_nguon: `${start + 1}-${lineEnd}`,
      body,
      issues,
    });
  }

  return { forms, skipped, source_line_count: scanUntil };
}

function yamlQuote(s) {
  return JSON.stringify(String(s ?? ""));
}

function buildOutput(forms, catalog, skipped) {
  const today = new Date().toISOString().slice(0, 10);
  const out = [];

  out.push("# Danh mục bảng kiểm chuẩn — Giám sát tuân thủ KSNK (4 phần)");
  out.push("");
  out.push("> **Nguồn trích xuất:** `docs/data/bang-kiem/raw-forms-full.md` (thân form, dòng 5–2706).");
  out.push(`> **Tạo tự động:** ${today} — ` + "`node scripts/extract-bang-kiem-chuan.mjs`");
  out.push("> **Số mẫu:** 36 bảng kiểm (bỏ 1 bản trùng SUDs trong file nguồn).");
  out.push("> **Quy ước:** Mỗi mẫu = metadata YAML + nội dung form **giữ nguyên** từ nguồn.");
  out.push("");
  out.push("## Mục lục");
  out.push("");
  out.push("| STT | Mã | Tên (trong form) | Dòng nguồn |");
  out.push("| --- | --- | --- | --- |");
  for (const f of forms) {
    const anchor = f.ma_bk.replace(/\./g, "").replace(/Đ/g, "D");
    out.push(
      `| ${f.stt} | [${f.ma_bk}](#${anchor}) | ${f.ten_trong_form.replace(/\|/g, "\\|")} | ${f.dong_nguon} |`,
    );
  }
  out.push("");
  if (skipped.length) {
    out.push("### Bản lặp đã bỏ qua (chỉ có trong file nguồn)");
    for (const s of skipped) {
      out.push(`- **${s.ma_bk}** — dòng ${s.dong_nguon}: ${s.ly_do}`);
    }
    out.push("");
  }
  out.push("---");
  out.push("");

  for (const f of forms) {
    const cat = catalog.get(f.ma_bk) || {};
    out.push("<!-- BANG_KIEM_START -->");
    out.push("```yaml");
    out.push("loai: bang_kiem_giam_sat");
    out.push(`ma_bk: ${f.ma_bk}`);
    out.push(`stt: ${f.stt}`);
    out.push(`ten_trong_form: ${yamlQuote(f.ten_trong_form)}`);
    out.push(`ten_catalog: ${yamlQuote(cat.ten_catalog || "")}`);
    out.push(`domain: ${yamlQuote(cat.domain || "")}`);
    out.push(`jci_mapped: ${yamlQuote(cat.jci || "")}`);
    out.push(`dong_nguon: ${yamlQuote(f.dong_nguon)}`);
    out.push("phien_ban_form: 1");
    out.push("so_phan: 4");
    out.push("```");
    out.push("");
    out.push(`## ${f.ma_bk}`);
    out.push("");
    out.push(f.body);
    out.push("");
    out.push("---");
    out.push("");
    out.push("<!-- BANG_KIEM_END -->");
    out.push("");
  }

  return out.join("\n");
}

function main() {
  const catalog = loadCatalog();
  const { forms, skipped, source_line_count } = extractForms();
  const allIssues = forms.flatMap((f) => f.issues.map((i) => ({ ma_bk: f.ma_bk, ...i })));

  if (allIssues.length) {
    console.error("Validation failed:", allIssues);
    process.exit(1);
  }

  const rawLines = readFileSync(SRC_MD, "utf8").split("\n");
  const fidelityErrors = [];
  for (const f of forms) {
    const [a, b] = f.dong_nguon.split("-").map(Number);
    const expected = rawLines.slice(a - 1, b).join("\n").trimEnd();
    if (expected !== f.body) {
      fidelityErrors.push({ ma_bk: f.ma_bk, expected_len: expected.length, actual_len: f.body.length });
    }
  }
  if (fidelityErrors.length) {
    console.error("Fidelity check failed (body ≠ slice nguồn):", fidelityErrors);
    process.exit(1);
  }

  const md = buildOutput(forms, catalog, skipped);
  writeFileSync(OUT_MD, md, "utf8");

  const report = {
    generated_at: new Date().toISOString(),
    source: "docs/data/bang-kiem/raw-forms-full.md",
    output: "docs/data/bang-kiem/canonical-36.md",
    forms_in_source: ORDERED_MA_BY_APPEARANCE.length,
    forms_written: forms.length,
    skipped_duplicates: skipped,
    source_scanned_lines: source_line_count,
    forms: forms.map((f) => ({
      stt: f.stt,
      ma_bk: f.ma_bk,
      ten_trong_form: f.ten_trong_form,
      dong_nguon: f.dong_nguon,
      body_chars: f.body.length,
    })),
  };
  writeFileSync(OUT_REPORT, JSON.stringify(report, null, 2), "utf8");

  console.log(`Wrote ${forms.length} forms → ${OUT_MD}`);
  console.log(`Report → ${OUT_REPORT}`);
  console.log("Chạy tiếp: node scripts/enrich-bang-kiem-act-codes.mjs để gắn [ACT-xxx] Phần 4");
}

main();
