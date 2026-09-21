"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, Package, Warehouse } from "lucide-react";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";
import { CSSD_UI_ACTION_PRIMARY, CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";
import { BoSourceFields, type BoCatalogOption } from "@/modules/cssd-su-co/components/SuCoReportFormFields";
import { getKhoCatalogPayloadAction } from "@/modules/cssd-erp/actions/cssd-catalog.actions";
import {
  listKiemKeKhoLoaiAction,
  loadKiemKeBoCompositionAction,
  submitKiemKeBoAction,
  submitKiemKeKhoAction,
  type KiemKeBoComposition,
  type KiemKeKhoLoaiRow,
} from "@/modules/cssd-erp/actions/cssd-kiem-ke.actions";
import SetReconcileCampaignPanel from "@/modules/cssd-erp/components/inventory/SetReconcileCampaignPanel";

type SubMode = "BO" | "KHO";

const BANNER =
  "Nhập số thực tế trước — hệ thống cập nhật tồn (ledger KIEM_KE). Luân chuyển kho↔bộ / bộ↔bộ không đổi tổng loại. Hỏng/Mất ghi ở Sự cố (/cssd-su-co).";

const demInputClass =
  "h-8 w-20 rounded-[var(--radius-control)] border border-slate-200 bg-white px-2 text-center text-[12px] tabular-nums outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/15";

export function CSSDCatalogKiemKeTab() {
  const [subMode, setSubMode] = useState<SubMode>("BO");
  const [boOptions, setBoOptions] = useState<BoCatalogOption[]>([]);
  const [boLoading, setBoLoading] = useState(false);
  const [maQR, setMaQR] = useState("");
  const [composition, setComposition] = useState<KiemKeBoComposition | null>(null);
  const [demBo, setDemBo] = useState<Record<string, string>>({});
  const [khoRows, setKhoRows] = useState<KiemKeKhoLoaiRow[]>([]);
  const [khoQ, setKhoQ] = useState("");
  const [demKho, setDemKho] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setBoLoading(true);
    void getKhoCatalogPayloadAction().then((res) => {
      if (!active) return;
      setBoLoading(false);
      if (!res.success) {
        toast.error(res.error || "Không tải danh mục bộ.");
        return;
      }
      setBoOptions(res.data.bo.map((b) => ({ id: b.id, ma_bo: b.ma_bo, ten_bo: b.ten_bo })));
    });
    return () => {
      active = false;
    };
  }, []);

  const loadBo = useCallback(async (code: string) => {
    const ma = code.trim().toUpperCase();
    if (!ma) {
      setComposition(null);
      setDemBo({});
      return;
    }
    setLoading(true);
    try {
      const res = await loadKiemKeBoCompositionAction(ma);
      if (!res.success) {
        toast.error(res.error);
        setComposition(null);
        setDemBo({});
        return;
      }
      setComposition(res.data);
      const next: Record<string, string> = {};
      for (const line of res.data.lines) {
        next[line.loaiDungCuId] = String(line.soLuongThucTe);
      }
      setDemBo(next);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadKho = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await listKiemKeKhoLoaiAction(q);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setKhoRows(res.data);
      setDemKho((prev) => {
        const next = { ...prev };
        for (const row of res.data) {
          if (next[row.loaiDungCuId] === undefined) {
            next[row.loaiDungCuId] = String(row.soLuongKhoDuPhong);
          }
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subMode !== "KHO") return;
    const t = window.setTimeout(() => void loadKho(khoQ), 280);
    return () => window.clearTimeout(t);
  }, [subMode, khoQ, loadKho]);

  const boDirtyCount = useMemo(() => {
    if (!composition) return 0;
    let n = 0;
    for (const line of composition.lines) {
      const dem = Math.floor(Number(demBo[line.loaiDungCuId]));
      if (!Number.isFinite(dem)) continue;
      if (dem !== line.soLuongThucTe) n += 1;
    }
    return n;
  }, [composition, demBo]);

  const khoDirtyCount = useMemo(() => {
    let n = 0;
    for (const row of khoRows) {
      const dem = Math.floor(Number(demKho[row.loaiDungCuId]));
      if (!Number.isFinite(dem)) continue;
      if (dem !== row.soLuongKhoDuPhong) n += 1;
    }
    return n;
  }, [khoRows, demKho]);

  const submitBo = async () => {
    if (!composition) {
      toast.error("Chọn bộ cần kiểm kê.");
      return;
    }
    setSaving(true);
    try {
      const lines = composition.lines.map((line) => ({
        loaiDungCuId: line.loaiDungCuId,
        dem: Math.floor(Number(demBo[line.loaiDungCuId] ?? line.soLuongThucTe)),
        thucTeHienTai: line.soLuongThucTe,
      }));
      const res = await submitKiemKeBoAction({
        boDungCuId: composition.boDungCuId,
        lines,
        note: `Kiểm kê bộ ${composition.maBo}`,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(res.applied === 0 ? "Không có lệch — không ghi giao dịch." : `Đã ghi ${res.applied} dòng kiểm kê bộ.`);
      await loadBo(composition.maBo);
    } finally {
      setSaving(false);
    }
  };

  const submitKho = async () => {
    setSaving(true);
    try {
      const lines = khoRows.map((row) => ({
        loaiDungCuId: row.loaiDungCuId,
        demKho: Math.floor(Number(demKho[row.loaiDungCuId] ?? row.soLuongKhoDuPhong)),
        khoCu: row.soLuongKhoDuPhong,
      }));
      const res = await submitKiemKeKhoAction({ lines, note: "Kiểm kê kho dự phòng" });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(res.applied === 0 ? "Không có lệch — không ghi giao dịch." : `Đã cập nhật ${res.applied} loại kho.`);
      await loadKho(khoQ);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-[var(--radius-shell)] border border-sky-100 bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-950">
        <p className="font-semibold text-sky-900">Kiểm kê — nhập số thực trước</p>
        <p className="mt-0.5">{BANNER}</p>
      </div>

      <div className="inline-flex rounded-[var(--radius-control)] border border-slate-200 bg-slate-50 p-0.5">
        <button
          type="button"
          onClick={() => setSubMode("BO")}
          className={`inline-flex items-center gap-1.5 rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-[11px] font-semibold ${
            subMode === "BO" ? "bg-white text-[var(--primary)] shadow-sm" : "text-slate-600"
          }`}
        >
          <Package size={14} /> Kiểm kê bộ
        </button>
        <button
          type="button"
          onClick={() => setSubMode("KHO")}
          className={`inline-flex items-center gap-1.5 rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-[11px] font-semibold ${
            subMode === "KHO" ? "bg-white text-[var(--primary)] shadow-sm" : "text-slate-600"
          }`}
        >
          <Warehouse size={14} /> Kiểm kê kho
        </button>
      </div>

      {subMode === "BO" ? (
        <div className="space-y-3">
          <BoSourceFields
            maQR={maQR}
            setMaQR={setMaQR}
            boOptions={boOptions}
            boLoading={boLoading}
            loading={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void loadBo(maQR);
              }
            }}
            onSelectBo={(ma) => void loadBo(ma)}
            onScanComplete={(ma) => void loadBo(ma)}
          />

          {composition ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
                <p className={UI.formLabel}>
                  {composition.maBo} — {composition.tenBo}
                  {composition.ngayKiemKeGanNhat ? (
                    <span className="ml-2 font-normal text-slate-500">
                      KK gần nhất: {new Date(composition.ngayKiemKeGanNhat).toLocaleString("vi-VN")}
                    </span>
                  ) : null}
                </p>
                <p className="text-[11px] text-slate-500">
                  Lệch so hệ thống: <span className="font-semibold tabular-nums">{boDirtyCount}</span>
                </p>
              </div>
              <div className="overflow-auto rounded-[var(--radius-shell)] border border-slate-200">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm text-slate-700">
                  <thead className={L.theadRow}>
                    <tr>
                      <th className={L.th}>Mã loại</th>
                      <th className={L.th}>Tên</th>
                      <th className={`${L.th} text-center`}>Chuẩn</th>
                      <th className={`${L.th} text-center`}>Hệ thống</th>
                      <th className={`${L.th} text-center`}>Số đếm</th>
                    </tr>
                  </thead>
                  <tbody className={L.tbody}>
                    {composition.lines.map((line) => {
                      const dem = demBo[line.loaiDungCuId] ?? "";
                      const dirty =
                        Number.isFinite(Math.floor(Number(dem))) &&
                        Math.floor(Number(dem)) !== line.soLuongThucTe;
                      return (
                        <tr key={line.loaiDungCuId} className={dirty ? L.rowSelected : L.row}>
                          <td className={`${L.td} font-medium text-violet-700`}>{line.maLoai || "—"}</td>
                          <td className={L.td}>{line.tenLoai || "—"}</td>
                          <td className={`${L.td} text-center tabular-nums`}>{line.soLuongChuan}</td>
                          <td className={`${L.td} text-center tabular-nums`}>{line.soLuongThucTe}</td>
                          <td className={`${L.td} text-center`}>
                            <input
                              type="text"
                              inputMode="numeric"
                              className={demInputClass}
                              value={dem}
                              onChange={(e) =>
                                setDemBo((prev) => ({
                                  ...prev,
                                  [line.loaiDungCuId]: e.target.value.replace(/[^\d]/g, ""),
                                }))
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {composition.lines.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`${L.td} text-center text-slate-500`}>
                          Bộ chưa có thành phần.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={saving || loading}
                  onClick={() => void submitBo()}
                  className={CSSD_UI_ACTION_PRIMARY}
                >
                  <ClipboardCheck size={14} className="mr-1.5 inline" />
                  {saving ? "Đang lưu…" : "Lưu kiểm kê bộ"}
                </button>
              </div>
            </div>
          ) : (
            <p className="px-1 text-[11px] text-slate-500">Quét / chọn bộ để nhập số đếm.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            value={khoQ}
            onChange={(e) => setKhoQ(e.target.value)}
            placeholder="Tìm mã / tên loại…"
            className="bv103-control-h w-full max-w-md rounded-[var(--radius-control)] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/15"
          />
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
            <p className={UI.formLabel}>Kho dự phòng theo loại</p>
            <p className="text-[11px] text-slate-500">
              Lệch so hệ thống: <span className="font-semibold tabular-nums">{khoDirtyCount}</span>
            </p>
          </div>
          <div className="overflow-auto rounded-[var(--radius-shell)] border border-slate-200">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm text-slate-700">
              <thead className={L.theadRow}>
                <tr>
                  <th className={L.th}>Mã loại</th>
                  <th className={L.th}>Tên</th>
                  <th className={`${L.th} text-center`}>Kho hiện tại</th>
                  <th className={`${L.th} text-center`}>Số đếm kho</th>
                </tr>
              </thead>
              <tbody className={L.tbody}>
                {khoRows.map((row) => {
                  const dem = demKho[row.loaiDungCuId] ?? "";
                  const dirty =
                    Number.isFinite(Math.floor(Number(dem))) &&
                    Math.floor(Number(dem)) !== row.soLuongKhoDuPhong;
                  return (
                    <tr key={row.loaiDungCuId} className={dirty ? L.rowSelected : L.row}>
                      <td className={`${L.td} font-medium text-violet-700`}>{row.maLoai || "—"}</td>
                      <td className={L.td}>{row.tenLoai || "—"}</td>
                      <td className={`${L.td} text-center tabular-nums`}>{row.soLuongKhoDuPhong}</td>
                      <td className={`${L.td} text-center`}>
                        <input
                          type="text"
                          inputMode="numeric"
                          className={demInputClass}
                          value={dem}
                          onChange={(e) =>
                            setDemKho((prev) => ({
                              ...prev,
                              [row.loaiDungCuId]: e.target.value.replace(/[^\d]/g, ""),
                            }))
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
                {khoRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={`${L.td} text-center text-slate-500`}>
                      {loading ? "Đang tải…" : "Không có loại khớp."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving || loading || khoRows.length === 0}
              onClick={() => void submitKho()}
              className={CSSD_UI_ACTION_PRIMARY}
            >
              <ClipboardCheck size={14} className="mr-1.5 inline" />
              {saving ? "Đang lưu…" : "Lưu kiểm kê kho"}
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 pt-2">
        <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Xuất phiếu (phụ)
        </p>
        <SetReconcileCampaignPanel />
      </div>
    </div>
  );
}
