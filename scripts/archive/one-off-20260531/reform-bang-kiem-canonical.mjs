#!/usr/bin/env node
/**
 * Chuẩn hóa BANG_KIEM_CHUAN_4_PHAN.md + sinh migration Part 3–4 gọn:
 * - Bỏ mã [101-SYS]/[ACT-xxx] và [ ] khỏi nội dung hiển thị (chuyển vào YAML)
 * - Nguyên nhân: nhãn ngắn từ lookup, sắp theo mã
 * - Hành động: 1 mã ACT / bảng kiểm (theo ngữ cảnh)
 *
 * Usage: node scripts/reform-bang-kiem-canonical.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const CANONICAL = path.join(repoRoot, "docs/data/bang-kiem/canonical-36.md");
const OUT_SQL = path.join(
  repoRoot,
  "supabase/migrations/20260528000011_gstt_canonical_part34_slim.sql",
);

/** Nhãn ngắn — khớp sys_lookup_value NGUYEN_NHAN_LOI (name). */
const LOOKUP_SHORT = {
  "101_SYS": "Thiếu vật tư / thiết bị",
  "102_SYS": "Thiết kế môi trường bất hợp lý",
  "103_SYS": "Quá tải công việc / nhân sự",
  "104_SYS": "Lỗi thiết bị / hỏng hóc",
  "105_SYS": "Lỗ hổng quy trình",
  "106_SYS": "Giao tiếp / bàn giao kém",
  "201_HUM": "Kỹ năng / đào tạo chưa đạt",
  "202_HUM": "Nhận thức sai (at-risk)",
  "203_HUM": "Thói quen đi tắt",
  "204_HUM": "Mất tập trung / quên",
  "205_HUM": "Hành vi liều lĩnh",
  "206_HUM": "Quy trình phức tạp",
  "207_HUM": "Sức khỏe nghề nghiệp",
  "301_CLI": "Cấp cứu khẩn cấp",
  "302_CLI": "Hành vi / tâm lý người bệnh",
  "304_CLI": "Giải phẫu / bệnh lý đặc thù",
};

const ACT_SHORT = {
  "ACT-100": "Nhắc nhở / hướng dẫn lại tại chỗ",
  "ACT-200": "Yêu cầu khắc phục ngay tại chỗ",
  "ACT-300": "Ghi nhận thiếu vật tư — đề xuất bổ sung",
  "ACT-400": "Đình chỉ hoạt động (Stop the line)",
  "ACT-500": "Lập biên bản / báo cáo sự cố",
};

/** Một mã ACT duy nhất / bảng kiểm — theo ngữ cảnh nghiệp vụ. */
const ACT_BY_MA = {
  "BM.03.03": "ACT-400",
  "BM.07.02": "ACT-100",
  "BM.07.03": "ACT-400",
  "BM.08.01": "ACT-100",
  "BM.09.01": "ACT-200",
  "BM.10.01": "ACT-500",
  "BM.14.01": "ACT-200",
  "BM.31.03": "ACT-200",
  "BM.17.01": "ACT-100",
  "BM.15.01": "ACT-200",
  "BM.16.01": "ACT-200",
  "BM.18.02": "ACT-200",
  "BM.19.01": "ACT-100",
  "BM.19.02": "ACT-200",
  "BM.20.02": "ACT-400",
  "BM.22.04": "ACT-400",
  "BM.QĐ.19.03": "ACT-400",
  "BM.21.04": "ACT-200",
  "BM.25.01": "ACT-300",
  "BM.25.03": "ACT-400",
  "BM.27.01": "ACT-400",
  "BM.27.02": "ACT-300",
  "BM.26.01": "ACT-200",
  "BM.24.02": "ACT-200",
  "BM.11.01": "ACT-400",
  "BM.QĐ.12.01": "ACT-200",
  "BM.QĐ.20.01": "ACT-300",
  "BM.13.01": "ACT-200",
  "BM.12.01": "ACT-200",
  "BM.QĐ.08.01": "ACT-400",
  "BM.QĐ.02.01": "ACT-200",
  "BM.QĐ.03.01": "ACT-200",
  "BM.QĐ.09.01": "ACT-200",
  "BM.QĐ.17.01": "ACT-200",
  "BM.QĐ.16.01": "ACT-200",
  "BM.QĐ.18.02": "ACT-400",
};

