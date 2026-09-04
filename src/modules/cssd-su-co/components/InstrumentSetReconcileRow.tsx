"use client";

import {
  SET_RECONCILE_KIND_LABEL,
  applyReconcileDoorInference,
  formatLechVsChuan,
  isReconcileCatalogMatched,
  lechVsChuan,
  lookupLoaiByMa,
  lookupLoaiForKhacField,
  typedMaLoai,
  type SetReconcileLineInput,
} from "@/lib/domain/cssd-set-reconcile";
import { bv103TableLayout as L } from "@/lib/bv103-table-layout";

export type LoaiReconcileOption = {
  id: string;
  ma: string;
  ten: string;
  isChiuNhiet: boolean;
  spaulding: string;
  sterileMethod: string;
  soLuongKho?: number;
};

export type KhacReconcileOption = LoaiReconcileOption & { maKhac: string };

const cellIn =
  "h-8 w-full border-0 bg-transparent px-0 text-[11px] outline-none focus:ring-0";

type Props = {
  line: SetReconcileLineInput;
  loaiOptions: LoaiReconcileOption[];
  khacIndex: KhacReconcileOption[];
  onPatch: (patch: Partial<SetReconcileLineInput>) => void;
  onRemove?: () => void;
};

function dacDiem(opt?: LoaiReconcileOption): string {
  if (!opt) return "";
  const heat = opt.isChiuNhiet === false ? "phi nhiệt" : "chịu nhiệt";
  const sp = opt.spaulding ? opt.spaulding.replaceAll("_", " ").toLowerCase() : "";
  return [heat, sp, opt.sterileMethod].filter(Boolean).join(" · ");
}

