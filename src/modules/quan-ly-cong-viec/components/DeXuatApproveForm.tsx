"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { pheDuyetDeXuat, pheDuyetVaCapNhatDeXuat } from "../actions/dexuat.actions";
import { getQlcvFormCatalog } from "../actions/cong-viec-read.actions";
import { QlcvReasonDialog } from "./dialogs/QlcvReasonDialog";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { congViecSchema } from "@/lib/validations/quan-ly-cong-viec.validations";
import type { QlcvSelectOption } from "../lib/qlcv-form-options";
import type { CongViecView } from "../types";

type QlcvLoaiCongViec = "DOT_XUAT" | "KHAN_CAP";
type QlcvMucDoUuTien = "THAP" | "TRUNG_BINH" | "CAO";

interface Props {
  proposal: CongViecView;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Form phê duyệt đề xuất — tách khỏi CongViecForm (create/edit việc active).
 */
export function DeXuatApproveForm({ proposal, onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [nhanSuOptions, setNhanSuOptions] = useState<QlcvSelectOption[]>([]);
  const [toCongTacOptions, setToCongTacOptions] = useState<QlcvSelectOption[]>([]);
  const [selectedNhanSu, setSelectedNhanSu] = useState("");
  const [selectedTo, setSelectedTo] = useState("");
  const [tieuDe, setTieuDe] = useState(proposal.tieu_de);
  const [moTa, setMoTa] = useState(proposal.mo_ta ?? "");
  const [loaiCongViec, setLoaiCongViec] = useState<QlcvLoaiCongViec>(
    proposal.loai_cong_viec === "KHAN_CAP" ? "KHAN_CAP" : "DOT_XUAT",
  );
  const [mucDoUuTien, setMucDoUuTien] = useState<QlcvMucDoUuTien>(
    (proposal.muc_do_uu_tien as QlcvMucDoUuTien) || "TRUNG_BINH",
  );
  const [hanHoanThanh, setHanHoanThanh] = useState(
    proposal.han_hoan_thanh ? String(proposal.han_hoan_thanh).split("T")[0] : "",
  );

  useEffect(() => {
    setTieuDe(proposal.tieu_de);
    setMoTa(proposal.mo_ta ?? "");
    setLoaiCongViec(proposal.loai_cong_viec === "KHAN_CAP" ? "KHAN_CAP" : "DOT_XUAT");
    setMucDoUuTien((proposal.muc_do_uu_tien as QlcvMucDoUuTien) || "TRUNG_BINH");
    setHanHoanThanh(proposal.han_hoan_thanh ? String(proposal.han_hoan_thanh).split("T")[0] : "");
    setSelectedNhanSu("");
    setSelectedTo("");
  }, [proposal]);

  useEffect(() => {
    const load = async () => {
      setOptionsLoading(true);
      try {
        const catalog = await getQlcvFormCatalog();
        setNhanSuOptions(catalog.nhanSu);
        setToCongTacOptions(catalog.toCongTac);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không tải được danh mục.");
      } finally {
        setOptionsLoading(false);
      }
    };
    void load();
  }, []);

  const { assigneeOptions, assigneeListUsesFullRoster } = useMemo(() => {
    if (!selectedTo) {
      return { assigneeOptions: nhanSuOptions, assigneeListUsesFullRoster: false };
    }
    const inTeam = nhanSuOptions.filter((opt) => String(opt.to_id || "") === String(selectedTo));
    if (inTeam.length === 0) {
      return { assigneeOptions: nhanSuOptions, assigneeListUsesFullRoster: nhanSuOptions.length > 0 };
    }
    return { assigneeOptions: inTeam, assigneeListUsesFullRoster: false };
  }, [nhanSuOptions, selectedTo]);

  useEffect(() => {
    if (selectedTo && selectedNhanSu) {
      const exists = assigneeOptions.some((opt) => opt.id === selectedNhanSu);
      if (!exists) setSelectedNhanSu("");
    }
  }, [selectedTo, assigneeOptions, selectedNhanSu]);

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!String(selectedTo || "").trim()) {
      toast.error("Chọn tổ công tác chuyên trách trước khi phê duyệt.");
      return;
    }
    if (!String(selectedNhanSu || "").trim()) {
      toast.error("Chọn người phụ trách trước khi phê duyệt.");
      return;
    }

    const payload = {
      tieu_de: tieuDe.trim(),
      mo_ta: moTa.trim() || null,
      loai_cong_viec: loaiCongViec,
      muc_do_uu_tien: mucDoUuTien,
      han_hoan_thanh: hanHoanThanh || null,
      nguoi_phu_trach_id: selectedNhanSu,
      to_cong_tac_id: selectedTo,
    };

    const validation = congViecSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message || "Dữ liệu không hợp lệ");
      return;
    }

    setLoading(true);
    try {
      await pheDuyetVaCapNhatDeXuat(proposal.id, validation.data);
      toast.success("Đã phê duyệt đề xuất và giao nhiệm vụ!");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không phê duyệt được.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    "bv103-control-h w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none transition-[box-shadow,border-color] focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/15";
  const labelStyles = bv103LayoutChrome.labelBlock;
  const readOnlyStyles =
    "rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2.5 text-sm text-slate-800";

  return (
    <form onSubmit={handleApprove} className="space-y-6">
      <div className={`space-y-4 p-5 sm:p-6 ${bv103LayoutChrome.panelSurface}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelStyles}>Tiêu đề *</label>
            <input
              required
              value={tieuDe}
              onChange={(e) => setTieuDe(e.target.value)}
              className={inputStyles}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelStyles}>Mô tả</label>
            <textarea
              rows={4}
              value={moTa}
              onChange={(e) => setMoTa(e.target.value)}
              className={bv103LayoutChrome.textarea}
              placeholder="Bổ sung / chỉnh nội dung công việc..."
            />
          </div>
          <div>
            <span className={labelStyles}>Người đề xuất</span>
            <div className={readOnlyStyles}>{proposal.nguoi_tao_ten || "—"}</div>
          </div>
          <div>
            <label className={labelStyles}>Loại hình</label>
            <select value={loaiCongViec} onChange={(e) => setLoaiCongViec(e.target.value as QlcvLoaiCongViec)} className={inputStyles}>
              <option value="DOT_XUAT">Đột xuất</option>
              <option value="KHAN_CAP">Khẩn cấp</option>
            </select>
          </div>
          <div>
            <label className={labelStyles}>Mức ưu tiên</label>
            <select value={mucDoUuTien} onChange={(e) => setMucDoUuTien(e.target.value as QlcvMucDoUuTien)} className={inputStyles}>
              <option value="CAO">Cao</option>
              <option value="TRUNG_BINH">Trung bình</option>
              <option value="THAP">Thấp</option>
            </select>
          </div>
          <div>
            <label className={labelStyles}>Hạn hoàn thành</label>
            <input
              type="date"
              value={hanHoanThanh}
              onChange={(e) => setHanHoanThanh(e.target.value)}
              className={inputStyles}
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-4">
          <div>
            <label className={labelStyles}>Tổ công tác chuyên trách *</label>
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
            <label className={labelStyles}>Người phụ trách *</label>
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
          onClick={onCancel}
          className="bv103-control-h rounded-xl border border-slate-200/90 bg-white px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm hover:bg-slate-50 sm:min-w-[7rem]"
        >
          Đóng
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => setRejectOpen(true)}
          className="bv103-control-h rounded-xl border border-red-200 bg-red-50 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-red-800 shadow-sm hover:bg-red-100 disabled:opacity-50 sm:min-w-[9rem]"
        >
          Từ chối
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bv103-control-h rounded-xl bg-[var(--primary)] px-8 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:opacity-90 disabled:opacity-50 sm:min-w-[10rem]"
        >
          {loading ? "Đang xử lý…" : "Phê duyệt & giao"}
        </button>
      </div>

      <QlcvReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Từ chối đề xuất"
        description="Đề xuất không thành phiếu điều hành. Lý do được ghi vào nhật ký."
        placeholder="Lý do không phù hợp / không duyệt…"
        confirmLabel="Từ chối"
        onConfirm={async (lyDo) => {
          setLoading(true);
          try {
            await pheDuyetDeXuat(proposal.id, false, lyDo);
            toast.success("Đã từ chối đề xuất.");
            onSuccess?.();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Không từ chối được.");
          } finally {
            setLoading(false);
          }
        }}
      />
    </form>
  );
}
