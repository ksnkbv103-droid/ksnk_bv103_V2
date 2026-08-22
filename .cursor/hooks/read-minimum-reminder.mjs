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
    pattern: /cssd-erp|modules\/cssd|cssd-|tiệt khuẩn|tiet khuan/i,
    context:
      "BV103 CSSD: read-minimum dòng CSSD; rules 12-cssd + 20-master-data-placement; @cssd-pilot nếu pilot.",
  },
  {
    pattern: /dao-tao|đào tạo|dao tao|mcq|ky-thi|ngân hàng câu/i,
    context:
      "BV103 Đào tạo: read-minimum dòng Đào tạo; rule 19-dao-tao-spec-context; docs/modules/dao-tao/README.md.",
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
    pattern:
      /dashboard|bao-cao|báo cáo|thong-ke|thống kê|metric-dictionary|command.center|điều hành/i,
    context:
      "BV103 Dashboard: read-minimum dòng Dashboard; rule 18-dashboard; @dashboard-pilot; metric-dictionary.md.",
  },
  {
    pattern: /bang-kiem|bảng kiểm|modules\/quan-tri-he-thong\/bang-kiem/i,
    context:
      "BV103 Bảng kiểm: read-minimum dòng BK; rule 16-bang-kiem-spec-context.",
  },
  {
    pattern:
      /intake-nv|không rành code|nghiệp vụ|product owner|po-intake/i,
    context:
      "BV103 PO: /intake-nv hoặc @po-intake; agent intake-coach; docs/core/po-cursor-guide.md.",
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
