"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { CheckCircle2, MessageSquare, Ban, Printer } from "lucide-react";
import { QlcvConfirmDialog } from "./dialogs/QlcvConfirmDialog";
import { QlcvReasonDialog } from "./dialogs/QlcvReasonDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BV103_DIALOG_STACK } from "@/lib/bv103-dialog-stack";
import { ActivityTimeline, type Activity } from "./ActivityTimeline";
import { CongViecForm } from "./CongViecForm";
import { HoatDongForm } from "./HoatDongForm";
import { QlcvChecklistPanel } from "./QlcvChecklistPanel";
import { QlcvManualProgressPanel } from "./QlcvManualProgressPanel";
import { DeXuatApproveForm } from "./DeXuatApproveForm";
import { QlcvTaskPrintView } from "./print/QlcvTaskPrintView";
import {
  normalizeQlcvChecklist,
  percentFromQlcvChecklist,
  taskUsesQlcvChecklistForProgress,
} from "@/lib/domain/qlcv-checklist";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";
import { formatDateVi } from "@/lib/format-datetime-vi";
import {
  getCongViecDetail,
  xacNhanHoanThanh,
  deleteCongViec,
  tuChoiHoanThanhCongViec,
} from "../actions/cong-viec.actions";
import { getQlcvFormCatalog } from "../actions/cong-viec-read.actions";
import { huyKhiChoNghiemThuKhongDat } from "../actions/cong-viec-write.actions";
import { isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";
import {
  canShowDeleteTask,
  canShowEditTaskMetadata,
  canShowHoatDongProgressSection,
  canShowHuyKhiNghiemThuKhongDat,
  canShowQlcvApproveActions,
} from "../lib/qlcv-access";
import { useModulePermission } from "@/hooks/useModulePermission";
import { getCongViecTrangThaiLabel } from "../lib/qlcv-labels";
import { resolveQlcvWorkflowBadgeAppearance } from "../lib/qlcv-workflow-badge";
import { getTrangThaiMauSacMap } from "../actions/cong-viec-read.actions";
import { normalizeQlcvTrangThaiToCanonical } from "@/lib/domain/qlcv/trang-thai-canonical";
import { isEligibleForNghiemThu } from "@/lib/domain/qlcv/nghiem-thu-gate";
import { isQlcvBoardOverdue } from "../lib/qlcv-board-lanes";
import { labelsForStaffIds, normalizeQlcvStaffIdList } from "../lib/qlcv-staff-ids";
import type { CongViecView } from "../types";
import type { QlcvSelectOption } from "../lib/qlcv-form-options";

interface Props {
  id: string;
  onClose: () => void;
  onRefreshList?: () => void;
}

type QlcvHoTenRef = { ho_ten?: string | null; is_active?: boolean | null };
type QlcvToRef = { ten_to?: string | null };
type CongViecDetailData = CongViecView & {
  nguoi_tao?: QlcvHoTenRef | null;
  nguoi_giao?: QlcvHoTenRef | null;
  nguoi_phu_trach?: QlcvHoTenRef | null;
  to_cong_tac?: QlcvToRef | null;
  hoat_dong?: Activity[] | null;
  dia_diem_khoa_ten?: string | null;
  dia_diem_khoa_ma?: string | null;
  nhiem_vu_ten?: string | null;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Có lỗi xảy ra.";
}

/** Đồng bộ với KsnkSupervisionHero / trang QLCV */
const qlcvDetailChrome = {
  panel:
    "rounded-[var(--radius-shell)] border border-slate-200/90 bg-white shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]",
  panelToolbar:
    "rounded-[var(--radius-shell)] border border-slate-200/90 bg-white/95 p-2 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]",
  metaTile:
    "rounded-[var(--radius-shell)] border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.02] sm:p-5",
  dashedEmpty: "rounded-[var(--radius-shell)] border-2 border-dashed border-slate-200/90 bg-slate-50/50 py-10 text-center",
  sectionLabel: "text-[11px] font-semibold uppercase tracking-wider text-slate-500",
  sectionHeading: "text-sm font-semibold uppercase tracking-wider text-slate-800",
  btnOutline:
    "bv103-control-h shrink-0 rounded-[var(--radius-control)] border border-slate-200/90 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50",
  btnPrimary:
    "bv103-control-h shrink-0 rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[var(--primary-hover)]",
  btnBlue:
    "bv103-control-h shrink-0 rounded-[var(--radius-control)] bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-700",
  btnGhost:
    "bv103-control-h shrink-0 rounded-[var(--radius-control)] border border-transparent px-3 text-xs font-semibold text-red-600 hover:border-red-100 hover:bg-red-50",
  dialogContent: `max-w-4xl rounded-[var(--radius-shell)] border border-slate-200/90 bg-slate-50 p-6 shadow-[var(--shadow-app-soft)] sm:p-8 ${BV103_DIALOG_STACK.nestedContent}`,
  dialogOverlay: BV103_DIALOG_STACK.nestedOverlay,
} as const;

export function CongViecDetail({ id, onClose, onRefreshList }: Props) {
  const { isAdmin, allowed, userData } = useModulePermission("CONG_VIEC");
  const accessFlags = {
    isRBACAdmin: isAdmin,
    hasDelete: allowed.delete,
    hasEdit: allowed.edit,
    hasCreate: allowed.create,
    hasApprove: allowed.approve,
    actorStaffId: userData?.id ?? null,
  };
  const canNghiemThu = canShowQlcvApproveActions(accessFlags);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CongViecDetailData | null>(null);
  const [mauSacByMa, setMauSacByMa] = useState<Record<string, string>>({});
  const [activeId] = useState(id);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  // Dialog state — thay thế browser prompt()/confirm()
  const [confirmNghiemThuOpen, setConfirmNghiemThuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [reasonHuyOpen, setReasonHuyOpen] = useState(false);
  const [reasonTuChoiOpen, setReasonTuChoiOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [nhanSuOptions, setNhanSuOptions] = useState<QlcvSelectOption[]>([]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await getCongViecDetail(activeId);
      setData(res as CongViecDetailData);
    } catch (err) {
      console.error("Lỗi tải chi tiết:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [activeId]);

  useEffect(() => {
    void getTrangThaiMauSacMap()
      .then(setMauSacByMa)
      .catch(() => setMauSacByMa({}));
  }, []);

  useEffect(() => {
    void getQlcvFormCatalog()
      .then((c) => setNhanSuOptions(c.nhanSu))
      .catch(() => setNhanSuOptions([]));
  }, []);

  useEffect(() => {
    if (!printing) return;
    const onAfter = () => setPrinting(false);
    window.addEventListener("afterprint", onAfter);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
    return () => window.removeEventListener("afterprint", onAfter);
  }, [printing]);

  const staffLabelOpts = useMemo(
    () => nhanSuOptions.map((o) => ({ id: o.id, label: o.label })),
    [nhanSuOptions],
  );
  const phoiHopLabel = useMemo(
    () => labelsForStaffIds(normalizeQlcvStaffIdList(data?.nguoi_phoi_hop_ids), staffLabelOpts),
    [data?.nguoi_phoi_hop_ids, staffLabelOpts],
  );
  const theoDoiLabel = useMemo(
    () => labelsForStaffIds(normalizeQlcvStaffIdList(data?.nguoi_theo_doi_ids), staffLabelOpts),
    [data?.nguoi_theo_doi_ids, staffLabelOpts],
  );

  if (loading)
    return (
      <div className={`flex min-h-[14rem] items-center justify-center p-8 ${qlcvDetailChrome.panel}`}>
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"
          aria-hidden
        />
      </div>
    );

  if (!data)
    return (
      <div className={`p-10 text-center ${qlcvDetailChrome.panel}`}>
        <p className="text-sm font-medium text-slate-600">Không tìm thấy dữ liệu</p>
      </div>
    );

  const statusDisplay = getCongViecTrangThaiLabel(data);
  const statusBadge = resolveQlcvWorkflowBadgeAppearance(data, mauSacByMa);

  const showDelete = canShowDeleteTask(data, accessFlags);
  const showEditMetadata = canShowEditTaskMetadata(data, accessFlags);
  const showApproveDeXuat = isDeXuatChoDuyet(data) && canShowQlcvApproveActions(accessFlags);
  const usesChecklist = taskUsesQlcvChecklistForProgress(data.checklist);
  const checklistPct = percentFromQlcvChecklist(normalizeQlcvChecklist(data.checklist));
  const st = normalizeQlcvTrangThaiToCanonical(data.trang_thai);
  const assigneeInactiveOpen =
    Boolean(data.nguoi_phu_trach_id) &&
    data.nguoi_phu_trach?.is_active === false &&
    st !== "HOAN_THANH" &&
    st !== "DA_HUY";
  const showHoatDong = canShowHoatDongProgressSection(data, accessFlags);
  const atNghiemThuGate = isEligibleForNghiemThu(data);
  const checklistReadOnly =
    isDeXuatChoDuyet(data) || st === "HOAN_THANH" || st === "DA_HUY" || atNghiemThuGate;
  const showNghiemThuToolbar = atNghiemThuGate && canNghiemThu;
  const showHuyKhiNghiemThuKhongDat = canShowHuyKhiNghiemThuKhongDat(data, accessFlags);
  const showHuyButton =
    (accessFlags.isRBACAdmin || accessFlags.hasDelete) &&
    st !== "HOAN_THANH" &&
    st !== "DA_HUY" &&
    !atNghiemThuGate;

  const runHuyKhongDat = async (lyDo: string) => {
    try {
      await huyKhiChoNghiemThuKhongDat(data!.id, lyDo);
      toast.success("Đã đóng phiếu ở trạng thái Đã hủy.");
      fetchDetail();
      onRefreshList?.();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="space-y-[var(--bv103-space-3)]">
      <div className="no-print space-y-[var(--bv103-space-3)]">
      {assigneeInactiveOpen && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          Người phụ trách đã ngừng hoạt động trong danh mục nhân sự. Nên giao lại việc hoặc hủy phiếu để tránh
          việc mở bị bỏ quên.
        </div>
      )}
      <div className="flex flex-col gap-[var(--bv103-space-3)] md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={statusBadge.className} style={statusBadge.style}>
              {statusDisplay}
            </span>
            {isQlcvBoardOverdue(data) ? (
              <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                Quá hạn
              </span>
            ) : null}
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              #{data.id?.slice(0, 8)}
            </span>
          </div>
          <h2 className="bv103-type-title">{data.tieu_de}</h2>
          {data.loai_cong_viec === "DINH_KY" || data.dinh_ky_mau_id ? (
            <p className="text-xs">
              <a
                href={
                  data.dinh_ky_mau_id
                    ? `/quan-ly-cong-viec?tab=DINH_KY&mau=${encodeURIComponent(String(data.dinh_ky_mau_id))}`
                    : "/quan-ly-cong-viec?tab=DINH_KY"
                }
                className="font-semibold text-emerald-800 hover:underline"
              >
                Mẫu định kỳ
              </a>
            </p>
          ) : null}
          {data.mo_ta ? (
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">{data.mo_ta}</p>
          ) : null}
        </div>

        <div className={`flex shrink-0 flex-wrap gap-2 ${qlcvDetailChrome.panelToolbar}`}>
          <button
            type="button"
            className={`${qlcvDetailChrome.btnOutline} inline-flex items-center`}
            onClick={() => setPrinting(true)}
          >
            <Printer className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
            In phiếu
          </button>
          {showHuyButton && (
            <button
              type="button"
              className={`${qlcvDetailChrome.btnOutline} inline-flex items-center border-red-200/90 text-red-800 hover:bg-red-50`}
              onClick={() => setReasonHuyOpen(true)}
            >
              <Ban className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
              Hủy công việc
            </button>
          )}

          {showNghiemThuToolbar && (
            <>
              <button
                type="button"
                className={`${qlcvDetailChrome.btnOutline} border-amber-200/90 text-amber-800 hover:bg-amber-50`}
                onClick={() => setReasonTuChoiOpen(true)}
              >
                Yêu cầu làm lại
              </button>

              {showHuyKhiNghiemThuKhongDat ? (
                <button
                  type="button"
                  className={`${qlcvDetailChrome.btnOutline} inline-flex items-center border-red-200/90 text-red-800 hover:bg-red-50`}
                  onClick={() => setReasonHuyOpen(true)}
                >
                  <Ban className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
                  Hủy (không đạt)
                </button>
              ) : null}

              <button type="button" className={qlcvDetailChrome.btnPrimary} onClick={() => setConfirmNghiemThuOpen(true)}>
                Nghiệm thu & Đóng
              </button>
            </>
          )}

          {showApproveDeXuat && (
            <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
              <DialogTrigger asChild>
                <button type="button" className={qlcvDetailChrome.btnPrimary}>Phê duyệt & giao</button>
              </DialogTrigger>
              <DialogContent className={qlcvDetailChrome.dialogContent} overlayClassName={qlcvDetailChrome.dialogOverlay}>
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">
                    Phê duyệt đề xuất
                  </DialogTitle>
                </DialogHeader>
                <DeXuatApproveForm
                  proposal={data}
                  onSuccess={() => {
                    setIsApproveOpen(false);
                    fetchDetail();
                    onRefreshList?.();
                  }}
                  onCancel={() => setIsApproveOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}

          {showEditMetadata && (
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <button type="button" className={qlcvDetailChrome.btnOutline}>
                  Sửa việc
                </button>
              </DialogTrigger>
              <DialogContent className={qlcvDetailChrome.dialogContent} overlayClassName={qlcvDetailChrome.dialogOverlay}>
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">
                    Chỉnh sửa nhiệm vụ
                  </DialogTitle>
                </DialogHeader>
                <CongViecForm
                  initialData={data}
                  onSuccess={() => {
                    setIsEditOpen(false);
                    fetchDetail();
                    onRefreshList?.();
                  }}
                  onCancel={() => setIsEditOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}

          {showDelete && (
            <button type="button" className={qlcvDetailChrome.btnGhost} onClick={() => setConfirmDeleteOpen(true)}>
              Xóa
            </button>
          )}
        </div>
      </div>

      <div className={`divide-y divide-slate-100 overflow-hidden ${qlcvDetailChrome.panel}`}>
        <div className="p-4 sm:p-5">
          {usesChecklist ? (
            <div className="space-y-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className={qlcvDetailChrome.sectionLabel}>Tiến độ thực hiện</span>
                <span className="text-sm font-semibold text-[var(--primary)]">
                  {checklistPct}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, checklistPct))}%` }}
                />
              </div>
            </div>
          ) : (
            <QlcvManualProgressPanel
              congViecId={data.id}
              initialPercent={Number(data.phan_tram_hoan_thanh ?? 0)}
              readOnly={checklistReadOnly}
              onUpdated={() => {
                fetchDetail();
                onRefreshList?.();
              }}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-4">
          {[
            { label: "Người đề xuất", val: data.nguoi_tao?.ho_ten || "—" },
            {
              label: "Người giao",
              val:
                data.nguoi_giao?.ho_ten ||
                (isDeXuatChoDuyet(data)
                  ? "— (ghi khi phê duyệt)"
                  : data.nguoi_tao?.ho_ten
                    ? `${data.nguoi_tao.ho_ten} (tạo việc)`
                    : "—"),
            },
            { label: "Phụ trách", val: data.nguoi_phu_trach?.ho_ten || "—" },
            { label: "Tổ công tác", val: data.to_cong_tac?.ten_to || "—" },
            {
              label: "Hạn chót",
              val: formatDateVi(data.han_hoan_thanh),
            },
            {
              label: "Khoa địa điểm",
              val: formatKhoaCompactLabel({
                ma_khoa: data.dia_diem_khoa_ma,
                ten_khoa: data.dia_diem_khoa_ten,
              }),
            },
            { label: "Vị trí chi tiết", val: data.vi_tri_thuc_hien || "—" },
            { label: "Nhiệm vụ", val: data.nhiem_vu_ten || "—" },
            { label: "Người phối hợp", val: phoiHopLabel },
            { label: "Người theo dõi", val: theoDoiLabel },
          ].map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className={`${qlcvDetailChrome.sectionLabel} mb-0.5`}>{item.label}</dt>
              <dd className="text-sm font-medium leading-snug text-slate-800">{item.val}</dd>
            </div>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          <QlcvChecklistPanel
            congViecId={data.id}
            initialChecklist={data.checklist}
            readOnly={checklistReadOnly}
            onUpdated={() => {
              fetchDetail();
              onRefreshList?.();
            }}
          />
        </div>

        {showHoatDong ? (
          <div className="space-y-[var(--bv103-space-3)] border-t border-slate-100 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0 text-[var(--primary)]" aria-hidden />
              <h3 className={qlcvDetailChrome.sectionHeading}>Ghi chú tiến độ</h3>
            </div>
            <HoatDongForm
              congViecId={data.id}
              usesChecklist={usesChecklist}
              onSuccess={() => {
                fetchDetail();
                onRefreshList?.();
              }}
              onCancel={() => onClose()}
            />
          </div>
        ) : null}
      </div>

      <div className={`bv103-pad-panel ${qlcvDetailChrome.panel}`}>
        <div className="mb-[var(--bv103-space-3)] flex items-center gap-2">
          <MessageSquare size={18} className="shrink-0 text-[var(--primary)]" aria-hidden />
          <h3 className={qlcvDetailChrome.sectionHeading}>Lịch sử hoạt động</h3>
        </div>
        <ActivityTimeline activities={data.hoat_dong || []} />
      </div>

      {/* ===== Dialog thay thế prompt()/confirm() ===== */}
      <QlcvReasonDialog
        open={reasonHuyOpen}
        onOpenChange={setReasonHuyOpen}
        title="Hủy công việc"
        description="Phiếu sẽ được đóng ở trạng thái Đã hủy — lịch sử hoạt động được giữ nguyên. Vui lòng ghi rõ lý do."
        placeholder="Lý do hủy / không đạt chất lượng (ghi rõ)…"
        confirmLabel="Xác nhận hủy"
        variant="danger"
        minLength={5}
        onConfirm={async (lyDo) => {
          await runHuyKhongDat(lyDo);
          setReasonHuyOpen(false);
        }}
      />

      <QlcvReasonDialog
        open={reasonTuChoiOpen}
        onOpenChange={setReasonTuChoiOpen}
        title="Yêu cầu làm lại"
        description="Nghiệm thu không đạt — công việc sẽ được trả về trạng thái Từ chối để thực hiện lại."
        placeholder="Lý do chưa đạt yêu cầu nghiệm thu…"
        confirmLabel="Trả về làm lại"
        variant="danger"
        minLength={5}
        onConfirm={async (lyDo) => {
          try {
            await tuChoiHoanThanhCongViec(data.id, lyDo);
            toast.success("Đã trả việc về thực hiện lại.");
            fetchDetail();
            onRefreshList?.();
          } catch (e: unknown) {
            toast.error(getErrorMessage(e));
          }
        }}
      />

      <QlcvConfirmDialog
        open={confirmNghiemThuOpen}
        onOpenChange={setConfirmNghiemThuOpen}
        title="Xác nhận nghiệm thu & đóng"
        description="Công việc sẽ được chuyển sang trạng thái Hoàn thành. Thao tác này không thể hoàn tác."
        confirmLabel="Nghiệm thu & Đóng"
        onConfirm={async () => {
          try {
            await xacNhanHoanThanh(data.id);
            toast.success("Đã nghiệm thu và hoàn thành công việc!");
            fetchDetail();
            onRefreshList?.();
          } catch (e: unknown) {
            toast.error(getErrorMessage(e));
          }
        }}
      />

      <QlcvConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={st === "HOAN_THANH" ? "Xóa công việc đã hoàn thành" : "Xác nhận xóa công việc"}
        description={
          st === "HOAN_THANH"
            ? "Xóa vĩnh viễn công việc đã hoàn thành. Chỉ quản trị viên hoặc người có quyền xóa mới thực hiện được."
            : "Công việc sẽ bị xóa vĩnh viễn khỏi hệ thống."
        }
        confirmLabel="Xóa vĩnh viễn"
        variant="danger"
        onConfirm={async () => {
          try {
            await deleteCongViec(data.id);
            toast.success("Đã xóa công việc!");
            onClose();
            onRefreshList?.();
          } catch (err: unknown) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
      </div>
      {printing ? (
        <QlcvTaskPrintView task={data} phoiHopLabels={phoiHopLabel} theoDoiLabels={theoDoiLabel} />
      ) : null}
    </div>
  );
}
