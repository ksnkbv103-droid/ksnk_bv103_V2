"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Clock, User, Users, CheckCircle2, MessageSquare, ArrowRight, CalendarClock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActivityTimeline } from "./ActivityTimeline";
import { CreateSubTaskForm } from "./CreateSubTaskForm";
import { CongViecForm } from "./CongViecForm";
import { HoatDongForm } from "./HoatDongForm";
import {
  getCongViecDetail,
  xacNhanHoanThanh,
  deleteCongViec,
  tuChoiHoanThanhCongViec,
} from "../actions/cong-viec.actions";
import { xacNhanDaNhanCongViec, giaHanCongViec } from "../actions/cong-viec-write.actions";
import { isChoNghiemThuHoanThanh, isChoNhanViec, isDeXuatChoDuyet } from "../lib/qlcv-workflow-display";
import { canShowDeleteTask, canShowEditTaskMetadata } from "../lib/qlcv-access";
import { useModulePermission } from "@/hooks/useModulePermission";

interface Props {
  id: string;
  onClose: () => void;
  onRefreshList?: () => void;
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
  dialogSm: "max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl",
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
  const [data, setData] = useState<any>(null);
  const [activeId, setActiveId] = useState(id);
  const [isCreateSubOpen, setIsCreateSubOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [giaHanOpen, setGiaHanOpen] = useState(false);
  const [giaHanDate, setGiaHanDate] = useState("");
  const [giaHanLyDo, setGiaHanLyDo] = useState("");

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await getCongViecDetail(activeId);
      setData(res);
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

  const statusLabel = (() => {
    if (isDeXuatChoDuyet(data)) return "Đề xuất chờ duyệt";
    if (isChoNhanViec(data)) return "Chờ nhận việc";
    if (isChoNghiemThuHoanThanh(data)) return "Chờ nghiệm thu";
    return data.trang_thai?.replace(/_/g, " ");
  })();

  const showDelete = canShowDeleteTask(data, accessFlags);
  const showEditMetadata = canShowEditTaskMetadata(data, accessFlags);

  const submitGiaHan = async () => {
    if (!giaHanDate || !giaHanLyDo.trim()) {
      toast.error("Nhập ngày hạn mới và lý do gia hạn.");
      return;
    }
    try {
      await giaHanCongViec(data.id, giaHanDate, giaHanLyDo.trim());
      toast.success("Đã gia hạn hạn hoàn thành.");
      setGiaHanOpen(false);
      setGiaHanLyDo("");
      fetchDetail();
      onRefreshList?.();
    } catch (e: any) {
      toast.error(e.message || "Không thể gia hạn");
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
              {statusLabel}
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
          {data.trang_thai !== "HOAN_THANH" && data.trang_thai !== "DA_HUY" && (
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
                } catch (e: any) {
                  toast.error(e.message || "Không thể xác nhận");
                }
              }}
            >
              Đã nhận nhiệm vụ
            </Button>
          )}

