"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import { BV103_DIALOG_STACK } from "@/lib/bv103-dialog-stack";
import { todayYmdInVn } from "@/lib/format-datetime-vi";
import {
  normalizeQlcvChecklist,
  serializeQlcvChecklistToMoTa,
  taskUsesQlcvChecklistForProgress,
} from "@/lib/domain/qlcv-checklist";
import {
  upsertDinhKyMau,
  type MaChuKyDinhKy,
  type MucDoUuTienDinhKy,
} from "../../actions/dinh-ky.actions";
import type { CongViecView } from "../../types";

interface QlcvSaveDinhKyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: CongViecView;
  onSuccess?: () => void;
}

export function QlcvSaveDinhKyDialog({
  open,
  onOpenChange,
  task,
  onSuccess,
}: QlcvSaveDinhKyDialogProps) {
  const [tieuDe, setTieuDe] = useState(() => task.tieu_de ?? "");
  const [maChuKy, setMaChuKy] = useState<MaChuKyDinhKy>("MONTHLY");
  const [ngayBatDau, setNgayBatDau] = useState(() => todayYmdInVn());
  const [ngayKetThuc, setNgayKetThuc] = useState("");
  const [mucDoUuTien, setMucDoUuTien] = useState<MucDoUuTienDinhKy>(
    (task.muc_do_uu_tien as MucDoUuTienDinhKy) || "TRUNG_BINH",
  );
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const titleTrimmed = tieuDe.trim();
    if (!titleTrimmed) {
      toast.error("Vui lòng nhập tiêu đề mẫu định kỳ.");
      return;
    }
    if (!ngayBatDau) {
      toast.error("Vui lòng chọn ngày bắt đầu hiệu lực.");
      return;
    }

    setBusy(true);
    try {
      // Chuẩn bị mô tả hoặc checklist từ công việc nguồn
      let moTa = task.mo_ta ?? "";
      if (taskUsesQlcvChecklistForProgress(task)) {
        const items = normalizeQlcvChecklist(task.checklist);
        if (items.length > 0) {
          moTa = serializeQlcvChecklistToMoTa(items);
        }
      }

      await upsertDinhKyMau({
        tieu_de: titleTrimmed,
        mo_ta: moTa || null,
        ma_chu_ky: maChuKy,
        ngay_bat_dau: ngayBatDau,
        ngay_ket_thuc: ngayKetThuc.trim() || null,
        nguoi_phu_trach_id: task.nguoi_phu_trach_id || null,
        to_cong_tac_id: task.to_cong_tac_id || null,
        nhom_chuyen_mon_id: task.nhom_chuyen_mon_id || null,
        muc_do_uu_tien: mucDoUuTien,
        vi_tri_thuc_hien: task.vi_tri_thuc_hien || null,
        dia_diem_khoa_id: task.dia_diem_khoa_id || null,
        dia_diem_khoa_ids: task.dia_diem_khoa_ids || null,
        nguoi_phoi_hop_ids: task.nguoi_phoi_hop_ids || [],
        nguoi_theo_doi_ids: task.nguoi_theo_doi_ids || [],
        nhiem_vu_id: task.nhiem_vu_id || null,
        is_active: true,
      });

      toast.success("Đã tạo mẫu định kỳ thành công từ công việc này.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo mẫu định kỳ.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent
        className={`max-w-md rounded-[var(--radius-shell)] border border-slate-200/90 bg-white p-6 shadow-[var(--shadow-app-soft)] ${BV103_DIALOG_STACK.nestedContent}`}
        overlayClassName={BV103_DIALOG_STACK.nestedOverlay}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <CalendarClock className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-slate-800">
                  Lưu thành mẫu định kỳ
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Tạo quy tắc tự động sinh công việc định kỳ từ cấu hình hiện tại.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <label className="mb-1 block font-medium text-slate-700">
                Tiêu đề mẫu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={tieuDe}
                onChange={(e) => setTieuDe(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Nhập tiêu đề mẫu định kỳ..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Chu kỳ lặp <span className="text-red-500">*</span>
                </label>
                <select
                  value={maChuKy}
                  onChange={(e) => setMaChuKy(e.target.value as MaChuKyDinhKy)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="DAILY">Hàng ngày</option>
                  <option value="WEEKLY">Hàng tuần</option>
                  <option value="MONTHLY">Hàng tháng</option>
                  <option value="QUARTERLY">Hàng quý</option>
                  <option value="YEARLY">Hàng năm</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Mức độ ưu tiên
                </label>
                <select
                  value={mucDoUuTien}
                  onChange={(e) => setMucDoUuTien(e.target.value as MucDoUuTienDinhKy)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="THAP">Thấp</option>
                  <option value="TRUNG_BINH">Trung bình</option>
                  <option value="CAO">Cao</option>
                  <option value="KHAN_CAP">Khẩn cấp</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Bắt đầu hiệu lực <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={ngayBatDau}
                  onChange={(e) => setNgayBatDau(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Kết thúc hiệu lực (tùy chọn)
                </label>
                <input
                  type="date"
                  value={ngayKetThuc}
                  onChange={(e) => setNgayKetThuc(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="rounded-md bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600 border border-slate-200/80">
              💡 Mẫu định kỳ sẽ tự động kế thừa người phụ trách, phối hợp, người theo dõi, địa điểm và danh mục checklist từ công việc hiện tại.
            </div>
          </div>

          <DialogFooter className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={busy}
              onClick={() => onOpenChange(false)}
              className={C.btnSecondary}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`${C.btnPrimary} bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 inline-flex items-center gap-1.5`}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              <span>Lưu mẫu</span>
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
