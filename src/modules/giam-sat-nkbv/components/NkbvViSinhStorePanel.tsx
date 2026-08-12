"use client";

/**
 * Kho vi sinh toàn viện — bảng chuẩn hóa bệnh phẩm CDC + CRUD + MDRO.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDateVi } from "@/lib/format-datetime-vi";
import SearchableSelect from "@/components/shared/SearchableSelect";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import {
  createNkbvViSinhStoreRecord,
  deleteNkbvViSinhStoreRecordHard,
  listNkbvViSinhStore,
  quickToggleNkbvViSinhMdro,
  updateNkbvViSinhStoreRecord,
  type NkbvViSinhStoreRow,
} from "../actions/giam-sat-nkbv-vi-sinh-store.actions";
import { createLabidEventFromViSinh } from "../actions/giam-sat-nkbv-labid.actions";
import type { NkbvViSinhKetQua } from "../lib/nkbv-vi-sinh-template";
import {
  NKBV_MDRO_PHENOTYPE_LABELS,
  NKBV_MDRO_PHENOTYPES,
  type NkbvMdroPhenotype,
} from "../lib/nkbv-mdro";
import {
  specimenLabel,
  specimenSelectGroups,
  type NkbvSpecimenCode,
} from "../lib/nkbv-specimen-canonical";
import { nkbvKhoaDisplayName, nkbvKhoaSelectOptions } from "../lib/nkbv-khoa-options";
import {
  statusBadgeClass,
  statusBadgeLabel,
  type ViSinhAnalysisStatus,
} from "../lib/nkbv-vi-sinh-analysis-status";

type Draft = {
  khoa_yeu_cau_id: string;
  loai_benh_pham: string;
  loai_benh_pham_chuan: string;
  tac_nhan: string;
  so_luong: string;
  ket_qua: NkbvViSinhKetQua;
  is_mdro: boolean;
  mdro_phenotype: string;
};

type CreateDraft = Draft & {
  ma_xet_nghiem: string;
  ma_benh_an: string;
  ma_benh_nhan: string;
  ho_ten_benh_nhan: string;
  ngay_lay_mau: string;
};

type KhoaOption = { id: string; ten_danh_muc: string; ma_danh_muc?: string };

const emptyDraft = (): Draft => ({
  khoa_yeu_cau_id: "",
  loai_benh_pham: "",
  loai_benh_pham_chuan: "",
  tac_nhan: "",
  so_luong: "",
  ket_qua: "DUONG_TINH",
  is_mdro: false,
  mdro_phenotype: "",
});

function SpecimenSelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const groups = useMemo(() => specimenSelectGroups(), []);
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${C.controlInput} w-full min-w-[12rem] text-xs`}
    >
      <option value="">— Chưa chuẩn hóa —</option>
      {groups.map((g) => (
        <optgroup key={g.group} label={g.groupLabel}>
          {g.options.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export default function NkbvViSinhStorePanel({
  khoas = [],
}: {
  khoas?: KhoaOption[];
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<NkbvViSinhStoreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const khoaOptions = useMemo(() => nkbvKhoaSelectOptions(khoas), [khoas]);

  const resolveKhoaTen = (r: NkbvViSinhStoreRow) =>
    nkbvKhoaDisplayName(r.khoa_yeu_cau_id, khoas) || r.khoa_chi_dinh_ten || null;
  const reload = useCallback(async () => {
    setLoading(true);
    const res = await listNkbvViSinhStore({ q, limit: 80 });
    setLoading(false);
    if (!res.success) {
      toast.error(res.error || "Không tải kho vi sinh");
      return;
    }
    setRows(res.data);
  }, [q]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const startEdit = (r: NkbvViSinhStoreRow) => {
    setCreating(false);
    setCreateDraft(null);
    setEditId(r.id);
    setDraft({
      khoa_yeu_cau_id: r.khoa_yeu_cau_id || "",
      loai_benh_pham: r.loai_benh_pham || "",
      loai_benh_pham_chuan: r.loai_benh_pham_chuan || "",
      tac_nhan: r.tac_nhan || "",
      so_luong: r.so_luong || "",
      ket_qua: (r.ket_qua_phan_loai as NkbvViSinhKetQua) || "DUONG_TINH",
      is_mdro: Boolean(r.is_mdro),
      mdro_phenotype: r.mdro_phenotype || "",
    });
  };

  const saveEdit = async () => {
    if (!editId || !draft) return;
    if (!draft.khoa_yeu_cau_id.trim()) {
      toast.error("Chọn khoa chỉ định");
      return;
    }
    setBusyId(editId);
    const res = await updateNkbvViSinhStoreRecord(editId, {
      khoa_yeu_cau_id: draft.khoa_yeu_cau_id,
      loai_benh_pham: draft.loai_benh_pham,
      loai_benh_pham_chuan: draft.loai_benh_pham_chuan
        ? (draft.loai_benh_pham_chuan as NkbvSpecimenCode)
        : null,
      tac_nhan: draft.tac_nhan,
      so_luong: draft.so_luong || null,
      ket_qua: draft.ket_qua,
      is_mdro: draft.is_mdro,
      mdro_phenotype: draft.is_mdro
        ? (draft.mdro_phenotype as NkbvMdroPhenotype)
        : null,
    });
    setBusyId(null);
    if (!res.success) {
      toast.error(res.error || "Không lưu");
      return;
    }
    toast.success("Đã chuẩn hóa thông tin xét nghiệm");
    setEditId(null);
    setDraft(null);
    void reload();
  };

  const startCreate = () => {
    setEditId(null);
    setDraft(null);
    setCreating(true);
    setCreateDraft({
      ...emptyDraft(),
      ma_xet_nghiem: "",
      ma_benh_an: "",
      ma_benh_nhan: "",
      ho_ten_benh_nhan: "",
      ngay_lay_mau: new Date().toISOString().slice(0, 10),
    });
  };

  const saveCreate = async () => {
    if (!createDraft) return;
    if (!createDraft.khoa_yeu_cau_id.trim()) {
      toast.error("Chọn khoa chỉ định");
      return;
    }
    setBusyId("create");
    const res = await createNkbvViSinhStoreRecord({
      ma_xet_nghiem: createDraft.ma_xet_nghiem,
      ma_benh_an: createDraft.ma_benh_an,
      ma_benh_nhan: createDraft.ma_benh_nhan || null,
      ho_ten_benh_nhan: createDraft.ho_ten_benh_nhan || null,
      ngay_lay_mau: createDraft.ngay_lay_mau,
      khoa_yeu_cau_id: createDraft.khoa_yeu_cau_id,
      loai_benh_pham: createDraft.loai_benh_pham,
      loai_benh_pham_chuan: createDraft.loai_benh_pham_chuan || null,
      tac_nhan: createDraft.tac_nhan,
      so_luong: createDraft.so_luong || null,
      ket_qua: createDraft.ket_qua,
      is_mdro: createDraft.is_mdro,
      mdro_phenotype: createDraft.is_mdro
        ? (createDraft.mdro_phenotype as NkbvMdroPhenotype)
        : null,
    });
    setBusyId(null);
    if (!res.success) {
      toast.error(res.error || "Không thêm");
      return;
    }
    toast.success("Đã thêm xét nghiệm vào kho");
    setCreating(false);
    setCreateDraft(null);
    void reload();
  };

  const onDelete = async (r: NkbvViSinhStoreRow) => {
    if (!window.confirm(`Xóa cứng xét nghiệm ${r.ma_xet_nghiem}? Không hoàn tác được.`)) return;
    setBusyId(r.id);
    const res = await deleteNkbvViSinhStoreRecordHard(r.id);
    setBusyId(null);
    if (!res.success) {
      toast.error(res.error || "Không xóa");
      return;
    }
    toast.success("Đã xóa xét nghiệm");
    if (editId === r.id) {
      setEditId(null);
      setDraft(null);
    }
    void reload();
  };

  const onQuickMdro = async (r: NkbvViSinhStoreRow) => {
    const next = !r.is_mdro;
    setBusyId(r.id);
    const res = await quickToggleNkbvViSinhMdro({
      id: r.id,
      is_mdro: next,
      mdro_phenotype: next
        ? ((r.mdro_phenotype as NkbvMdroPhenotype) || "OTHER_MDRO")
        : null,
    });
    setBusyId(null);
    if (!res.success) {
      toast.error(res.error || "Không cập nhật MDRO");
      return;
    }
    toast.success(next ? "Đã đánh dấu đa kháng" : "Đã bỏ đánh dấu đa kháng");
    void reload();
  };

  const onCreateLabid = async (r: NkbvViSinhStoreRow) => {
    if (!r.is_mdro && !r.mdro_phenotype) {
      toast.message("Đánh dấu MDRO/phenotype trước khi tạo LabID Event");
      return;
    }
    setBusyId(r.id);
    const res = await createLabidEventFromViSinh(r.id);
    setBusyId(null);
    if (!res.success) {
      toast.error(res.error || "Không tạo được LabID");
      return;
    }
    if (res.verdict?.isEvent) {
      toast.success(`LabID: ${res.verdict.eventType}`);
    } else {
      toast.message(res.verdict?.reason || "Không đủ điều kiện LabID Event");
    }
  };

  const ketQuaLabel = (k: string | null) => {
    if (k === "DUONG_TINH") return "Dương tính";
    if (k === "AM_TINH") return "Âm tính";
    if (k === "NHIEU") return "Nhiễu";
    return k || "—";
  };

  return (
    <div className={`${C.panelSurface} space-y-3 p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={`${C.panelTitle} text-base`}>Kho vi sinh toàn viện</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Chuẩn hóa bệnh phẩm theo danh mục CDC (cột LIS gốc | cột chuẩn). Phân tích nhiễm khuẩn trên
            Hub bệnh án.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-3 py-1.5 text-[11px] font-semibold text-[var(--primary)]"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm XN
          </button>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-50"
            aria-label="Tải lại kho"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm mã XN, BA, tác nhân, tên BN, bệnh phẩm LIS…"
          className={`${C.controlInput} w-full pl-9 text-xs`}
        />
      </div>

      {creating && createDraft ? (
        <div className="space-y-2 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-3">
          <p className="text-xs font-semibold text-slate-800">Thêm xét nghiệm tay</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1">
              <span className="text-[11px] text-slate-500">Mã XN *</span>
              <input
                value={createDraft.ma_xet_nghiem}
                onChange={(e) => setCreateDraft({ ...createDraft, ma_xet_nghiem: e.target.value })}
                className={`${C.controlInput} w-full text-xs`}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-slate-500">Mã BA *</span>
              <input
                value={createDraft.ma_benh_an}
                onChange={(e) => setCreateDraft({ ...createDraft, ma_benh_an: e.target.value })}
                className={`${C.controlInput} w-full text-xs`}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-slate-500">Ngày lấy mẫu *</span>
              <input
                type="date"
                value={createDraft.ngay_lay_mau}
                onChange={(e) => setCreateDraft({ ...createDraft, ngay_lay_mau: e.target.value })}
                className={`${C.controlInput} w-full text-xs`}
              />
            </label>
            <label className="space-y-1 sm:col-span-2 lg:col-span-3">
              <span className="text-[11px] text-slate-500">Khoa chỉ định *</span>
              <SearchableSelect
                value={createDraft.khoa_yeu_cau_id}
                onChange={(v) => setCreateDraft({ ...createDraft, khoa_yeu_cau_id: v })}
                options={khoaOptions}
                placeholder="Chọn khoa chỉ định..."
                searchPlaceholder="Tìm mã / tên khoa..."
                className="text-xs"
              />
            </label>            <label className="space-y-1 sm:col-span-2">
              <span className="text-[11px] text-slate-500">Bệnh phẩm LIS / nhập tay *</span>
              <input
                value={createDraft.loai_benh_pham}
                onChange={(e) => setCreateDraft({ ...createDraft, loai_benh_pham: e.target.value })}
                className={`${C.controlInput} w-full text-xs`}
                placeholder="Chuỗi gốc từ LIS hoặc mô tả tay"
              />
            </label>            <label className="space-y-1">
              <span className="text-[11px] text-slate-500">Bệnh phẩm chuẩn</span>
              <SpecimenSelect
                value={createDraft.loai_benh_pham_chuan}
                onChange={(v) => setCreateDraft({ ...createDraft, loai_benh_pham_chuan: v })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-slate-500">Tác nhân</span>
              <input
                value={createDraft.tac_nhan}
                onChange={(e) => setCreateDraft({ ...createDraft, tac_nhan: e.target.value })}
                className={`${C.controlInput} w-full text-xs`}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-slate-500">Kết quả</span>
              <select
                value={createDraft.ket_qua}
                onChange={(e) =>
                  setCreateDraft({
                    ...createDraft,
                    ket_qua: e.target.value as NkbvViSinhKetQua,
                  })
                }
                className={`${C.controlInput} w-full text-xs`}
              >
                <option value="DUONG_TINH">Dương tính</option>
                <option value="AM_TINH">Âm tính / dưới ngưỡng</option>
                <option value="NHIEU">Nhiễu / nhiễm</option>
              </select>
            </label>
            <label className="flex items-center gap-2 pt-5 text-xs">
              <input
                type="checkbox"
                checked={createDraft.is_mdro}
                onChange={(e) =>
                  setCreateDraft({
                    ...createDraft,
                    is_mdro: e.target.checked,
                    mdro_phenotype: e.target.checked
                      ? createDraft.mdro_phenotype || "OTHER_MDRO"
                      : "",
                  })
                }
              />
              Đa kháng (MDRO)
            </label>
            {createDraft.is_mdro ? (
              <label className="space-y-1">
                <span className="text-[11px] text-slate-500">Phenotype</span>
                <select
                  value={createDraft.mdro_phenotype}
                  onChange={(e) =>
                    setCreateDraft({ ...createDraft, mdro_phenotype: e.target.value })
                  }
                  className={`${C.controlInput} w-full text-xs`}
                >
                  {NKBV_MDRO_PHENOTYPES.map((p) => (
                    <option key={p} value={p}>
                      {NKBV_MDRO_PHENOTYPE_LABELS[p]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busyId === "create"}
              onClick={() => void saveCreate()}
              className={`${C.ctaPrimary} text-xs`}
            >
              Lưu xét nghiệm
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setCreateDraft(null);
              }}
              className={`${C.ctaSecondary} text-xs`}
            >
              Hủy
            </button>
          </div>
        </div>
      ) : null}

      <ResponsiveTableShell
        unboxed
        className="border border-slate-100 rounded-[var(--radius-shell)]"
        maxHeight="max-h-[min(56dvh,560px)]"
      >
        <table className="w-full min-w-[1280px] border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <th className="px-3 py-2.5">Mã XN</th>
              <th className="px-3 py-2.5">BA / BN</th>
              <th className="px-3 py-2.5">Khoa chỉ định</th>
              <th className="px-3 py-2.5">Ngày mẫu</th>
              <th className="px-3 py-2.5">Bệnh phẩm LIS</th>
              <th className="px-3 py-2.5">Bệnh phẩm chuẩn</th>
              <th className="px-3 py-2.5">Tác nhân</th>
              <th className="px-3 py-2.5">KQ</th>
              <th className="px-3 py-2.5">Đã PT?</th>
              <th className="px-3 py-2.5">MDRO</th>
              <th className="px-3 py-2.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-slate-500">
                  Chưa có bản ghi — nạp Excel/LIS phía trên hoặc thêm tay.
                </td>
              </tr>
            ) : null}
            {rows.map((r) => {
              const editing = editId === r.id && draft;
              const khoaTen = resolveKhoaTen(r);
              const ptStatus: ViSinhAnalysisStatus =
                r.analysis_disposition === "BO_QUA"
                  ? "BO_QUA"
                  : r.analysis_disposition === "DA_PHAN_TICH"
                    ? "DA_PHAN_TICH"
                    : "CHUA_PHAN_TICH";
              return (
                <React.Fragment key={r.id}>
                  <tr className="align-top hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-mono text-[var(--primary)]">{r.ma_xet_nghiem}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-800">{r.ma_benh_an}</div>
                      <div className="text-[11px] text-slate-500">{r.ho_ten_benh_nhan || "—"}</div>
                    </td>
                    <td className="px-3 py-2 max-w-[10rem]">
                      {khoaTen ? (
                        <span className="font-medium text-slate-800">{khoaTen}</span>
                      ) : (
                        <span className="text-amber-700">Chưa có khoa</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.ngay_lay_mau ? formatDateVi(r.ngay_lay_mau) : "—"}
                    </td>                    <td className="px-3 py-2 max-w-[10rem]">
                      <span className="line-clamp-2" title={r.loai_benh_pham || ""}>
                        {r.loai_benh_pham || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[14rem]">
                      {r.loai_benh_pham_chuan ? (
                        <span className="font-medium text-emerald-800">
                          {specimenLabel(r.loai_benh_pham_chuan) || r.loai_benh_pham_chuan}
                        </span>
                      ) : (
                        <span className="text-amber-700">Chưa chuẩn hóa</span>
                      )}
                    </td>
                    <td className="px-3 py-2 italic text-amber-950 max-w-[9rem]">
                      <span className="line-clamp-2">{r.tac_nhan || "—"}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{ketQuaLabel(r.ket_qua_phan_loai)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(ptStatus)}`}
                        title="Trạng thái phân tích NKBV trên Hub BA"
                      >
                        {statusBadgeLabel(ptStatus)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void onQuickMdro(r)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          r.is_mdro
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-600 hover:bg-rose-50"
                        }`}
                        title="Chọn nhanh đa kháng"
                      >
                        {r.is_mdro
                          ? r.mdro_phenotype
                            ? NKBV_MDRO_PHENOTYPE_LABELS[
                                r.mdro_phenotype as NkbvMdroPhenotype
                              ] || r.mdro_phenotype
                            : "MDRO"
                          : "MDRO?"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {r.is_mdro ? (
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void onCreateLabid(r)}
                            className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-800"
                            title="Tạo LabID Event NHSN từ XN này"
                          >
                            LabID
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => startEdit(r)}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                        >
                          <Pencil className="h-3 w-3" /> Sửa
                        </button>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => void onDelete(r)}
                          className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700"
                        >
                          <Trash2 className="h-3 w-3" /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editing ? (
                    <tr className="bg-slate-50/90">
                      <td colSpan={11} className="px-3 py-3">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          <label className="space-y-1 sm:col-span-2 lg:col-span-3">
                            <span className="text-[11px] text-slate-500">Khoa chỉ định *</span>
                            <SearchableSelect
                              value={draft.khoa_yeu_cau_id}
                              onChange={(v) => setDraft({ ...draft, khoa_yeu_cau_id: v })}
                              options={khoaOptions}
                              placeholder="Chọn khoa chỉ định..."
                              searchPlaceholder="Tìm mã / tên khoa..."
                              className="text-xs"
                            />
                          </label>                          <label className="space-y-1 sm:col-span-2">
                            <span className="text-[11px] text-slate-500">Bệnh phẩm LIS (giữ nguyên)</span>
                            <input
                              value={draft.loai_benh_pham}
                              onChange={(e) =>
                                setDraft({ ...draft, loai_benh_pham: e.target.value })
                              }
                              className={`${C.controlInput} w-full text-xs`}
                            />
                          </label>                          <label className="space-y-1">
                            <span className="text-[11px] text-slate-500">Bệnh phẩm chuẩn *</span>
                            <SpecimenSelect
                              value={draft.loai_benh_pham_chuan}
                              onChange={(v) => setDraft({ ...draft, loai_benh_pham_chuan: v })}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[11px] text-slate-500">Tác nhân</span>
                            <input
                              value={draft.tac_nhan}
                              onChange={(e) => setDraft({ ...draft, tac_nhan: e.target.value })}
                              className={`${C.controlInput} w-full text-xs`}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[11px] text-slate-500">Số lượng / CFU</span>
                            <input
                              value={draft.so_luong}
                              onChange={(e) => setDraft({ ...draft, so_luong: e.target.value })}
                              className={`${C.controlInput} w-full text-xs`}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[11px] text-slate-500">Kết quả</span>
                            <select
                              value={draft.ket_qua}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  ket_qua: e.target.value as NkbvViSinhKetQua,
                                })
                              }
                              className={`${C.controlInput} w-full text-xs`}
                            >
                              <option value="DUONG_TINH">Dương tính</option>
                              <option value="AM_TINH">Âm tính / dưới ngưỡng</option>
                              <option value="NHIEU">Nhiễu / nhiễm</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-2 pt-5 text-xs">
                            <input
                              type="checkbox"
                              checked={draft.is_mdro}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  is_mdro: e.target.checked,
                                  mdro_phenotype: e.target.checked
                                    ? draft.mdro_phenotype || "OTHER_MDRO"
                                    : "",
                                })
                              }
                            />
                            Vi khuẩn đa kháng kháng sinh (MDRO)
                          </label>
                          {draft.is_mdro ? (
                            <label className="space-y-1">
                              <span className="text-[11px] text-slate-500">Phenotype MDRO</span>
                              <select
                                value={draft.mdro_phenotype}
                                onChange={(e) =>
                                  setDraft({ ...draft, mdro_phenotype: e.target.value })
                                }
                                className={`${C.controlInput} w-full text-xs`}
                              >
                                {NKBV_MDRO_PHENOTYPES.map((p) => (
                                  <option key={p} value={p}>
                                    {NKBV_MDRO_PHENOTYPE_LABELS[p]}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void saveEdit()}
                            className={`${C.ctaPrimary} text-xs`}
                          >
                            Lưu chuẩn hóa
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditId(null);
                              setDraft(null);
                            }}
                            className={`${C.ctaSecondary} text-xs`}
                          >
                            Hủy
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </ResponsiveTableShell>
    </div>
  );
}