function stripMd(s) {
  return String(s || "")
    .replace(/\\([_\\[\]()])/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

function parseReasonCodes(body, yaml) {
  const fromYaml = yaml.match(/^nguyen_nhan:\s*\[(.+)\]/m);
  if (fromYaml) {
    return fromYaml[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .sort((a, b) => {
        const na = Number(a.split("_")[0]);
        const nb = Number(b.split("_")[0]);
        return na - nb || a.localeCompare(b);
      });
  }
  const p3 = body.split(/\*\*PHẦN 3/i)[1]?.split(/\*\*PHẦN 4/i)[0] || "";
  const codes = [];
  for (const line of p3.split("\n")) {
    const m = line.match(/\\?\[(\d{3})-(SYS|HUM|CLI)\\?\]/i);
    if (!m) continue;
    const code = `${m[1]}_${m[2].toUpperCase()}`;
    if (!codes.includes(code)) codes.push(code);
  }
  codes.sort((a, b) => {
    const na = Number(a.split("_")[0]);
    const nb = Number(b.split("_")[0]);
    return na - nb || a.localeCompare(b);
  });
  return codes;
}

function cleanCriterionText(text) {
  let t = stripMd(text);
  t = t.replace(/\s*\|\s*\\?\[\s*\\?\]\s*(\|\s*\\?\[\s*\\?\]\s*)*$/g, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function rebuildPart3(reasonCodes) {
  const lines = [
    "**PHẦN 3: NGUYÊN NHÂN**",
    "",
    "*(Chọn một hoặc nhiều — nhãn ngắn; mã lookup lưu ở metadata YAML)*",
    "",
  ];
  let lastGroup = "";
  for (const code of reasonCodes) {
    const prefix = code.startsWith("10") ? "HE_THONG" : code.startsWith("20") ? "CON_NGUOI" : "LAM_SANG";
    const groupLabel =
      prefix === "HE_THONG"
        ? "**NHÓM 1: HỆ THỐNG & MÔI TRƯỜNG**"
        : prefix === "CON_NGUOI"
          ? "**NHÓM 2: CON NGƯỜI**"
          : "**NHÓM 3: LÂM SÀNG / NGƯỜI BỆNH**";
    if (groupLabel !== lastGroup) {
      if (lastGroup) lines.push("");
      lines.push(groupLabel, "");
      lastGroup = groupLabel;
    }
    const label = LOOKUP_SHORT[code] || code;
    lines.push(`* ${label}`);
  }
  lines.push("");
  return lines.join("\n");
}

function rebuildPart4(actCode) {
  const label = ACT_SHORT[actCode] || actCode;
  return [
    "**PHẦN 4: HÀNH ĐỘNG KHẮC PHỤC**",
    "",
    "*(Một mã ACT / bảng kiểm — tick khi đã can thiệp)*",
    "",
    `* ${label}`,
    "",
  ].join("\n");
}

function updateYamlBlock(yaml, reasonCodes, actCode) {
  const lines = yaml.trimEnd().split("\n");
  const filtered = lines.filter(
    (l) => !/^(nguyen_nhan|act_mac_dinh):/.test(l.trim()),
  );
  filtered.push(`nguyen_nhan: [${reasonCodes.join(", ")}]`);
  filtered.push(`act_mac_dinh: ${actCode}`);
  return filtered.join("\n");
}

function cleanPart2Table(body) {
  const parts = body.split(/\*\*PHẦN 2:/i);
  if (parts.length < 2) return body;
  const before = parts[0];
  const rest = parts[1];
  const afterP2 = rest.split(/\*\*PHẦN 3/i);
  let p2 = afterP2[0];
  const after = afterP2.slice(1).join("**PHẦN 3");

  let prevRow = "";
  p2 = p2
    .split("\n")
    .map((line) => {
      if (!line.trim().startsWith("|")) return line;
      const cells = line.split("|").map((c) => c.trim());
      if (cells.length < 2) return line;
      const first = cells[1] ?? "";
      if (/^-+$/.test(first.replace(/\s/g, ""))) return null;
      if (/^(\d+)\\?\./.test(first)) {
        const m = first.match(/^(\d+)\\?\.\s*(.+)$/);
        if (m) return `| ${m[1]}. ${cleanCriterionText(m[2])} |`;
      }
      if (first.startsWith("**") && !first.includes("-----")) {
        return `| ${stripMd(first)} |`;
      }
      if (/^tiêu chí/i.test(first)) return "| Tiêu chí |";
      return line;
    })
    .filter((line) => {
      if (!line) return false;
      if (line === prevRow) return false;
      prevRow = line;
      return true;
    })
    .join("\n");

  p2 = p2.replace(
    /\*\*Kết luận Phần 2:\*\*[^\n]*/g,
    "**Kết luận Phần 2:** Tỉ lệ đạt ___ % *(Có tiêu chí không đạt → điền Phần 3–4)*",
  );

  return `${before}**PHẦN 2:${p2}\n\n**PHẦN 3${after}`;
}

function sqlJsonb(obj) {
  return `$jsonb$${JSON.stringify(obj)}$jsonb$::jsonb`;
}

function buildAllowlistUpdate(ma, reasonCodes) {
  const entries = reasonCodes.map((code, i) => ({
    lookup_code: code,
    ten_hien_thi: LOOKUP_SHORT[code] || code,
    thu_tu_hien_thi: i + 1,
  }));
  return `-- ${ma} allowlist (${entries.length} nguyên nhân)
update public.gstt_dm_bang_kiem bk set
  nguyen_nhan_cho_phep_jsonb = coalesce(
    (select jsonb_agg(
      jsonb_build_object(
        'lookup_id', l.id::text,
        'lookup_code', l.code,
        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),
        'mo_ta_chi_tiet', null,
        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int
      ) order by (e->>'thu_tu_hien_thi')::int
    ) from jsonb_array_elements(${sqlJsonb(entries)}) e
    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code'),
    '[]'::jsonb)
where bk.ma_bk = '${ma}';

update public.gstt_dm_bang_kiem bk set
  hanh_dong_khac_phuc_jsonb = ${sqlJsonb([
    {
      stt: 1,
      noi_dung: ACT_SHORT[ACT_BY_MA[ma]] || "Yêu cầu khắc phục ngay tại chỗ",
      action_code: ACT_BY_MA[ma] || "ACT-200",
      la_stop_the_line: (ACT_BY_MA[ma] || "ACT-200") === "ACT-400",
    },
  ])}
where bk.ma_bk = '${ma}';
`;
}

function main() {
  const md = readFileSync(CANONICAL, "utf8");
  const re =
    /(<!-- BANG_KIEM_START -->\n)```yaml\n([\s\S]*?)```\n\n## ([^\n]+)\n\n([\s\S]*?)\n\n---\n\n(<!-- BANG_KIEM_END -->)/g;

  const sqlParts = [
    "-- 20260528000011_gstt_canonical_part34_slim.sql",
    "-- Part 3–4 gọn: 1 ACT/bảng kiểm, nguyên nhân nhãn ngắn, sắp theo mã lookup",
    "-- SSOT: docs/data/bang-kiem/canonical-36.md (reform-bang-kiem-canonical.mjs)",
    "begin;",
    "",
  ];

  let count = 0;
  const newMd = md.replace(re, (_full, start, yaml, maBk, body, end) => {
    const ma = maBk.trim();
    const reasonCodes = parseReasonCodes(body, yaml);
    const actFromYaml = yaml.match(/^act_mac_dinh:\s*(ACT-\d{3})/m);
    const actCode = actFromYaml?.[1] || ACT_BY_MA[ma] || "ACT-200";
    if (reasonCodes.length === 0) {
      console.warn(`WARN ${ma}: không parse được nguyên nhân`);
    }

    let cleanedBody = cleanPart2Table(body);
    const p3Idx = cleanedBody.search(/\*\*PHẦN 3/i);
    const sigIdx = cleanedBody.search(/\n\*\*Chữ ký/i);
    if (p3Idx >= 0 && sigIdx >= 0) {
      const head = cleanedBody.slice(0, p3Idx).trimEnd() + "\n\n";
      const tail = cleanedBody.slice(sigIdx);
      cleanedBody = head + rebuildPart3(reasonCodes) + rebuildPart4(actCode) + tail;
    }

    const newYaml = updateYamlBlock(yaml, reasonCodes, actCode);
    sqlParts.push(buildAllowlistUpdate(ma, reasonCodes));
    count++;
    return `${start}\`\`\`yaml\n${newYaml}\n\`\`\`\n\n## ${ma}\n\n${cleanedBody}\n\n---\n\n${end}`;
  });

  sqlParts.push("notify pgrst, 'reload schema';", "", "commit;", "", `-- ${count} templates`);

  writeFileSync(CANONICAL, newMd, "utf8");
  writeFileSync(OUT_SQL, sqlParts.join("\n"), "utf8");
  console.log(`Reformed ${count} forms → ${CANONICAL}`);
  console.log(`Wrote ${OUT_SQL}`);
}

main();
