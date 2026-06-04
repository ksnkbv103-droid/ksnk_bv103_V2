#!/usr/bin/env npx tsx
/**
 * Onboarding hàng loạt: gán mọi nhân sự đang hoạt động về khoa KSNK, đặt mật khẩu Auth (nếu đã có tài khoản),
 * gán vai trò RBAC `NHAN_VIEN_KSNK` (hoặc biến môi trường).
 *
 * CẢNH BÁO BẢO MẬT: chỉ chạy trên môi trường pilot / nội bộ; sau chạy bắt buộc nhân viên đổi mật khẩu
 * (`/tai-khoan/doi-mat-khau`). Không commit mật khẩu vào git — truyền qua env hoặc `--password` một lần.
 *
 * Biến môi trường:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Tuỳ chọn:
 *   BULK_KSNK_PASSWORD_MODE=shared|per_name
 *     shared  → mọi người cùng BULK_INITIAL_PASSWORD (mặc định, đúng yêu cầu "một mật khẩu ban đầu giống nhau")
 *     per_name → mật khẩu = chuỗi từ họ tên (bỏ dấu) + "_" + ma_nv + hậu tố cố định (≥ 8 ký tự, mỗi người khác nhau)
 *   BULK_INITIAL_PASSWORD   (bắt buộc khi MODE=shared và không --dry-run)
 *   BULK_KSNK_ROLE_NAME     (mặc định NHAN_VIEN_KSNK)
 *
 * Chạy:
 *   npx tsx scripts/bulk-ksnk-staff-onboarding.ts --dry-run
 *   BULK_INITIAL_PASSWORD='MatKhauChung8!' npx tsx scripts/bulk-ksnk-staff-onboarding.ts
 *   BULK_KSNK_PASSWORD_MODE=per_name npx tsx scripts/bulk-ksnk-staff-onboarding.ts
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const mode = (process.env.BULK_KSNK_PASSWORD_MODE || "shared").toLowerCase() as "shared" | "per_name";
const roleName = (process.env.BULK_KSNK_ROLE_NAME || "NHAN_VIEN_KSNK").trim();
const dryRun = process.argv.includes("--dry-run");
const pwArg = process.argv.find((a) => a.startsWith("--password="))?.split("=", 2)[1];
const sharedPw = (pwArg || process.env.BULK_INITIAL_PASSWORD || "").trim();

function stripAccents(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d");
}

function buildPerNamePassword(hoTen: string, maNv: string): string {
  const core = stripAccents(hoTen).replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
  const nv = String(maNv || "X").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  const p = `${core || "nhanvien"}_${nv}KsnkBv103!`;
  return p.slice(0, 72);
}

type KhoaRow = { id?: string; ma_khoa?: string; ten_khoa?: string };

async function resolveKsnkKhoaId(sb: SupabaseClient): Promise<string | null> {
  const { data: rows, error } = await sb
    .from("mdm_dm_khoa_phong")
    .select("id, ma_khoa, ten_khoa")
    .eq("is_active", true);
  if (error) throw error;
  const list = (rows || []) as KhoaRow[];
  const byCode = list.find((r) => {
    const m = String(r.ma_khoa || "").toUpperCase();
    return m === "KSNK" || m === "C18";
  });
  if (byCode?.id) return String(byCode.id);
  const byName = list.find((r) =>
    /kiểm soát nhiễm khuẩn|kiem soat nhiem khuan/i.test(String(r.ten_khoa || "")),
  );
  if (byName?.id) return String(byName.id);
  return null;
}

async function main() {
  if (!url || !serviceKey) {
    console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  if (!dryRun && mode === "shared" && sharedPw.length < 8) {
    console.error("MODE=shared cần BULK_INITIAL_PASSWORD hoặc --password=... (tối thiểu 8 ký tự).");
    process.exit(1);
  }

  const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const khoaId = await resolveKsnkKhoaId(sb);
  if (!khoaId) {
    console.error("Không tìm được mdm_dm_khoa_phong KSNK (ma_khoa KSNK/C18 hoặc tên chứa Kiểm soát nhiễm khuẩn).");
    process.exit(1);
  }
  console.log(`[info] khoa KSNK id: ${khoaId}  dryRun=${dryRun}  mode=${mode}  role=${roleName}`);

  const { data: staff, error: staffErr } = await sb
    .from("mdm_nhan_su")
    .select("id, ho_ten, ma_nv, email, auth_user_id, is_active, khoa_id")
    .eq("is_active", true);
  if (staffErr) throw staffErr;

  const rows = staff || [];
  let updatedKhoa = 0;
  let updatedPw = 0;
  let assignedRole = 0;
  let skippedNoAuth = 0;
  let errors = 0;

  for (const r of rows) {
    const id = String(r.id);
    const authId = r.auth_user_id ? String(r.auth_user_id) : "";

    if (String(r.khoa_id || "") !== khoaId) {
      if (!dryRun) {
        const { error } = await sb
          .from("mdm_nhan_su")
          .update({ khoa_id: khoaId, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) {
          console.error(`[khoa] ${r.ma_nv} ${id}:`, error.message);
          errors++;
        } else updatedKhoa++;
      } else updatedKhoa++;
    }

    const pw =
      mode === "shared"
        ? sharedPw
        : buildPerNamePassword(String(r.ho_ten || ""), String(r.ma_nv || ""));
    if (pw.length < 8) {
      console.error(`[pw] Bỏ qua ${r.ma_nv}: mật khẩu quá ngắn`);
      errors++;
      continue;
    }

    if (!authId) {
      skippedNoAuth++;
      continue;
    }

    if (!dryRun) {
      const { error: uErr } = await sb.auth.admin.updateUserById(authId, { password: pw });
      if (uErr) {
        console.error(`[auth] ${r.ma_nv}:`, uErr.message);
        errors++;
        continue;
      }
      updatedPw++;

      const { data: rpcData, error: rpcErr } = await sb.rpc("rpc_assign_staff_ksnk_role", {
        p_staff_id: id,
        p_role_name: roleName,
      });
      if (rpcErr) {
        console.error(`[rbac] ${r.ma_nv}:`, rpcErr.message);
        errors++;
      } else if (rpcData && typeof rpcData === "object" && "success" in rpcData && !(rpcData as { success: boolean }).success) {
        console.error(`[rbac] ${r.ma_nv}:`, (rpcData as { error?: string }).error || JSON.stringify(rpcData));
        errors++;
      } else assignedRole++;
    } else {
      updatedPw++;
      assignedRole++;
    }
  }

  console.log("--- Kết quả ---");
  console.log(`Nhân sự active: ${rows.length}`);
  console.log(`Cập nhật khoa_id → KSNK: ${updatedKhoa}${dryRun ? " (dry-run)" : ""}`);
  console.log(`Đổi mật khẩu Auth (có auth_user_id): ${updatedPw}${dryRun ? " (dry-run)" : ""}`);
  console.log(`Gán vai trò ${roleName}: ${assignedRole}${dryRun ? " (dry-run)" : ""}`);
  console.log(`Bỏ qua (chưa có tài khoản Auth — cần cấp trên UI Tài khoản nhân sự): ${skippedNoAuth}`);
  console.log(`Lỗi: ${errors}`);
  if (skippedNoAuth > 0) {
    console.log("\nGợi ý: vào /quan-tri-he-thong/tai-khoan-nhan-su để provision từng người thiếu email/auth.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
