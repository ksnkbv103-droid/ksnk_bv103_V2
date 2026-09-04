/**
 * Mô tả nghiệp vụ tiếng Việt cho ma trận RBAC — giúp PO/IT duyệt quyền.
 */
const PERMISSION_MODULE_BUSINESS_DESCRIPTIONS: Record<string, string> = {
  DASHBOARD: "Xem Tổng quan KSNK (nhìn nhanh KPI và khoảng trống giám sát).",
  DASHBOARD_CC_OVERVIEW: "Tab cơ cấu nguồn và tổng hợp trên Command Center.",
  DASHBOARD_CC_SUPERVISION: "Tab giám sát chuyên trách / chéo / tự giám sát.",
  DASHBOARD_CC_GAP: "Tab đối soát và phát hiện lệch dữ liệu giám sát.",
  DASHBOARD_CC_EXPORT: "Xuất hoặc in báo cáo PDF từ Command Center.",
  DANH_MUC: "Quản trị danh mục lookup chung (tổ chức, trạm CSSD, khu vực…).",
  DANH_MUC_ORG: "Danh mục tổ chức: khối khoa, tổ công tác, chức vụ, chức danh, nghề nghiệp.",
  DANH_MUC_GSTT: "Lookup giám sát: khu vực, hình thức, cách thức giám sát.",
  DANH_MUC_CSSD_LOOKUP: "Lookup CSSD: loại sự cố, loại máy, trạm workflow.",
  NHAN_SU: "Hồ sơ nhân sự toàn viện — gán khoa, tổ, vai trò KSNK.",
  BANG_KIEM: "Mẫu bảng kiểm giám sát tuân thủ.",
  BANG_KIEM_DETAIL: "Tiêu chí chi tiết trong từng mẫu bảng kiểm.",
  CONG_VIEC: "Quản lý công việc KSNK — Kanban, đề xuất, nghiệm thu.",
  DAO_TAO: "Thi ôn tập / thi chính thức KSNK — ngân hàng câu, kỳ thi, sổ kết quả.",
  LOAI_DC: "Danh mục loại dụng cụ phẫu thuật (master CSSD). Hard-write form chỉ ADMIN (D5).",
  BO_DC: "Danh mục bộ dụng cụ và mã tem QR. Hard-write master chỉ ADMIN; BO_DC.edit = duyệt phiếu (D5).",
  DC_LE: "Thành phần / chi tiết trong bộ dụng cụ (BOM). Hard-write master chỉ ADMIN (D5).",
  THIET_BI: "Danh mục máy tiệt khuẩn, rửa và thiết bị KSNK.",
  HOA_CHAT: "Danh mục hóa chất, vật tư, test kit.",
  KHOA_PHONG: "Danh mục khoa phòng và cấu trúc tổ chức lâm sàng.",
  CSSD_REPORT: "Báo cáo vận hành CSSD.",
  CSSD_KHO_DUNGCU: "Kho dụng cụ — tồn, giao dịch, QR vận hành.",
  CSSD_WORKFLOW: "Quy trình luân chuyển QR trạm CSSD.",
  CSSD_ME_TIET_KHUAN: "Mẻ tiệt khuẩn — QC, khóa an toàn.",
  KSNK_KHO_HOACHAT: "Kho hóa chất — nhập xuất theo lô FEFO.",
  GIAM_SAT_VST: "Phiên giám sát vệ sinh tay (WHO).",
  GIAM_SAT_CHUNG: "Phiên giám sát bảng kiểm chung (GSC).",
  GIAM_SAT_NKBV: "Giám sát nhiễm khuẩn bệnh viện / HAI.",
  PHAN_QUYEN: "Cấu hình ma trận phân quyền và tài khoản KSNK.",
  BAO_SU_CO: "Báo cáo sự cố an toàn / tiệt khuẩn.",
};

export function getPermissionModuleBusinessDescription(code: string): string | undefined {
  return PERMISSION_MODULE_BUSINESS_DESCRIPTIONS[code];
}
