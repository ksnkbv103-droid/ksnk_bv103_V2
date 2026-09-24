/**
 * SSOT phương pháp tiệt khuẩn — chỉ từ mã loại máy (`LOAI_MAY_TIET_KHUAN`), không regex tên máy.
 * Máy hàn túi, tủ ủ BI, máy giặt, máy rửa… không phải máy tiệt khuẩn → null.
 */

export type SterilizerMethod = "HOI_NUOC" | "PLASMA_H2O2" | "EO";

const METHOD_BY_CODE: Record<string, SterilizerMethod> = {
  LM_HOI_NUOC: "HOI_NUOC",
  HOI_NUOC: "HOI_NUOC",
  LM_PLASMA: "PLASMA_H2O2",
  PLASMA_H2O2: "PLASMA_H2O2",
  LM_EO: "EO",
  EO: "EO",
};

function unwrapRow(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  return row as Record<string, unknown>;
}

function pushCode(out: string[], value: unknown) {
  const code = String(value ?? "").trim().toUpperCase();
  if (code) out.push(code);
}

/** Mã lookup / `loai_may` trên thiết bị hoặc trên chính dòng loại máy. */
export function getSterilizerMethod(thietBi: unknown): SterilizerMethod | null {
  const row = unwrapRow(thietBi);
  if (!row) return null;
  const codes: string[] = [];
  pushCode(codes, row.ma_loai_may);
  pushCode(codes, row.code);
  pushCode(codes, row.loai_thiet_bi);
  pushCode(codes, row.phuong_phap);
  const loaiMay = unwrapRow(row.loai_may);
  if (loaiMay) {
    pushCode(codes, loaiMay.ma_loai_may);
    pushCode(codes, loaiMay.code);
  }
  for (const code of codes) {
    const method = METHOD_BY_CODE[code];
    if (method) return method;
  }
  return null;
}

export function isSteamSterilizerProfile(machine: unknown): boolean {
  return getSterilizerMethod(machine) === "HOI_NUOC";
}
