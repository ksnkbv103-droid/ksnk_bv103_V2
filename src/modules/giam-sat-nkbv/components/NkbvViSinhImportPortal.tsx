"use client";

import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import React, { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { parseISO, differenceInCalendarDays } from "date-fns";
import { formatDateVi } from "@/lib/format-datetime-vi";
import { isHaiSuspectByDay3Rule } from "../lib/nkbv-timeline-math";
import { buildViSinhTemplateTsv, type NkbvViSinhKetQua } from "../lib/nkbv-vi-sinh-template";
import {
  buildLisExcelSampleMatrix,
  parseLisOrInternalPaste,
  type NkbvLisDraftRow,
} from "../lib/nkbv-lis-adapter";
import type { ImportWindowAlert } from "../lib/nkbv-import-window-scan";
import { nkbvKhoaSelectOptions } from "../lib/nkbv-khoa-options";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  Trash2,
  HelpCircle,
  ArrowRight,
  Database,
  Download,
  ClipboardPaste,
} from "lucide-react";
import {
  importViSinhExcel,
  previewViSinhImportAlerts,
} from "../actions/giam-sat-nkbv-import.actions";
import NkbvViSinhStorePanel from "./NkbvViSinhStorePanel";

type NkbvViSinhImportPortalProps = {
  khoas: Array<{ id: string; ten_danh_muc: string; ma_danh_muc?: string }>;
};

type ParsedRecord = {
  ma_benh_nhan: string;
  ho_ten_benh_nhan: string;
  ngay_sinh: string;
  gioi_tinh: string;
  ngay_vao_vien: string;
  ngay_lay_mau: string;
  khoa_yeu_cau_id: string;
  loai_benh_pham: string;
  tac_nhan: string;
  ma_benh_an: string;
  ma_benh_pham: string;
  ma_xet_nghiem: string;
  ket_qua: NkbvViSinhKetQua;
  is_mdro: boolean;
  mdro_phenotype: string;
  so_luong?: string;
  lis_metadata?: Record<string, string>;
  needs_stay_fields: boolean;
  diffDays: number;
  isHaiSuspect: boolean;
  willSpawnCase: boolean;
  alerts: ImportWindowAlert[];
};

const KET_QUA_LABEL: Record<NkbvViSinhKetQua, string> = {
  DUONG_TINH: "Dương tính",
  AM_TINH: "Âm tính / dưới ngưỡng",
  NHIEU: "Nhiễu / nhiễm",
};

