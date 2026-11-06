"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { pheDuyetDeXuat, pheDuyetVaCapNhatDeXuat } from "../actions/dexuat.actions";
import { getQlcvFormCatalog } from "../actions/cong-viec-read.actions";
import { QlcvReasonDialog } from "./dialogs/QlcvReasonDialog";
import SearchableSelect from "@/components/shared/SearchableSelect";
import SearchableMultiSelect from "@/components/shared/SearchableMultiSelect";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { congViecSchemaWithHanRule } from "@/lib/validations/quan-ly-cong-viec.validations";
import type { QlcvSelectOption } from "../lib/qlcv-form-options";
import { normalizeQlcvStaffIdList } from "../lib/qlcv-staff-ids";
import { qlcvDateVnFromInstant } from "../lib/qlcv-today-vn";
import type { CongViecView } from "../types";

function proposalKhoaIds(p: CongViecView): string[] {
  if (p.dia_diem_khoa_ids?.length) return p.dia_diem_khoa_ids;
  return p.dia_diem_khoa_id ? [p.dia_diem_khoa_id] : [];
}

/** loai = cách sinh; ưu tiên = urgency. Approve giữ KHAN_CAP legacy nếu đề xuất cũ có. */
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
  const [selectedNhanSu, setSelectedNhanSu] = useState(
    proposal.nguoi_phu_trach_id ? String(proposal.nguoi_phu_trach_id) : "",
  );
  const [selectedTo, setSelectedTo] = useState(
    proposal.to_cong_tac_id ? String(proposal.to_cong_tac_id) : "",
  );
  const [tieuDe, setTieuDe] = useState(proposal.tieu_de);
  const [moTa, setMoTa] = useState(proposal.mo_ta ?? "");
  const [loaiCongViec, setLoaiCongViec] = useState<QlcvLoaiCongViec>(
    proposal.loai_cong_viec === "KHAN_CAP" ? "KHAN_CAP" : "DOT_XUAT",
  );
  const [mucDoUuTien, setMucDoUuTien] = useState<QlcvMucDoUuTien>(
    (proposal.muc_do_uu_tien as QlcvMucDoUuTien) || "TRUNG_BINH",
  );
  const [hanHoanThanh, setHanHoanThanh] = useState(
    proposal.han_hoan_thanh
      ? (qlcvDateVnFromInstant(proposal.han_hoan_thanh) ?? String(proposal.han_hoan_thanh).split("T")[0])
      : "",
  );
  const [khoaPhongOptions, setKhoaPhongOptions] = useState<QlcvSelectOption[]>([]);
  const [selectedKhoaIds, setSelectedKhoaIds] = useState<string[]>(() => proposalKhoaIds(proposal));
  const [phoiHopIds, setPhoiHopIds] = useState<string[]>(() =>
    normalizeQlcvStaffIdList(proposal.nguoi_phoi_hop_ids),
  );
  const [theoDoiIds, setTheoDoiIds] = useState<string[]>(() =>
    normalizeQlcvStaffIdList(proposal.nguoi_theo_doi_ids),
  );

  useEffect(() => {
    setTieuDe(proposal.tieu_de);
    setMoTa(proposal.mo_ta ?? "");
    setLoaiCongViec(proposal.loai_cong_viec === "KHAN_CAP" ? "KHAN_CAP" : "DOT_XUAT");
    setMucDoUuTien((proposal.muc_do_uu_tien as QlcvMucDoUuTien) || "TRUNG_BINH");
    setHanHoanThanh(
      proposal.han_hoan_thanh
        ? (qlcvDateVnFromInstant(proposal.han_hoan_thanh) ?? String(proposal.han_hoan_thanh).split("T")[0])
        : "",
    );
    setSelectedKhoaIds(proposalKhoaIds(proposal));
    setSelectedNhanSu(proposal.nguoi_phu_trach_id ? String(proposal.nguoi_phu_trach_id) : "");
    setSelectedTo(proposal.to_cong_tac_id ? String(proposal.to_cong_tac_id) : "");
    setPhoiHopIds(normalizeQlcvStaffIdList(proposal.nguoi_phoi_hop_ids));
    setTheoDoiIds(normalizeQlcvStaffIdList(proposal.nguoi_theo_doi_ids));
  }, [proposal]);

  useEffect(() => {
    const load = async () => {
      setOptionsLoading(true);
      try {
        const catalog = await getQlcvFormCatalog();
        setNhanSuOptions(catalog.nhanSu);
        setToCongTacOptions(catalog.toCongTac);
        setKhoaPhongOptions(catalog.khoaPhong);
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
    if (!String(selectedNhanSu || "").trim()) {
      toast.error("Chọn người phụ trách trước khi phê duyệt.");
      return;
    }
    if (!String(hanHoanThanh || "").trim()) {
      toast.error("Nhập hạn hoàn thành trước khi phê duyệt.");
      return;
    }

    const payload = {
      tieu_de: tieuDe.trim(),
      mo_ta: moTa.trim() || null,
      loai_cong_viec: loaiCongViec,
      muc_do_uu_tien: mucDoUuTien,
      han_hoan_thanh: hanHoanThanh || null,
      nguoi_phu_trach_id: selectedNhanSu,
      to_cong_tac_id: selectedTo || null,
      dia_diem_khoa_id: selectedKhoaIds[0] ?? null,
      dia_diem_khoa_ids: selectedKhoaIds,
      nhom_chuyen_mon_id: proposal.nhom_chuyen_mon_id ?? null,
      nhiem_vu_id: proposal.nhiem_vu_id ?? null,
      vi_tri_thuc_hien: proposal.vi_tri_thuc_hien ?? null,
      nguoi_phoi_hop_ids: phoiHopIds,
      nguoi_theo_doi_ids: theoDoiIds,
    };

    const validation = congViecSchemaWithHanRule.safeParse(payload);
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
    <form onSubmit={handleApprove} className="space-y-[var(--bv103-space-3)]">
      <div className={`space-y-[var(--bv103-space-3)] ${bv103LayoutChrome.panelShellPadded}`}>
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
            <label className={labelStyles}>Mức ưu tiên</label>
            <select value={mucDoUuTien} onChange={(e) => setMucDoUuTien(e.target.value as QlcvMucDoUuTien)} className={inputStyles}>
              <option value="CAO">Cao</option>
              <option value="TRUNG_BINH">Trung bình</option>
              <option value="THAP">Thấp</option>
            </select>
            <p className={`mt-1 ${bv103LayoutChrome.noticeSlate}`}>
              Ưu tiên Cao dùng cho việc cần xử lý gấp.
            </p>
          </div>
          <div>
            <label className={labelStyles}>Hạn hoàn thành *</label>
            <input
              required
              type="date"
              value={hanHoanThanh}
              onChange={(e) => setHanHoanThanh(e.target.value)}
              className={inputStyles}
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-[var(--bv103-space-3)]">
          <div>
            <SearchableMultiSelect
              label="Khoa / đơn vị địa điểm (tuỳ chọn, chọn được nhiều)"
              options={khoaPhongOptions.map((o) => ({ id: o.id, label: o.label }))}
              selected={selectedKhoaIds}
              onChange={setSelectedKhoaIds}
              disabled={optionsLoading}
              minWidthClassName="w-full"
            />
          </div>
          <div>
            <label className={labelStyles}>Tổ công tác (tuỳ chọn)</label>
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

          <div>
            <SearchableMultiSelect
              label="Người phối hợp (tuỳ chọn, chọn được nhiều)"
              options={nhanSuOptions.map((o) => ({ id: o.id, label: o.label }))}
              selected={phoiHopIds}
              onChange={setPhoiHopIds}
              disabled={optionsLoading}
              minWidthClassName="w-full"
            />
          </div>

          <div>
            <SearchableMultiSelect
              label="Người theo dõi / giám sát (tuỳ chọn, chọn được nhiều)"
              options={nhanSuOptions.map((o) => ({ id: o.id, label: o.label }))}
              selected={theoDoiIds}
              onChange={setTheoDoiIds}
              disabled={optionsLoading}
              minWidthClassName="w-full"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-200/80 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={onCancel}
          className={`${bv103LayoutChrome.btnSecondary} sm:min-w-[7rem]`}
        >
          Đóng
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => setRejectOpen(true)}
          className={`${bv103LayoutChrome.btnSecondary} border-red-200 bg-red-50 text-red-800 hover:bg-red-100 sm:min-w-[9rem]`}
        >
          Từ chối
        </button>
        <button
          type="submit"
          disabled={loading}
          className={`${bv103LayoutChrome.btnPrimary} sm:min-w-[10rem]`}
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
