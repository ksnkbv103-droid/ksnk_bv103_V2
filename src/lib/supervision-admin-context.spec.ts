import { describe, expect, it } from "vitest";
import {
  buildContinueAdminSession,
  buildFreshAdminSession,
  mergeStickyIntoSession,
  pickAdminContext,
  resolveDefaultKhoaId,
  stickyStorageKey,
} from "./supervision-admin-context";
import type { GiamSatSession } from "@/components/shared/giam-sat-header.types";

const baseSession = (): GiamSatSession => ({
  khoa_id: "k1",
  khu_vuc_id: "kv1",
  vi_tri: "P201",
  cach_thuc_id: "ct1",
  cach_thuc_giam_sat: "Giám sát trực tiếp tại chỗ",
  hinh_thuc_giam_sat: "Tự giám sát",
  nguoi_giam_sat_id: "nv1",
  ngay_giam_sat: "2026-08-01",
  thoi_gian_bat_dau: "2026-08-01T08:00:00.000Z",
  thoi_gian_ket_thuc: "2026-08-01T09:00:00.000Z",
  is_giam_sat_ca_nhan: true,
  nghe_nghiep_id: "nn1",
  nhan_vien_id: "staff1",
  ghi_chu_chung: "note",
});

describe("resolveDefaultKhoaId", () => {
  it("ưu tiên khoa mạng lưới", () => {
    expect(
      resolveDefaultKhoaId({
        isMangLuoi: true,
        actorKhoaId: "mine",
        khoas: [{ id: "a" }, { id: "b" }],
      }),
    ).toBe("mine");
  });

  it("một khoa trong danh sách → chọn luôn", () => {
    expect(
      resolveDefaultKhoaId({
        isMangLuoi: false,
        actorKhoaId: null,
        khoas: [{ id: "only" }],
      }),
    ).toBe("only");
  });

  it("nhiều khoa không mạng lưới → trống", () => {
    expect(
      resolveDefaultKhoaId({
        isMangLuoi: false,
        actorKhoaId: null,
        khoas: [{ id: "a" }, { id: "b" }],
      }),
    ).toBe("");
  });
});

describe("buildContinueAdminSession", () => {
  it("giữ hành chính, reset ngày/giờ và đối tượng khi keepSubjects=false", () => {
    const next = buildContinueAdminSession(baseSession(), { keepSubjects: false });
    expect(next.khoa_id).toBe("k1");
    expect(next.khu_vuc_id).toBe("kv1");
    expect(next.vi_tri).toBe("P201");
    expect(next.cach_thuc_id).toBe("ct1");
    expect(next.thoi_gian_bat_dau).toBe("");
    expect(next.thoi_gian_ket_thuc).toBe("");
    expect(next.ghi_chu_chung).toBe("");
    expect(next.is_giam_sat_ca_nhan).toBe(false);
    expect(next.nhan_vien_id).toBe("");
    expect(next.ngay_giam_sat).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("giữ đối tượng khi keepSubjects=true", () => {
    const next = buildContinueAdminSession(baseSession(), { keepSubjects: true });
    expect(next.is_giam_sat_ca_nhan).toBe(true);
    expect(next.nhan_vien_id).toBe("staff1");
    expect(next.nghe_nghiep_id).toBe("nn1");
  });
});

describe("buildFreshAdminSession", () => {
  it("xóa hành chính nhưng giữ khoa khóa mạng lưới", () => {
    const next = buildFreshAdminSession(baseSession(), { lockedKhoaId: "mine" });
    expect(next.khoa_id).toBe("mine");
    expect(next.khu_vuc_id).toBe("");
    expect(next.vi_tri).toBe("");
  });
});

describe("mergeStickyIntoSession", () => {
  it("mạng lưới: sticky khác khoa → chỉ giữ khoa phụ trách", () => {
    const merged = mergeStickyIntoSession(
      { ...baseSession(), khoa_id: "", khu_vuc_id: "", vi_tri: "" },
      { khoa_id: "other", khu_vuc_id: "kvX", vi_tri: "P9" },
      { isMangLuoi: true, actorKhoaId: "mine" },
    );
    expect(merged.khoa_id).toBe("mine");
    expect(merged.khu_vuc_id).toBe("");
    expect(merged.vi_tri).toBe("");
  });

  it("mạng lưới: sticky cùng khoa → lấy khu vực/vị trí", () => {
    const merged = mergeStickyIntoSession(
      { ...baseSession(), khoa_id: "", khu_vuc_id: "", vi_tri: "" },
      { khoa_id: "mine", khu_vuc_id: "kvX", vi_tri: "P9", cach_thuc_id: "ct2" },
      { isMangLuoi: true, actorKhoaId: "mine" },
    );
    expect(merged.khoa_id).toBe("mine");
    expect(merged.khu_vuc_id).toBe("kvX");
    expect(merged.vi_tri).toBe("P9");
    expect(merged.cach_thuc_id).toBe("ct2");
  });

  it("KSNK: prefill đầy đủ từ sticky", () => {
    const merged = mergeStickyIntoSession(
      { ...baseSession(), khoa_id: "", khu_vuc_id: "", vi_tri: "" },
      { khoa_id: "kB", khu_vuc_id: "kvB", vi_tri: "201" },
      { isMangLuoi: false, actorKhoaId: null },
    );
    expect(merged.khoa_id).toBe("kB");
    expect(merged.khu_vuc_id).toBe("kvB");
    expect(merged.vi_tri).toBe("201");
  });
});

describe("pickAdminContext + sticky key", () => {
  it("pick và key ổn định", () => {
    expect(pickAdminContext(baseSession())).toEqual({
      khoa_id: "k1",
      khu_vuc_id: "kv1",
      vi_tri: "P201",
      cach_thuc_id: "ct1",
      cach_thuc_giam_sat: "Giám sát trực tiếp tại chỗ",
    });
    expect(stickyStorageKey("vst", "hs1")).toBe("ksnk.supervision.admin.vst.hs1");
  });
});
