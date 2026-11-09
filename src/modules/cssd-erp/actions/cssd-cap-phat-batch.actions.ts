"use server";

import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdWorkflowEdit } from "@/lib/cssd-server-gates";
import { scanQR } from "./cssd-scan.actions";
import {
  CAP_PHAT_BATCH_MAX,
  normalizeCapPhatCodes,
  type CapPhatBatchItem,
} from "../lib/cssd-cap-phat-batch";

const batchSchema = z.object({
  khoaNhanId: z.string().uuid("Chưa chọn nơi nhận."),
  maQrs: z.array(z.string().max(200)).min(1, "Chưa quét bộ nào.").max(CAP_PHAT_BATCH_MAX, `Tối đa ${CAP_PHAT_BATCH_MAX} bộ mỗi lần.`),
  maCaMoId: z.string().trim().max(200).optional().nullable(),
});

/** Nơi nhận = khoa hoặc phòng/bàn mổ (cùng danh mục mdm_dm_khoa_phong). */
export async function listNoiNhanCapPhatAction() {
  try {
    await verifyCssdWorkflowEdit();
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("mdm_dm_khoa_phong")
      .select("id, ma_khoa, ten_khoa")
      .eq("is_active", true)
      .order("ten_khoa")
      .limit(500);
    if (error) {
      console.error({ module: "cssd", action: "listNoiNhanCapPhat", error: error.message });
      throw new Error("Không tải được nơi nhận.");
    }
    return {
      success: true as const,
      data: (data || []).map((r) => ({
        id: String(r.id),
        label: String(r.ten_khoa || r.ma_khoa || "?"),
        maKhoa: String(r.ma_khoa || ""),
      })),
    };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Không tải được nơi nhận.",
      data: [] as Array<{ id: string; label: string; maKhoa: string }>,
    };
  }
}

/**
 * Cấp phát nhiều bộ cho MỘT nơi nhận. Mỗi bộ đi qua `scanQR` (gate mẻ/sổ cấu phần + RPC nguyên tử);
 * bộ lỗi không chặn bộ khác. Tuần tự để không tranh khóa dòng.
 */
export async function capPhatNhieuBoAction(input: {
  khoaNhanId: string;
  maQrs: string[];
  maCaMoId?: string | null;
}): Promise<{ success: true; items: CapPhatBatchItem[] } | { success: false; error: string }> {
  try {
    await verifyCssdWorkflowEdit();
    const parsed = batchSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." };
    const codes = normalizeCapPhatCodes(parsed.data.maQrs);
    if (codes.length === 0) return { success: false, error: "Chưa quét bộ nào." };

    // RPC chỉ kiểm khoa tồn tại, không kiểm is_active → chặn nơi nhận đã ngưng ở đây.
    const { data: khoa, error: khoaErr } = await createAdminSupabaseClient()
      .from("mdm_dm_khoa_phong")
      .select("id")
      .eq("id", parsed.data.khoaNhanId)
      .eq("is_active", true)
      .maybeSingle();
    if (khoaErr) {
      console.error({ module: "cssd", action: "capPhatNhieuBo", error: khoaErr.message });
      return { success: false, error: "Không kiểm tra được nơi nhận." };
    }
    if (!khoa) return { success: false, error: "Nơi nhận không tồn tại hoặc đã ngưng hoạt động." };

    const items: CapPhatBatchItem[] = [];
    for (const maQr of codes) {
      try {
        const res = await scanQR(maQr, "CAP_PHAT", {
          khoa_nhan_id: parsed.data.khoaNhanId,
          ...(parsed.data.maCaMoId ? { ma_ca_mo_id: parsed.data.maCaMoId } : {}),
        });
        items.push({
          maQr,
          ok: true,
          tenBo: String((res as { tenBoDungCu?: string }).tenBoDungCu || maQr),
          quyTrinhId: String((res as { quyTrinhId?: string }).quyTrinhId || ""),
          daCapTruoc: false,
        });
      } catch (e: unknown) {
        items.push({ maQr, ok: false, error: e instanceof Error ? e.message : "Lỗi cấp phát." });
      }
    }
    return { success: true, items };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Lỗi cấp phát." };
  }
}
