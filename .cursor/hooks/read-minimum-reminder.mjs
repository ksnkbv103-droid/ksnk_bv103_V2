#!/usr/bin/env node
/**
 * Nhắc agent đọc READ_MINIMUM + rule module khi prompt đụng action/DB/path.
 * Fail-open: không chặn submit.
 */
const ACTION_DB =
  /\b(server action|fact_|migration|supabase\/migrations|rpc_|mdm:migrate|verify:engineering)\b/i;

const MODULE_HINTS = [
  {
    pattern: /giam-sat-vst|giam-sat-chung|modules\/giam-sat/i,
    context:
      "BV103 Giám sát: read-minimum dòng VST/GSC; rule 13-giam-sat; @giam-sat-pilot nếu pilot.",
  },
  {
    pattern: /quan-ly-cong-viec|modules\/qlcv|qlcv_/i,
    context:
      "BV103 QLCV: read-minimum dòng QLCV; rule 14-cong-viec; @qlcv-pilot nếu pilot.",
  },
  {
    pattern: /cssd-erp|modules\/cssd/i,
    context:
      "BV103 CSSD: read-minimum dòng CSSD; rules 12-cssd + 20-master-data-placement.",
  },
  {
    pattern: /giam-sat-nkbv|modules\/nkbv|nkbv_/i,
    context: "BV103 NKBV: read-minimum dòng NKBV; rule 17-nkbv-spec-context.",
  },
  {
    pattern: /quan-tri-he-thong\/danh-muc|mdm_/i,
    context:
      "BV103 MDM: read-minimum dòng MDM; rules 15-danh-muc + 20-master-data-placement.",
  },
  {
    pattern: /supabase\/migrations|\.sql\b/i,
    context:
      "BV103 DB: read-minimum migration; rule 51-database-migration; @smart-db-bv103.",
  },
];

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  try {
    const parsed = JSON.parse(input || "{}");
    const prompt = String(
      parsed.prompt ?? parsed.user_message ?? parsed.message ?? "",
    );
    const hints = [];

    if (ACTION_DB.test(prompt)) {
      hints.push(
        "BV103: đọc docs/core/read-minimum.md + rule glob module trước khi sửa action/DB.",
      );
    }

    for (const { pattern, context } of MODULE_HINTS) {
      if (pattern.test(prompt)) {
        hints.push(context);
      }
    }

    if (hints.length > 0) {
      process.stdout.write(
        JSON.stringify({ additional_context: [...new Set(hints)].join(" ") }),
      );
    }
  } catch {
    // fail-open
  }
});
