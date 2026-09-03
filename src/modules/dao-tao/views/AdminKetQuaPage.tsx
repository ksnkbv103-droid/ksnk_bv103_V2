"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  listChuaNopKyThi,
  listKetQuaKyThi,
  listKhoaPhongOptions,
  listKyThiThatAdmin,
  type KetQuaKyThiRow,
} from "@/modules/dao-tao/actions/dao-tao-admin.actions";
import { DaoTaoAdminTabs } from "@/modules/dao-tao/components/DaoTaoAdminTabs";
import {
  DaoTaoHeader,
  DaoTaoPage,
  DaoTaoPanel,
  daoTaoBtnSecondary,
} from "@/modules/dao-tao/components/DaoTaoChrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { formatKhoaPickerLabel } from "@/lib/domain/khoa-display";
import { formatDateTimeVi } from "@/lib/format-datetime-vi";
import { cn } from "@/lib/utils";

type KyOpt = { id: string; ten: string };
type KhoaOpt = { id: string; ten_khoa: string; ma_khoa: string };
type ChuaNop = Awaited<ReturnType<typeof listChuaNopKyThi>>;

async function downloadKetQuaXlsx(
  rows: KetQuaKyThiRow[],
  coverage: ChuaNop | null,
) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Da_nop");
  ws.addRow(["Kỳ thi", "Họ tên", "Khoa", "Điểm", "%", "Đạt", "Nộp", "Chứng chỉ", "Hạn đến"]);
  for (const r of rows) {
    ws.addRow([
      r.kyTen,
      r.hoTen,
      r.khoaMa || r.khoaTen,
      `${r.diem_so ?? 0}/${r.diem_toi_da ?? r.so_cau}`,
      r.diem_pct ?? 0,
      r.dat == null ? "" : r.dat ? "Đạt" : "Chưa đạt",
      r.nop_luc ?? "",
      r.chungChiLabel,
      r.hetHanLuc ?? "",
    ]);
  }
  ws.getRow(1).font = { bold: true };
  if (coverage) {
    const c = wb.addWorksheet("Chua_nop");
    c.addRow(["Họ tên", "Mã NV", "Khoa", "Tình trạng"]);
    for (const s of coverage.chuaNop) {
      c.addRow([s.hoTen, s.maNv ?? "", s.khoaTen, "Chưa nộp"]);
    }
    for (const s of coverage.chuaTaiKhoan) {
      c.addRow([s.hoTen, s.maNv ?? "", s.khoaTen, "Chưa gắn tài khoản"]);
    }
    c.getRow(1).font = { bold: true };
  }
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "BV103_DaoTao_KetQua.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminKetQuaPage() {
  const [rows, setRows] = useState<KetQuaKyThiRow[]>([]);
  const [kys, setKys] = useState<KyOpt[]>([]);
  const [khoas, setKhoas] = useState<KhoaOpt[]>([]);
  const [kyThiId, setKyThiId] = useState("");
  const [khoaId, setKhoaId] = useState("");
  const [coverage, setCoverage] = useState<ChuaNop | null>(null);
  const [pending, startTransition] = useTransition();

  const reload = async (ky: string, khoa: string) => {
    const data = await listKetQuaKyThi({
      kyThiId: ky || undefined,
      khoaId: khoa || undefined,
    });
    setRows(data);
    if (ky) {
      setCoverage(await listChuaNopKyThi(ky));
    } else {
      setCoverage(null);
    }
  };

  useEffect(() => {
    void Promise.all([listKyThiThatAdmin(), listKhoaPhongOptions()])
      .then(([kyRows, kp]) => {
        setKys((kyRows as KyOpt[]).map((k) => ({ id: k.id, ten: k.ten })));
        setKhoas(kp as KhoaOpt[]);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Lỗi"));
    void reload("", "").catch((e) => toast.error(e instanceof Error ? e.message : "Lỗi"));
  }, []);

  return (
    <DaoTaoPage>
      <DaoTaoHeader
        title="Kết quả thi"
        tabs={<DaoTaoAdminTabs />}
        actions={
          <button
            type="button"
            className={daoTaoBtnSecondary}
            disabled={pending || (rows.length === 0 && !coverage)}
            onClick={() => {
              startTransition(async () => {
                try {
                  await downloadKetQuaXlsx(rows, coverage);
                  toast.success("Đã xuất Excel");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Xuất thất bại");
                }
              });
            }}
          >
            Xuất Excel
          </button>
        }
      />

      <DaoTaoPanel className="flex flex-wrap gap-3">
        <label className="grid min-w-[12rem] flex-1 gap-1">
          <span className={T.labelBlock}>Kỳ thi</span>
          <select
            className={T.authInput}
            value={kyThiId}
            onChange={(e) => {
              const next = e.target.value;
              setKyThiId(next);
              startTransition(async () => {
                try {
                  await reload(next, khoaId);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Lỗi");
                }
              });
            }}
          >
            <option value="">Tất cả kỳ</option>
            {kys.map((k) => (
              <option key={k.id} value={k.id}>
                {k.ten}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-[12rem] flex-1 gap-1">
          <span className={T.labelBlock}>Khoa</span>
          <select
            className={T.authInput}
            value={khoaId}
            onChange={(e) => {
              const next = e.target.value;
              setKhoaId(next);
              startTransition(async () => {
                try {
                  await reload(kyThiId, next);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Lỗi");
                }
              });
            }}
          >
            <option value="">Tất cả khoa</option>
            {khoas.map((k) => (
              <option key={k.id} value={k.id}>
                {formatKhoaPickerLabel(k)}
              </option>
            ))}
          </select>
        </label>
      </DaoTaoPanel>

      {coverage ? (
        <DaoTaoPanel>
          <p className={T.sectionTitle}>
            Chưa nộp — {coverage.kyTen} ({coverage.chuaNop.length})
          </p>
          {coverage.chuaNop.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500">Không còn nhân sự còn tài khoản chưa nộp.</p>
          ) : (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-slate-700">
              {coverage.chuaNop.map((s) => (
                <li key={s.id}>
                  {s.hoTen}
                  {s.maNv ? ` · ${s.maNv}` : ""} · {s.khoaTen}
                </li>
              ))}
            </ul>
          )}
          {coverage.chuaTaiKhoan.length > 0 ? (
            <p className="mt-2 text-[11px] text-slate-500">
              {coverage.chuaTaiKhoan.length} người được gán nhưng chưa gắn tài khoản đăng nhập.
            </p>
          ) : null}
        </DaoTaoPanel>
      ) : (
        <p className="text-[11px] text-slate-500">Chọn một kỳ thi để xem ai chưa nộp.</p>
      )}

      <DaoTaoPanel className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Kỳ thi</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Họ tên</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Khoa</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Điểm</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Đạt</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Chứng chỉ</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)}>Nộp</th>
                <th className={cn("px-3 py-2.5", T.tableHeader)} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5 text-slate-600">{r.kyTen}</td>
                  <td className={cn("px-3 py-2.5", T.tableCellTitle)}>{r.hoTen}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.khoaMa || r.khoaTen}</td>
                  <td className="px-3 py-2.5 tabular-nums text-slate-700">
                    {r.diem_so ?? 0}/{r.diem_toi_da ?? r.so_cau} ({r.diem_pct ?? 0}%)
                  </td>
                  <td className="px-3 py-2.5">
                    {r.dat == null ? (
                      "—"
                    ) : (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          r.dat
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700",
                        )}
                      >
                        {r.dat ? "Đạt" : "Chưa đạt"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-600">{r.chungChiLabel}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-slate-500">
                    {formatDateTimeVi(r.nop_luc)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      className="text-xs font-semibold text-[var(--primary)] hover:underline"
                      href={`/dao-tao/ket-qua/${r.id}`}
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                    Chưa có bài thi chính thức nào được nộp.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </DaoTaoPanel>
    </DaoTaoPage>
  );
}
