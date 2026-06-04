"use client";

import React, { useMemo, useRef, useState } from "react";
import { Download, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { importCongViecRows } from "../actions/qlcv-import.actions";
import { parseQlcvImportRows } from "../lib/qlcv-import-parse";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
};

const TEMPLATE_HEADERS = [
  { header: "Tiêu đề*", key: "tieu_de" },
  { header: "Mô tả", key: "mo_ta" },
  { header: "Loại (DINH_KY|DOT_XUAT|KHAN_CAP)", key: "loai_cong_viec" },
  { header: "Ưu tiên (THAP|TRUNG_BINH|CAO)", key: "muc_do_uu_tien" },
  { header: "Hạn (YYYY-MM-DD)", key: "han_hoan_thanh" },
  { header: "Mã NV phụ trách*", key: "ma_nv" },
  { header: "Mã khoa", key: "ma_khoa" },
  { header: "Mã tổ", key: "ma_to" },
];

export function QlcvImportDialog({ isOpen, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [busy, setBusy] = useState(false);

  const validation = useMemo(() => parseQlcvImportRows(rows), [rows]);
  const validCount = validation.filter((v) => v.ok).length;
  const invalidCount = validation.length - validCount;

  if (!isOpen) return null;

  async function downloadTemplate() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("QLCV");
    ws.columns = TEMPLATE_HEADERS.map((c) => ({ header: c.header, key: c.key, width: 22 }));
    ws.addRow({
      tieu_de: "Kiểm tra vô khuẩn khoa Ngoại",
      mo_ta: "Theo checklist BV103",
      loai_cong_viec: "DOT_XUAT",
      muc_do_uu_tien: "TRUNG_BINH",
      han_hoan_thanh: "2026-12-31",
      ma_nv: "NV001",
      ma_khoa: "KHOA_NGOAI",
      ma_to: "",
    });
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), "mau-import-cong-viec.xlsx");
  }

  async function onFileChange(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      setRows(parsed);
    } catch {
      toast.error("Không đọc được file Excel.");
      setRows([]);
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    if (!validCount) {
      toast.error("Không có dòng hợp lệ để import.");
      return;
    }
    setBusy(true);
    try {
      const result = await importCongViecRows(rows);
      toast.success(`Đã import ${result.inserted} công việc.`);
      setRows([]);
      onImported();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Import thất bại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Import công việc</h2>
            <p className="mt-1 text-sm text-slate-600">
              Một dòng = một phiếu. Bắt buộc tiêu đề và mã NV phụ trách.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void downloadTemplate()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download size={14} /> Tải mẫu Excel
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Upload size={14} /> Chọn file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
          />
        </div>

        {rows.length > 0 ? (
          <p className="mt-4 text-sm text-slate-700">
            {validCount} dòng hợp lệ · {invalidCount} lỗi / {rows.length} dòng
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Hủy
          </button>
          <button
            type="button"
            disabled={busy || validCount === 0}
            onClick={() => void runImport()}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            Import {validCount > 0 ? `(${validCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
