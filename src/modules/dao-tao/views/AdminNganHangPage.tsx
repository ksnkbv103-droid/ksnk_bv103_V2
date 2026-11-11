"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Pencil, Upload } from "lucide-react";
import {
  getBankStats,
  getCauHoiDetail,
  getDaoTaoBankForExport,
  importMcqMatrixAction,
  listCauHoiDaoTao,
  listChuDeDaoTao,
  setCauHoiActive,
  updateCauHoiDaoTao,
} from "@/modules/dao-tao/actions/dao-tao-bank.actions";
import {
  DAO_TAO_BANK_HEADERS,
  DAO_TAO_GUIDE_ROWS,
  formatDapAnByNhan,
  dapAnDungToByNhan,
  serializeMcqRowsToMatrix,
} from "@/lib/dao-tao/parse-mcq-excel";
import type { BloomLevel, DaoTaoQuestionLoai, DapAnDung } from "@/lib/dao-tao/types";
import { CANONICAL_TARGET_ROLES, TARGET_ROLE_LABELS } from "@/lib/dao-tao/types";
import { requestImportContract } from "@/hooks/import-confirm-contract";
import { DaoTaoAdminTabs } from "@/modules/dao-tao/components/DaoTaoAdminTabs";
import {
  DaoTaoField,
  DaoTaoHeader,
  DaoTaoPage,
  DaoTaoPanel,
  daoTaoBtnPrimary,
  daoTaoBtnSecondary,
  daoTaoInputClass,
} from "@/modules/dao-tao/components/DaoTaoChrome";
import { labelLoaiCau } from "@/lib/dao-tao/labels";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ListRow = {
  id: string;
  ma_cau: string;
  loai: string;
  stem: string;
  clinical_vignette?: string | null;
  chu_de_ma?: string;
  chu_de_ten?: string;
  target_roles?: string[];
  sop_refs?: string[];
  is_active: boolean;
};

type EditState = {
  id: string;
  maCau: string;
  loai: DaoTaoQuestionLoai;
  stem: string;
  bloomLevel: BloomLevel;
  giaiThich: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  dapAnRaw: string;
};

function cellToValue(v: unknown): unknown {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "object" && v && "text" in v) return String((v as { text: string }).text ?? "");
  if (typeof v === "object" && v && "richText" in v) {
    const rt = (v as { richText: Array<{ text: string }> }).richText ?? [];
    return rt.map((t) => t.text).join("");
  }
  if (typeof v === "object" && v && "result" in v) return (v as { result: unknown }).result ?? "";
  return String(v);
}

