import type { BaTimelineMilestone } from "../lib/nkbv-ba-timeline-core";
import type { NkbvBaAnalysisSeedInput } from "../actions/giam-sat-nkbv-ba-analysis.actions";
import type { SyndromePanelId } from "../lib/nkbv-specimen-syndrome";
import type { ViSinhAnalysisDispositionRow } from "../lib/nkbv-vi-sinh-analysis-status";

export type NkbvBaWorkspaceKhoaOpt = {
  id: string;
  ma?: string;
  ten?: string;
  ma_danh_muc?: string;
  ten_danh_muc?: string;
};

/**
 * Props workspace BA multi-timeline — tách file để giảm độ dày mega-component.
 * Không chứa thuật toán phân loại / tử số.
 */
export type NkbvBaMultiTimelineWorkspaceProps = {
  maBenhAn: string;
  ngayVaoVien: string;
  ngayRaVien?: string | null;
  ngaySinh?: string | null;
  defaultKhoa?: string | null;
  /** UUID khoa điều trị — prefill khi thêm XN từ lưới */
  khoaId?: string | null;
  maBenhNhan?: string | null;
  hoTen?: string | null;
  khoaTen?: string | null;
  khoas?: NkbvBaWorkspaceKhoaOpt[];
  locationDays?: Array<{ ngay_lich: string; khoa_id: string }>;
  deviceDays?: Array<{ id?: string; ngay_lich: string; loai_dung_cu: "CVC" | "VENT" | "FOLEY" }>;
  timeline: BaTimelineMilestone[];
  devices: Array<{
    id: string;
    device_type: string;
    insertion_date: string;
    removal_date: string | null;
  }>;
  /** Hàng đợi XN (+) — từ hub cases + skip metadata */
  analysisDispositions?: ViSinhAnalysisDispositionRow[];
  /** Deep link từ kho vi sinh: UUID XN → mở phiên Index. */
  focusXnId?: string | null;
  allowedEdit: boolean;
  /** Chọn Index — chỉ đánh dấu mốc, không tạo phiếu */
  onIndexChange?: (input: { milestoneId: string }) => void;
  /** Sau kết luận — tạo phiếu phân tích (late create) */
  onCreatePhieu?: (input: {
    milestoneId: string;
    panel: SyndromePanelId;
    analysisSeed?: NkbvBaAnalysisSeedInput | null;
  }) => void;
  /** Bỏ qua XN (+) có lý do */
  onSkipViSinh?: (input: { viSinhId: string; reason: string }) => void;
  /** Chốt Index không đủ TC (KHONG_DU_TC) */
  onMarkKhongDuTc?: (input: { viSinhId: string; indexDate: string }) => void;
  /** Xóa phiên → mở lại XN đã gắn KHONG_DU_TC trên DB */
  onClearViSinhDisposition?: (input: { viSinhId: string }) => void | Promise<void>;
  /** Soft reload hub (silent) — dùng khi cần đồng bộ LIS/case, không mỗi tick TC */
  onReload: () => void;
  /** Patch timeline local sau upsert DB — tránh reload cả hub */
  onTimelineUpsertLocal?: (row: {
    id: string;
    milestone_kind: string;
    milestone_date: string;
    title: string;
    detail?: string | null;
    specimen_hint?: string | null;
    criteria_key?: string | null;
  }) => void;
  onTimelineRemoveLocal?: (milestoneId: string) => void;
  /** Phiếu đã có trên BA — cảnh báo RIT khi mở Index mới. */
  priorEvents?: Array<{
    id: string;
    ngay_phat_hien: string | null;
    loai_ma?: string | null;
    loai_ten?: string | null;
    vi_tri_nhiem_khuan?: string | null;
    index_vi_sinh_id?: string | null;
    tac_nhan_vi_khuan?: string | null;
    attributed_vi_sinh_ids?: string[] | null;
  }>;
};
