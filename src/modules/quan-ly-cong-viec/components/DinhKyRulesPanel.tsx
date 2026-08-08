"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CalendarClock, Pencil, PlayCircle, RefreshCw, Trash2, X } from "lucide-react";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import {
  parseMoTaToQlcvChecklist,
  serializeQlcvChecklistToMoTa,
  type QlcvChecklistItem,
} from "@/lib/domain/qlcv-checklist";
import {
  listDinhKyMau,
  upsertDinhKyMau,
  setDinhKyMauActive,
  deleteDinhKyMau,
  spawnCongViecDinhKyHomNay,
  type DinhKyMauRow,
  type MucDoUuTienDinhKy,
  type MaChuKyDinhKy,
} from "../actions/dinh-ky.actions";
import { listNhiemVuOptions, type NhiemVuSelectOption } from "../actions/nhiem-vu.actions";
import { getQlcvFormCatalog } from "../actions/cong-viec-read.actions";
import SearchableSelect from "@/components/shared/SearchableSelect";
import SearchableMultiSelect from "@/components/shared/SearchableMultiSelect";
import {
  formatKhoaCompactLabel,
  parseMaFromKhoaOptionLabel,
} from "@/lib/domain/khoa-display";
import { nextDinhKySpawnDates } from "../lib/qlcv-dinh-ky-schedule";
import type { QlcvSelectOption } from "../lib/qlcv-form-options";
import { normalizeQlcvStaffIdList } from "../lib/qlcv-staff-ids";
import { DinhKyChecklistEditor } from "./DinhKyChecklistEditor";
import type { QlcvPeriodKind } from "../lib/qlcv-period-range";
import { formatDateVi } from "@/lib/format-datetime-vi";

function labelChuKy(ma: string): string {
  if (ma === "DAILY") return "Hàng ngày";
  if (ma === "WEEKLY") return "Hàng tuần (cách 7 ngày từ mốc)";
  if (ma === "MONTHLY") return "Hàng tháng (cùng ngày lịch)";
  if (ma === "QUARTERLY") return "Hàng quý (mỗi 3 tháng cùng ngày)";
  if (ma === "YEARLY") return "Hàng năm (cùng tháng+ngày)";
  return ma;
}

function previewSpawnLabels(ma: MaChuKyDinhKy, ngayBatDau: string): string {
  const maxMatches = ma === "DAILY" ? 14 : ma === "YEARLY" ? 4 : 8;
  const dates = nextDinhKySpawnDates(ma, ngayBatDau, new Date(), { maxScanDays: 1200, maxMatches });
  if (dates.length === 0) return "—";
  const fmt = (iso: string) => formatDateVi(iso, iso);
  return dates.map(fmt).join(" · ");
}

function labelMucDoUuTien(ma: string | null): { label: string; cls: string } {
  switch (ma) {
    case "THAP":
      return { label: "Thấp", cls: "bg-slate-100 text-slate-500" };
    case "TRUNG_BINH":
      return { label: "TB", cls: "bg-blue-50 text-blue-600" };
    case "CAO":
      return { label: "Cao", cls: "bg-amber-50 text-amber-600" };
    case "KHAN_CAP":
      return { label: "Khẩn cấp", cls: "bg-red-50 text-red-600" };
    default:
      return { label: "TB", cls: "bg-blue-50 text-blue-600" };
  }
}

type Props = {
  highlightMauId?: string | null;
  onRequestPrintPlan?: (period: QlcvPeriodKind) => void;
};

