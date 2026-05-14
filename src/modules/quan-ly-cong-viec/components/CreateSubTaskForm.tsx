"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createCongViec } from "../actions/cong-viec.actions";
import { getNhanSuOptions, getToCongTacOptions } from "../actions/cong-viec-read.actions";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { congViecSchema } from "@/lib/validations/quan-ly-cong-viec.validations";

interface Props {
  parentTaskId: string;
  /** Hạn việc cha (ISO hoặc date string) — việc con không được sau ngày này */
  parentHanHoanThanh?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateSubTaskForm({ parentTaskId, parentHanHoanThanh, onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [nhanSuOptions, setNhanSuOptions] = useState<any[]>([]);
  const [toCongTacOptions, setToCongTacOptions] = useState<any[]>([]);
  const [selectedNhanSu, setSelectedNhanSu] = useState("");
  const [selectedTo, setSelectedTo] = useState("");

  useEffect(() => {
    const load = async () => {
      setOptionsLoading(true);
      try {
        const [ns, tct] = await Promise.all([getNhanSuOptions(), getToCongTacOptions()]);
        setNhanSuOptions(ns);
        setToCongTacOptions(tct);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Không tải được danh mục tổ / nhân sự.");
      } finally {
        setOptionsLoading(false);
      }
    };
    void load();
  }, []);

  const assigneeOptions = useMemo(() => {
    if (!selectedTo) return nhanSuOptions;
    const inTeam = nhanSuOptions.filter((opt) => String(opt.to_id || "") === String(selectedTo));
    return inTeam.length ? inTeam : nhanSuOptions;
  }, [nhanSuOptions, selectedTo]);

  useEffect(() => {
    if (selectedTo && selectedNhanSu && !assigneeOptions.some((o) => o.id === selectedNhanSu)) {
      setSelectedNhanSu("");
    }
  }, [selectedTo, assigneeOptions, selectedNhanSu]);

  const inputStyles =
    "bv103-control-h w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm outline-none transition-[box-shadow,border-color] focus:border-[#026f17]/40 focus:ring-2 focus:ring-[#026f17]/15";
  const labelStyles = "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const hanRaw = (formData.get("han_hoan_thanh") as string) || "";

    if (parentHanHoanThanh && hanRaw) {
      const p = new Date(String(parentHanHoanThanh)).setHours(0, 0, 0, 0);
      const c = new Date(hanRaw).setHours(0, 0, 0, 0);
      if (c > p) {
        toast.error("Hạn việc con không được sau hạn việc cha.");
        setLoading(false);
        return;
      }
    }

    const rawPayload = {
      tieu_de: formData.get("tieu_de") as string,
      mo_ta: (formData.get("mo_ta") as string) || null,
      loai_cong_viec: (formData.get("loai_cong_viec") as "DINH_KY" | "DOT_XUAT" | "KHAN_CAP") || "DOT_XUAT",
      muc_do_uu_tien: (formData.get("muc_do_uu_tien") as "THAP" | "TRUNG_BINH" | "CAO") || "TRUNG_BINH",
      han_hoan_thanh: hanRaw || null,
      nguoi_phu_trach_id: selectedNhanSu || null,
      khoa_thuc_hien_id: null,
      to_cong_tac_id: selectedTo || null,
      cong_viec_cha_id: parentTaskId,
    };

    const validation = congViecSchema.safeParse(rawPayload);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message || "Dữ liệu không hợp lệ");
      setLoading(false);
      return;
    }
    if (!selectedNhanSu) {
      toast.error("Chọn người phụ trách cho việc con.");
      setLoading(false);
      return;
    }

    try {
      await createCongViec(validation.data);
      toast.success("Đã tạo công việc con.");
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo công việc con");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className={labelStyles}>Tên nhiệm vụ con *</label>
          <input name="tieu_de" required className={inputStyles} placeholder="Ví dụ: Chuẩn bị tài liệu…" />
        </div>

        <div>
          <label className={labelStyles}>Mô tả</label>
          <textarea
            name="mo_ta"
            rows={2}
            className="min-h-[5.5rem] w-full rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-[box-shadow,border-color] focus:border-[#026f17]/40 focus:ring-2 focus:ring-[#026f17]/15"
            placeholder="Nội dung cần làm…"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelStyles}>Loại hình</label>
            <select name="loai_cong_viec" className={inputStyles} defaultValue="DOT_XUAT">
              <option value="DINH_KY">Định kỳ</option>
              <option value="DOT_XUAT">Đột xuất</option>
              <option value="KHAN_CAP">Khẩn cấp</option>
            </select>
          </div>
          <div>
            <label className={labelStyles}>Mức độ ưu tiên</label>
            <select name="muc_do_uu_tien" className={inputStyles} defaultValue="TRUNG_BINH">
              <option value="CAO">Khẩn</option>
              <option value="TRUNG_BINH">Trung bình</option>
              <option value="THAP">Thấp</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelStyles}>Hạn hoàn thành *</label>
          <input type="date" name="han_hoan_thanh" required className={inputStyles} />
          {parentHanHoanThanh ? (
            <p className="mt-1.5 text-[10px] font-medium text-slate-500">
              Không sau hạn cha: {new Date(parentHanHoanThanh).toLocaleDateString("vi-VN")}
            </p>
          ) : null}
        </div>

        <div>
          <label className={labelStyles}>Tổ công tác</label>
          <SearchableSelect
            options={toCongTacOptions}
            placeholder={optionsLoading ? "Đang tải…" : "Chọn tổ…"}
            value={selectedTo}
            onChange={setSelectedTo}
            disabled={optionsLoading}
          />
        </div>

        <div>
          <label className={labelStyles}>Người phụ trách *</label>
          <SearchableSelect
            options={assigneeOptions}
            placeholder={optionsLoading ? "Đang tải…" : "Chọn nhân sự…"}
            value={selectedNhanSu}
            onChange={setSelectedNhanSu}
            disabled={optionsLoading}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-6 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bv103-control-h rounded-lg bg-[#026f17] px-8 text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-colors hover:bg-[#015a12] disabled:opacity-50"
        >
          {loading ? "Đang xử lý…" : "Tạo việc con"}
        </button>
      </div>
    </form>
  );
}
