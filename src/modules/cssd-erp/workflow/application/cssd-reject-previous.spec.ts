import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeRejectToPreviousStation } from "./cssd-workflow-application";

/** CSSD-006: trả lui = một RPC nguyên tử, không ghi rời từng bước. */
function fakeSupabase(rpcResult: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  const from = vi.fn(() => {
    throw new Error("không được truy vấn bảng trực tiếp");
  });
  return { client: { rpc, from } as unknown as SupabaseClient, rpc, from };
}

const base = {
  maQR: "qr-1",
  quyTrinh: { id: "qt-1", ma_trang_thai_hien_tai: "DONG_GOI", is_dong_bang: false },
  hasDongBangColumn: true,
  lyDo: "  sai bộ ",
  operatorLabel: "a@b.vn",
  actorUserId: "u-1",
};

describe("executeRejectToPreviousStation", () => {
  it("gọi đúng một RPC nguyên tử với tham số chuẩn hóa", async () => {
    const { client, rpc, from } = fakeSupabase({ data: { success: true }, error: null });
    await expect(executeRejectToPreviousStation(client, base)).resolves.toEqual({ from: "DONG_GOI", to: "QC" });
    expect(from).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("rpc_cssd_tra_lui_mot_buoc", {
      p_quy_trinh_id: "qt-1",
      p_tu_tram: "DONG_GOI",
      p_ly_do: "sai bộ",
      p_actor_user_id: "u-1",
      p_nguoi_thao_tac: "a@b.vn",
      p_ma_qr: "QR-1",
    });
  });

  it("RPC từ chối (đổi trạm) → ném đúng thông báo", async () => {
    const { client } = fakeSupabase({
      data: { success: false, message: "Bộ đã đổi trạm — không trả lui." },
      error: null,
    });
    await expect(executeRejectToPreviousStation(client, base)).rejects.toThrow("Bộ đã đổi trạm — không trả lui.");
  });

  it("lỗi hệ thống từ RPC → tiền tố «Lỗi hệ thống»", async () => {
    const { client } = fakeSupabase({ data: null, error: { message: "boom" } });
    await expect(executeRejectToPreviousStation(client, base)).rejects.toThrow("Lỗi hệ thống: boom");
  });

  it("chặn trước RPC: Tiệt khuẩn, khóa an toàn, thiếu lý do", async () => {
    const { client, rpc } = fakeSupabase({ data: { success: true }, error: null });
    await expect(
      executeRejectToPreviousStation(client, { ...base, quyTrinh: { ...base.quyTrinh, ma_trang_thai_hien_tai: "TIET_KHUAN" } }),
    ).rejects.toThrow(/Tiệt khuẩn/);
    await expect(
      executeRejectToPreviousStation(client, { ...base, quyTrinh: { ...base.quyTrinh, is_dong_bang: true } }),
    ).rejects.toThrow("Đang khóa an toàn — không trả lui thủ công.");
    await expect(executeRejectToPreviousStation(client, { ...base, lyDo: " " })).rejects.toThrow(
      "Vui lòng nhập lý do trả lui.",
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});
