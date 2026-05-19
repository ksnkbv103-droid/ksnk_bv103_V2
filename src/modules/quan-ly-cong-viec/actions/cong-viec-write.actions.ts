"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { verifyPermission, hasRBACAdminSupervisionBypass } from "@/lib/server-permission";
import { isBoardLaneQuaHan } from "../lib/qlcv-board-lanes";
import { isChoNghiemThuHoanThanh, isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";
import { qlcvWorkflowMaFromViewRow } from "../lib/qlcv-workflow-read";
import { updateCongViecTrangThaiByMa } from "../lib/qlcv-workflow-mutate";

/**
 * Luồng nghiệp vụ (nhận việc, hủy không đạt) — CRUD form dùng `cong-viec.actions` (`createCongViec` / `updateCongViec`).
 */

/**
 * Người phụ trách xác nhận đã nhận nhiệm vụ.
 */
export async function xacNhanDaNhanCongViec(id: string) {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();

  const { data: cur, error: fetchErr } = await supabase
    .from("v_fact_cong_viec_full")
    .select("id, trang_thai, trang_thai_id, is_active, nguoi_phu_trach_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !cur) throw new Error("Không tìm thấy công việc.");

  const st = qlcvWorkflowMaFromViewRow(cur).trang_thai;
  const adminBypass = await hasRBACAdminSupervisionBypass();
  const isAssignee =
    Boolean(actorNhanSuId && cur.nguoi_phu_trach_id) &&
    String(actorNhanSuId) === String(cur.nguoi_phu_trach_id);
  if (!adminBypass && !isAssignee) {
    await verifyPermission("CONG_VIEC", "edit");
  }

  const canAccept =
    st === "CHO_NHAN_VIEC" ||
    (st === "MOI" && cur.is_active && cur.nguoi_phu_trach_id) ||
    (st === "CHUA_BAT_DAU" && cur.is_active && cur.nguoi_phu_trach_id);

  if (!canAccept) {
    throw new Error("Công việc không ở trạng thái chờ nhận nhiệm vụ.");
  }

  const { updated } = await updateCongViecTrangThaiByMa(supabase, {
    id,
    currentTrangThaiId: cur.trang_thai_id ? String(cur.trang_thai_id) : null,
    nextMa: "DANG_LAM",
  });

  if (!updated) {
    throw new Error("Không cập nhật được trạng thái (đã nhận việc trước đó hoặc trạng thái đã đổi).");
  }

  await supabase.from("fact_cong_viec_hoat_dong").insert({
    id_cong_viec: id,
    loai_hoat_dong: "CAP_NHAT",
    nguoi_thuc_hien_id: actorNhanSuId,
    noi_dung: "Đã xác nhận nhận nhiệm vụ",
  });

  revalidatePath("/quan-ly-cong-viec");
  return { success: true as const };
}

/**
 * Đóng phiếu `DA_HUY` khi không đạt (không xóa bản ghi — khác `deleteCongViec`).
 * Áp dụng khi chờ nghiệm thu **hoặc** phiếu còn mở nhưng đã quá hạn (kể cả chưa báo 100%).
 */
export async function huyKhiChoNghiemThuKhongDat(id: string, lyDo: string) {
  await verifyPermission("CONG_VIEC", "edit");
  const supabase = createAdminSupabaseClient();
  const actorNhanSuId = await getActorNhanSuId();
  const reason = lyDo.trim();
  if (!reason) throw new Error("Nhập lý do hủy do không đạt.");

  const { data: cur, error: fetchErr } = await supabase
    .from("v_fact_cong_viec_full")
    .select("id, trang_thai, trang_thai_id, phan_tram_hoan_thanh, han_hoan_thanh, is_qua_han, is_active, nguoi_phu_trach_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !cur) throw new Error("Không tìm thấy công việc.");

  const st = qlcvWorkflowMaFromViewRow(cur).trang_thai;
  const pct = Number(cur.phan_tram_hoan_thanh ?? 0);
  const rowSnapshot = {
    trang_thai: st,
    is_active: cur.is_active,
    nguoi_phu_trach_id: cur.nguoi_phu_trach_id,
    phan_tram_hoan_thanh: cur.phan_tram_hoan_thanh,
    han_hoan_thanh: cur.han_hoan_thanh,
    is_qua_han: cur.is_qua_han,
  };
  const inGate = isChoNghiemThuHoanThanh(rowSnapshot);

  const quaHanCoTheHuy =
    isBoardLaneQuaHan(rowSnapshot) &&
    !isDeXuatChoDuyet(rowSnapshot) &&
    st !== "HOAN_THANH" &&
    st !== "DA_HUY" &&
    !inGate;

  if (!inGate && !quaHanCoTheHuy) {
    throw new Error("Chỉ áp dụng khi việc đang chờ nghiệm thu hoặc đã quá hạn (phiếu chưa đóng).");
  }

  const { data: conChildren, error: chErr } = await supabase
    .from("v_fact_cong_viec_full")
    .select("id, trang_thai, tieu_de")
    .eq("cong_viec_cha_id", id);
  if (chErr) throw new Error("Không kiểm tra được việc con.");
  const chOpen = (conChildren || []).filter((c) => c.trang_thai !== "HOAN_THANH" && c.trang_thai !== "DA_HUY");
  if (chOpen.length > 0) {
    throw new Error(`Còn ${chOpen.length} việc con chưa đóng — không thể hủy công việc cha.`);
  }

  const { updated } = await updateCongViecTrangThaiByMa(supabase, {
    id,
    currentTrangThaiId: cur.trang_thai_id ? String(cur.trang_thai_id) : null,
    nextMa: "DA_HUY",
  });

  if (!updated) throw new Error("Không cập nhật được (trạng thái đã đổi).");

  const noiDung = inGate
    ? `Hủy do không đạt khi nghiệm thu: ${reason}`
    : `Hủy do không đạt (quá hạn, chưa nghiệm thu): ${reason}`;

  await supabase.from("fact_cong_viec_hoat_dong").insert({
    id_cong_viec: id,
    loai_hoat_dong: "CAP_NHAT",
    nguoi_thuc_hien_id: actorNhanSuId,
    noi_dung: noiDung,
    phan_tram_hoan_thanh: pct,
  });

  revalidatePath("/quan-ly-cong-viec");
  return { success: true as const };
}

/**
 * Quét định kỳ và đồng bộ hóa trạng thái quá hạn thực tế vào Database.
 * Tránh trôi lệch trạng thái giữa DB tĩnh và view hiển thị.
 */
export async function syncOverdueTasks() {
  await verifyPermission("CONG_VIEC", "edit");
  const supabase = createAdminSupabaseClient();
  const actor = await getActorNhanSuId();
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Giải quyết các ID trạng thái
  const { data: dmTrangThai, error: tErr } = await supabase
    .from("dm_trang_thai_cong_viec")
    .select("id, ma");
  if (tErr || !dmTrangThai) throw new Error("Không thể truy vấn danh mục trạng thái.");

  const ttMap = new Map(dmTrangThai.map((t) => [t.ma, t.id]));
  const hoanThanhId = ttMap.get("HOAN_THANH");
  const daHuyId = ttMap.get("DA_HUY");
  const quaHanId = ttMap.get("QUA_HAN");

  if (!quaHanId) throw new Error("Không tìm thấy trạng thái QUA_HAN trong danh mục.");

  // Loại trừ các trạng thái đã kết thúc
  const excludedIds = [hoanThanhId, daHuyId, quaHanId].filter(Boolean) as string[];

  // 2. Tìm các công việc quá hạn thực tế nhưng chưa cập nhật sang QUA_HAN trong DB
  let query = supabase
    .from("fact_cong_viec")
    .select("id, tieu_de, han_hoan_thanh, phan_tram_hoan_thanh, trang_thai_id")
    .lt("han_hoan_thanh", todayStr)
    .eq("is_active", true);

  if (excludedIds.length > 0) {
    query = query.not("trang_thai_id", "in", `(${excludedIds.join(",")})`);
  }

  const { data: overdueTasks, error: fetchErr } = await query;
  if (fetchErr) {
    console.error("Lỗi quét công việc quá hạn:", fetchErr);
    throw new Error("Không thể quét công việc quá hạn: " + fetchErr.message);
  }

  if (!overdueTasks || overdueTasks.length === 0) {
    return { success: true, count: 0 };
  }

  let updatedCount = 0;

  // 3. Cập nhật từng công việc sang QUA_HAN và ghi log hoạt động
  for (const task of overdueTasks) {
    const { error: updateErr } = await supabase
      .from("fact_cong_viec")
      .update({
        trang_thai_id: quaHanId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (!updateErr) {
      updatedCount++;
      // Ghi log hoạt động tự động
      await supabase.from("fact_cong_viec_hoat_dong").insert({
        id_cong_viec: task.id,
        loai_hoat_dong: "CAP_NHAT",
        nguoi_thuc_hien_id: actor,
        noi_dung: `Hệ thống tự động đồng bộ trạng thái sang Quá Hạn (Hạn chót: ${task.han_hoan_thanh}).`,
        phan_tram_hoan_thanh: task.phan_tram_hoan_thanh ?? 0,
      });
    } else {
      console.error(`Lỗi cập nhật quá hạn cho task ${task.id}:`, updateErr);
    }
  }

  if (updatedCount > 0) {
    revalidatePath("/quan-ly-cong-viec");
  }

  return { success: true, count: updatedCount };
}
