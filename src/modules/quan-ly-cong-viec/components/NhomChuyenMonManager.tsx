"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Tags } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  createNhomChuyenMonAction,
  listNhomChuyenMonAction,
  setNhomChuyenMonActiveAction,
  updateNhomChuyenMonAction,
} from "../actions/nhom-chuyen-mon.actions";
import type { NhomChuyenMonRow } from "../types";

const INPUT = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm";

/** ADMIN quản lý danh mục nhóm chuyên môn (giám sát, đào tạo…). Xóa mềm: Ngừng sử dụng. */
export function NhomChuyenMonManager({ onChanged }: { onChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NhomChuyenMonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTen, setNewTen] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTen, setEditTen] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await listNhomChuyenMonAction();
    setLoading(false);
    if (r.success) setRows(r.data);
    else toast.error(r.error || "Không tải được nhóm.");
  }, []);

  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) => {
    const r = await fn();
    if (!r.success) return toast.error(r.error || "Thao tác thất bại.");
    toast.success(okMsg);
    setEditId(null);
    await reload();
    onChanged?.();
  };

  const move = (idx: number, dir: -1 | 1) => {
    const a = rows[idx];
    const b = rows[idx + dir];
    if (!a || !b) return;
    const [ta, tb] = a.thu_tu === b.thu_tu ? [b.thu_tu + dir, b.thu_tu] : [b.thu_tu, a.thu_tu];
    void run(async () => {
      const r1 = await updateNhomChuyenMonAction(a.id, { thu_tu: Math.max(0, ta) });
      if (!r1.success) return r1;
      return updateNhomChuyenMonAction(b.id, { thu_tu: tb });
    }, "Đã đổi thứ tự.");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="bv103-control-h inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Tags size={15} aria-hidden /> Nhóm chuyên môn
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-[var(--radius-shell)] border border-slate-200/90 bg-slate-50 p-6">
        <DialogHeader className="mb-2">
          <DialogTitle className="bv103-type-title tracking-tight text-slate-900">Nhóm chuyên môn</DialogTitle>
          <p className="text-xs text-slate-500">
            Loại việc KSNK (giám sát, đào tạo…). Nhóm ngừng sử dụng không còn hiện khi chọn.
          </p>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const r = await createNhomChuyenMonAction({ ten: newTen });
              if (r.success) setNewTen("");
              return r;
            }, "Đã thêm nhóm.");
          }}
        >
          <input
            value={newTen}
            maxLength={100}
            onChange={(e) => setNewTen(e.target.value)}
            placeholder="Tên nhóm mới"
            className={INPUT}
          />
          <button
            type="submit"
            disabled={!newTen.trim()}
            className="rounded-xl bg-[var(--primary)] px-4 text-xs font-semibold text-white disabled:opacity-50"
          >
            Thêm
          </button>
        </form>
        {loading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
        ) : (
          <ul className="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto text-sm">
            {rows.map((n, idx) => (
              <li key={n.id} className="flex items-center gap-2 py-2">
                {editId === n.id ? (
                  <input autoFocus value={editTen} maxLength={100} onChange={(e) => setEditTen(e.target.value)} className={INPUT} />
                ) : (
                  <span className={`flex-1 ${n.is_active ? "text-slate-700" : "text-slate-400 line-through"}`}>
                    {n.ten}
                    {n.is_active ? "" : " (Ngừng sử dụng)"}
                  </span>
                )}
                {editId === n.id ? (
                  <>
                    <button type="button" className="text-xs font-semibold text-emerald-700" onClick={() => void run(() => updateNhomChuyenMonAction(n.id, { ten: editTen }), "Đã đổi tên.")}>
                      Lưu
                    </button>
                    <button type="button" className="text-xs text-slate-500" onClick={() => setEditId(null)}>
                      Hủy
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" aria-label="Lên" disabled={idx === 0} className="px-1 disabled:opacity-30" onClick={() => move(idx, -1)}>
                      ↑
                    </button>
                    <button type="button" aria-label="Xuống" disabled={idx === rows.length - 1} className="px-1 disabled:opacity-30" onClick={() => move(idx, 1)}>
                      ↓
                    </button>
                    <button type="button" className="text-xs font-semibold text-slate-600" onClick={() => { setEditId(n.id); setEditTen(n.ten); }}>
                      Đổi tên
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-600"
                      onClick={() => void run(() => setNhomChuyenMonActiveAction(n.id, !n.is_active), n.is_active ? "Đã ngừng sử dụng." : "Đã khôi phục.")}
                    >
                      {n.is_active ? "Ngừng sử dụng" : "Khôi phục"}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
