export type CssdPrintInstrumentRow = {
  ten: string;
  keHoach: number;
  thucTe: number;
};

export type CssdBatchPrintMember = {
  stt: number;
  maQrBo: string;
  tenBo: string;
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
  ketQuaDat: boolean;
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
  thoiGianBatDau: string | null;
  thoiGianKetThuc: string | null;
  ghiChuQc: string;
  anhMinhChung: CssdBatchAnhMinhChung;
  members: CssdBatchPrintMember[];
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
  nguoiCapPhat: string;
  thoiGianCapPhat: string;
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
};
