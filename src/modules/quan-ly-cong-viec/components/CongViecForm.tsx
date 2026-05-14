"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { createCongViec, updateCongViec } from "../actions/cong-viec.actions";
import { pheDuyetVaCapNhatDeXuat } from "../actions/dexuat.actions";
import { getNhanSuOptions, getToCongTacOptions } from "../actions/cong-viec-read.actions";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { congViecSchema } from "@/lib/validations/quan-ly-cong-viec.validations";

interface Props {
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CongViecForm({ initialData, onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [nhanSuOptions, setNhanSuOptions] = useState<any[]>([]);
  const [toCongTacOptions, setToCongTacOptions] = useState<any[]>([]);

  const [selectedNhanSu, setSelectedNhanSu] = useState(() => String(initialData?.nguoi_phu_trach_id || ""));
  const [selectedTo, setSelectedTo] = useState(() => String(initialData?.to_cong_tac_id || ""));

  useEffect(() => {
    setSelectedNhanSu(String(initialData?.nguoi_phu_trach_id || ""));
    setSelectedTo(String(initialData?.to_cong_tac_id || ""));
  }, [initialData]);

  useEffect(() => {
    const loadOptions = async () => {
      setOptionsLoading(true);
      try {
        const [ns, tct] = await Promise.all([getNhanSuOptions(), getToCongTacOptions()]);
        setNhanSuOptions(ns);
        setToCongTacOptions(tct);
      } catch (error) {
        console.error("Lỗi tải danh mục:", error);
        toast.error(
          error instanceof Error ? error.message : "Không tải được danh mục tổ / nhân sự (kiểm tra kết nối và service role)."
        );
      } finally {
        setOptionsLoading(false);
      }
    };
    void loadOptions();
  }, []);

  const { assigneeOptions, assigneeListUsesFullRoster } = useMemo(() => {
    if (!selectedTo) {
      return { assigneeOptions: nhanSuOptions, assigneeListUsesFullRoster: false };
    }
    const inTeam = nhanSuOptions.filter((opt) => String(opt.to_id || "") === String(selectedTo));
    // Nhiều triển khai chưa backfill mdm_nhan_su.to_id → lọc theo tổ trả về 0 dòng; fallback để vẫn giao được việc.
    if (inTeam.length === 0) {
      return {
        assigneeOptions: nhanSuOptions,
        assigneeListUsesFullRoster: nhanSuOptions.length > 0,
      };
    }
    return { assigneeOptions: inTeam, assigneeListUsesFullRoster: false };
  }, [nhanSuOptions, selectedTo]);

  useEffect(() => {
    if (selectedTo && selectedNhanSu) {
      const exists = assigneeOptions.some((opt) => opt.id === selectedNhanSu);
      if (!exists) setSelectedNhanSu("");
    }
  }, [selectedTo, assigneeOptions, selectedNhanSu]);

  const isPendingDeXuat =
    Boolean(initialData?.id) && initialData?.is_active === false && initialData?.trang_thai !== "DA_HUY";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const rawPayload = {
      tieu_de: formData.get("tieu_de") as string,
      mo_ta: (formData.get("mo_ta") as string) || null,
      loai_cong_viec: (formData.get("loai_cong_viec") as any) || "DOT_XUAT",
      muc_do_uu_tien: (formData.get("muc_do_uu_tien") as any) || "TRUNG_BINH",
      han_hoan_thanh: (formData.get("han_hoan_thanh") as string) || null,
      nguoi_phu_trach_id: selectedNhanSu || null,
      khoa_thuc_hien_id: null,
      to_cong_tac_id: selectedTo || null,
    };

    if (isPendingDeXuat) {
      if (!String(selectedTo || "").trim()) {
        setLoading(false);
        toast.error("Chọn tổ công tác chuyên trách trước khi phê duyệt.");
        return;
      }
      if (!String(selectedNhanSu || "").trim()) {
        setLoading(false);
        toast.error("Chọn người phụ trách trước khi phê duyệt.");
        return;
      }
    }

    const validation = congViecSchema.safeParse(rawPayload);
    if (!validation.success) {
      setLoading(false);
      const firstError = validation.error.issues[0]?.message || "Dữ liệu không hợp lệ";
      toast.error(firstError);
      return;
    }

    try {
      if (initialData?.id) {
        if (isPendingDeXuat) {
          await pheDuyetVaCapNhatDeXuat(initialData.id, validation.data);
          toast.success("Đã phê duyệt đề xuất và giao nhiệm vụ!");
        } else {
          await updateCongViec(initialData.id, validation.data);
          toast.success("Đã cập nhật và kích hoạt công việc!");
        }
      } else {
        await createCongViec(validation.data);
        toast.success("Đã tạo công việc thành công!");
      }
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Lỗi hệ thống khi lưu công việc");
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    "bv103-control-h w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none transition-[box-shadow,border-color] focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/15";
  const labelStyles = bv103LayoutChrome.labelBlock;

  const defaultHanHoanThanh = initialData?.han_hoan_thanh
    ? String(initialData.han_hoan_thanh).split("T")[0]
    : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={`grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-2 lg:gap-0 ${bv103LayoutChrome.panelSurface}`}>
        <div className="space-y-5 lg:pr-6">
          <div>
            <label className={labelStyles}>Tiêu đề công việc *</label>
            <input
              name="tieu_de"
              required
              className={inputStyles}
              placeholder="Nhập tiêu đề..."
              defaultValue={initialData?.tieu_de || ""}
            />
          </div>

          <div>
            <label className={labelStyles}>Mô tả chi tiết</label>
            <textarea
              name="mo_ta"
              rows={4}
              className={bv103LayoutChrome.textarea}
              placeholder="Nội dung công việc..."
              defaultValue={initialData?.mo_ta || ""}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelStyles}>Mức độ ưu tiên</label>
              <select
                name="muc_do_uu_tien"
                defaultValue={initialData?.muc_do_uu_tien || "TRUNG_BINH"}
                className={inputStyles}
              >
                <option value="CAO">Khẩn cấp</option>
                <option value="TRUNG_BINH">Trung bình</option>
                <option value="THAP">Thấp</option>
              </select>
            </div>
            <div>
              <label className={labelStyles}>Hạn hoàn thành</label>
              <input type="date" name="han_hoan_thanh" className={inputStyles} defaultValue={defaultHanHoanThanh} />
            </div>
          </div>
        </div>

        <div className="space-y-5 border-t border-slate-100 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <label className={labelStyles}>Loại hình</label>
            <select
              name="loai_cong_viec"
              required
              className={inputStyles}
              defaultValue={initialData?.loai_cong_viec || "DINH_KY"}
            >
              <option value="DINH_KY">Định kỳ</option>
              <option value="DOT_XUAT">Đột xuất</option>
              <option value="KHAN_CAP">Khẩn cấp</option>
            </select>
          </div>

          <div>
            <label className={labelStyles}>Tổ công tác chuyên trách</label>
            <SearchableSelect
              options={toCongTacOptions}
              placeholder={optionsLoading ? "Đang tải..." : "Chọn tổ (dm_to_cong_tac)..."}
              value={selectedTo}
              onChange={setSelectedTo}
              disabled={optionsLoading}
            />
            {!optionsLoading && toCongTacOptions.length === 0 ? (
              <p className={`mt-2 ${bv103LayoutChrome.noticeAmber}`}>
                Chưa có dòng nào trong <code className="text-[11px]">dm_to_cong_tac</code> (is_active). Thêm tổ ở Quản
                trị → Danh mục tổ công tác.
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelStyles}>Người phụ trách</label>
            <SearchableSelect
              options={assigneeOptions}
              placeholder={
                optionsLoading
                  ? "Đang tải..."
                  : selectedTo
                    ? "Tìm nhân sự (mdm_nhan_su)..."
                    : "Tìm nhân sự — chọn tổ để lọc (tuỳ chọn)..."
              }
              value={selectedNhanSu}
              onChange={setSelectedNhanSu}
              disabled={optionsLoading}
            />
            {assigneeListUsesFullRoster ? (
              <p className={`mt-2 ${bv103LayoutChrome.noticeSlate}`}>
                Không có nhân sự nào gắn <code className="text-[11px]">to_id</code> trùng tổ đã chọn; đang hiển thị toàn
                danh sách. Cập nhật cột tổ trên hồ sơ nhân sự để lọc đúng theo tổ.
              </p>
            ) : null}
          </div>

          {isPendingDeXuat && (
            <p className={bv103LayoutChrome.noticeViolet}>
              Đây là đề xuất chờ phê duyệt. Lưu sẽ <strong>phê duyệt, kích hoạt và giao</strong> theo thông tin trên.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-200/80 pt-5 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancel?.();
          }}
          className="bv103-control-h rounded-xl border border-slate-200/90 bg-white px-6 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm hover:bg-slate-50 sm:min-w-[7rem]"
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bv103-control-h rounded-xl bg-[#026f17] px-8 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-[#025a12] disabled:opacity-50 sm:min-w-[10rem]"
        >
          {loading
            ? "Đang xử lý..."
            : initialData?.id
              ? isPendingDeXuat
                ? "Phê duyệt & giao"
                : "Lưu & kích hoạt"
              : "Tạo nhiệm vụ"}
        </button>
      </div>
    </form>
  );
}
