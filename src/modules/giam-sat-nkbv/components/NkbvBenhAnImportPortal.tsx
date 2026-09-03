"use client";

import React, { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Trash2,
  UploadCloud,
} from "lucide-react";
import SearchableSelect from "@/components/shared/SearchableSelect";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import {
  buildBenhAnTemplateTsv,
  parseBenhAnImportText,
  type NkbvBenhAnTemplateRow,
} from "../lib/nkbv-benh-an-template";
import { importBenhAnExcel } from "../actions/giam-sat-nkbv-import.actions";
import { nkbvKhoaSelectOptions } from "../lib/nkbv-khoa-options";

type KhoaOpt = { id: string; ten_danh_muc: string; ma_danh_muc?: string };

type DraftRow = NkbvBenhAnTemplateRow & {
  khoa_dieu_tri_id: string;
  incomplete: boolean;
};

type Props = {
  khoas: KhoaOpt[];
  onImported?: () => void;
};

function resolveKhoaId(label: string | undefined, khoas: KhoaOpt[]): string {
  if (!label) return "";
  const n = label.toLowerCase().replace(/khoa/g, "").trim();
  const match = khoas.find((k) => {
    const ten = (k.ten_danh_muc || "").toLowerCase().replace(/khoa/g, "").trim();
    const ma = (k.ma_danh_muc || "").toLowerCase().trim();
    return ten === n || ten.includes(n) || n.includes(ten) || (ma && (ma === n || label.toLowerCase() === ma));
  });
  return match?.id || "";
}

