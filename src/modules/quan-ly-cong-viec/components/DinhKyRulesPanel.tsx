"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CalendarClock, PlayCircle, RefreshCw } from "lucide-react";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import {
  listDinhKyMau,
  upsertDinhKyMau,
  setDinhKyMauActive,
  spawnCongViecDinhKyHomNay,
  type DinhKyMauRow,
  type MucDoUuTienDinhKy,
} from "../actions/dinh-ky.actions";
import { getQlcvFormCatalog } from "../actions/cong-viec-read.actions";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { nextDinhKySpawnDates } from "../lib/qlcv-dinh-ky-schedule";
import type { QlcvSelectOption } from "../lib/qlcv-form-options";

function labelChuKy(ma: string): string {
  if (ma === "DAILY") return "Hàng ngày";
  if (ma === "WEEKLY") return "Hàng tuần (cách 7 ngày từ mốc)";
  if (ma === "MONTHLY") return "Hàng tháng (cùng ngày lịch)";
  if (ma === "QUARTERLY") return "Hàng quý (mỗi 3 tháng cùng ngày)";
  return ma;
}

function previewSpawnLabels(ma: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY", ngayBatDau: string): string {
  // DAILY: giới hạn 14 ngày preview
  const maxMatches = ma === "DAILY" ? 14 : 8;
  const dates = nextDinhKySpawnDates(ma, ngayBatDau, new Date(), { maxScanDays: 800, maxMatches });
  if (dates.length === 0) return "—";
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
    if (!y) return iso;
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
  };
  return dates.map(fmt).join(" · ");
}

function labelMucDoUuTien(ma: string | null): { label: string; cls: string } {
  switch (ma) {
    case "THAP":       return { label: "Thấp",     cls: "bg-slate-100 text-slate-500" };
    case "TRUNG_BINH": return { label: "TB",        cls: "bg-blue-50 text-blue-600" };
    case "CAO":        return { label: "Cao",       cls: "bg-amber-50 text-amber-600" };
    case "KHAN_CAP":   return { label: "Khẩn cấp", cls: "bg-red-50 text-red-600" };
    default:           return { label: "TB",        cls: "bg-blue-50 text-blue-600" };
  }
}

