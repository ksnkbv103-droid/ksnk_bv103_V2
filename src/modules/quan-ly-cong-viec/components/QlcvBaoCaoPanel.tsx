"use client";

/**
 * Tab Báo cáo kỳ MVP — Domain SSOT §6 (người · trạng thái · quá hạn · đúng hạn).
 * Định kỳ tuân thủ: P1 defer.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { bv103TableLayout } from "@/lib/bv103-table-layout";
import { Bv103EmptyState } from "@/components/shared/Bv103EmptyState";
import { getQlcvBaoCaoKy } from "../actions/bao-cao-ky.actions";
import {
  ketQuaDongHanLabel,
  QLCV_BAO_CAO_PERIOD_KINDS,
  rowsToCsv,
  type QlcvBaoCaoKyPayload,
  type QlcvBaoCaoPeriodKind,
} from "../lib/qlcv-bao-cao-ky";
import { labelQlcvPeriodKind } from "../lib/qlcv-period-range";

type ReportTableId = "NGUOI" | "TRANG_THAI" | "QUA_HAN" | "DONG_HAN";

const TABLE_TABS: { id: ReportTableId; label: string; hint: string }[] = [
  {
    id: "NGUOI",
    label: "Theo người",
    hint: "Người thực hiện · mở · quá hạn · hoàn thành · đúng hạn (theo kỳ)",
  },
  {
    id: "TRANG_THAI",
    label: "Theo trạng thái",
    hint: "7 mã canonical + đề xuất (thời điểm trên tập đã tải)",
  },
  {
    id: "QUA_HAN",
    label: "Quá hạn mở",
    hint: "Việc · hạn · người thực hiện · người giao · % (thời điểm)",
  },
  {
    id: "DONG_HAN",
    label: "Đúng hạn / trễ",
    hint: "Phiếu đóng trong kỳ: hoàn thành lúc vs hạn",
  },
];

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function QlcvBaoCaoPanel() {
  const [periodKind, setPeriodKind] = useState<QlcvBaoCaoPeriodKind>("MONTH");
  const [shift, setShift] = useState(0);
  const [tableId, setTableId] = useState<ReportTableId>("NGUOI");
  const [payload, setPayload] = useState<QlcvBaoCaoKyPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getQlcvBaoCaoKy({ periodKind, shift });
      setPayload(next);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Không tải được báo cáo kỳ");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [periodKind, shift]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeHint = TABLE_TABS.find((t) => t.id === tableId)?.hint ?? "";

  const csvBundle = useMemo(() => {
    if (!payload) return null;
    const stamp = payload.period.startIso;
    if (tableId === "NGUOI") {
      return {
        name: `qlcv-bao-cao-theo-nguoi-${stamp}.csv`,
        rows: payload.theoNguoi.map((r) => ({
          phu_trach: r.phu_trach,
          mo: r.mo,
          qua_han: r.qua_han,
          hoan_thanh: r.hoan_thanh,
          dung_han: r.dung_han,
        })),
      };
    }
    if (tableId === "TRANG_THAI") {
      return {
        name: `qlcv-bao-cao-trang-thai-${stamp}.csv`,
        rows: payload.theoTrangThai.map((r) => ({
          ma: r.ma,
          nhan: r.nhan,
          so_luong: r.so_luong,
        })),
      };
    }
    if (tableId === "QUA_HAN") {
      return {
        name: `qlcv-bao-cao-qua-han-${stamp}.csv`,
        rows: payload.quaHan.map((r) => ({
          tieu_de: r.tieu_de,
          han: r.han_hoan_thanh ?? "",
          phu_trach: r.phu_trach,
          nguoi_giao: r.nguoi_giao,
          phan_tram: r.phan_tram_hoan_thanh,
        })),
      };
    }
    return {
      name: `qlcv-bao-cao-dong-han-${stamp}.csv`,
      rows: payload.dongHan.map((r) => ({
        tieu_de: r.tieu_de,
        phu_trach: r.phu_trach,
        han: r.han_hoan_thanh ?? "",
        hoan_thanh_luc: r.hoan_thanh_luc ?? "",
        ket_qua: ketQuaDongHanLabel(r.ket_qua),
      })),
    };
  }, [payload, tableId]);

  const emptyTitle = "Chưa có dòng phù hợp kỳ này.";
  const emptyState = (
    <div className="p-4">
      <Bv103EmptyState
        title={emptyTitle}
        action={
          <button
            type="button"
            className={bv103LayoutChrome.btnPrimary}
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : undefined} aria-hidden />
            Tải lại
          </button>
        }
      />
    </div>
  );

  return (
    <div className="bv103-stack-page space-y-[var(--bv103-space-3)]">
      <div className={`${bv103LayoutChrome.panelSurface} space-y-3 p-4 sm:p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="bv103-type-section text-slate-900">Báo cáo kỳ · người–việc–tiến độ</h2>
            <p className="bv103-type-body text-slate-600">
              Quan sát rõ <strong>ai phụ trách</strong>, <strong>việc gì</strong>,{" "}
              <strong>mở / quá hạn / hoàn thành đúng hạn</strong> theo tuần · tháng · quý (SSOT §6).
            </p>
          </div>
          <button
            type="button"
            className={bv103LayoutChrome.btnSecondary}
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : undefined} aria-hidden />
            Tải lại
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="bv103-type-label text-slate-500">Kỳ</span>
          {QLCV_BAO_CAO_PERIOD_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className={periodKind === k ? bv103LayoutChrome.btnPrimary : bv103LayoutChrome.btnSecondary}
              onClick={() => {
                setPeriodKind(k);
                setShift(0);
              }}
            >
              {labelQlcvPeriodKind(k)}
            </button>
          ))}
          <div className="ml-1 inline-flex items-center gap-1">
            <button
              type="button"
              className={bv103LayoutChrome.btnSecondary}
              aria-label="Kỳ trước"
              onClick={() => setShift((s) => s - 1)}
            >
              <ChevronLeft size={14} aria-hidden />
            </button>
            <span className="min-w-[10rem] text-center bv103-type-label font-semibold text-slate-800">
              {payload?.period.label ?? "…"}
            </span>
            <button
              type="button"
              className={bv103LayoutChrome.btnSecondary}
              aria-label="Kỳ sau"
              disabled={shift >= 0}
              onClick={() => setShift((s) => Math.min(0, s + 1))}
            >
              <ChevronRight size={14} aria-hidden />
            </button>
          </div>
        </div>

        {payload?.truncated ? (
          <p className="rounded-[var(--radius-control)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Đã đạt trần fetch {payload.fetchCap} phiếu (mới cập nhật trước). Báo cáo có thể thiếu việc cũ —
            cần RPC/mig aggregate nếu volume lớn (chưa áp dụng prod trong task này).
          </p>
        ) : null}

        <p className="text-xs text-slate-500">
          Đã tải {payload?.fetched ?? 0} phiếu · không RPC mới · đọc fact + aggregate TS.
        </p>

        {payload ? (
          <div
            className="flex flex-wrap items-center gap-2 rounded-[var(--radius-control)] border border-slate-200/90 bg-white px-3 py-2 text-xs text-slate-700"
            title="Stats MVP · aggregate client từ rows kỳ (không RPC mới)"
          >
            {(() => {
              // Derive from payload.theoNguoi (client aggregate kỳ — không RPC mới)
              const tongNguoi = payload.theoNguoi.reduce((s, r) => s + r.mo + r.hoan_thanh, 0);
              const tong = tongNguoi > 0 ? tongNguoi : payload.fetched;
              const hoanThanh = payload.theoNguoi.reduce((s, r) => s + r.hoan_thanh, 0);
              const quaHan = payload.theoNguoi.reduce((s, r) => s + r.qua_han, 0);
              const pct = (n: number, d: number) => (d <= 0 ? 0 : Math.round((n / d) * 1000) / 10);
              return (
                <>
                  <span>
                    <span className="font-medium text-slate-500">Số việc</span>{" "}
                    <strong className="tabular-nums">{tong}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    <span className="font-medium text-slate-500">% hoàn thành</span>{" "}
                    <strong className="tabular-nums text-emerald-700">{pct(hoanThanh, tong)}%</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    <span className="font-medium text-slate-500">% quá hạn</span>{" "}
                    <strong className="tabular-nums text-red-700">{pct(quaHan, tong)}%</strong>
                  </span>
                </>
              );
            })()}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABLE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tableId === t.id ? bv103LayoutChrome.btnPrimary : bv103LayoutChrome.btnSecondary}
            onClick={() => setTableId(t.id)}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          className={`${bv103LayoutChrome.btnSecondary} ml-auto`}
          disabled={!csvBundle || csvBundle.rows.length === 0}
          onClick={() => {
            if (!csvBundle) return;
            downloadCsv(csvBundle.name, rowsToCsv(csvBundle.rows));
            toast.success("Đã tải CSV");
          }}
        >
          <Download size={14} aria-hidden /> CSV bảng đang xem
        </button>
      </div>

      <p className="bv103-type-body text-slate-600">{activeHint}</p>

      <div className={`${bv103TableLayout.frame} overflow-x-auto`}>
        {loading && !payload ? (
          <p className="p-6 text-center text-sm text-slate-500">Đang tải báo cáo…</p>
        ) : null}

        {!loading && payload && tableId === "NGUOI" ? (
          payload.theoNguoi.length === 0 ? (
            emptyState
          ) : (
            <table className={bv103TableLayout.tableFixed}>
              <thead>
                <tr className={bv103TableLayout.theadRow}>
                  <th className={`${bv103TableLayout.th} ${bv103TableLayout.colTitle}`}>Người thực hiện</th>
                  <th className={`${bv103TableLayout.th} ${bv103TableLayout.colNarrow}`}>Mở</th>
                  <th className={`${bv103TableLayout.th} ${bv103TableLayout.colNarrow}`}>Quá hạn</th>
                  <th className={`${bv103TableLayout.th} ${bv103TableLayout.colNarrow}`}>Hoàn thành</th>
                  <th className={`${bv103TableLayout.th} ${bv103TableLayout.colNarrow}`}>Đúng hạn</th>
                </tr>
              </thead>
              <tbody className={bv103TableLayout.tbody}>
                {payload.theoNguoi.map((r) => (
                  <tr key={r.nguoi_phu_trach_id ?? r.phu_trach} className={bv103TableLayout.row}>
                    <td className={`${bv103TableLayout.td} font-medium text-slate-900`}>{r.phu_trach}</td>
                    <td className={`${bv103TableLayout.td} text-center tabular-nums`}>{r.mo}</td>
                    <td
                      className={`${bv103TableLayout.td} text-center tabular-nums ${
                        r.qua_han > 0 ? bv103TableLayout.statusDanger : ""
                      }`}
                    >
                      {r.qua_han}
                    </td>
                    <td className={`${bv103TableLayout.td} text-center tabular-nums`}>{r.hoan_thanh}</td>
                    <td className={`${bv103TableLayout.td} text-center tabular-nums`}>{r.dung_han}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}

        {!loading && payload && tableId === "TRANG_THAI" ? (
          <table className={bv103TableLayout.tableFixed}>
            <thead>
              <tr className={bv103TableLayout.theadRow}>
                <th className={`${bv103TableLayout.th} ${bv103TableLayout.colStatus}`}>Mã</th>
                <th className={`${bv103TableLayout.th} ${bv103TableLayout.colTitle}`}>Nhãn</th>
                <th className={`${bv103TableLayout.th} ${bv103TableLayout.colNarrow}`}>Số lượng</th>
              </tr>
            </thead>
            <tbody className={bv103TableLayout.tbody}>
              {payload.theoTrangThai.map((r) => (
                <tr key={r.ma} className={bv103TableLayout.row}>
                  <td className={`${bv103TableLayout.td} font-mono text-xs text-slate-600`}>{r.ma}</td>
                  <td className={bv103TableLayout.td}>{r.nhan}</td>
                  <td className={`${bv103TableLayout.td} text-center tabular-nums font-semibold`}>
                    {r.so_luong}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {!loading && payload && tableId === "QUA_HAN" ? (
          payload.quaHan.length === 0 ? (
            emptyState
          ) : (
            <table className={bv103TableLayout.tableFixed}>
              <thead>
                <tr className={bv103TableLayout.theadRow}>
                  <th className={`${bv103TableLayout.th} ${bv103TableLayout.colTitle}`}>Việc</th>
                  <th className={`${bv103TableLayout.th} ${bv103TableLayout.colMeta}`}>Hạn</th>
                  <th className={`${bv103TableLayout.th} ${bv103TableLayout.colMeta}`}>Người thực hiện</th>
                  <th className={`${bv103TableLayout.th} ${bv103TableLayout.colMeta}`}>Người giao</th>
                  <th className={`${bv103TableLayout.th} ${bv103TableLayout.colNarrow}`}>%</th>
                </tr>
              </thead>
              <tbody className={bv103TableLayout.tbody}>
                {payload.quaHan.map((r) => (
                  <tr key={r.id} className={bv103TableLayout.row}>
                    <td className={`${bv103TableLayout.td} font-medium text-slate-900`}>{r.tieu_de}</td>
                    <td className={`${bv103TableLayout.td} ${bv103TableLayout.statusDanger}`}>
                      {r.han_hoan_thanh ?? "—"}
                    </td>
                    <td className={bv103TableLayout.td}>{r.phu_trach}</td>
                    <td className={bv103TableLayout.td}>{r.nguoi_giao}</td>
                    <td className={`${bv103TableLayout.td} text-center tabular-nums`}>
                      {r.phan_tram_hoan_thanh}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}

        {!loading && payload && tableId === "DONG_HAN" ? (
          payload.dongHan.length === 0 ? (
            emptyState
          ) : (
            <table className={bv103TableLayout.tableFixed}>
              <thead>
                <tr className={bv103TableLayout.theadRow}>
                  <th className={`${bv103TableLayout.th} ${bv103TableLayout.colTitle}`}>Việc</th>
                  <th className={`${bv103TableLayout.th} ${bv103TableLayout.colMeta}`}>Người thực hiện</th>
                  <th className={`${bv103TableLayout.th} ${bv103TableLayout.colMeta}`}>Hạn</th>
                  <th className={`${bv103TableLayout.th} ${bv103TableLayout.colMeta}`}>Hoàn thành lúc</th>
                  <th className={`${bv103TableLayout.th} ${bv103TableLayout.colStatus}`}>Kết quả</th>
                </tr>
              </thead>
              <tbody className={bv103TableLayout.tbody}>
                {payload.dongHan.map((r) => (
                  <tr key={r.id} className={bv103TableLayout.row}>
                    <td className={`${bv103TableLayout.td} font-medium text-slate-900`}>{r.tieu_de}</td>
                    <td className={bv103TableLayout.td}>{r.phu_trach}</td>
                    <td className={bv103TableLayout.td}>{r.han_hoan_thanh ?? "—"}</td>
                    <td className={bv103TableLayout.td}>{r.hoan_thanh_luc ?? "—"}</td>
                    <td
                      className={`${bv103TableLayout.td} ${
                        r.ket_qua === "DUNG_HAN"
                          ? bv103TableLayout.statusOk
                          : r.ket_qua === "TRE"
                            ? bv103TableLayout.statusDanger
                            : bv103TableLayout.statusMuted
                      }`}
                    >
                      {ketQuaDongHanLabel(r.ket_qua)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}
      </div>

      <p className="text-xs text-slate-400">
        P1 defer: Định kỳ tuân thủ (mẫu · spawn · hoàn thành). GateStats / Điều hành không đổi.
      </p>
    </div>
  );
}
