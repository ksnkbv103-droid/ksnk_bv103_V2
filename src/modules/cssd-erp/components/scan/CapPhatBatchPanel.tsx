// src/modules/cssd-erp/components/scan/CapPhatBatchPanel.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import QrScanInput from "@/components/shared/QrScanInput";
import { CSSD_UI_ACTION_PRIMARY } from "../../shared/ui/cssd-ui-chrome";
import { capPhatNhieuBoAction, listNoiNhanCapPhatAction } from "../../actions/cssd-cap-phat-batch.actions";
import {
  normalizeCapPhatCodes,
  summarizeCapPhatBatch,
  type CapPhatBatchItem,
} from "../../lib/cssd-cap-phat-batch";

type NoiNhan = { id: string; label: string; maKhoa: string };

type Props = {
  disabled?: boolean;
  onPrint?: (quyTrinhId: string) => void;
  onDone?: () => void;
};

/** Trạm Cấp phát: chọn nơi nhận (khoa / phòng mổ / bàn mổ) → quét nhiều bộ → xác nhận một lần. */
export default function CapPhatBatchPanel({ disabled, onPrint, onDone }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [options, setOptions] = useState<NoiNhan[]>([]);
  const [search, setSearch] = useState("");
  const [noiNhan, setNoiNhan] = useState<NoiNhan | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<CapPhatBatchItem[] | null>(null);

  useEffect(() => {
    void listNoiNhanCapPhatAction().then((r) => {
      if (r.success) setOptions(r.data);
      else toast.error(r.error);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options.slice(0, 30);
    return options.filter((o) => `${o.label} ${o.maKhoa}`.toLowerCase().includes(q)).slice(0, 30);
  }, [options, search]);

  const addCode = (raw: string) => {
    const next = normalizeCapPhatCodes([...codes, raw]);
    if (next.length === codes.length) toast.message("Mã trống hoặc đã quét.");
    setCodes(next);
    setResults(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const confirm = async () => {
    if (!noiNhan || codes.length === 0) return;
    setBusy(true);
    try {
      const res = await capPhatNhieuBoAction({ khoaNhanId: noiNhan.id, maQrs: codes });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const s = summarizeCapPhatBatch(res.items);
      setResults(res.items);
      // Giữ lại chỉ các bộ lỗi để quét/xử lý lại.
      setCodes(res.items.filter((i) => !i.ok).map((i) => i.maQr));
      const truoc = res.items.filter((i) => i.ok && i.daCapTruoc).length;
      const ghiChuTruoc = truoc > 0 ? ` (${truoc} bộ đã cấp trước đó, nơi nhận không đổi)` : "";
      if (s.failed === 0) toast.success(`Đã cấp ${s.ok} bộ cho ${noiNhan.label}${ghiChuTruoc}`);
      else toast.warning(`Cấp ${s.ok}/${s.total} bộ; ${s.failed} bộ lỗi, xem danh sách.${ghiChuTruoc}`);
      onDone?.();
    } finally {
      setBusy(false);
    }
  };

  const off = disabled || busy;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 space-y-2">
        <p className="text-[11px] font-semibold text-slate-600">1. Nơi nhận (khoa, phòng mổ hoặc bàn mổ)</p>
        {noiNhan ? (
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800">
            <span>{noiNhan.label}</span>
            <button type="button" className="text-xs text-[var(--primary)] underline" onClick={() => setNoiNhan(null)} disabled={off}>
              Đổi
            </button>
          </div>
        ) : (
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Gõ để tìm khoa / phòng mổ…"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-300"
            />
            <ul className="max-h-48 overflow-auto rounded-lg bg-white text-sm">
              {filtered.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => setNoiNhan(o)} className="w-full touch-manipulation px-3 py-2 text-left hover:bg-emerald-50">
                    {o.label}
                  </button>
                </li>
              ))}
              {filtered.length === 0 ? <li className="px-3 py-2 text-slate-400">Không có nơi nhận khớp.</li> : null}
            </ul>
          </>
        )}
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 space-y-2">
        <p className="text-[11px] font-semibold text-slate-600">2. Quét các bộ cần cấp ({codes.length})</p>
        <QrScanInput
          id="cssd-cap-phat-batch-qr"
          inputRef={inputRef}
          disabled={off || !noiNhan}
          placeholder={noiNhan ? "Quét hoặc gõ mã bộ rồi Enter" : "Chọn nơi nhận trước"}
          cameraTitle="Quét QR bộ dụng cụ"
          onEnter={addCode}
          onCameraScan={addCode}
          className="min-w-0"
          inputClassName="h-12 w-full min-w-0 touch-manipulation rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold uppercase outline-none focus:border-emerald-300 disabled:opacity-60"
        />
        <ul className="space-y-1 text-sm">
          {codes.map((c) => (
            <li key={c} className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5">
              <span className="font-mono">{c}</span>
              <button type="button" className="text-xs text-red-600" onClick={() => setCodes(codes.filter((x) => x !== c))} disabled={off}>
                Bỏ
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        disabled={off || !noiNhan || codes.length === 0}
        onClick={() => void confirm()}
        className={`${CSSD_UI_ACTION_PRIMARY} h-12 w-full touch-manipulation disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {busy ? "Đang cấp phát…" : `3. Xác nhận cấp ${codes.length} bộ${noiNhan ? ` cho ${noiNhan.label}` : ""}`}
      </button>

      {results ? (
        <ul className="space-y-1 text-sm">
          {results.map((r) => (
            <li
              key={r.maQr}
              className={`flex items-center justify-between rounded-lg px-3 py-1.5 ${r.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
            >
              <span>
                <span className="font-mono">{r.maQr}</span> — {r.ok
                  ? r.daCapTruoc
                    ? `đã cấp trước đó (${r.tenBo}) — nơi nhận giữ như lần cấp đầu`
                    : `đã cấp (${r.tenBo})`
                  : r.error}
              </span>
              {r.ok && r.quyTrinhId && onPrint ? (
                <button type="button" className="text-xs underline" onClick={() => onPrint(r.quyTrinhId)}>
                  In phiếu
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
