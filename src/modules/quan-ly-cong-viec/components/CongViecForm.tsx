"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { createCongViec, updateCongViec } from "../actions/cong-viec.actions";
import { getQlcvFormCatalog } from "../actions/cong-viec-read.actions";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { congViecSchema } from "@/lib/validations/quan-ly-cong-viec.validations";
import type { QlcvSelectOption } from "../lib/qlcv-form-options";
import type { CongViecView } from "../types";

type QlcvLoaiCongViec = "DINH_KY" | "DOT_XUAT" | "KHAN_CAP";
type QlcvMucDoUuTien = "THAP" | "TRUNG_BINH" | "CAO";

interface Props {
  initialData?: Partial<CongViecView> & { id?: string; is_active?: boolean };
  onSuccess?: () => void;
  onCancel?: () => void;
}

/** Tạo / sửa phiếu active — phê duyệt đề xuất dùng `DeXuatApproveForm`. */
export function CongViecForm({ initialData, onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [nhanSuOptions, setNhanSuOptions] = useState<QlcvSelectOption[]>([]);
  const [toCongTacOptions, setToCongTacOptions] = useState<QlcvSelectOption[]>([]);

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
        const catalog = await getQlcvFormCatalog();
        setNhanSuOptions(catalog.nhanSu);
        setToCongTacOptions(catalog.toCongTac);
      } catch (error) {
        console.error("Lỗi tải danh mục:", error);
        toast.error(
          error instanceof Error ? error.message : "Không tải được danh mục tổ / nhân sự (kiểm tra kết nối và service role).",
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const hanRaw = formData.get("han_hoan_thanh");
    const rawPayload = {
      tieu_de: formData.get("tieu_de") as string,
      mo_ta: (formData.get("mo_ta") as string) || null,
      loai_cong_viec: (formData.get("loai_cong_viec") as QlcvLoaiCongViec) || "DOT_XUAT",
      muc_do_uu_tien: (formData.get("muc_do_uu_tien") as QlcvMucDoUuTien) || "TRUNG_BINH",
      han_hoan_thanh: hanRaw ? String(hanRaw) : null,
      nguoi_phu_trach_id: selectedNhanSu || null,
      to_cong_tac_id: selectedTo || null,
    };

    if (!initialData?.id && !String(selectedNhanSu || "").trim()) {
      setLoading(false);
      toast.error("Chọn người phụ trách — việc được giao ngay khi tạo.");
      return;
    }

    const validation = congViecSchema.safeParse(rawPayload);
    if (!validation.success) {
      setLoading(false);
      toast.error(validation.error.issues[0]?.message || "Dữ liệu không hợp lệ");
      return;
    }

    try {
      if (initialData?.id) {
        await updateCongViec(initialData.id, validation.data);
        toast.success("Đã cập nhật công việc!");
      } else {
        await createCongViec(validation.data);
        toast.success("Đã tạo công việc thành công!");
      }
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống khi lưu công việc");
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
                <option value="CAO">Cao</option>
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
              placeholder={optionsLoading ? "Đang tải..." : "Chọn tổ công tác..."}
              value={selectedTo}
              onChange={setSelectedTo}
              disabled={optionsLoading}
              searchPlaceholder="Tìm tổ theo tên hoặc mã..."
            />
          </div>

          <div>
            <label className={labelStyles}>Người phụ trách{!initialData?.id ? " *" : ""}</label>
            <SearchableSelect
              options={assigneeOptions}
              placeholder={optionsLoading ? "Đang tải..." : "Chọn nhân viên KSNK..."}
              value={selectedNhanSu}
              onChange={setSelectedNhanSu}
              disabled={optionsLoading}
            />
            {assigneeListUsesFullRoster ? (
              <p className={`mt-2 ${bv103LayoutChrome.noticeSlate}`}>
                Không có nhân sự gắn tổ đã chọn; đang hiển thị toàn roster KSNK.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-200/80 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={() => onCancel?.()}
          className="bv103-control-h rounded-xl border border-slate-200/90 bg-white px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm hover:bg-slate-50 sm:min-w-[7rem]"
        >
          Đóng
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bv103-control-h rounded-xl bg-[var(--primary)] px-8 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:opacity-90 disabled:opacity-50 sm:min-w-[10rem]"
        >
          {loading ? "Đang xử lý..." : initialData?.id ? "Lưu thay đổi" : "Tạo nhiệm vụ"}
        </button>
      </div>
    </form>
  );
}
