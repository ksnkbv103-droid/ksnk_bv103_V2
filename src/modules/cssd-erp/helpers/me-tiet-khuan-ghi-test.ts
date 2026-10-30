import type { SupabaseClient } from "@supabase/supabase-js";

/** Loại test khớp rpc_cssd_me_ghi_test (migration 20261030020000). */
export type MeGhiTestLoai = "THONG_SO_VAT_LY" | "CI_NGOAI_GOI" | "CI_PCD" | "BI";

export type MeGhiTestInput = {
  thongSoVatLy: string;
  ciNgoaiGoi: string;
  ciPcd: string;
  trangThaiBi: string;
};

/** Chỉ những test NV đã nhập (DAT/KHONG_DAT; BI chỉ AM/DUONG) — mỗi test một dòng người + giờ. */
export function buildMeGhiTestList(input: MeGhiTestInput): { loai: MeGhiTestLoai; ketQua: string }[] {
  const norm = (v: string) => String(v || "").trim().toUpperCase();
  const out: { loai: MeGhiTestLoai; ketQua: string }[] = [];
  const add = (loai: MeGhiTestLoai, v: string, allowed: string[]) => {
    const kq = norm(v);
    if (allowed.includes(kq)) out.push({ loai, ketQua: kq });
  };
  add("THONG_SO_VAT_LY", input.thongSoVatLy, ["DAT", "KHONG_DAT"]);
  add("CI_NGOAI_GOI", input.ciNgoaiGoi, ["DAT", "KHONG_DAT"]);
  add("CI_PCD", input.ciPcd, ["DAT", "KHONG_DAT"]);
  add("BI", input.trangThaiBi, ["AM", "DUONG"]);
  return out;
}

/**
 * Gọi rpc_cssd_me_ghi_test cho từng test đã nhập. RPC trả {success:false,message} chứ không ném lỗi.
 * `loHong=true` khi có test không đạt → RPC đã đặt mẻ QC_KHONG_DAT («Lô hỏng, cần xem lại»).
 */
export async function ghiCacTestMe(
  client: SupabaseClient,
  args: { meId: string; actorUserId: string; tests: MeGhiTestInput },
): Promise<{ ok: true; loHong: boolean } | { ok: false; message: string }> {
  let loHong = false;
  for (const t of buildMeGhiTestList(args.tests)) {
    const { data, error } = await client.rpc("rpc_cssd_me_ghi_test", {
      p_me_id: args.meId,
      p_loai: t.loai,
      p_ket_qua: t.ketQua,
      p_actor_user_id: args.actorUserId,
    });
    const r = data as { success?: boolean; message?: string; dat?: boolean } | null;
    if (error) return { ok: false, message: error.message };
    if (!r || r.success !== true) return { ok: false, message: r?.message || "Không ghi được kết quả test." };
    if (r.dat === false) loHong = true;
  }
  return { ok: true, loHong };
}