async function downloadLisExcelTemplate() {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Vi_sinh_LIS");
  for (const row of buildLisExcelSampleMatrix()) ws.addRow(row);
  ws.getRow(1).font = { bold: true };
  const guide = wb.addWorksheet("Huong_dan");
  guide.addRow(["Mục", "Hướng dẫn"]);
  guide.addRow(["Bước 1", "Tải file mẫu — giữ nguyên dòng tiêu đề sheet Vi_sinh_LIS."]);
  guide.addRow(["Bước 2", "Điền/dán từ LIS. Bổ sung Mã bệnh án + Ngày vào viện nếu thiếu."]);
  guide.addRow(["Bước 3", "Nạp vào phần mềm → xem trước → lưu kho vi sinh (không tạo phiếu điều tra)."]);
  guide.addRow(["Số phiếu", "Khóa mã xét nghiệm (ưu tiên). Cùng phiếu + khác Mã dịch vụ → 2 dòng."]);
  guide.addRow(["Barcode", "Dùng khi thiếu Số phiếu"]);
  guide.addRow(["Mã bệnh án", "Bắt buộc trước khi lưu — điền trên file hoặc màn xem trước"]);
  guide.addRow(["Ngày vào viện", "Bắt buộc để gắn timeline bệnh án (YYYY-MM-DD hoặc M/D/YY)"]);
  guide.addRow(["Ngày thực hiện", "Ngày lấy mẫu (không dùng ngày trả kết quả)"]);
  guide.addRow(["Kết quả", "Dương tính | Âm tính | Dưới ngưỡng gây bệnh | Bệnh phẩm nhiễm"]);
  guide.getRow(1).font = { bold: true };
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mau-import-vi-sinh-lis-bv103.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

function matrixToTsv(matrix: string[][]): string {
  return matrix.map((r) => r.join("\t")).join("\n");
}

function draftToParsed(r: NkbvLisDraftRow, khoas: NkbvViSinhImportPortalProps["khoas"]): ParsedRecord {
  let diffDays = 0;
  let isHaiSuspect = false;
  if (r.ngay_vao_vien && r.ngay_lay_mau) {
    try {
      const dVao = parseISO(r.ngay_vao_vien.includes("T") ? r.ngay_vao_vien : `${r.ngay_vao_vien}T00:00:00`);
      const dMau = parseISO(r.ngay_lay_mau.includes("T") ? r.ngay_lay_mau : `${r.ngay_lay_mau}T00:00:00`);
      diffDays = differenceInCalendarDays(dMau, dVao);
      isHaiSuspect = isHaiSuspectByDay3Rule(r.ngay_vao_vien, r.ngay_lay_mau);
    } catch {
      /* ignore */
    }
  }

  let khoa_yeu_cau_id = "";
  if (r.khoa_yeu_cau) {
    const normalizedKhoa = r.khoa_yeu_cau.toLowerCase().replace(/khoa/g, "").trim();
    const match = khoas.find(
      (k) =>
        k.ten_danh_muc.toLowerCase().replace(/khoa/g, "").trim() === normalizedKhoa ||
        k.ten_danh_muc.toLowerCase().includes(normalizedKhoa) ||
        normalizedKhoa.includes(k.ten_danh_muc.toLowerCase().replace(/khoa/g, "").trim()),
    );
    if (match) khoa_yeu_cau_id = match.id;
  }

  const needs = !r.ma_benh_an?.trim() || !r.ngay_vao_vien?.trim();
  return {
    ma_benh_nhan: r.ma_benh_nhan,
    ho_ten_benh_nhan: r.ho_ten_benh_nhan,
    ngay_sinh: r.ngay_sinh || "",
    gioi_tinh: r.gioi_tinh || "",
    ngay_vao_vien: r.ngay_vao_vien || "",
    ngay_lay_mau: r.ngay_lay_mau,
    khoa_yeu_cau_id,
    loai_benh_pham: r.loai_benh_pham,
    tac_nhan: r.tac_nhan,
    ma_benh_an: r.ma_benh_an || "",
    ma_benh_pham: r.ma_benh_pham || "",
    ma_xet_nghiem: r.ma_xet_nghiem,
    ket_qua: r.ket_qua,
    is_mdro: Boolean(r.is_mdro),
    mdro_phenotype: r.mdro_phenotype || "",
    so_luong: r.so_luong,
    lis_metadata: r.metadata,
    needs_stay_fields: needs,
    diffDays,
    isHaiSuspect,
    willSpawnCase: r.ket_qua === "DUONG_TINH" && isHaiSuspect && !needs,
    alerts: [],
  };
}

export default function NkbvViSinhImportPortal({ khoas }: NkbvViSinhImportPortalProps) {
  const khoaOptions = useMemo(() => nkbvKhoaSelectOptions(khoas), [khoas]);
  const [pasteData, setPasteData] = useState("");
  const [showPastePanel, setShowPastePanel] = useState(false);
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const sampleInternal = buildViSinhTemplateTsv();
  const sampleLis = matrixToTsv(buildLisExcelSampleMatrix());

  const applyParsedRows = async (drafts: NkbvLisDraftRow[], formatLabel: string) => {
    const baseRows = drafts.map((r) => draftToParsed(r, khoas));
    setIsLoading(true);
    try {
      const alertRes = await previewViSinhImportAlerts(
        baseRows
          .filter((r) => r.ket_qua === "DUONG_TINH" && !r.needs_stay_fields)
          .map((r) => ({
            ma_benh_an: r.ma_benh_an,
            ngay_lay_mau: r.ngay_lay_mau,
            loai_benh_pham: r.loai_benh_pham,
            ma_xet_nghiem: r.ma_xet_nghiem,
          })),
      );
      const alertsByXn = alertRes.success ? alertRes.alertsByXn : {};
      setRecords(
        baseRows.map((r) => ({
          ...r,
          alerts: alertsByXn[r.ma_xet_nghiem] || [],
        })),
      );
      setPasteData("");
      setShowPastePanel(false);
      const needFill = baseRows.filter((r) => r.needs_stay_fields).length;
      toast.success(
        `Đã phân tích ${baseRows.length} dòng (${formatLabel})${
          needFill ? ` — ${needFill} dòng cần bổ sung mã BA / ngày vào viện` : ""
        }.`,
      );
    } catch (err: unknown) {
      setRecords(baseRows);
      setPasteData("");
      setShowPastePanel(false);
      const msg = err instanceof Error ? err.message : "lỗi";
      toast.success(`Đã phân tích ${baseRows.length} dòng (chưa rà RIT/SBAP: ${msg})`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParsePaste = async () => {
    if (!pasteData.trim()) {
      toast.error("Vui lòng dán bảng LIS hoặc mẫu nội bộ!");
      return;
    }
    const parsed = parseLisOrInternalPaste(pasteData);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    if (parsed.warnings.length) toast.warning(parsed.warnings.slice(0, 3).join(" · "));
    await applyParsedRows(parsed.rows, parsed.format === "lis" ? "LIS" : "mẫu nội bộ");
  };

  const handleExcelUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const { default: ExcelJS } = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) {
        toast.error("File Excel không có sheet dữ liệu.");
        return;
      }
      const matrix: string[][] = [];
      ws.eachRow({ includeEmpty: false }, (row) => {
        const vals: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          while (vals.length < colNumber - 1) vals.push("");
          const v = cell.value;
          if (v && typeof v === "object" && "text" in (v as object)) {
            vals.push(String((v as { text?: string }).text ?? ""));
          } else if (v && typeof v === "object" && "result" in (v as object)) {
            vals.push(String((v as { result?: unknown }).result ?? ""));
          } else if (v instanceof Date) {
            vals.push(
              `${v.getMonth() + 1}/${v.getDate()}/${String(v.getFullYear()).slice(2)} ${v.getHours()}:${String(v.getMinutes()).padStart(2, "0")}`,
            );
          } else {
            vals.push(v == null ? "" : String(v));
          }
        });
        matrix.push(vals);
      });
      const tsv = matrixToTsv(matrix);
      const parsed = parseLisOrInternalPaste(tsv);
      if (!parsed.ok) {
        toast.error(parsed.error);
        return;
      }
      if (parsed.warnings.length) toast.warning(parsed.warnings.slice(0, 3).join(" · "));
      await applyParsedRows(parsed.rows, "Excel");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không đọc được file Excel");
    } finally {
      setIsLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleImportSubmit = async () => {
    if (records.length === 0) return;
    const incomplete = records.filter((r) => !r.ma_benh_an.trim() || !r.ngay_vao_vien.trim());
    if (incomplete.length > 0) {
      toast.error(`Còn ${incomplete.length} dòng thiếu mã bệnh án hoặc ngày vào viện — bổ sung trên bảng xem trước.`);
      return;
    }
    const mdroMissing = records.filter((r) => r.is_mdro && !r.mdro_phenotype);
    if (mdroMissing.length > 0) {
      toast.error(`${mdroMissing.length} dòng đa kháng chưa chọn phenotype.`);
      return;
    }
    setIsLoading(true);
    try {
      const payload = records.map((r) => ({
        ma_benh_nhan: r.ma_benh_nhan,
        ho_ten_benh_nhan: r.ho_ten_benh_nhan,
        ngay_sinh: r.ngay_sinh || undefined,
        gioi_tinh: r.gioi_tinh || undefined,
        ngay_vao_vien: r.ngay_vao_vien,
        ngay_lay_mau: r.ngay_lay_mau,
        khoa_yeu_cau_id: r.khoa_yeu_cau_id || undefined,
        loai_benh_pham: r.loai_benh_pham,
        tac_nhan: r.tac_nhan,
        ma_benh_an: r.ma_benh_an,
        ma_benh_pham: r.ma_benh_pham || undefined,
        ma_xet_nghiem: r.ma_xet_nghiem,
        ket_qua: r.ket_qua,
        is_mdro: r.is_mdro,
        mdro_phenotype: r.is_mdro ? (r.mdro_phenotype as import("../lib/nkbv-mdro").NkbvMdroPhenotype) : null,
        mdro_source: r.is_mdro ? ("MANUAL" as const) : undefined,
        so_luong: r.so_luong,
        lis_metadata: r.lis_metadata,
      }));

      const res = await importViSinhExcel(payload);
      if (res.success) {
        toast.success(
          `Đã lưu ${res.count} xét nghiệm vào kho vi sinh (bỏ trùng ${res.skippedDuplicate ?? 0}). Phân tích trên Hub bệnh án.`,
        );
        setRecords([]);
      } else {
        toast.error(res.error || "Gặp lỗi khi nạp vi sinh");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi lưu dữ liệu vi sinh");
    } finally {
      setIsLoading(false);
    }
  };

  const updateRow = (idx: number, patch: Partial<ParsedRecord>) => {
    setRecords((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, ...patch };
        const needs = !next.ma_benh_an.trim() || !next.ngay_vao_vien.trim();
        let isHaiSuspect = false;
        let diffDays = 0;
        if (!needs) {
          try {
            const dVao = parseISO(
              next.ngay_vao_vien.includes("T") ? next.ngay_vao_vien : `${next.ngay_vao_vien}T00:00:00`,
            );
            const dMau = parseISO(
              next.ngay_lay_mau.includes("T") ? next.ngay_lay_mau : `${next.ngay_lay_mau}T00:00:00`,
            );
            diffDays = differenceInCalendarDays(dMau, dVao);
            isHaiSuspect = isHaiSuspectByDay3Rule(next.ngay_vao_vien, next.ngay_lay_mau);
          } catch {
            /* ignore */
          }
        }
        return {
          ...next,
          needs_stay_fields: needs,
          diffDays,
          isHaiSuspect,
          willSpawnCase: next.ket_qua === "DUONG_TINH" && isHaiSuspect && !needs,
        };
      }),
    );
  };

  const incompleteCount = records.filter((r) => r.needs_stay_fields).length;

  return (
    <div className="space-y-3 py-2 sm:space-y-4 sm:py-3">
      <div className={`${C.panelSurface} p-6 space-y-4`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className={`${C.panelTitle} flex items-center gap-2`}>
              <FileSpreadsheet className="h-6 w-6 text-[var(--primary)]" />
              Kho nạp xét nghiệm vi sinh toàn viện (LIS)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Chỉ lưu / chuẩn hóa dữ liệu vi sinh thô — không phải phiếu điều tra dịch tễ. Phân tích
              nhiễm khuẩn trên Hub bệnh án (sau phân tích, kho hiện cột «Đã PT?»). 1) Tải mẫu → 2) dán từ LIS → 3) lưu kho.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                await downloadLisExcelTemplate();
                toast.success("Đã tải file mẫu Excel LIS (.xlsx)");
              }}
              className="flex items-center gap-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800 transition"
            >
              <Download className="h-4 w-4" />
              Tải file mẫu
            </button>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([sampleInternal], { type: "text/tab-separated-values;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "mau-import-vi-sinh-nkbv-noi-bo.tsv";
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Đã tải mẫu nội bộ (.tsv)");
              }}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition"
            >
              <Download className="h-4 w-4" />
              TSV nội bộ
            </button>
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition"
            >
              <HelpCircle className="h-4 w-4" />
              Hướng dẫn
            </button>
          </div>
        </div>

        {showGuide && (
          <div className="rounded-[var(--radius-shell)] bg-slate-50 p-4 border border-slate-200/60 text-xs text-slate-600 space-y-3">
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                <span className="font-bold">Tải file mẫu</span> (Excel) — xem thêm sheet «Huong_dan»; hoặc dán bảng từ
                LIS (Số phiếu, Mã bệnh nhân, Kết quả, Loại bệnh phẩm, Ngày thực hiện…). Khóa XN = Số phiếu (+ Mã dịch
                vụ nếu có).
              </li>
              <li>
                <span className="font-bold">Nạp / dán dữ liệu:</span> Excel cùng cột LIS; mẫu có thêm{" "}
                <span className="font-bold">Mã bệnh án</span> và <span className="font-bold">Ngày vào viện</span>.
              </li>
              <li>
                <span className="font-bold">Xem trước rồi lưu</span> — thiếu BA hoặc ngày vào viện → điền trên lưới
                trước khi ghi. Chỉ thêm xét nghiệm mới (bỏ trùng).
              </li>
            </ol>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Kết quả: Dương / Âm / Dưới ngưỡng (lưu kho, không tạo phiếu) / Bệnh phẩm nhiễm (nhiễu).
              </li>
            </ul>
            <textarea
              readOnly
              value={sampleLis}
              onClick={(e) => {
                (e.target as HTMLTextAreaElement).select();
                void navigator.clipboard.writeText(sampleLis);
                toast.success("Đã copy mẫu LIS vào Clipboard");
              }}
              className="w-full h-28 font-mono text-[11px] bg-white border border-slate-200 rounded-xl p-2 cursor-pointer focus:outline-none"
            />
          </div>
        )}
      </div>

      {records.length === 0 ? (
        <div className={`${C.panelSurface} p-6 space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={C.statLabel}>Nạp xét nghiệm vi sinh</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleExcelUpload(f);
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-full bg-blue-50 hover:bg-blue-100 px-4 py-2 text-xs font-bold text-blue-800 disabled:opacity-50"
              >
                <UploadCloud className="h-4 w-4" />
                Upload Excel
              </button>
              <button
                type="button"
                onClick={() => setShowPastePanel((v) => !v)}
                disabled={isLoading}
                aria-expanded={showPastePanel}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50 ${
                  showPastePanel
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/15"
                }`}
              >
                <ClipboardPaste className="h-4 w-4" />
                {showPastePanel ? "Ẩn khung dán" : "Dán bảng"}
                {pasteData.trim() && !showPastePanel ? (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">
                    có nội dung
                  </span>
                ) : null}
              </button>
            </div>
          </div>
          {showPastePanel ? (
            <div className="space-y-3 rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50/40 p-4">
              <span className="text-[11px] font-medium text-slate-500">
                Dán bảng LIS / mẫu nội bộ (TSV)
              </span>
              <textarea
                value={pasteData}
                onChange={(e) => setPasteData(e.target.value)}
                placeholder="Dán bảng copy từ LIS (header tiếng Việt) hoặc mẫu nội bộ..."
                className="w-full min-h-[220px] rounded-[var(--radius-shell)] border-slate-200 bg-white p-4 font-mono text-xs focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleParsePaste()}
                  disabled={isLoading}
                  className={`${C.ctaPrimary} hover:bg-[var(--primary-hover)] disabled:opacity-50`}
                >
                  Phân tích <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Chọn <span className="font-semibold">Upload Excel</span> hoặc bấm{" "}
              <span className="font-semibold">Dán bảng</span> khi cần dán từ clipboard.
            </p>
          )}
        </div>
      ) : (
        <div className={`${C.panelSurface} p-6 space-y-6`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Database className="h-5 w-5 text-[var(--primary)]" />
                Xem trước ({records.length} hàng)
              </h3>
              <p className="text-xs text-slate-400">
                Bổ sung mã BA / ngày vào viện nếu thiếu. Kiểm tra khoa, cảnh báo RIT/SBAP trước khi lưu.
              </p>
              {incompleteCount > 0 && (
                <p className="text-xs font-bold text-amber-700 mt-1">
                  Còn {incompleteCount} dòng thiếu BA hoặc ngày vào viện — chưa lưu được.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRecords([])}
                className="rounded-full bg-slate-100 hover:bg-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600"
              >
                Hủy / Dán lại
              </button>
              <button
                type="button"
                onClick={() => void handleImportSubmit()}
                disabled={isLoading || incompleteCount > 0}
                className="rounded-full bg-[var(--primary)] px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-white shadow-lg disabled:opacity-50"
              >
                {isLoading ? "Đang lưu..." : "Lưu vào kho vi sinh"}
              </button>
            </div>
          </div>

          <ResponsiveTableShell
            unboxed
            className="border border-slate-100 rounded-[var(--radius-shell)]"
            maxHeight="max-h-[min(52dvh,520px)]"
          >
            <table className="w-full min-w-[1400px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-3 py-3">#</th>
                  <th className="px-3 py-3">Mã BA *</th>
                  <th className="px-3 py-3">Ngày VV *</th>
                  <th className="px-3 py-3">Mã XN</th>
                  <th className="px-3 py-3">Họ tên</th>
                  <th className="px-3 py-3">Kết quả</th>
                  <th className="px-3 py-3">Lấy mẫu</th>
                  <th className="px-3 py-3">Khoa</th>
                  <th className="px-3 py-3">Bệnh phẩm / Tác nhân</th>
                  <th className="px-3 py-3">Đa kháng</th>
                  <th className="px-3 py-3">Phân định</th>
                  <th className="px-3 py-3">Cảnh báo</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                {records.map((r, idx) => (
                  <tr
                    key={r.ma_xet_nghiem}
                    className={
                      r.needs_stay_fields ? "bg-amber-50/40" : r.willSpawnCase ? "bg-emerald-50/20" : ""
                    }
                  >
                    <td className="px-3 py-3 text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <input
                        value={r.ma_benh_an}
                        onChange={(e) => updateRow(idx, { ma_benh_an: e.target.value })}
                        placeholder="BA-..."
                        className={`${C.controlInput} min-w-[100px] ${!r.ma_benh_an ? "border-amber-400" : ""}`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="date"
                        value={r.ngay_vao_vien.slice(0, 10)}
                        onChange={(e) => updateRow(idx, { ngay_vao_vien: e.target.value })}
                        className={`${C.controlInput} ${!r.ngay_vao_vien ? "border-amber-400" : ""}`}
                      />
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px]">{r.ma_xet_nghiem}</td>
                    <td className="px-3 py-3">
                      <div className="font-bold">{r.ho_ten_benh_nhan}</div>
                      <div className="text-[11px] text-slate-400">{r.ma_benh_nhan}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          r.ket_qua === "DUONG_TINH"
                            ? "bg-amber-100 text-amber-800"
                            : r.ket_qua === "NHIEU"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {KET_QUA_LABEL[r.ket_qua]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {formatDateVi(r.ngay_lay_mau.slice(0, 10))}
                      {r.ngay_vao_vien ? <div className="text-[11px]">Ngày {r.diffDays + 1}</div> : null}
                    </td>
                    <td className="px-3 py-3 min-w-[200px]">
                      <SearchableSelect
                        value={r.khoa_yeu_cau_id}
                        onChange={(v) => updateRow(idx, { khoa_yeu_cau_id: v })}
                        options={khoaOptions}
                        placeholder="Chọn khoa chỉ định..."
                        searchPlaceholder="Tìm mã / tên khoa..."
                        className="text-xs"
                      />
                    </td>                    <td className="px-3 py-3">
                      <div className="font-bold text-blue-700">{r.loai_benh_pham}</div>
                      <div className="italic text-amber-700">{r.tac_nhan || "—"}</div>
                    </td>
                    <td className="px-3 py-3">
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold">
                        <input
                          type="checkbox"
                          checked={r.is_mdro}
                          onChange={(e) =>
                            updateRow(idx, {
                              is_mdro: e.target.checked,
                              mdro_phenotype: e.target.checked ? r.mdro_phenotype || "OTHER_MDRO" : "",
                            })
                          }
                        />
                        MDRO
                      </label>
                      {r.is_mdro ? (
                        <select
                          value={r.mdro_phenotype}
                          onChange={(e) => updateRow(idx, { mdro_phenotype: e.target.value })}
                          className={`${C.controlInput} mt-1 min-w-[110px]`}
                        >
                          <option value="MRSA">MRSA</option>
                          <option value="VRE">VRE</option>
                          <option value="CRE">CRE</option>
                          <option value="CEPH_R_KLEB">CephR-Kleb</option>
                          <option value="CDI">CDI</option>
                          <option value="OTHER_MDRO">Khác</option>
                        </select>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      {r.needs_stay_fields ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-800">
                          <AlertTriangle className="h-3 w-3" /> Thiếu BA/VV
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-800">
                          <CheckCircle className="h-3 w-3" /> Lưu kho
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 max-w-[200px]">
                      {r.alerts.length === 0 ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <ul className="space-y-1">
                          {r.alerts.map((a) => (
                            <li
                              key={`${a.code}-${a.related_event_id}`}
                              className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                                a.code === "SBAP"
                                  ? "bg-violet-50 text-violet-800"
                                  : "bg-amber-50 text-amber-900"
                              }`}
                            >
                              {a.code}: {a.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setRecords((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTableShell>

          <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500 bg-slate-50 rounded-[var(--radius-shell)] p-4">
            <span>
              Sẽ lưu kho: <strong>{records.length}</strong>
            </span>
            <span className="text-amber-700">
              Thiếu BA/VV: <strong>{incompleteCount}</strong>
            </span>
            <span className="text-slate-400">Không tạo phiếu điều tra từ kho này</span>
          </div>
        </div>
      )}

      <NkbvViSinhStorePanel khoas={khoas} />
    </div>
  );
}
