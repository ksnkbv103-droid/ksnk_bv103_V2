"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listDinhKyMau,
  upsertDinhKyMau,
  setDinhKyMauActive,
  spawnCongViecDinhKyHomNay,
  type DinhKyMauRow,
} from "../actions/dinh-ky.actions";
import { getNhanSuOptions, getToCongTacOptions } from "../actions/cong-viec-read.actions";
import SearchableSelect from "@/components/shared/SearchableSelect";

export function DinhKyRulesPanel() {
  const [rows, setRows] = useState<DinhKyMauRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [spawning, setSpawning] = useState(false);
  const [ns, setNs] = useState<any[]>([]);
  const [to, setTo] = useState<any[]>([]);
  const [tieuDe, setTieuDe] = useState("");
  const [moTa, setMoTa] = useState("");
  const [chuKy, setChuKy] = useState<"WEEKLY" | "MONTHLY">("MONTHLY");
  const [ngayBatDau, setNgayBatDau] = useState(() => new Date().toISOString().slice(0, 10));
  const [nsId, setNsId] = useState("");
  const [toId, setToId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [r, n, t] = await Promise.all([listDinhKyMau(), getNhanSuOptions(), getToCongTacOptions()]);
      setRows(r);
      setNs(n);
      setTo(t);
    } catch (e: any) {
      toast.error(e.message || "Không tải được mẫu định kỳ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tieuDe.trim()) {
      toast.error("Nhập tiêu đề mẫu.");
      return;
    }
    try {
      await upsertDinhKyMau({
        tieu_de: tieuDe.trim(),
        mo_ta: moTa || null,
        ma_chu_ky: chuKy,
        ngay_bat_dau: ngayBatDau,
        nguoi_phu_trach_id: nsId || null,
        to_cong_tac_id: toId || null,
        is_active: true,
      });
      toast.success("Đã lưu mẫu định kỳ.");
      setTieuDe("");
      setMoTa("");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Lỗi lưu");
    }
  };

  const runSpawn = async () => {
    setSpawning(true);
    try {
      const { inserted } = await spawnCongViecDinhKyHomNay();
      toast.success(`Đã sinh ${inserted} việc cho hôm nay (trùng kỳ sẽ bỏ qua).`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Không gọi được RPC (kiểm tra migration / quyền).");
    } finally {
      setSpawning(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Đang tải mẫu định kỳ...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Việc định kỳ (mẫu)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Hệ thống sinh <code className="text-[11px] bg-slate-100 px-1 rounded">fact_cong_viec</code> theo chu kỳ; gọi RPC hàng ngày hoặc thử chạy tay bên dưới.
            </p>
          </div>
          <button
            type="button"
            onClick={runSpawn}
            disabled={spawning}
            className="h-10 px-4 rounded-xl bg-[#026f17] text-white text-xs font-bold disabled:opacity-50"
          >
            {spawning ? "Đang chạy..." : "Sinh việc hôm nay (RPC)"}
          </button>
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black uppercase text-slate-400">Tiêu đề mẫu *</label>
            <input
              className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
              value={tieuDe}
              onChange={(e) => setTieuDe(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-black uppercase text-slate-400">Mô tả</label>
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm min-h-[60px]"
              value={moTa}
              onChange={(e) => setMoTa(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Chu kỳ</label>
            <select
              className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
              value={chuKy}
              onChange={(e) => setChuKy(e.target.value as "WEEKLY" | "MONTHLY")}
            >
              <option value="WEEKLY">Hàng tuần</option>
              <option value="MONTHLY">Hàng tháng (cùng ngày trong tháng)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Ngày mốc chu kỳ</label>
            <input
              type="date"
              className="mt-1 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
              value={ngayBatDau}
              onChange={(e) => setNgayBatDau(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Tổ công tác</label>
            <div className="mt-1">
              <SearchableSelect options={to} placeholder="(tuỳ chọn)" value={toId} onChange={setToId} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Người phụ trách mặc định</label>
            <div className="mt-1">
              <SearchableSelect options={ns} placeholder="(tuỳ chọn)" value={nsId} onChange={setNsId} />
            </div>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="h-10 px-6 rounded-xl bg-slate-800 text-white text-xs font-bold">
              Thêm mẫu
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-[10px] font-black uppercase text-slate-500">
            <tr>
              <th className="p-3">Tiêu đề</th>
              <th className="p-3">Chu kỳ</th>
              <th className="p-3">Mốc</th>
              <th className="p-3">Bật</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-3 font-semibold text-slate-800">{r.tieu_de}</td>
                <td className="p-3 text-slate-600">{r.ma_chu_ky}</td>
                <td className="p-3 text-slate-600">{r.ngay_bat_dau}</td>
                <td className="p-3">
                  <button
                    type="button"
                    className="text-xs font-bold text-[#026f17]"
                    onClick={async () => {
                      try {
                        await setDinhKyMauActive(r.id, !r.is_active);
                        toast.success(r.is_active ? "Đã tắt mẫu" : "Đã bật mẫu");
                        await load();
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                  >
                    {r.is_active ? "Tắt" : "Bật"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-400 text-xs">
                  Chưa có mẫu định kỳ.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
