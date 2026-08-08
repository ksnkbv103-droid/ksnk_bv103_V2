/** Option dropdown QLCV — form + định kỳ. */

export type QlcvSelectOption = {
  id: string;
  label: string;
  to_id?: string | null;
};

export type QlcvFormCatalog = {
  nhanSu: QlcvSelectOption[];
  toCongTac: QlcvSelectOption[];
  /** Khoa/đơn vị địa điểm (toàn viện) — khác roster KSNK. */
  khoaPhong: QlcvSelectOption[];
  loaiCongViec: QlcvSelectOption[];
  trangThaiMauSac: Record<string, string>;
};
