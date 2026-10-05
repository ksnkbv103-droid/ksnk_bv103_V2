export type CssdPrintInstrumentRow = {
  ten: string;
  keHoach: number;
  thucTe: number;
};

export type CssdBatchPrintMember = {
  stt: number;
  maQrBo: string;
  tenBo: string;
  /** Thu hồi / không đạt: hướng xử lý từng bộ. */
  xuLyLabel?: string;
};

/** Ảnh minh chứng QC — lưu trong `tk_qc_json.anhMinhChung`. */
export type CssdBatchAnhMinhChung = {
  may: string;
  tiepXuc: string;
  daThongSo: string;
  sinhHoc: string;
  bowieDick: string;
};

/** Một hàng QC trên phiếu in: hạng mục + kết quả + URL ảnh. */
export type CssdQcProofRow = {
  label: string;
  ketQua: string;
  anhUrl: string | null;
};

export type CssdBatchPrintData = {
  batchId: string;
  maLo: string;
  trangThaiLabel: string;
  ketQuaDat: boolean;
  coTheIn: boolean;
  thietBi: string;
  phuongPhap: string;
  chuongTrinh: string;
  nhietDo: string;
  apSuat: string;
  thoiGianChuKy: string;
  nguoiNap: string;
  nguoiDo: string;
  nguoiNha: string;
  thoiGianKetThucChuTrinh: string | null;
  thoiGianNha: string | null;
  qcVatLy: string;
  qcCiNgoai: string;
  qcCiPcd: string;
  biLabel: string;
  coImplantLabel: string;
  /** ME-02: dòng Bowie-Dick đầu ngày (hơi nước) hoặc «Không áp dụng». */
  bowieDickLine?: string;
  nguoiLoad: string;
  nguoiUnload: string;
  nhietDoApSuat: string;
  thongSoMay: string;
  chiThiTiepXuc: string;
  chiThiDaThongSo: string;
  testSinhHoc: string;
  testCI: string;
  testBowieDick: string;
  thoiGianBatDau: string | null;
  thoiGianKetThuc: string | null;
  ghiChuQc: string;
  anhMinhChung: CssdBatchAnhMinhChung;
  members: CssdBatchPrintMember[];
};

/** Một dòng sự cố trên phiếu cấp phát (CSSD-05 / §8). */
export type CssdCapPhatPrintIncident = {
  ma: string;
  trangThai: string;
  loai: string;
};

export type CssdCapPhatPrintData = {
  quyTrinhId: string;
  maLo: string;
  /** Mã chu trình xử lý bộ (truy vết ai xử lý / máy TK). */
  maCycleQr: string | null;
  maQrBo: string;
  tenBo: string;
  hanSuDung: string | null;
  maCaMo: string | null;
  /** Thiếu dữ liệu → «—», không fallback người TK. */
  nguoiCapPhat: string;
  /** Thiếu → null; UI hiện «—», không lấy giờ TK/now. */
  thoiGianCapPhat: string | null;
  thietBi: string;
  nguoiLoad: string;
  nguoiUnload: string;
  nhietDoApSuat: string;
  thongSoMay: string;
  chiThiTiepXuc: string;
  chiThiDaThongSo: string;
  testSinhHoc: string;
  testCI: string;
  testBowieDick: string;
  thoiGianKetThucMe: string | null;
  instruments: CssdPrintInstrumentRow[];
  /** Rỗng → dòng phủ định trên phiếu. */
  suCo: CssdCapPhatPrintIncident[];
};