export default function InstrumentSetReconcileRow({
  line,
  loaiOptions,
  khacIndex,
  onPatch,
  onRemove,
}: Props) {
  const loaiHit =
    lookupLoaiByMa(typedMaLoai(line), loaiOptions) ||
    lookupLoaiForKhacField(String(line.maKhac || ""), loaiOptions, khacIndex);
  const matched = isReconcileCatalogMatched(line, loaiOptions, khacIndex);
  const dem = Math.floor(Number(line.soLuongDem) || 0);
  const thuc = Math.floor(Number(line.soLuongThucTe) || 0);
  const lech = lechVsChuan(line);
  const needHongMat = dem < thuc && line.kind !== "XOA_DONG";
  const tenHien = line.kind === "DOI_LOAI" ? line.tenDungCuLeDeXuat || line.tenDungCuLe : line.tenDungCuLe;
  const chuanHien = line.kind === "DOI_CHUAN" ? Number(line.soLuongChuanDeXuat ?? line.soLuongChuan) : line.soLuongChuan;
  const removed = line.kind === "XOA_DONG";

  const commit = (patch: Partial<SetReconcileLineInput>) => {
    onPatch(applyReconcileDoorInference({ ...line, ...patch }));
  };

  return (
    <tr className={removed ? `${L.row} opacity-60` : L.row}>
      <td className={`${L.td} font-mono text-[11px] text-slate-700`}>
        <input
          className={`${cellIn} min-w-[6.5rem] font-mono`}
          value={line.maLoaiDeXuat ?? line.maLoai ?? ""}
          placeholder="Mã loại"
          disabled={removed}
          onChange={(e) => {
            const ma = e.target.value.toUpperCase();
            const hit = lookupLoaiByMa(ma, loaiOptions);
            commit({
              maLoaiDeXuat: ma,
              loaiDungCuIdDeXuat: hit?.id,
              tenDungCuLeDeXuat: hit?.ten || line.tenDungCuLeDeXuat,
              tenDungCuLe: hit?.ten || line.tenDungCuLe,
              loaiDungCuId: line.kind === "THEM_DONG" && hit ? hit.id : line.loaiDungCuId,
            });
          }}
        />
      </td>
      <td className={L.td}>
        <input
          className={`${cellIn} min-w-[5rem] font-mono`}
          value={line.maKhac || ""}
          placeholder="—"
          disabled={removed}
          onChange={(e) => {
            const ma = e.target.value.toUpperCase();
            const hit = lookupLoaiForKhacField(ma, loaiOptions, khacIndex);
            commit({
              maKhac: ma,
              ...(hit
                ? {
                    maLoaiDeXuat: hit.ma,
                    loaiDungCuIdDeXuat: hit.id,
                    tenDungCuLeDeXuat: hit.ten,
                    tenDungCuLe: hit.ten,
                    loaiDungCuId: line.kind === "THEM_DONG" ? hit.id : line.loaiDungCuId,
                  }
                : {}),
            });
          }}
        />
      </td>
      <td className={`${L.td} min-w-[10rem]`}>
        <input
          className={cellIn}
          value={tenHien}
          placeholder="Tên dụng cụ"
          disabled={removed}
          onChange={(e) =>
            commit({
              tenDungCuLe: e.target.value,
              tenDungCuLeDeXuat: e.target.value,
            })
          }
        />
        {dacDiem(loaiHit) ? (
          <p className="mt-0.5 bv103-type-label leading-tight text-slate-500">{dacDiem(loaiHit)}</p>
        ) : !matched && (typedMaLoai(line) || line.maKhac) ? (
          <p className="mt-0.5 bv103-type-label text-amber-700">Chưa có trong danh mục.</p>
        ) : null}
      </td>
      <td className={L.td}>
        <input
          type="number"
          min={1}
          className={`${cellIn} w-12 text-center tabular-nums`}
          value={chuanHien}
          disabled={removed}
          onChange={(e) => {
            const n = Number(e.target.value) || 0;
            if (line.kind === "THEM_DONG") commit({ soLuongChuan: Math.max(1, n), soLuongChuanDeXuat: n });
            else commit({ soLuongChuanDeXuat: n });
          }}
        />
      </td>
      <td className={`${L.td} text-center tabular-nums`}>{line.soLuongThucTe}</td>
      <td className={L.td}>
        <input
          type="number"
          min={0}
          className={`${cellIn} w-12 text-center tabular-nums`}
          value={line.soLuongDem}
          disabled={removed}
          onChange={(e) => commit({ soLuongDem: Number(e.target.value) || 0 })}
        />
      </td>
      <td className={L.td}>
        <p className={lech > 0 ? L.statusWarn : lech < 0 ? L.statusInfo : L.statusMuted}>
          {formatLechVsChuan(lech)}
        </p>
        {line.kind !== "KHOP" ? (
          <p
            className={
              line.kind === "HONG" ? L.statusDanger : line.kind === "MAT" ? L.statusWarn : L.statusMuted
            }
          >
            {SET_RECONCILE_KIND_LABEL[line.kind]}
          </p>
        ) : null}
        {needHongMat ? (
          <p className="mt-0.5 flex flex-wrap gap-2">
            <button
              type="button"
              className={line.kind === "HONG" ? L.statusDanger : "text-[11px] font-medium text-slate-500"}
              onClick={() => commit({ kind: "HONG" })}
            >
              Hỏng
            </button>
            <button
              type="button"
              className={line.kind === "MAT" ? L.statusWarn : "text-[11px] font-medium text-slate-500"}
              onClick={() => commit({ kind: "MAT" })}
            >
              Mất
            </button>
          </p>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            className="mt-0.5 text-[11px] font-medium text-slate-500"
            onClick={onRemove}
          >
            {removed ? "Hoàn tác xóa" : line.kind === "THEM_DONG" ? "Bỏ dòng mới" : "Xóa khỏi bộ (chờ duyệt)"}
          </button>
        ) : null}
      </td>
      <td className={`${L.td} min-w-[7rem]`}>
        <input
          className={cellIn}
          value={line.note || ""}
          placeholder="—"
          disabled={removed}
          onChange={(e) => commit({ note: e.target.value })}
        />
      </td>
    </tr>
  );
}
