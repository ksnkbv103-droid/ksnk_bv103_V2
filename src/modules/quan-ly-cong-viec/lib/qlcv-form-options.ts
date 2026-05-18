/** Option dropdown QLCV — dùng chung form / định kỳ / việc con. */

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
};
