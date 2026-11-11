"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import QuanTriFormDialogShell from "@/components/shared/QuanTriFormDialogShell";
import { quanTriFormChrome as C } from "@/lib/master-data-form-chrome";
import { loaiHoaChatLabel } from "@/lib/domain/cssd-hoa-chat-loai";
import type { HoaChatNhomRow } from "@/modules/cssd-erp/contexts/inventory-chemical/admin/hoa-chat.types";
import {
  createHoaChatNhomAction,
  listHoaChatNhomAction,
  setHoaChatNhomActiveAction,
  updateHoaChatNhomAction,
} from "@/modules/cssd-erp/contexts/inventory-chemical/admin/hoa-chat-nhom.actions";

type Loai = "HOA_CHAT" | "VAT_TU";

/** Quản lý nhóm hóa chất / vật tư — chỉ ADMIN (trang cha quyết định hiển thị). */
export default function HoaChatNhomManager({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [loai, setLoai] = useState<Loai>("HOA_CHAT");
  const [rows, setRows] = useState<HoaChatNhomRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTen, setNewTen] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTen, setEditTen] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await listHoaChatNhomAction(loai);
    setLoading(false);
    if (r.success) setRows(r.data);
    else toast.error(r.error || "Không tải được nhóm.");
  }, [loai]);

  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) => {
    const r = await fn();
    if (!r.success) return toast.error(r.error || "Thao tác thất bại.");
    toast.success(okMsg);
    setEditId(null);
    await reload();
    onChanged();
  };

  const move = (idx: number, dir: -1 | 1) => {
    const a = rows[idx];
    const b = rows[idx + dir];
    if (!a || !b) return;
    // Hoán đổi thứ tự; nếu trùng giá trị thì đẩy a lệch 1 theo hướng di chuyển.
    const [ta, tb] = a.thu_tu === b.thu_tu ? [b.thu_tu + dir, b.thu_tu] : [b.thu_tu, a.thu_tu];
    void run(async () => {
      const r1 = await updateHoaChatNhomAction(a.id, { thu_tu: Math.max(0, ta) });
      if (!r1.success) return r1;
      return updateHoaChatNhomAction(b.id, { thu_tu: tb });
    }, "Đã đổi thứ tự.");
  };

  return (
    <QuanTriFormDialogShell
      open={open}
      onClose={onClose}
      title="Quản lý nhóm"
      subtitle="Nhóm con của hóa chất / vật tư. Nhóm ngừng sử dụng không còn hiện khi chọn."
      size="md"
      footer={
        <button type="button" onClick={onClose} className={`${C.ctaSecondary} flex-1 ${C.modalFooterBtn}`}>
          Đóng
        </button>
      }
    >
      <select value={loai} onChange={(e) => setLoai(e.target.value as Loai)} className={C.controlInput}>
        <option value="HOA_CHAT">{loaiHoaChatLabel("HOA_CHAT")}</option>
        <option value="VAT_TU">{loaiHoaChatLabel("VAT_TU")}</option>
      </select>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const r = await createHoaChatNhomAction({ ten: newTen, loai_hoa_chat: loai });
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
          className={C.controlInput}
        />
        <button type="submit" className={C.ctaPrimary} disabled={!newTen.trim()}>
          Thêm
        </button>
      </form>

      {loading ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {rows.map((n, idx) => (
            <li key={n.id} className="flex items-center gap-2 py-2">
              {editId === n.id ? (
                <input
                  autoFocus
                  value={editTen}
                  maxLength={100}
                  onChange={(e) => setEditTen(e.target.value)}
                  className={C.controlInput}
                />
              ) : (
                <span className={`flex-1 ${n.is_active ? "text-slate-700" : "text-slate-400 line-through"}`}>
                  {n.ten}
                  {n.is_active ? "" : " (Ngừng sử dụng)"}
                </span>
              )}
              {editId === n.id ? (
                <>
                  <button type="button" className="text-[11px] font-semibold text-emerald-700" onClick={() => void run(() => updateHoaChatNhomAction(n.id, { ten: editTen }), "Đã đổi tên.")}>
                    Lưu
                  </button>
                  <button type="button" className="text-[11px] text-slate-500" onClick={() => setEditId(null)}>
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
                  <button type="button" className="text-[11px] font-semibold text-slate-600" onClick={() => { setEditId(n.id); setEditTen(n.ten); }}>
                    Đổi tên
                  </button>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-slate-600"
                    onClick={() => void run(() => setHoaChatNhomActiveAction(n.id, !n.is_active), n.is_active ? "Đã ngừng sử dụng." : "Đã khôi phục.")}
                  >
                    {n.is_active ? "Ngừng sử dụng" : "Khôi phục"}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </QuanTriFormDialogShell>
  );
}
