"use client";

import React, { useEffect, useState } from "react";
import { Tag, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { usePrint } from "@/hooks/usePrint";
import {
  listActiveBoDungCuForCssdLabel,
  registerPhysicalBoLabelFromDmAction,
} from "../../contexts/instrument-catalog/entrypoint";

/** Đăng ký một mã QR gắn với `dm_bo_dung_cu` để in dán và quét truy vết (≤ 140 dòng). */
export default function RegisterBoLabelFromCatalogPanel() {
  const { printLabel } = usePrint();
  const [options, setOptions] = useState<{ id: string; ten_bo: string; ma_bo: string | null }[]>([]);
  const [boId, setBoId] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingList(true);
      const res = await listActiveBoDungCuForCssdLabel();
      if (cancelled) return;
      if (!res.success) {
        toast.error(res.error || "Không tải danh mục bộ.");
        setOptions([]);
        setLoadingList(false);
        return;
      }
      setOptions(res.data);
      if (res.data.length) setBoId((prev) => prev || res.data[0].id);
      setLoadingList(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateAndPrint() {
    const id = String(boId || "").trim();
    if (!id) {
      toast.error("Chọn bộ dụng cụ trong danh mục.");
      return;
    }
    setBusy(true);
    try {
      const res = await registerPhysicalBoLabelFromDmAction(id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`Đã tạo mã ${res.ma_vach_qr} — có thể in nhãn.`);
      await printLabel({
        qrCode: res.ma_vach_qr,
        tenBoDungCu: res.ten_bo,
        tram: "TIEP_NHAN",
        nguoiThucHien: "CSSD",
        thoiGian: new Date().toLocaleString("vi-VN"),
      });
      window.dispatchEvent(new CustomEvent("cssd:kho-refetch"));
    } finally {
      setBusy(false);
    }
  }

  const labelSel = loadingList ? "Đang tải danh mục…" : "Chọn bộ trong danh mục KSNK…";

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#026f17]/10 text-[#026f17]">
            <Tag className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#026f17]">
              Đăng ký nhãn QR (từ danh mục bộ)
            </h3>
            <p className="mt-1 max-w-xl text-[11px] font-medium leading-relaxed text-slate-500">
              Mã chỉ được tạo cho bộ đã có trong <strong className="text-slate-700">danh mục Bộ dụng cụ</strong>.
              Sau khi in dán xong mới có thể quét tại các trạm; hệ thống <strong>không nhận</strong> QR tự bịa không qua bước này.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-[min(100%,280px)] flex-1">
          <label className="sr-only" htmlFor="cssd-register-bo-select">{labelSel}</label>
          <select
            id="cssd-register-bo-select"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-[#026f17]/40 focus:ring-2 focus:ring-[#026f17]/15 disabled:opacity-60"
            value={boId}
            disabled={loadingList || !options.length}
            onChange={(e) => setBoId(e.target.value)}
          >
            {loadingList ? (
              <option value="">{labelSel}</option>
            ) : options.length === 0 ? (
              <option value="">Không có bộ hoạt động — kiểm tra danh mục</option>
            ) : (
              options.map((o) => (
                <option key={o.id} value={o.id}>
                  {(o.ma_bo ? `[${o.ma_bo}] ` : "") + o.ten_bo}
                </option>
              ))
            )}
          </select>
        </div>
        <button
          type="button"
          disabled={busy || loadingList || !options.length || !boId}
          onClick={() => void handleCreateAndPrint()}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#026f17] px-6 text-xs font-black uppercase tracking-wider text-[#FFD700] hover:bg-[#025814] transition-all disabled:opacity-50 shadow-md touch-manipulation"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Tạo mã và in nhãn
        </button>
      </div>
    </div>
  );
}
