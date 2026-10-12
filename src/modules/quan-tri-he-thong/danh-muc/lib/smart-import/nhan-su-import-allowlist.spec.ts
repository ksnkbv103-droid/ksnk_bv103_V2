import { describe, expect, it } from "vitest";
import { applyNhanSuImportAllowlist } from "./nhan-su-import-allowlist";

const base = {
  id: "id-1",
  ma_nv: "NV01",
  ho_ten: "Nguyễn Văn A",
  khoa_id: "k1",
  is_active: true,
  updated_at: "2026-10-12T00:00:00Z",
};

describe("applyNhanSuImportAllowlist", () => {
  it("bỏ auth_user_id, vai_tro_he_thong_id và cột lạ; gộp thông tin cá nhân vào extra_data", () => {
    const { payload, notes } = applyNhanSuImportAllowlist(
      {
        ...base,
        auth_user_id: "attacker",
        vai_tro_he_thong_id: "role-admin",
        extra_data: "{}",
        so_dien_thoai: "0900",
        email: "A@BV103.vn",
      },
      undefined,
    );
    expect(payload).not.toHaveProperty("auth_user_id");
    expect(payload).not.toHaveProperty("vai_tro_he_thong_id");
    expect(payload).not.toHaveProperty("so_dien_thoai");
    expect(payload.extra_data).toEqual({ so_dien_thoai: "0900", email: "a@bv103.vn" });
    expect(notes.join(" ")).toContain("vai trò");
  });

  it("hồ sơ đã có tài khoản: giữ is_active, email đăng nhập và khóa nhạy cảm của extra_data", () => {
    const { payload, notes } = applyNhanSuImportAllowlist(
      { ...base, is_active: false, email: "khac@bv103.vn", gioi_tinh: "Nam" },
      {
        auth_user_id: "auth-1",
        is_active: true,
        extra_data: { email: "a@bv103.vn", auth_audit: [{ action: "self_change" }] },
      },
    );
    expect(payload.is_active).toBe(true);
    expect(payload.extra_data).toEqual({
      email: "a@bv103.vn",
      auth_audit: [{ action: "self_change" }],
      gioi_tinh: "Nam",
    });
    expect(notes).toHaveLength(2);
  });

  it("hồ sơ chưa có tài khoản: được ngưng/đổi email qua import", () => {
    const { payload, notes } = applyNhanSuImportAllowlist(
      { ...base, is_active: false, email: "moi@bv103.vn" },
      { auth_user_id: null, is_active: true, extra_data: { email: "cu@bv103.vn" } },
    );
    expect(payload.is_active).toBe(false);
    expect((payload.extra_data as Record<string, unknown>).email).toBe("moi@bv103.vn");
    expect(notes).toEqual([]);
  });
});
