"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, CheckCircle2, MessageSquare, ArrowRight, Ban } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActivityTimeline, type Activity } from "./ActivityTimeline";
import { CreateSubTaskForm } from "./CreateSubTaskForm";
import { CongViecForm } from "./CongViecForm";
import { HoatDongForm } from "./HoatDongForm";
import {
  getCongViecDetail,
  xacNhanHoanThanh,
  deleteCongViec,
  tuChoiHoanThanhCongViec,
} from "../actions/cong-viec.actions";
import { xacNhanDaNhanCongViec, huyKhiChoNghiemThuKhongDat } from "../actions/cong-viec-write.actions";
import { isBoardLaneQuaHan } from "../lib/qlcv-board-lanes";
import { isChoNghiemThuHoanThanh, isChoNhanViec, isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";
import { canShowCreateSubTask, canShowDeleteTask, canShowEditTaskMetadata, canShowHoatDongProgressSection } from "../lib/qlcv-access";
import { useModulePermission } from "@/hooks/useModulePermission";
import { getCongViecTrangThaiLabel } from "../lib/qlcv-labels";
import { qlcvSubTaskChrome } from "../lib/qlcv-ux-chrome";
import type { CongViecView } from "../types";

interface Props {
  id: string;
  onClose: () => void;
  onRefreshList?: () => void;
}

type QlcvHoTenRef = { ho_ten?: string | null };
type QlcvToRef = { ten_to?: string | null };
type QlcvSubTask = {
  id: string;
  tieu_de?: string | null;
  trang_thai?: string | null;
  phan_tram_hoan_thanh?: number | null;
};
type CongViecDetailData = CongViecView & {
  nguoi_tao?: QlcvHoTenRef | null;
  nguoi_giao?: QlcvHoTenRef | null;
  nguoi_phu_trach?: QlcvHoTenRef | null;
  to_cong_tac?: QlcvToRef | null;
  cong_viec_con?: QlcvSubTask[] | null;
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
  const [isCreateSubOpen, setIsCreateSubOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

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
  const showCreateSub = canShowCreateSubTask(data, accessFlags);
  const showHoatDong = canShowHoatDongProgressSection(data, accessFlags);
  const showNghiemThuToolbar = isChoNghiemThuHoanThanh(data) && (accessFlags.hasEdit || accessFlags.isRBACAdmin);
  const st = String(data.trang_thai || "");
  const showHuyKhongDatQuaHanSom =
    (accessFlags.hasEdit || accessFlags.isRBACAdmin) &&
    isBoardLaneQuaHan(data) &&
    !isDeXuatChoDuyet(data) &&
    st !== "HOAN_THANH" &&
    st !== "DA_HUY" &&
    !isChoNghiemThuHoanThanh(data);

  const runHuyKhongDat = async () => {
    const lyDo = prompt("Lý do hủy do không đạt / chất lượng không đạt (ghi rõ):");
    if (!lyDo?.trim()) return;
    if (!confirm("Hủy phiếu (Đã hủy) — không xóa lịch sử. Tiếp tục?")) return;
    try {
      await huyKhiChoNghiemThuKhongDat(data.id, lyDo.trim());
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
          {showCreateSub && (
            <Dialog modal={false} open={isCreateSubOpen} onOpenChange={setIsCreateSubOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className={qlcvDetailChrome.btnOutline}>
                  <Plus size={16} className="mr-1.5 shrink-0" aria-hidden />
                  Tạo việc con
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl rounded-2xl border border-slate-200/90 bg-slate-50 p-6 shadow-xl sm:p-8">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">
                    Tạo nhiệm vụ con
                  </DialogTitle>
                  <p className={`mt-1 ${qlcvDetailChrome.sectionLabel}`}>Phụ thuộc: {data.tieu_de}</p>
                </DialogHeader>
                <CreateSubTaskForm
                  parentTaskId={data.id}
                  parentHanHoanThanh={data.han_hoan_thanh ?? null}
                  onSuccess={() => {
                    setIsCreateSubOpen(false);
                    fetchDetail();
                    onRefreshList?.();
                  }}
                  onCancel={() => setIsCreateSubOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}

          {isChoNhanViec(data) && (
            <Button className={qlcvDetailChrome.btnBlue} onClick={async () => {
                try {
                  await xacNhanDaNhanCongViec(data.id);
                  toast.success("Đã xác nhận nhận nhiệm vụ!");
                  fetchDetail();
                  onRefreshList?.();
                } catch (e: unknown) {
                  toast.error(getErrorMessage(e));
                }
              }}
            >
              Đã nhận nhiệm vụ
            </Button>
          )}

          {showHuyKhongDatQuaHanSom && (
            <Button
              variant="outline"
              className={`${qlcvDetailChrome.btnOutline} inline-flex items-center border-red-200/90 text-red-800 hover:bg-red-50`}
              onClick={runHuyKhongDat}
            >
              <Ban size={16} className="mr-1.5 shrink-0" aria-hidden />
              Hủy (không đạt)
            </Button>
          )}

          {showNghiemThuToolbar && (
            <>
              <Button
                variant="outline"
                className={`${qlcvDetailChrome.btnOutline} border-amber-200/90 text-amber-800 hover:bg-amber-50`}
                onClick={async () => {
                  const lyDo = prompt("Nhập lý do chưa đạt (yêu cầu làm lại):");
                  if (!lyDo) return;
                  try {
                    await tuChoiHoanThanhCongViec(data.id, lyDo);
                    toast.success("Đã trả việc về thực hiện lại.");
                    fetchDetail();
                    onRefreshList?.();
                  } catch (e: unknown) {
                    toast.error(getErrorMessage(e));
                  }
                }}
              >
                Yêu cầu làm lại
              </Button>

              <Button
                variant="outline"
                className={`${qlcvDetailChrome.btnOutline} inline-flex items-center border-red-200/90 text-red-800 hover:bg-red-50`}
                onClick={runHuyKhongDat}
              >
                <Ban size={16} className="mr-1.5 shrink-0" aria-hidden />
                Hủy (không đạt)
              </Button>

              <Button className={qlcvDetailChrome.btnPrimary} onClick={async () => {
                  if (!confirm("Xác nhận nghiệm thu và đóng công việc này?")) return;
                  try {
                    await xacNhanHoanThanh(data.id);
                    toast.success("Đã nghiệm thu và hoàn thành công việc!");
                    fetchDetail();
                    onRefreshList?.();
                  } catch (e: unknown) {
                    toast.error(getErrorMessage(e));
                  }
                }}
              >
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
            <Button variant="ghost" className={qlcvDetailChrome.btnGhost} onClick={async () => {
                const msg =
                  data.trang_thai === "HOAN_THANH"
                    ? "Xóa vĩnh viễn công việc đã hoàn thành? (chỉ quản trị / quyền xóa)"
                    : "Xác nhận xóa công việc này?";
                if (confirm(msg)) {
                  try {
                    await deleteCongViec(data.id);
                    toast.success("Đã xóa công việc!");
                    onClose();
                    onRefreshList?.();
                  } catch (err: unknown) {
                    toast.error(getErrorMessage(err));
                  }
                }
              }}
            >
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

        {showHoatDong && (
        <div className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0 text-[var(--primary)]" aria-hidden />
              <h3 className={qlcvDetailChrome.sectionHeading}>Cập nhật tiến độ</h3>
            </div>
            <HoatDongForm
              congViecId={data.id}
              initialPhanTram={Number(data.phan_tram_hoan_thanh ?? 0)}
              hasChildren={Boolean(data.cong_viec_con && data.cong_viec_con.length > 0)}
              onSuccess={() => {
                fetchDetail();
                onRefreshList?.();
                onClose();
              }}
              onCancel={() => onClose()}
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={qlcvDetailChrome.sectionHeading}>Danh sách việc con</h3>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {data.cong_viec_con?.length || 0}
          </span>
        </div>

        <div className={qlcvSubTaskChrome.list}>
          {data.cong_viec_con?.map((sub) => (
            <div key={sub.id} className={qlcvSubTaskChrome.row}>
              <div className="flex min-w-0 items-center gap-3">
                <div className={qlcvSubTaskChrome.iconWrap}>
                  <ArrowRight size={16} aria-hidden />
                </div>
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold text-slate-800">{sub.tieu_de}</h4>
                  <p className={`mt-0.5 ${qlcvDetailChrome.sectionLabel}`}>{getCongViecTrangThaiLabel(sub)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="hidden text-right sm:block">
                  <div className="text-xs font-semibold text-[var(--primary)]">{sub.phan_tram_hoan_thanh || 0}%</div>
                  <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[var(--primary)]"
                      style={{ width: `${sub.phan_tram_hoan_thanh || 0}%` }}
                    />
                  </div>
                </div>
                <Button variant="outline" className={qlcvDetailChrome.btnOutline} onClick={() => setActiveId(sub.id)}>
                  Xem
                </Button>
              </div>
            </div>
          ))}
          {(!data.cong_viec_con || data.cong_viec_con.length === 0) && (
            <div className={qlcvDetailChrome.dashedEmpty}>
              <p className={qlcvDetailChrome.sectionLabel}>Chưa có công việc con</p>
            </div>
          )}
        </div>
      </div>

      <div className={`p-5 sm:p-6 ${qlcvDetailChrome.panel}`}>
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare size={18} className="shrink-0 text-[var(--primary)]" aria-hidden />
          <h3 className={qlcvDetailChrome.sectionHeading}>Lịch sử hoạt động</h3>
        </div>
        <ActivityTimeline activities={data.hoat_dong || []} />
      </div>
    </div>
  );
}
