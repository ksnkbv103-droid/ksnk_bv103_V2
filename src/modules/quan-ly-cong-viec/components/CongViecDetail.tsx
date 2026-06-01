"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, MessageSquare, Ban } from "lucide-react";
import { QlcvConfirmDialog } from "./dialogs/QlcvConfirmDialog";
import { QlcvReasonDialog } from "./dialogs/QlcvReasonDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActivityTimeline, type Activity } from "./ActivityTimeline";
import { CongViecForm } from "./CongViecForm";
import { HoatDongForm } from "./HoatDongForm";
import { QlcvChecklistPanel } from "./QlcvChecklistPanel";
import {
  getCongViecDetail,
  xacNhanHoanThanh,
  deleteCongViec,
  tuChoiHoanThanhCongViec,
} from "../actions/cong-viec.actions";
import { huyKhiChoNghiemThuKhongDat } from "../actions/cong-viec-write.actions";
import { isBoardLaneQuaHan } from "../lib/qlcv-board-lanes";
import { isChoNghiemThuHoanThanh, isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";
import { canShowDeleteTask, canShowEditTaskMetadata, canShowHoatDongProgressSection } from "../lib/qlcv-access";
import { useModulePermission } from "@/hooks/useModulePermission";
import { getCongViecTrangThaiLabel } from "../lib/qlcv-labels";
import type { CongViecView } from "../types";

interface Props {
  id: string;
  onClose: () => void;
  onRefreshList?: () => void;
}

type QlcvHoTenRef = { ho_ten?: string | null };
type QlcvToRef = { ten_to?: string | null };
type CongViecDetailData = CongViecView & {
  nguoi_tao?: QlcvHoTenRef | null;
  nguoi_giao?: QlcvHoTenRef | null;
  nguoi_phu_trach?: QlcvHoTenRef | null;
  to_cong_tac?: QlcvToRef | null;
  hoat_dong?: Activity[] | null;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Có lỗi xảy ra.";
}

/** Đồng bộ với KsnkSupervisionHero / trang QLCV */
const qlcvDetailChrome = {
  panel:
    "rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]",
  panelToolbar:
    "rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]",
  metaTile:
    "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.02] sm:p-5",
  dashedEmpty: "rounded-2xl border-2 border-dashed border-slate-200/90 bg-slate-50/50 py-10 text-center",
  sectionLabel: "text-[11px] font-semibold uppercase tracking-wider text-slate-500",
  sectionHeading: "text-sm font-semibold uppercase tracking-wider text-slate-800",
  btnOutline:
    "bv103-control-h h-11 shrink-0 rounded-xl border border-slate-200/90 bg-white px-4 text-[10px] font-semibold uppercase tracking-wide text-slate-800 shadow-sm hover:bg-slate-50",
  btnPrimary:
    "bv103-control-h h-11 shrink-0 rounded-xl bg-[#026f17] px-4 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-[#025a12]",
  btnBlue: "bv103-control-h h-11 shrink-0 rounded-xl bg-blue-600 px-4 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-blue-700",
  btnGhost:
    "bv103-control-h h-11 shrink-0 rounded-xl border border-transparent px-3 text-[10px] font-semibold uppercase tracking-wide text-red-600 hover:border-red-100 hover:bg-red-50",
  dialogContent: "max-w-4xl rounded-2xl border border-slate-200/90 bg-slate-50 p-6 shadow-xl sm:p-8",
} as const;

export function CongViecDetail({ id, onClose, onRefreshList }: Props) {
  const { isAdmin, allowed, userData } = useModulePermission("CONG_VIEC");
  const accessFlags = {
    isRBACAdmin: isAdmin,
    hasDelete: allowed.delete,
    hasEdit: allowed.edit,
    hasCreate: allowed.create,
    actorStaffId: userData?.id ?? null,
  };
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CongViecDetailData | null>(null);
  const [activeId, setActiveId] = useState(id);
  const [isEditOpen, setIsEditOpen] = useState(false);
  // Dialog state — thay thế browser prompt()/confirm()
  const [confirmNghiemThuOpen, setConfirmNghiemThuOpen] = useState(false);
  const [confirmNghiemThuForce, setConfirmNghiemThuForce] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [reasonHuyOpen, setReasonHuyOpen] = useState(false);
  const [reasonTuChoiOpen, setReasonTuChoiOpen] = useState(false);

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

  if (loading)
    return (
      <div className={`flex min-h-[14rem] items-center justify-center p-8 ${qlcvDetailChrome.panel}`}>
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-[#026f17] border-t-transparent"
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

  const showDelete = canShowDeleteTask(data, accessFlags);
  const showEditMetadata = canShowEditTaskMetadata(data, accessFlags);
  const st = String(data.trang_thai || "");
  const showHoatDong = canShowHoatDongProgressSection(data, accessFlags);
  const checklistReadOnly =
    isDeXuatChoDuyet(data) || st === "HOAN_THANH" || st === "DA_HUY" || isChoNghiemThuHoanThanh(data);
  const showNghiemThuToolbar = isChoNghiemThuHoanThanh(data) && (accessFlags.hasEdit || accessFlags.isRBACAdmin);
  const isCreatorOrAssigner =
    (accessFlags.actorStaffId && data.nguoi_tao_id && String(accessFlags.actorStaffId) === String(data.nguoi_tao_id)) ||
    (accessFlags.actorStaffId && data.nguoi_giao_viec_id && String(accessFlags.actorStaffId) === String(data.nguoi_giao_viec_id));
  const showHuyButton =
    accessFlags.isRBACAdmin &&
    st !== "HOAN_THANH" &&
    st !== "DA_HUY" &&
    !isChoNghiemThuHoanThanh(data);
  const showForceNghiemThu =
    (accessFlags.hasEdit || accessFlags.isRBACAdmin) &&
    st !== "HOAN_THANH" &&
    st !== "DA_HUY" &&
    !isChoNghiemThuHoanThanh(data);

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
    <div className="space-y-6 pb-16 animate-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-xs font-medium normal-case tracking-normal text-emerald-900">
              {statusDisplay}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              #{data.id?.slice(0, 8)}
            </span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">{data.tieu_de}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
            {data.mo_ta || "Không có mô tả chi tiết cho nhiệm vụ này."}
          </p>
        </div>

        <div className={`flex shrink-0 flex-wrap gap-2 ${qlcvDetailChrome.panelToolbar}`}>
          {showHuyButton && (
            <Button
              variant="outline"
              className={`${qlcvDetailChrome.btnOutline} inline-flex items-center border-red-200/90 text-red-800 hover:bg-red-50`}
              onClick={() => setReasonHuyOpen(true)}
            >
              <Ban size={16} className="mr-1.5 shrink-0" aria-hidden />
              Hủy công việc
            </Button>
          )}

          {showForceNghiemThu && (
            <Button
              className={qlcvDetailChrome.btnPrimary}
              onClick={() => setConfirmNghiemThuForce(true)}
            >
              Nghiệm thu & Đóng
            </Button>
          )}

          {showNghiemThuToolbar && (
            <>
              <Button
                variant="outline"
                className={`${qlcvDetailChrome.btnOutline} border-amber-200/90 text-amber-800 hover:bg-amber-50`}
                onClick={() => setReasonTuChoiOpen(true)}
              >
                Yêu cầu làm lại
              </Button>

              <Button
                variant="outline"
                className={`${qlcvDetailChrome.btnOutline} inline-flex items-center border-red-200/90 text-red-800 hover:bg-red-50`}
                onClick={() => setReasonHuyOpen(true)}
              >
                <Ban size={16} className="mr-1.5 shrink-0" aria-hidden />
                Hủy (không đạt)
              </Button>

              <Button className={qlcvDetailChrome.btnPrimary} onClick={() => setConfirmNghiemThuOpen(true)}>
                Nghiệm thu & Đóng
              </Button>
            </>
          )}

          {showEditMetadata && (
            <Dialog modal={false} open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className={qlcvDetailChrome.btnOutline}>
                  Sửa nhiệm vụ
                </Button>
              </DialogTrigger>
              <DialogContent className={qlcvDetailChrome.dialogContent}>
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
            <Button variant="ghost" className={qlcvDetailChrome.btnGhost} onClick={() => setConfirmDeleteOpen(true)}>
              Xóa
            </Button>
          )}
        </div>
      </div>

      <div className={`divide-y divide-slate-100 overflow-hidden ${qlcvDetailChrome.panel}`}>
        <div className="p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className={qlcvDetailChrome.sectionLabel}>Tiến độ thực hiện</span>
            <span className="text-sm font-semibold text-[var(--primary)]">{Number(data.phan_tram_hoan_thanh ?? 0)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all"
              style={{ width: `${Math.min(100, Math.max(0, Number(data.phan_tram_hoan_thanh ?? 0)))}%` }}
            />
          </div>
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
              val: data.han_hoan_thanh ? new Date(data.han_hoan_thanh).toLocaleDateString("vi-VN") : "—",
            },
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
          <div className="space-y-4 border-t border-slate-100 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0 text-[var(--primary)]" aria-hidden />
              <h3 className={qlcvDetailChrome.sectionHeading}>Ghi chú tiến độ (tùy chọn)</h3>
            </div>
            <p className="text-xs text-slate-500">Ưu tiên tick checklist phía trên; form này chỉ khi cần ghi chú thêm.</p>
            <HoatDongForm
              congViecId={data.id}
              initialPhanTram={Number(data.phan_tram_hoan_thanh ?? 0)}
              hasChildren={false}
              onSuccess={() => {
                fetchDetail();
                onRefreshList?.();
              }}
              onCancel={() => onClose()}
            />
          </div>
        ) : null}
      </div>

      <div className={`p-5 sm:p-6 ${qlcvDetailChrome.panel}`}>
        <div className="mb-4 flex items-center gap-2">
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
        open={confirmNghiemThuForce}
        onOpenChange={setConfirmNghiemThuForce}
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
        title={data.trang_thai === "HOAN_THANH" ? "Xóa công việc đã hoàn thành" : "Xác nhận xóa công việc"}
        description={
          data.trang_thai === "HOAN_THANH"
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
  );
}
