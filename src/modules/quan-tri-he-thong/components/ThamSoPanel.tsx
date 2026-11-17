"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { themThamSo } from "../actions/tham-so.actions";
import { quanTriFormChrome as UI } from "@/lib/master-data-form-chrome";

export type ThamSoRow = { id: string; ma_tham_so: string; gia_tri: number; hieu_luc_tu: string; nguon: string };

type Props = { rows: ThamSoRow[]; maList: string[]; homNay: string };

const inputCls = UI.controlInput;

export default function ThamSoPanel({ rows, maList, homNay }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ma, setMa] = useState(maList[0] ?? "");
  const [giaTri, setGiaTri] = useState("");
  const [ngay, setNgay] = useState(homNay);
  const [nguon, setNguon] = useState("");

  // Dòng đang áp dụng: hiệu lực lớn nhất ≤ hôm nay theo từng mã.
  const dangApDung = new Map<string, string>();
  for (const r of rows) {
    if (r.hieu_luc_tu <= homNay && (dangApDung.get(r.ma_tham_so) ?? "") < r.hieu_luc_tu) {
      dangApDung.set(r.ma_tham_so, r.hieu_luc_tu);
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await themThamSo({ maThamSo: ma, giaTri, hieuLucTu: ngay, nguon });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Đã thêm giá trị tham số");
      setGiaTri("");
      setNguon("");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <h1 className="bv103-type-title">Tham số nghiệp vụ</h1>
      <p className="bv103-type-body text-slate-600">
        Ngưỡng % và cỡ mẫu tối thiểu theo ngày hiệu lực. Chỉ thêm dòng mới, không sửa hay xóa dòng cũ.
      </p>

      <form onSubmit={submit} className={`${UI.shellPadded} grid gap-3 sm:grid-cols-4`}>
        <label className="text-sm sm:col-span-2">
          Mã tham số
          <select className={inputCls} value={ma} onChange={(e) => setMa(e.target.value)}>
            {maList.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Giá trị
          <input className={inputCls} inputMode="decimal" value={giaTri} onChange={(e) => setGiaTri(e.target.value)} required />
        </label>
        <label className="text-sm">
          Hiệu lực từ
          <input className={inputCls} type="date" min={homNay} value={ngay} onChange={(e) => setNgay(e.target.value)} required />
        </label>
        <label className="text-sm sm:col-span-3">
          Nguồn / căn cứ
          <input className={inputCls} value={nguon} onChange={(e) => setNguon(e.target.value)} required />
        </label>
        <button
          type="submit"
          disabled={pending}
          className={`${UI.ctaPrimary} self-end justify-center`}
        >
          {pending ? "Đang lưu…" : "Thêm giá trị"}
        </button>
      </form>

      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-300 text-slate-600">
          <tr>
            <th className="py-2">Mã</th>
            <th>Giá trị</th>
            <th>Hiệu lực từ</th>
            <th>Nguồn</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100">
              <td className="py-2 font-mono text-xs">{r.ma_tham_so}</td>
              <td>{r.gia_tri}</td>
              <td>{r.hieu_luc_tu}</td>
              <td className="text-slate-600">{r.nguon}</td>
              <td>
                {r.hieu_luc_tu > homNay
                  ? "Chưa hiệu lực"
                  : dangApDung.get(r.ma_tham_so) === r.hieu_luc_tu
                    ? "Đang áp dụng"
                    : "Đã thay"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
