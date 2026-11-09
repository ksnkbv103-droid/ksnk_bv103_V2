import type React from "react";
import type {
  BaGridActiveIndex,
  BaGridCdhaCell,
  BaGridColumn,
  BaGridSymptomByDate,
  BaGridXnCell,
} from "../lib/nkbv-ba-grid-engine";
import type { BaAnalysisSessionDraft } from "../lib/nkbv-ba-analysis-session";
import type { SyndromePanelId } from "../lib/nkbv-specimen-syndrome";
import type { OpenSiteSessionForSbap } from "../lib/nkbv-index-event-disposition";
import type { ViSinhAnalysisDispositionRow } from "../lib/nkbv-vi-sinh-analysis-status";
import type { BaSampleConclusion } from "../lib/nkbv-ba-sample-conclusions";
import type { BaDayGridColumnDef } from "./NkbvBaDayGrid";

export type Device = {
  id: string;
  device_type: string;
  insertion_date: string;
  removal_date: string | null;
};

export type PriorEvent = {
  id: string;
  ngay_phat_hien: string | null;
  loai_ma?: string | null;
  loai_ten?: string | null;
  vi_tri_nhiem_khuan?: string | null;
  index_vi_sinh_id?: string | null;
  tac_nhan_vi_khuan?: string | null;
  attributed_vi_sinh_ids?: string[] | null;
  calculated_doe?: string | null;
  classification?: string | null;
  is_positive?: boolean | null;
  is_secondary_bsi?: boolean | null;
  analysis_disposition?: string | null;
  trang_thai_ma?: string | null;
  poa_major_type?: string | null;
};

export type Props = {
  panel: "PNEU" | "UTI" | "BSI";
  maBenhAn?: string;
  ngayVaoVien: string;
  ngayRaVien?: string | null;
  ngaySinh?: string | null;
  /** Trục cột ngày SSOT từ parent — không tự build. */
  columns: BaGridColumn[];
  index: BaGridActiveIndex;
  xn: BaGridXnCell[];
  cdha: BaGridCdhaCell[];
  devices?: Device[];
  /** Ngày can thiệp từ timeline BA (SSOT) — không dùng sổ đăng ký. */
  baCanThiepDates?: string[];
  defaultKhoa?: string | null;
  /** Ngày–khoa trên lưới BA (UUID) — quy kết chuyển khoa. */
  baKhoaByDate?: Record<string, string>;
  allowedEdit: boolean;
  draft: BaAnalysisSessionDraft;
  /** LS đã lưu trên bảng chung BA — merge với draft phiên. */
  baLamSangByDate?: BaGridSymptomByDate;
  /** Phiếu đã có — cảnh báo RIT khi Index nằm trong khung sự kiện trước. */
  priorEvents?: PriorEvent[];
  /** Phiên site đủ TC đang PT — rà SBAP trước Primary trên cột Kết luận. */
  openSiteSessions?: OpenSiteSessionForSbap[];
  onDraftChange: (patch: Partial<BaAnalysisSessionDraft>) => void;
  /** Chốt Index không đủ TC — đóng phiên, không tô RIT. */
  onCloseInsufficient?: () => void;
  /** Đồng bộ tick LS panel → milestone bảng chung. */
  onPersistLamSang?: (
    date: string,
    criteriaKey: string,
    title: string,
    turnOn: boolean,
  ) => void;
  /** Disposition XN đã PT — cột Kết luận RIT/SBAP. */
  analysisDispositions?: ViSinhAnalysisDispositionRow[];
  /** Kết luận đã chốt theo mẫu (luôn hiện khi PT Index khác). */
  sampleConclusions?: BaSampleConclusion[];
  /** CDC | MANUAL — MANUAL: IP tự KL, không đổ smart/progressive. */
  analysisMode?: import("../lib/nkbv-ba-analysis-mode").BaAnalysisMode;
  onManualSampleConclude?: (payload: {
    indexId: string;
    kind: "XN" | "CDHA";
    date: string;
    disposition: BaSampleConclusion["disposition"];
    label: string;
  }) => void;
  onManualSampleClear?: (payload: { indexId: string }) => void;
  scrollRef?: (el: HTMLDivElement | null) => void;
  onScrollSync?: () => void;
  onClose: () => void;
  onOpenPrimaryBsi?: (bloodId: string) => void;
  /** Phủ quyết: xác nhận máu Secondary trên cột Kết luận — không mở khung BSI. */
  onConfirmSecondaryBlood?: (payload: {
    sampleId: string;
    date: string;
    label: string;
  }) => void;
  colW?: number;
  labelW?: number;
  /**
   * Gộp cột phân tích vào bảng chung (cùng hàng ngày).
   * Khi có children → không vẽ DayGrid riêng bên dưới.
   */
  children?: (api: {
    analysisColumns: BaDayGridColumnDef[];
  }) => React.ReactNode;
};

export type IwpPanelId = Extract<SyndromePanelId, "PNEU" | "UTI" | "BSI">;