export function DinhKyRulesPanel({ highlightMauId, onRequestPrintPlan }: Props) {
  const [rows, setRows] = useState<DinhKyMauRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [spawning, setSpawning] = useState(false);
  const [ns, setNs] = useState<QlcvSelectOption[]>([]);
  const [to, setTo] = useState<QlcvSelectOption[]>([]);
  const [khoaPhong, setKhoaPhong] = useState<QlcvSelectOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tieuDe, setTieuDe] = useState("");
  const [checklistItems, setChecklistItems] = useState<QlcvChecklistItem[]>([]);
  const [chuKy, setChuKy] = useState<MaChuKyDinhKy>("MONTHLY");
  const [ngayBatDau, setNgayBatDau] = useState(() => new Date().toISOString().slice(0, 10));
  const [nsId, setNsId] = useState("");
  const [toId, setToId] = useState("");
  const [mucDoUuTien, setMucDoUuTien] = useState<MucDoUuTienDinhKy>("TRUNG_BINH");
  const [viTri, setViTri] = useState("");
  const [gioBat, setGioBat] = useState("");
  const [gioKet, setGioKet] = useState("");
  const [diaDiemKhoaId, setDiaDiemKhoaId] = useState("");
  const [phoiHopIds, setPhoiHopIds] = useState<string[]>([]);
  const [theoDoiIds, setTheoDoiIds] = useState<string[]>([]);
  const [nhiemVuId, setNhiemVuId] = useState("");
  const [nhiemVuOptions, setNhiemVuOptions] = useState<NhiemVuSelectOption[]>([]);
  const [printPeriod, setPrintPeriod] = useState<QlcvPeriodKind>("MONTH");

  const resetForm = () => {
    setEditingId(null);
    setTieuDe("");
    setChecklistItems([]);
    setChuKy("MONTHLY");
    setNgayBatDau(new Date().toISOString().slice(0, 10));
    setNsId("");
    setToId("");
    setMucDoUuTien("TRUNG_BINH");
    setViTri("");
    setGioBat("");
    setGioKet("");
    setDiaDiemKhoaId("");
    setPhoiHopIds([]);
    setTheoDoiIds([]);
    setNhiemVuId("");
  };

  const loadIntoForm = (r: DinhKyMauRow) => {
    setEditingId(r.id);
    setTieuDe(r.tieu_de);
    setChecklistItems(parseMoTaToQlcvChecklist(r.mo_ta));
    setChuKy(r.ma_chu_ky);
    setNgayBatDau(r.ngay_bat_dau);
    setNsId(r.nguoi_phu_trach_id || "");
    setToId(r.to_cong_tac_id || "");
    setMucDoUuTien(r.muc_do_uu_tien || "TRUNG_BINH");
    setViTri(r.vi_tri_thuc_hien || "");
    setGioBat(r.gio_bat_dau || "");
    setGioKet(r.gio_ket_thuc || "");
    setDiaDiemKhoaId(r.dia_diem_khoa_id || "");
    setPhoiHopIds(normalizeQlcvStaffIdList(r.nguoi_phoi_hop_ids));
    setTheoDoiIds(normalizeQlcvStaffIdList(r.nguoi_theo_doi_ids));
    setNhiemVuId(r.nhiem_vu_id || "");
  };

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await listDinhKyMau();
      setRows(r);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Không tải được mẫu định kỳ.";
      setLoadError(msg);
      setRows([]);
      toast.error(msg);
    }
    try {
      const catalog = await getQlcvFormCatalog();
      setNs(catalog.nhanSu);
      setTo(catalog.toCongTac);
      setKhoaPhong(catalog.khoaPhong);
      const nvOpts = await listNhiemVuOptions();
      setNhiemVuOptions(nvOpts);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tải danh mục nhân sự / tổ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!highlightMauId || rows.length === 0) return;
    const hit = rows.find((r) => r.id === highlightMauId);
    if (hit) loadIntoForm(hit);
  }, [highlightMauId, rows]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tieuDe.trim()) {
      toast.error("Nhập tiêu đề mẫu.");
      return;
    }
    if (!diaDiemKhoaId) {
      toast.error("Chọn khoa/đơn vị địa điểm thực hiện.");
      return;
    }
    if (!gioBat || !gioKet) {
      toast.error("Nhập giờ bắt đầu và giờ kết thúc.");
      return;
    }
    try {
      await upsertDinhKyMau({
        id: editingId || undefined,
        tieu_de: tieuDe.trim(),
        mo_ta: serializeQlcvChecklistToMoTa(checklistItems) || null,
        ma_chu_ky: chuKy,
        ngay_bat_dau: ngayBatDau,
        nguoi_phu_trach_id: nsId || null,
        to_cong_tac_id: toId || null,
        muc_do_uu_tien: mucDoUuTien,
        vi_tri_thuc_hien: viTri.trim() || null,
        gio_bat_dau: gioBat,
        gio_ket_thuc: gioKet,
        dia_diem_khoa_id: diaDiemKhoaId,
        nguoi_phoi_hop_ids: phoiHopIds,
        nguoi_theo_doi_ids: theoDoiIds,
        nhiem_vu_id: nhiemVuId || null,
        is_active: true,
      });
      toast.success(editingId ? "Đã cập nhật mẫu định kỳ." : "Đã lưu mẫu định kỳ.");
      resetForm();
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lỗi lưu");
    }
  };

  const runSpawn = async () => {
    setSpawning(true);
    try {
      const { inserted } = await spawnCongViecDinhKyHomNay();
      toast.success(`Đã sinh ${inserted} phiếu cho hôm nay (đã có cùng mẫu + cùng hạn thì bỏ qua).`);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không gọi được RPC (migration / quyền service_role).");
    } finally {
      setSpawning(false);
    }
  };

  if (loading && rows.length === 0 && !loadError) {
    return <p className="text-sm text-slate-500">Đang tải mẫu định kỳ…</p>;
  }

  return (
    <div className={`${bv103LayoutChrome.panelSurface} p-4 sm:p-5`}>
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-slate-800">
            <CalendarClock className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
            <h3 className="text-sm font-medium">Mẫu định kỳ</h3>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {onRequestPrintPlan ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold shadow-sm"
                value={printPeriod}
                onChange={(e) => setPrintPeriod(e.target.value as QlcvPeriodKind)}
              >
                <option value="WEEK">Tuần</option>
                <option value="MONTH">Tháng</option>
                <option value="QUARTER">Quý</option>
                <option value="YEAR">Năm</option>
              </select>
              <button
                type="button"
                onClick={() => onRequestPrintPlan(printPeriod)}
                className="bv103-control-h rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                In kế hoạch kỳ
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void runSpawn()}
            disabled={spawning}
            className="bv103-control-h inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {spawning ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden /> : <PlayCircle className="h-4 w-4" aria-hidden />}
            {spawning ? "Đang chạy…" : "Sinh phiếu hôm nay"}
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 gap-4 border-b border-slate-100 py-5 md:grid-cols-2">
        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">
            {editingId ? "Sửa mẫu định kỳ" : "Thêm mẫu định kỳ"}
          </p>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:underline"
            >
              <X className="h-3.5 w-3.5" aria-hidden /> Hủy sửa
            </button>
          ) : null}
        </div>
        <div className="md:col-span-2">
          <label className={bv103LayoutChrome.labelBlock}>Tiêu đề mẫu *</label>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/15"
            value={tieuDe}
            onChange={(e) => setTieuDe(e.target.value)}
            placeholder="Ví dụ: Kiểm tra tủ thuốc khoa — tuần"
          />
        </div>
        <div className="md:col-span-2">
          <label className={bv103LayoutChrome.labelBlock}>Checklist mẫu</label>
          <div className="mt-1.5">
            <DinhKyChecklistEditor items={checklistItems} onChange={setChecklistItems} />
          </div>
        </div>
        <div>
          <label className={bv103LayoutChrome.labelBlock}>Chu kỳ</label>
          <select
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
            value={chuKy}
            onChange={(e) => setChuKy(e.target.value as MaChuKyDinhKy)}
          >
            <option value="DAILY">Hàng ngày (mỗi ngày từ mốc)</option>
            <option value="WEEKLY">Hàng tuần (mốc + bội số 7 ngày)</option>
            <option value="MONTHLY">Hàng tháng (cùng số ngày trong tháng)</option>
            <option value="QUARTERLY">Hàng quý (mỗi 3 tháng cùng ngày)</option>
            <option value="YEARLY">Hàng năm (cùng tháng + ngày)</option>
          </select>
        </div>
        <div>
          <label className={bv103LayoutChrome.labelBlock}>Ngày mốc chu kỳ</label>
          <input
            type="date"
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
            value={ngayBatDau}
            onChange={(e) => setNgayBatDau(e.target.value)}
          />
        </div>
        <div>
          <label className={bv103LayoutChrome.labelBlock}>Tổ công tác (tuỳ chọn)</label>
          <div className="mt-1.5">
            <SearchableSelect options={to} placeholder="—" value={toId} onChange={setToId} />
          </div>
        </div>
        <div>
          <label className={bv103LayoutChrome.labelBlock}>Người phụ trách mặc định (tuỳ chọn)</label>
          <div className="mt-1.5">
            <SearchableSelect options={ns} placeholder="—" value={nsId} onChange={setNsId} />
          </div>
        </div>
        <div>
          <label className={bv103LayoutChrome.labelBlock}>Nhiệm vụ kế hoạch năm (tuỳ chọn)</label>
          <div className="mt-1.5">
            <SearchableSelect
              options={nhiemVuOptions.map((o) => ({ id: o.id, label: o.label }))}
              placeholder="— Không gắn"
              value={nhiemVuId}
              onChange={setNhiemVuId}
            />
          </div>
        </div>
        <div>
          <label className={bv103LayoutChrome.labelBlock}>Giờ bắt đầu *</label>
          <input
            type="time"
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
            value={gioBat}
            onChange={(e) => setGioBat(e.target.value)}
          />
        </div>
        <div>
          <label className={bv103LayoutChrome.labelBlock}>Giờ kết thúc *</label>
          <input
            type="time"
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
            value={gioKet}
            onChange={(e) => setGioKet(e.target.value)}
          />
        </div>
        <div>
          <label className={bv103LayoutChrome.labelBlock}>Khoa / đơn vị địa điểm *</label>
          <div className="mt-1.5">
            <SearchableSelect
              options={khoaPhong}
              placeholder="Chọn khoa từ danh mục MDM…"
              value={diaDiemKhoaId}
              onChange={setDiaDiemKhoaId}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className={bv103LayoutChrome.labelBlock}>Vị trí chi tiết (tuỳ chọn)</label>
          <input
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
            value={viTri}
            onChange={(e) => setViTri(e.target.value)}
            placeholder="VD: Phòng 302 · Kho thuốc · Hành lang tầng 2"
          />
        </div>
        <div>
          <SearchableMultiSelect
            label="Người phối hợp"
            options={ns.map((o) => ({ id: o.id, label: o.label }))}
            selected={phoiHopIds}
            onChange={setPhoiHopIds}
            minWidthClassName="w-full"
          />
        </div>
        <div>
          <SearchableMultiSelect
            label="Người theo dõi / giám sát"
            options={ns.map((o) => ({ id: o.id, label: o.label }))}
            selected={theoDoiIds}
            onChange={setTheoDoiIds}
            minWidthClassName="w-full"
          />
        </div>
        <div>
          <label className={bv103LayoutChrome.labelBlock}>Mức độ ưu tiên</label>
          <select
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
            value={mucDoUuTien}
            onChange={(e) => setMucDoUuTien(e.target.value as MucDoUuTienDinhKy)}
          >
            <option value="THAP">Thấp</option>
            <option value="TRUNG_BINH">Trung bình</option>
            <option value="CAO">Cao</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="h-10 rounded-xl bg-slate-800 px-5 text-xs font-semibold text-white hover:bg-slate-900">
            {editingId ? "Lưu thay đổi" : "Thêm mẫu"}
          </button>
        </div>
      </form>

      {loadError ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-shell)] border border-red-100 bg-red-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 text-sm text-red-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p className="leading-relaxed">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="bv103-control-h inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-800 hover:bg-red-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Thử lại
          </button>
        </div>
      ) : null}

      <div className="pt-4">
        <p className={`${bv103LayoutChrome.labelBlock}`}>Mẫu đã lưu ({loading ? "…" : rows.length})</p>
        <div className="mt-2 max-h-[min(22rem,50vh)] overflow-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[20rem] text-left text-sm">
            <thead className="sticky top-0 z-[1] bg-slate-50 text-[11px] font-medium text-slate-500">
              <tr>
                <th className="p-3">Tiêu đề</th>
                <th className="p-3">Chu kỳ</th>
                <th className="p-3 whitespace-nowrap">Khoa</th>
                <th className="p-3 whitespace-nowrap">Mốc</th>
                <th className="p-3">Ưu tiên</th>
                <th className="p-3">Thao tác</th>
                <th className="min-w-[12rem] p-3 text-[11px] font-bold normal-case text-slate-500">
                  Kỳ tới (ước lượng)
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-slate-500">
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[var(--primary)]" aria-hidden />
                    Đang tải mẫu định kỳ…
                  </td>
                </tr>
              ) : null}
              {!loading &&
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t border-slate-100 bg-white ${highlightMauId === r.id ? "ring-2 ring-inset ring-[var(--primary)]/40" : ""}`}
                  >
                    <td className="p-3 font-medium text-slate-800">{r.tieu_de}</td>
                    <td className="p-3 text-slate-600">{labelChuKy(r.ma_chu_ky)}</td>
                    <td className="p-3 text-xs text-slate-600">
                      {(() => {
                        const opt = khoaPhong.find((k) => k.id === r.dia_diem_khoa_id);
                        if (!opt) return "—";
                        return formatKhoaCompactLabel({
                          ma_khoa: parseMaFromKhoaOptionLabel(opt.label),
                          ten_khoa: opt.label,
                        });
                      })()}
                    </td>
                    <td className="p-3 tabular-nums text-slate-600">{formatDateVi(r.ngay_bat_dau)}</td>
                    <td className="p-3">
                      {(() => {
                        const { label, cls } = labelMucDoUuTien(r.muc_do_uu_tien);
                        return (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:underline"
                          onClick={() => loadIntoForm(r)}
                        >
                          <Pencil className="h-3 w-3" aria-hidden /> Sửa
                        </button>
                        <button
                          type="button"
                          className="text-xs font-semibold text-[var(--primary)] hover:underline"
                          onClick={async () => {
                            try {
                              await setDinhKyMauActive(r.id, !r.is_active);
                              toast.success(r.is_active ? "Đã tắt mẫu" : "Đã bật mẫu");
                              await load();
                            } catch (e: unknown) {
                              toast.error(e instanceof Error ? e.message : "Lỗi");
                            }
                          }}
                        >
                          {r.is_active ? "Tắt" : "Bật"}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline"
                          onClick={async () => {
                            if (!window.confirm(`Xóa mẫu «${r.tieu_de}»? Nếu còn phiếu gắn mẫu, hệ thống chỉ tắt mẫu.`)) {
                              return;
                            }
                            try {
                              const res = await deleteDinhKyMau(r.id);
                              toast.success(
                                res.mode === "deleted"
                                  ? "Đã xóa mẫu."
                                  : "Mẫu còn phiếu lịch sử — đã tắt, không xóa hẳn.",
                              );
                              if (editingId === r.id) resetForm();
                              await load();
                            } catch (e: unknown) {
                              toast.error(e instanceof Error ? e.message : "Lỗi xóa");
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" aria-hidden /> Xóa
                        </button>
                      </div>
                    </td>
                    <td className="max-w-[14rem] p-3 text-[11px] leading-snug text-slate-500">
                      {previewSpawnLabels(r.ma_chu_ky, r.ngay_bat_dau)}
                    </td>
                  </tr>
                ))}
              {!loading && rows.length === 0 && !loadError ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-xs text-slate-400">
                    Chưa có mẫu — thêm ở biểu mẫu phía trên.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