async function downloadExcelTemplate() {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Ho_so_benh_an");
  const headers = [
    "ma_benh_an",
    "ma_benh_nhan",
    "ho_ten_benh_nhan",
    "ngay_vao_vien",
    "khoa_dieu_tri",
    "ngay_sinh",
    "gioi_tinh",
    "ngay_ra_vien",
  ];
  ws.addRow(headers);
  ws.addRow(["BA-00123", "BN-90001", "Nguyen Van A", "2026-07-01", "Khoa HSTC", "1980-05-12", "Nam", ""]);
  ws.addRow(["BA-00124", "BN-90002", "Tran Thi B", "01/08/2026", "Khoa NGOAI", "1992-11-03", "Nữ", ""]);
  const guide = wb.addWorksheet("Huong_dan");
  guide.addRow(["Bước 1", "Tải file mẫu — giữ nguyên dòng tiêu đề sheet Ho_so_benh_an."]);
  guide.addRow(["Bước 2", "Điền/dán từ HIS (mã BA, mã BN, họ tên, ngày vào viện, khoa…)."]);
  guide.addRow(["Bước 3", "Nạp file hoặc dán bảng → xem trước → lưu. Trùng mã BA đã có → cập nhật (upsert)."]);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mau-import-ho-so-benh-an-bv103.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

export default function NkbvBenhAnImportPortal({ khoas, onImported }: Props) {
  const khoaOptions = useMemo(() => nkbvKhoaSelectOptions(khoas), [khoas]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState("");
  const [showPastePanel, setShowPastePanel] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [batchDupHint, setBatchDupHint] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [saving, setSaving] = useState(false);
  const sampleTsv = useMemo(() => buildBenhAnTemplateTsv(), []);

  const applyParsed = (parsed: NkbvBenhAnTemplateRow[], skippedBatchDup: number) => {
    setBatchDupHint(skippedBatchDup);
    setRows(
      parsed.map((r) => {
        const khoa_dieu_tri_id = resolveKhoaId(r.khoa_dieu_tri, khoas);
        const incomplete = !r.ma_benh_an || !r.ma_benh_nhan || !r.ho_ten_benh_nhan || !r.ngay_vao_vien;
        return { ...r, khoa_dieu_tri_id, incomplete };
      }),
    );
    toast.success(
      `Đã nạp ${parsed.length} dòng xem trước` +
        (skippedBatchDup ? ` (bỏ ${skippedBatchDup} trùng trong file)` : ""),
    );
  };

  const onParsePaste = () => {
    const res = parseBenhAnImportText(paste);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    applyParsed(res.rows, res.skippedBatchDup);
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const { default: ExcelJS } = await import("exceljs");
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await file.arrayBuffer());
        const ws = wb.worksheets[0];
        if (!ws) {
          toast.error("File Excel không có sheet dữ liệu");
          return;
        }
        const lines: string[] = [];
        ws.eachRow((row) => {
          const vals = (row.values as unknown[])
            .slice(1)
            .map((v) => (v == null ? "" : String(v)));
          lines.push(vals.join("\t"));
        });
        const res = parseBenhAnImportText(lines.join("\n"));
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        applyParsed(res.rows, res.skippedBatchDup);
        return;
      }
      const text = await file.text();
      const res = parseBenhAnImportText(text);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      applyParsed(res.rows, res.skippedBatchDup);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không đọc được file");
    }
  };

  const updateRow = (idx: number, patch: Partial<DraftRow>) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, ...patch };
        next.incomplete =
          !next.ma_benh_an.trim() ||
          !next.ma_benh_nhan.trim() ||
          !next.ho_ten_benh_nhan.trim() ||
          !next.ngay_vao_vien.trim();
        return next;
      }),
    );
  };

  const incompleteCount = rows.filter((r) => r.incomplete).length;

  const onSave = async () => {
    if (!rows.length) {
      toast.error("Chưa có dữ liệu xem trước");
      return;
    }
    if (incompleteCount > 0) {
      toast.error(`Còn ${incompleteCount} dòng thiếu trường bắt buộc`);
      return;
    }
    setSaving(true);
    try {
      const res = await importBenhAnExcel(
        rows.map((r) => ({
          ma_benh_an: r.ma_benh_an,
          ma_benh_nhan: r.ma_benh_nhan,
          ho_ten_benh_nhan: r.ho_ten_benh_nhan,
          ngay_vao_vien: r.ngay_vao_vien,
          khoa_dieu_tri_id: r.khoa_dieu_tri_id || undefined,
          ngay_sinh: r.ngay_sinh,
          gioi_tinh: r.gioi_tinh,
          ngay_ra_vien: r.ngay_ra_vien,
        })),
      );
      if (!res.success) {
        toast.error(res.error || "Lỗi lưu hồ sơ bệnh án");
        return;
      }
      toast.success(
        `Đã xử lý ${res.count} hồ sơ` +
          (res.inserted != null ? ` · mới ${res.inserted}` : "") +
          (res.skippedExisting ? ` · đã có mã, không đè ${res.skippedExisting}` : "") +
          (res.skippedDuplicate ? ` · bỏ trùng lô ${res.skippedDuplicate}` : "") +
          (res.skippedConflict ? ` · xung đột BA/BN ${res.skippedConflict}` : ""),
      );
      setRows([]);
      setPaste("");
      setShowPastePanel(false);
      onImported?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi lưu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 py-2 sm:space-y-[var(--bv103-space-3)]">
      <div className={`${C.panelShellPadded} space-y-[var(--bv103-space-3)]`}>
        <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100 pb-3 md:flex-row md:items-center">
          <div>
            <h3 className={`${C.panelTitle} flex items-center gap-2`}>
              <FileSpreadsheet className="h-5 w-5 text-[var(--primary)]" />
              Cổng hồ sơ bệnh án (HIS / Excel)
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              1) Tải mẫu → 2) điền/dán từ HIS → 3) xem trước → lưu. Trùng mã BA + mã BN (hoặc mã BA đã có) sẽ bỏ
              qua — không tạo phiếu NKBV.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void downloadExcelTemplate().then(() => toast.success("Đã tải mẫu Excel"))}
              className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 bv103-type-label font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              <Download className="h-3.5 w-3.5" /> Tải mẫu
            </button>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([sampleTsv], { type: "text/tab-separated-values;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "mau-import-ho-so-benh-an.tsv";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 bv103-type-label font-semibold text-slate-600 hover:bg-slate-200"
            >
              <Download className="h-3.5 w-3.5" /> TSV
            </button>
            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 bv103-type-label font-semibold text-slate-600 hover:bg-slate-200"
            >
              <HelpCircle className="h-3.5 w-3.5" /> Hướng dẫn
            </button>
          </div>
        </div>

        {showGuide ? (
          <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-600">
            <li>Cột bắt buộc: Mã bệnh án, Mã bệnh nhân, Họ tên, Ngày vào viện.</li>
            <li>Nhận header tiếng Việt (HIS) hoặc snake_case nội bộ.</li>
            <li>Trong một file: dòng trùng BA+BN hoặc trùng mã BA → giữ dòng đầu.</li>
            <li>Khi lưu: hồ sơ đã có cùng mã BA → cập nhật ngày ra viện / khoa / tên (upsert).</li>
          </ol>
        ) : null}

        {rows.length === 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.tsv,.csv,.txt"
                className="hidden"
                onChange={(e) => void onPickFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={`${C.btnPrimary} gap-1.5`}
              >
                <UploadCloud className="h-4 w-4" /> Chọn file Excel / TSV
              </button>
              <button
                type="button"
                onClick={() => setShowPastePanel((v) => !v)}
                aria-expanded={showPastePanel}
                className={`${C.btnSecondary} gap-1.5`}
              >
                <ClipboardPaste className="h-4 w-4" />
                {showPastePanel ? "Ẩn khung dán" : "Dán bảng"}
                {paste.trim() && !showPastePanel ? (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 bv103-type-label font-semibold text-amber-800">
                    có nội dung
                  </span>
                ) : null}
              </button>
            </div>
            {showPastePanel ? (
              <div className="space-y-2 rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50/40 p-3">
                <label className="block space-y-1">
                  <span className="text-[11px] font-medium text-slate-500">Dán bảng (TSV/CSV)</span>
                  <textarea
                    value={paste}
                    onChange={(e) => setPaste(e.target.value)}
                    rows={6}
                    placeholder="Dán header + dữ liệu từ HIS…"
                    className="w-full rounded-[var(--radius-shell)] border border-slate-200 bg-white p-3 font-mono text-[11px] text-slate-800 shadow-sm outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/15"
                  />
                </label>
                <button type="button" onClick={onParsePaste} className={C.btnSecondary}>
                  Xem trước
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">
                <CheckCircle className="h-3.5 w-3.5" /> {rows.length} dòng
              </span>
              {incompleteCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" /> {incompleteCount} thiếu trường
                </span>
              ) : null}
              {batchDupHint > 0 ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                  Đã bỏ {batchDupHint} trùng trong file
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setRows([]);
                  setPaste("");
                  setShowPastePanel(false);
                }}
                className="ml-auto inline-flex items-center gap-1 text-slate-500 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" /> Xóa xem trước
              </button>
            </div>

            <ResponsiveTableShell>
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Mã BA</th>
                    <th className="px-2 py-2">Mã BN</th>
                    <th className="px-2 py-2">Họ tên</th>
                    <th className="px-2 py-2">Ngày vào</th>
                    <th className="px-2 py-2">Khoa</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={`${r.ma_benh_an}-${idx}`} className={r.incomplete ? "bg-amber-50/50" : ""}>
                      <td className="px-2 py-1.5">
                        <input
                          className={`${C.controlInput} min-w-[100px] font-mono`}
                          value={r.ma_benh_an}
                          onChange={(e) => updateRow(idx, { ma_benh_an: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          className={`${C.controlInput} min-w-[90px] font-mono`}
                          value={r.ma_benh_nhan}
                          onChange={(e) => updateRow(idx, { ma_benh_nhan: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          className={`${C.controlInput} min-w-[140px]`}
                          value={r.ho_ten_benh_nhan}
                          onChange={(e) => updateRow(idx, { ho_ten_benh_nhan: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="date"
                          className={C.controlInput}
                          value={r.ngay_vao_vien}
                          onChange={(e) => updateRow(idx, { ngay_vao_vien: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5 min-w-[200px]">
                        <SearchableSelect
                          value={r.khoa_dieu_tri_id}
                          onChange={(v) => updateRow(idx, { khoa_dieu_tri_id: v })}
                          options={khoaOptions}
                          placeholder="Chọn khoa điều trị..."
                          searchPlaceholder="Tìm mã / tên khoa..."
                          className="text-xs"
                        />
                      </td>                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTableShell>

            <button type="button" disabled={saving} onClick={() => void onSave()} className={C.btnPrimary}>
              {saving ? "Đang lưu…" : "Lưu vào hồ sơ bệnh án"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
