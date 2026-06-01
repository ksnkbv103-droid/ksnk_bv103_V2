// scripts/cssd-backfill-thanh-phan.ts
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Nạp biến môi trường từ .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Thiếu cấu hình SUPABASE_URL hoặc SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfill() {
  console.log("=== BẮT ĐẦU BACKFILL SỔ CẤU PHẦN RUNTIME ===");

  // 1. Lấy tất cả các quy trình đang hoạt động (chưa hoàn thành)
  const { data: quyTrinhs, error: qtErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("id, bo_dung_cu_id, ma_trang_thai_hien_tai")
    .eq("is_active", true);

  if (qtErr) {
    console.error("Lỗi lấy danh sách quy trình:", qtErr.message);
    process.exit(1);
  }

  console.log(`Tìm thấy ${quyTrinhs?.length || 0} quy trình đang hoạt động.`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const qt of quyTrinhs || []) {
    const boId = String(qt.bo_dung_cu_id || "").trim();
    if (!boId) {
      skipCount++;
      continue;
    }

    // Kiểm tra xem đã có cấu phần chưa
    const { data: existing, error: exErr } = await supabase
      .from("cssd_fact_quy_trinh_thanh_phan")
      .select("id")
      .eq("quy_trinh_id", qt.id)
      .eq("is_active", true)
      .limit(1);

    if (exErr) {
      console.error(`[Quy trình ${qt.id}] Lỗi kiểm tra tồn tại:`, exErr.message);
      failCount++;
      continue;
    }

    if ((existing || []).length > 0) {
      skipCount++;
      continue;
    }

    // Nếu chưa có, tiến hành nạp từ template (dm_bo_dung_cu_chi_tiet)
    console.log(`-> Đang đồng bộ cấu phần cho quy trình ${qt.id} (Bộ: ${boId})...`);

    const { data: lines, error: lErr } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .select("id, ten_dung_cu_le, so_luong")
      .eq("bo_dung_cu_id", boId)
      .eq("is_active", true);

    if (lErr) {
      console.error(`[Quy trình ${qt.id}] Lỗi tải template:`, lErr.message);
      failCount++;
      continue;
    }

    if (!lines || lines.length === 0) {
      console.log(`[Quy trình ${qt.id}] Template rỗng. Bỏ qua.`);
      skipCount++;
      continue;
    }

    const rows = lines.map((ln) => {
      const qty = Number(ln.so_luong ?? 1) || 1;
      return {
        quy_trinh_id: qt.id,
        dm_bo_dung_cu_chi_tiet_id: ln.id,
        ten_dung_cu_le: String(ln.ten_dung_cu_le || "").trim() || "—",
        so_luong_ke_hoach: qty,
        so_luong_thuc_te: qty, // mặc định ban đầu đủ
        is_active: true,
        updated_at: new Date().toISOString(),
      };
    });

    const { error: insErr } = await supabase.from("cssd_fact_quy_trinh_thanh_phan").insert(rows);

    if (insErr) {
      console.error(`[Quy trình ${qt.id}] Lỗi chèn dữ liệu cấu phần:`, insErr.message);
      failCount++;
    } else {
      successCount++;
    }
  }

  console.log("\n=== KẾT QUẢ BACKFILL ===");
  console.log(`Thành công: ${successCount}`);
  console.log(`Bỏ qua (đã có hoặc không có bộ): ${skipCount}`);
  console.log(`Thất bại: ${failCount}`);
}

void backfill();
