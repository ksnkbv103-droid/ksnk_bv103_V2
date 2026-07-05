"use client";

import type { VSTFormPerson } from "../lib/vst-form-model";
import type { VstPrintData } from "../hooks/use-vst-print";

/** Gom quan sát từ API chi tiết phiên → cấu trúc hiển thị viewer/in. */
export function buildVstViewDataFromDetail(detail: {
  session: Record<string, unknown>;
  observations?: Array<Record<string, unknown>>;
  nhanSuForPrint?: { id: string; ho_ten: string }[];
}, dm: {
  ngheNghieps: VstPrintData["ngheNghieps"];
  khoas: VstPrintData["khoas"];
  khuVucs: VstPrintData["khuVucs"];
}): VstPrintData {
  const obs = detail.observations || [];
  const personsMap: Record<string, Record<string, unknown>> = {};

  const splitThoiDiem = (raw: unknown): string[] =>
    String(raw ?? "")
      .split(/\s*,\s*/g)
      .map((x) => x.trim())
      .filter(Boolean);

  obs.forEach((o) => {
    const byNv = String(o.nhan_vien_id ?? "").trim();
    const byName = String(o.ten_nhan_vien_ngoai ?? "").trim();
    const personKey = byNv || byName || "__MISSING_PERSON__";
    if (!personsMap[personKey]) {
      personsMap[personKey] = {
        id_col: personKey,
        nhan_vien_id: o.nhan_vien_id,
        ten_manual: o.ten_nhan_vien_ngoai,
        is_manual: Boolean(byName),
        nghe_nghiep: o.nghe_nghiep,
        opportunities: [] as Record<string, unknown>[],
      };
    }
    (personsMap[personKey].opportunities as Record<string, unknown>[]).push({
      thoi_diems: splitThoiDiem(o.thoi_diem),
      hanh_dong: o.hanh_dong,
      dung_ky_thuat: o.dung_ky_thuat,
      du_thoi_gian: o.du_thoi_gian,
      co_deo_gang: o.co_deo_gang,
      thoi_gian_ghi_nhan: o.thoi_gian_ghi_nhan,
    });
  });

  return {
    session: detail.session,
    persons: Object.values(personsMap) as unknown as VSTFormPerson[],
    ngheNghieps: dm.ngheNghieps,
    khoas: dm.khoas,
    khuVucs: dm.khuVucs,
    nhanSus: detail.nhanSuForPrint || [],
  };
}