async function downloadMatrixXlsx(
  filename: string,
  matrix: unknown[][],
  guide = true,
) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Ngan_hang");
  for (const row of matrix) ws.addRow(row);
  ws.getRow(1).font = { bold: true };
  if (guide) {
    const g = wb.addWorksheet("Huong_dan");
    for (const row of DAO_TAO_GUIDE_ROWS) g.addRow(row);
    g.getRow(1).font = { bold: true };
  }
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminNganHangPage() {
  const [stats, setStats] = useState<{
    total: number;
    byLoai: Record<string, number>;
  } | null>(null);
  const [rows, setRows] = useState<ListRow[]>([]);
  const [pending, startTransition] = useTransition();
  const [edit, setEdit] = useState<EditState | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterChuDe, setFilterChuDe] = useState("ALL");
  const [chuDeList, setChuDeList] = useState<Array<{ id: string; ma: string; ten: string }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    const [s, list, cds] = await Promise.all([
      getBankStats(),
      listCauHoiDaoTao({
        limit: 500,
        includeInactive: showInactive,
        chuDeMa: filterChuDe !== "ALL" ? filterChuDe : undefined,
        targetRole: filterRole !== "ALL" ? filterRole : undefined,
      }),
      listChuDeDaoTao(),
    ]);
    setStats(s);
    setChuDeList(cds);
    setRows(
      list.map((r: any) => ({
        id: r.id,
        ma_cau: r.ma_cau ?? "",
        loai: r.loai,
        stem: r.stem,
        clinical_vignette: r.clinical_vignette,
        chu_de_ma: r.chu_de_ma,
        chu_de_ten: r.chu_de_ten,
        target_roles: r.target_roles,
        sop_refs: r.sop_refs,
        is_active: r.is_active,
      })),
    );
  };

  useEffect(() => {
    void reload().catch((e) =>
      toast.error(e instanceof Error ? e.message : "Lỗi tải ngân hàng"),
    );
  }, [showInactive, filterRole, filterChuDe]);

  const openEdit = (id: string) => {
    startTransition(async () => {
      try {
        const d = await getCauHoiDetail(id);
        const opts = ((d.phuong_an ?? []) as Array<{
          nhan_goc: string;
          noi_dung: string;
          thu_tu_goc: number;
          id: string;
        }>)
          .slice()
          .sort((a, b) => a.thu_tu_goc - b.thu_tu_goc);
        const byNhan = Object.fromEntries(opts.map((o) => [o.nhan_goc, o.noi_dung]));
        const dapAnByNhan = dapAnDungToByNhan(
          d.dap_an_dung as DapAnDung,
          opts.map((o) => ({ id: o.id, nhanGoc: o.nhan_goc })),
        );
        setEdit({
          id: d.id,
          maCau: d.ma_cau,
          loai: d.loai as DaoTaoQuestionLoai,
          stem: d.stem,
          bloomLevel: d.bloom_level as BloomLevel,
          giaiThich: d.giai_thich ?? "",
          optionA: byNhan.A ?? "",
          optionB: byNhan.B ?? "",
          optionC: byNhan.C ?? "",
          optionD: byNhan.D ?? "",
          dapAnRaw: dapAnByNhan ? formatDapAnByNhan(dapAnByNhan) : "",
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Không tải được câu hỏi");
      }
    });
  };

  return (
    <DaoTaoPage>
      <DaoTaoHeader title="Ngân hàng câu hỏi" tabs={<DaoTaoAdminTabs />} />

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <DaoTaoPanel className="!p-4">
            <p className={T.labelBlock}>Tổng câu active</p>
            <p className={T.statValue}>{stats.total}</p>
          </DaoTaoPanel>
          <DaoTaoPanel className="!p-4 sm:col-span-2">
            <p className={T.labelBlock}>Theo loại câu</p>
            <p className="mt-1 text-sm text-slate-600">
              {Object.entries(stats.byLoai)
                .map(([k, v]) => `${labelLoaiCau(k)}: ${v}`)
                .join(" · ") || "—"}
            </p>
          </DaoTaoPanel>
        </div>
      ) : null}

      <DaoTaoPanel className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            startTransition(async () => {
              try {
                const { default: ExcelJS } = await import("exceljs");
                const wb = new ExcelJS.Workbook();
                await wb.xlsx.load(await file.arrayBuffer());
                const ws = wb.worksheets[0];
                if (!ws) throw new Error("File không có sheet");
                const matrix: unknown[][] = [];
                ws.eachRow((row) => {
                  const vals: unknown[] = [];
                  row.eachCell({ includeEmpty: true }, (cell, col) => {
                    vals[col - 1] = cellToValue(cell.value);
                  });
                  matrix.push(vals);
                });

                const preview = await importMcqMatrixAction({ rows: matrix, dryRun: true });
                const validTotal = preview.audit.insertCount + preview.audit.updateCount;
                if (validTotal === 0) {
                  toast.error(preview.message || "Không có câu hợp lệ.");
                  if (preview.errors.length) {
                    toast.message(preview.errors.slice(0, 5).join(" | "), {
                      duration: 12_000,
                    });
                  }
                  return;
                }
                const decision = await requestImportContract({
                  displayName: "ngân hàng Thi KSNK",
                  total: validTotal,
                  insertCount: preview.audit.insertCount,
                  updateCount: preview.audit.updateCount,
                  deactivateCount: preview.audit.deactivateCount,
                  sampleLines: preview.sampleLines,
                  errorLines: preview.errors.slice(0, 20),
                  errorTotal: preview.errors.length,
                });
                if (decision === "cancel") {
                  toast.message("Đã hủy — không ghi dữ liệu");
                  return;
                }
                const res = await importMcqMatrixAction({
                  rows: matrix,
                  softDeleteMissing: decision === "sync_full",
                });
                if (res.ok) toast.success(res.message);
                else toast.error(res.message);
                if (res.errors.length) {
                  toast.message(
                    `${res.errors.length} dòng lỗi/cảnh báo — xem lại file Excel`,
                  );
                }
                await reload();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Import thất bại");
              } finally {
                if (fileRef.current) fileRef.current.value = "";
              }
            });
          }}
        />
        <button
          type="button"
          disabled={pending}
          className={daoTaoBtnSecondary}
          onClick={() => {
            startTransition(async () => {
              try {
                const sample = serializeMcqRowsToMatrix([
                  {
                    maCau: "",
                    chuDeMa: "SSI_TRUOC_MO",
                    chuDeTen: "Phòng ngừa nhiễm khuẩn vết mổ (trước mổ)",
                    stt: 1,
                    loai: "single",
                    stem: "Ví dụ: câu chọn một đáp án?",
                    options: [
                      { nhanGoc: "A", noiDung: "Phương án A", thuTuGoc: 0 },
                      { nhanGoc: "B", noiDung: "Phương án B", thuTuGoc: 1 },
                      { nhanGoc: "C", noiDung: "Phương án C", thuTuGoc: 2 },
                      { nhanGoc: "D", noiDung: "Phương án D", thuTuGoc: 3 },
                    ],
                    dapAnByNhan: { kind: "single", nhan: "C" },
                    bloomLevel: 1,
                    giaiThich: "Giải thích mẫu — xóa hoặc sửa trước khi import thật",
                    isActive: true,
                  },
                ]);
                // Đảm bảo header đúng SSOT
                sample[0] = [...DAO_TAO_BANK_HEADERS];
                await downloadMatrixXlsx("BV103_DaoTao_NganHang_Mau.xlsx", sample);
                toast.success("Đã tải mẫu Excel");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Tải file mẫu thất bại");
              }
            });
          }}
        >
          <Download className="h-4 w-4" />
          Tải file mẫu
        </button>
        <button
          type="button"
          disabled={pending}
          className={daoTaoBtnSecondary}
          onClick={() => {
            startTransition(async () => {
              try {
                const data = await getDaoTaoBankForExport(true);
                const matrix = serializeMcqRowsToMatrix(data);
                await downloadMatrixXlsx("BV103_DaoTao_NganHang.xlsx", matrix);
                toast.success(`Đã export ${data.length} câu`);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Export thất bại");
              }
            });
          }}
        >
          <Download className="h-4 w-4" />
          Export ngân hàng
        </button>
        <button
          type="button"
          disabled={pending}
          className={daoTaoBtnPrimary}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {pending ? "Đang xử lý…" : "Nạp Excel"}
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Hiện câu đã tắt
        </label>
      </DaoTaoPanel>

      {/* Thanh bộ lọc đa chiều */}
      <DaoTaoPanel className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Lọc theo:</span>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="rounded-[var(--radius-control)] border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs"
        >
          <option value="ALL">Tất cả 9 vai trò chuẩn</option>
          {CANONICAL_TARGET_ROLES.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>

        <select
          value={filterChuDe}
          onChange={(e) => setFilterChuDe(e.target.value)}
          className="max-w-xs truncate rounded-[var(--radius-control)] border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs"
        >
          <option value="ALL">Tất cả 35 chuyên đề KSNK</option>
          {chuDeList.map((c) => (
            <option key={c.ma} value={c.ma}>
              {c.ten}
            </option>
          ))}
        </select>

        <span className="ml-auto text-xs font-medium text-slate-500">
          Hiển thị: <strong className="text-slate-800">{rows.length}</strong> câu
        </span>
      </DaoTaoPanel>

      <DaoTaoPanel className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Mã câu</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Loại</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Nội dung câu hỏi và Tình huống lâm sàng</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>TT</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs font-semibold text-slate-700">
                    <div>{r.ma_cau || "—"}</div>
                    {r.sop_refs && r.sop_refs.length > 0 && (
                      <span className="mt-0.5 inline-block rounded bg-amber-50 px-1.5 py-0.2 text-xs font-medium text-amber-800 border border-amber-200/60">
                        {r.sop_refs[0]}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-slate-600">
                    {labelLoaiCau(r.loai)}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {r.clinical_vignette && (
                      <p className="mb-0.5 text-xs text-slate-500 line-clamp-1">
                        &ldquo;{r.clinical_vignette}&rdquo;
                      </p>
                    )}
                    <p className="font-medium text-slate-800 line-clamp-2">{r.stem}</p>
                    {r.target_roles && r.target_roles.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.target_roles.slice(0, 3).map((role) => (
                          <span
                            key={role}
                            className="rounded bg-blue-50 px-1.5 py-0.2 text-xs text-blue-700 border border-blue-200/50 font-normal"
                            title={TARGET_ROLE_LABELS[role] || role}
                          >
                            {TARGET_ROLE_LABELS[role] ? TARGET_ROLE_LABELS[role].split("(")[0].trim() : role.replace("ROLE_", "")}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      disabled={pending}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        r.is_active
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                      )}
                      onClick={() => {
                        startTransition(async () => {
                          try {
                            await setCauHoiActive(r.id, !r.is_active);
                            toast.success(r.is_active ? "Đã tắt câu" : "Đã bật câu");
                            await reload();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Lỗi");
                          }
                        });
                      }}
                    >
                      {r.is_active ? "Đang dùng" : "Tạm ẩn"}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      disabled={pending}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
                      onClick={() => openEdit(r.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                    Chưa có câu hỏi — Tải file mẫu hoặc Nạp Excel.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </DaoTaoPanel>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="flex max-h-[min(90dvh,880px)] max-w-lg flex-col gap-0 overflow-hidden p-0 max-sm:overflow-hidden sm:max-w-lg">
          <DialogHeader className="shrink-0 px-6 py-4 pr-14">
            <DialogTitle>Sửa nhanh — {edit?.maCau}</DialogTitle>
          </DialogHeader>
          {edit ? (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-6 py-4">
              <DaoTaoField label="Loại (không đổi)">
                <input className={daoTaoInputClass} value={edit.loai} disabled readOnly />
              </DaoTaoField>
              <DaoTaoField label="Nội dung câu hỏi">
                <textarea
                  className={cn(daoTaoInputClass, "min-h-[72px]")}
                  value={edit.stem}
                  onChange={(e) => setEdit({ ...edit, stem: e.target.value })}
                />
              </DaoTaoField>
              <DaoTaoField label="Đáp án (đúng format loại)">
                <input
                  className={daoTaoInputClass}
                  value={edit.dapAnRaw}
                  onChange={(e) => setEdit({ ...edit, dapAnRaw: e.target.value })}
                  placeholder="C · A, B · A-Đúng, B-Sai · C -> B -> A"
                />
              </DaoTaoField>
              {(["A", "B", "C", "D"] as const).map((k) => (
                <DaoTaoField key={k} label={`Phương án ${k}`}>
                  <input
                    className={daoTaoInputClass}
                    value={edit[`option${k}` as const]}
                    onChange={(e) =>
                      setEdit({ ...edit, [`option${k}`]: e.target.value } as EditState)
                    }
                  />
                </DaoTaoField>
              ))}
              <DaoTaoField label="Giải thích">
                <textarea
                  className={cn(daoTaoInputClass, "min-h-[56px]")}
                  value={edit.giaiThich}
                  onChange={(e) => setEdit({ ...edit, giaiThich: e.target.value })}
                />
              </DaoTaoField>
            </div>
          ) : null}
          <DialogFooter className="shrink-0 gap-2 border-t border-slate-100 px-6 py-3">
            <button type="button" className={daoTaoBtnSecondary} onClick={() => setEdit(null)}>
              Hủy
            </button>
            <button
              type="button"
              disabled={pending || !edit}
              className={daoTaoBtnPrimary}
              onClick={() => {
                if (!edit) return;
                startTransition(async () => {
                  try {
                    await updateCauHoiDaoTao({
                      id: edit.id,
                      loai: edit.loai,
                      stem: edit.stem,
                      bloomLevel: edit.bloomLevel,
                      giaiThich: edit.giaiThich,
                      optionA: edit.optionA,
                      optionB: edit.optionB,
                      optionC: edit.optionC,
                      optionD: edit.optionD,
                      dapAnRaw: edit.dapAnRaw,
                    });
                    toast.success("Đã lưu câu hỏi");
                    setEdit(null);
                    await reload();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Lưu thất bại");
                  }
                });
              }}
            >
              Lưu
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DaoTaoPage>
  );
}