          {isChoNghiemThuHoanThanh(data) && (
            <>
              <Dialog open={giaHanOpen} onOpenChange={setGiaHanOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className={qlcvDetailChrome.btnOutline}>
                    <CalendarClock size={16} className="mr-1.5 shrink-0" aria-hidden />
                    Gia hạn
                  </Button>
                </DialogTrigger>
                <DialogContent className={qlcvDetailChrome.dialogSm}>
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">
                      Gia hạn hạn hoàn thành
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <label className={`${qlcvDetailChrome.sectionLabel} mb-1.5 ml-0.5 block`}>Hạn mới</label>
                      <input
                        type="date"
                        className="bv103-control-h mt-1 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm outline-none focus:border-[#026f17]/40 focus:ring-2 focus:ring-[#026f17]/15"
                        value={giaHanDate}
                        onChange={(e) => setGiaHanDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={`${qlcvDetailChrome.sectionLabel} mb-1.5 ml-0.5 block`}>Lý do</label>
                      <textarea
                        className="mt-1 min-h-[88px] w-full rounded-xl border border-slate-200 p-3 text-sm shadow-sm outline-none focus:border-[#026f17]/40 focus:ring-2 focus:ring-[#026f17]/15"
                        value={giaHanLyDo}
                        onChange={(e) => setGiaHanLyDo(e.target.value)}
                        placeholder="Ghi rõ lý do gia hạn..."
                      />
                    </div>
                    <Button className="h-11 w-full rounded-xl font-semibold" onClick={submitGiaHan}>
                      Lưu gia hạn
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

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
                  } catch (e: any) {
                    toast.error(e.message || "Lỗi khi xử lý");
                  }
                }}
              >
                Yêu cầu làm lại
              </Button>

              <Button className={qlcvDetailChrome.btnPrimary} onClick={async () => {
                  if (!confirm("Xác nhận nghiệm thu và đóng công việc này?")) return;
                  try {
                    await xacNhanHoanThanh(data.id);
                    toast.success("Đã nghiệm thu và hoàn thành công việc!");
                    fetchDetail();
                    onRefreshList?.();
                  } catch (e: any) {
                    toast.error(e.message || "Lỗi khi xử lý");
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
                  } catch (err: any) {
                    toast.error(err.message);
                  }
                }
              }}
            >
              Xóa
            </Button>
          )}
        </div>
      </div>

      <div className={`p-5 sm:p-6 ${qlcvDetailChrome.panel}`}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className={qlcvDetailChrome.sectionLabel}>Tiến độ thực hiện</span>
          <span className="text-sm font-semibold text-[var(--primary)]">
            {Number(data.phan_tram_hoan_thanh ?? 0)}%
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all"
            style={{ width: `${Math.min(100, Math.max(0, Number(data.phan_tram_hoan_thanh ?? 0)))}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: "Người đề xuất", val: data.nguoi_tao?.ho_ten || "---", icon: User },
          {
            label: "Người giao",
            val:
              data.nguoi_giao?.ho_ten ||
              (isDeXuatChoDuyet(data)
                ? "— (ghi khi phê duyệt đề xuất)"
                : data.nguoi_tao?.ho_ten
                  ? `${data.nguoi_tao.ho_ten} (tạo việc)`
                  : "—"),
            icon: User,
          },
          { label: "Phụ trách", val: data.nguoi_phu_trach?.ho_ten || "---", icon: User },
          { label: "Tổ công tác", val: data.to_cong_tac?.ten_to || "---", icon: Users },
          {
            label: "Hạn chót",
            val: data.han_hoan_thanh ? new Date(data.han_hoan_thanh).toLocaleDateString("vi-VN") : "---",
            icon: Clock,
          },
          {
            label: "Tiến độ",
            val: `${Number(data.phan_tram_hoan_thanh ?? 0)}%`,
            icon: CheckCircle2,
            color: "text-[var(--primary)]",
          },
        ].map((item, i) => (
          <div key={i} className={`flex flex-col gap-2 ${qlcvDetailChrome.metaTile}`}>
            <div className={`flex items-center gap-1.5 ${qlcvDetailChrome.sectionLabel}`}>
              <item.icon size={14} className={item.color || "text-slate-400"} aria-hidden /> {item.label}
            </div>
            <div className={`text-sm font-medium text-slate-800 ${item.color || ""}`}>{item.val}</div>
          </div>
        ))}
      </div>

      {data.trang_thai !== "HOAN_THANH" && data.trang_thai !== "DA_HUY" && (
        <div className={`space-y-5 p-5 sm:p-6 ${qlcvDetailChrome.panel}`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-[var(--primary)]" aria-hidden />
            <h3 className={qlcvDetailChrome.sectionHeading}>Cập nhật tiến độ</h3>
          </div>
          <HoatDongForm
            congViecId={data.id}
            initialPhanTram={Number(data.phan_tram_hoan_thanh ?? 0)}
            onSuccess={() => {
              fetchDetail();
              onRefreshList?.();
            }}
          />
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={qlcvDetailChrome.sectionHeading}>Danh sách việc con</h3>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {data.cong_viec_con?.length || 0}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {data.cong_viec_con?.map((sub: any) => (
            <div
              key={sub.id}
              className={`group flex items-center justify-between gap-3 p-4 transition-colors hover:border-[var(--primary)]/25 sm:p-5 ${qlcvDetailChrome.metaTile}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-400 transition-colors group-hover:border-[var(--primary)]/20 group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)]">
                  <ArrowRight size={16} aria-hidden />
                </div>
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold text-slate-800">{sub.tieu_de}</h4>
                  <p className={`mt-0.5 ${qlcvDetailChrome.sectionLabel}`}>{sub.trang_thai?.replace(/_/g, " ")}</p>
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
