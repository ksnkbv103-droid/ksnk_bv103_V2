/** Option dropdown QLCV — form + định kỳ. */

export type QlcvSelectOption = {
  id: string;
  label: string;
  to_id?: string | null;
};

export type QlcvFormCatalog = {
  nhanSu: QlcvSelectOption[];
  toCongTac: QlcvSelectOption[];
  loaiCongViec: QlcvSelectOption[];
  khoaPhong: QlcvSelectOption[];
  trangThaiMauSac: Record<string, string>;
};