export function DinhKyRulesPanel() {
  const [rows, setRows] = useState<DinhKyMauRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [spawning, setSpawning] = useState(false);
  const [ns, setNs] = useState<QlcvSelectOption[]>([]);
  const [to, setTo] = useState<QlcvSelectOption[]>([]);
  const [tieuDe, setTieuDe] = useState("");
  const [moTa, setMoTa] = useState("");
  const [chuKy, setChuKy] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY">("MONTHLY");
  const [ngayBatDau, setNgayBatDau] = useState(() => new Date().toISOString().slice(0, 10));
  const [nsId, setNsId] = useState("");
  const [toId, setToId] = useState("");
  const [mucDoUuTien, setMucDoUuTien] = useState<MucDoUuTienDinhKy>("TRUNG_BINH");

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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tải danh mục nhân sự / tổ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tieuDe.trim()) {
      toast.error("Nhập tiêu đề mẫu.");
      return;
    }
    try {
      await upsertDinhKyMau({
        tieu_de: tieuDe.trim(),
        mo_ta: moTa || null,
        ma_chu_ky: chuKy,
        ngay_bat_dau: ngayBatDau,
        nguoi_phu_trach_id: nsId || null,
        to_cong_tac_id: toId || null,
        muc_do_uu_tien: mucDoUuTien,
        is_active: true,
      });
      toast.success("Đã lưu mẫu định kỳ.");
      setTieuDe("");
      setMoTa("");
      setMucDoUuTien("TRUNG_BINH");
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

  if (loading) {
    return <p className="text-sm text-slate-500">Đang tải mẫu định kỳ…</p>;
  }

  return (
    <div className={`${bv103LayoutChrome.panelSurface} p-4 sm:p-5`}>
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 text-slate-800">
            <CalendarClock className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
            <h3 className="text-sm font-bold uppercase tracking-wider">Việc định kỳ (mẫu → phiếu)</h3>
          </div>
          <p className={`${bv103LayoutChrome.noticeSlateRelaxed}`}>
            <strong className="font-semibold text-slate-800">Hàng ngày (DAILY):</strong> Sinh phiếu mỗi ngày từ ngày mốc trở đi.{" "}
            <strong className="font-semibold text-slate-800">Hàng tuần (WEEKLY):</strong> Sinh khi khoảng cách từ mốc chia hết cho 7 ngày.{" "}
            <strong className="font-semibold text-slate-800">Hàng tháng (MONTHLY):</strong> Sinh đúng ngày trong tháng trùng mốc (vd. mốc ngày 15 → mỗi tháng ngày 15).{" "}
            <strong className="font-semibold text-slate-800">Hàng quý (QUARTERLY):</strong> Sinh cùng ngày trong tháng, cách mốc bội số 3 tháng.
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            RPC <code className="rounded bg-slate-100 px-1">fn_fact_cong_viec_spawn_dinh_ky_hom_nay</code> — idempotent
            theo cặp <em>(mẫu, hạn)</em>. Đã giao phụ trách → <code className="rounded bg-slate-100 px-1">DANG_LAM</code>;
            mỗi dòng trong <strong>mô tả</strong> thành một mục checklist trên phiếu sinh ra.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runSpawn()}
          disabled={spawning}
          className="bv103-control-h inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#026f17] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#025a12] disabled:opacity-50"
        >
          {spawning ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden /> : <PlayCircle className="h-4 w-4" aria-hidden />}
          {spawning ? "Đang chạy…" : "Sinh phiếu hôm nay"}
        </button>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 gap-4 border-b border-slate-100 py-5 md:grid-cols-2">
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
          <label className={bv103LayoutChrome.labelBlock}>Checklist mẫu (mỗi dòng một việc)</label>
          <textarea
            className={bv103LayoutChrome.textareaCompact}
            value={moTa}
            onChange={(e) => setMoTa(e.target.value)}
            placeholder={"Kiểm tủ thuốc\nRửa tay trước ca\nGhi nhật ký"}
            rows={4}
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Khi sinh phiếu, hệ thống chuyển từng dòng thành checklist — nhân viên tick trên tab Điều hành.
          </p>
        </div>
        <div>
          <label className={bv103LayoutChrome.labelBlock}>Chu kỳ</label>
          <select
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
            value={chuKy}
            onChange={(e) => setChuKy(e.target.value as "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY")}
          >
            <option value="DAILY">Hàng ngày (mỗi ngày từ mốc)</option>
            <option value="WEEKLY">Hàng tuần (mốc + bội số 7 ngày)</option>
            <option value="MONTHLY">Hàng tháng (cùng số ngày trong tháng)</option>
            <option value="QUARTERLY">Hàng quý (mỗi 3 tháng cùng ngày)</option>
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
            Thêm mẫu
          </button>
        </div>
      </form>

      {loadError ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
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
            <thead className="sticky top-0 z-[1] bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-3">Tiêu đề</th>
                <th className="p-3">Chu kỳ</th>
                <th className="p-3 whitespace-nowrap">Mốc</th>
                <th className="p-3">Ưu tiên</th>
                <th className="p-3">Hoạt động</th>
                <th className="min-w-[12rem] p-3 text-[9px] font-bold normal-case text-slate-500">
                  8 kỳ tới (ước lượng, khớp RPC)
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-slate-500">
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[var(--primary)]" aria-hidden />
                    Đang tải mẫu định kỳ…
                  </td>
                </tr>
              ) : null}
              {!loading &&
                rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 bg-white">
                  <td className="p-3 font-medium text-slate-800">{r.tieu_de}</td>
                  <td className="p-3 text-slate-600">{labelChuKy(r.ma_chu_ky)}</td>
                  <td className="p-3 tabular-nums text-slate-600">{r.ngay_bat_dau}</td>
                  <td className="p-3">
                    {(() => {
                      const { label, cls } = labelMucDoUuTien(r.muc_do_uu_tien);
                      return (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>
                      );
                    })()}
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#026f17] hover:underline"
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
                  </td>
                  <td className="max-w-[14rem] p-3 text-[11px] leading-snug text-slate-500">
                    {previewSpawnLabels(r.ma_chu_ky, r.ngay_bat_dau)}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && !loadError ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-xs text-slate-400">
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
