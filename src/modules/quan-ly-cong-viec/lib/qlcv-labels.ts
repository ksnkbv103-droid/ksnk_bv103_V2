import { isChoNghiemThuHoanThanh, isChoNhanViec, isDeXuatChoDuyet, type CongViecLike } from "./qlcv-workflow-display";

/** Nhãn ưu tiên hiển thị (không dùng mã DB thô). */
export function formatMucDoUuTienLabel(code: string | null | undefined): string {
  const c = String(code || "TRUNG_BINH").trim().toUpperCase();
  if (c === "CAO") return "Ưu tiên cao";
  if (c === "THAP") return "Ưu tiên thấp";
  return "Ưu tiên trung bình";
}

/** Trạng thái một dòng công việc — luôn có dấu, không ASCII hóa. */
export function getCongViecTrangThaiLabel(t: CongViecLike & { trang_thai?: string | null }): string {
  if (isDeXuatChoDuyet(t)) return "Đề xuất chờ duyệt";
  if (isChoNhanViec(t)) return "Chờ nhận việc";
  if (isChoNghiemThuHoanThanh(t)) return "Chờ nghiệm thu";
  const raw = String(t.trang_thai || "").trim().toUpperCase();
  const map: Record<string, string> = {
    MOI: "Mới",
    DANG_LAM: "Đang làm",
    CHO_DUYET: "Chờ nghiệm thu",
    TU_CHOI: "Từ chối nghiệm thu",
    CHUA_BAT_DAU: "Chưa bắt đầu",
    DANG_THUC_HIEN: "Đang thực hiện",
    HOAN_THANH: "Hoàn thành",
    QUA_HAN: "Quá hạn",
    DA_HUY: "Đã hủy",
    DE_XUAT_CHO_DUYET: "Đề xuất chờ duyệt",
    CHO_NHAN_VIEC: "Chờ nhận việc",
    CHO_XAC_NHAN_HOAN_THANH: "Chờ nghiệm thu",
  };
  return map[raw] || (raw ? raw.replace(/_/g, " ").toLowerCase() : "—");
}
