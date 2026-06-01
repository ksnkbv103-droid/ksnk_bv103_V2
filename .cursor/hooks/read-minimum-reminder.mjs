#!/usr/bin/env node
/**
 * Nhắc agent đọc READ_MINIMUM khi prompt đụng action/DB/migration.
 * Fail-open: không chặn submit.
 */
const KEYWORDS = /\b(server action|fact_|migration|supabase\/migrations|rpc_|mdm:migrate|verify:engineering)\b/i;

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  try {
    const parsed = JSON.parse(input || "{}");
    const prompt = String(parsed.prompt ?? parsed.user_message ?? parsed.message ?? "");
    if (KEYWORDS.test(prompt)) {
      process.stdout.write(
        JSON.stringify({
          additional_context:
            "BV103: đọc docs/core/read-minimum.md + rule glob module trước khi sửa action/DB.",
        }),
      );
    }
  } catch {
    // fail-open
  }
});
