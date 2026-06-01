// src/modules/cssd-erp/components/inventory/SetMembersModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { X, PackageOpen, Info } from "lucide-react";
import { toast } from "sonner";
import { fetchBoDungCuChiTietMembers } from "../../actions/cssd-bo-members.actions";

interface Props { isOpen: boolean; onClose: () => void; set: any; }

/**
 * Modal hiển thị danh sách thành viên bộ dụng cụ (Master Data) - ≤ 180 dòng
 */
export default function SetMembersModal({ isOpen, onClose, set }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && set?.bo_dung_cu_id) {
      (async () => {
        setLoading(true);
        const res = await fetchBoDungCuChiTietMembers(String(set.bo_dung_cu_id));
        if (!res.success) {
          toast.error("Không tải thành phần: " + res.error);
          setItems([]);
        } else setItems(res.data);
        setLoading(false);
      })();
    }
  }, [isOpen, set]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-t-[48px] sm:rounded-[48px] p-8 space-y-6 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-[#026f17] rounded-2xl"><PackageOpen size={24} /></div>
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thành phần bộ dụng cụ</h4>
              <p className="text-sm font-black text-slate-700 uppercase">{set?.dm_bo_dung_cu?.ten_bo || 'BỘ CHƯA ĐỊNH DANH'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center border border-slate-100"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-2">
          {loading ? (
            <div className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest animate-pulse">Đang tải thành phần...</div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Bộ này chưa có dụng cụ chi tiết</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center group hover:border-[#026f17]/20 transition-all">
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-700 uppercase">{item.ten_dung_cu_le || item.ten_chi_tiet}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Info size={10} /> Max SUDs: {item.max_suds_count} lần • Trọng lượng: {item.trong_luong || 0}g
                  </p>
                </div>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-[#026f17] font-black text-xs border border-slate-100">x{item.so_luong ?? 1}</div>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 border-t border-slate-50">
          <p className="text-[9px] text-slate-400 font-medium italic">* Thành phần được trích xuất từ Danh mục gốc. Thay đổi danh mục để cập nhật toàn hệ thống.</p>
        </div>
      </div>
    </div>
  );
}
