"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X, AlertCircle, User, Calendar, Edit3 } from "lucide-react";
import { getPendingDeXuat, pheDuyetDeXuat } from "../actions/dexuat.actions";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog";
import { CongViecForm } from "./CongViecForm";

export function DeXuatApprovalList({ onApproved }: { onApproved?: () => void }) {
  const [deXuatList, setDeXuatList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedDeXuat, setSelectedDeXuat] = useState<any | null>(null);

  const fetchDeXuat = async () => {
    setLoading(true);
    try {
      const data = await getPendingDeXuat();
      setDeXuatList(data);
    } catch (error) {
      console.error("Lỗi tải danh sách đề xuất:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeXuat();
  }, []);

  const handleReject = async (id: string) => {
    if (!confirm("Xác nhận từ chối đề xuất này?")) return;
    setProcessingId(id);
    try {
      await pheDuyetDeXuat(id, false, "Không phù hợp với kế hoạch hiện tại");
      toast.success("Đã từ chối đề xuất.");
      await fetchDeXuat();
      onApproved?.();
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi từ chối");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return (
    <div className="space-y-4">
      {[1, 2].map(i => (
        <div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
      ))}
    </div>
  );

  if (deXuatList.length === 0) {
    return (
      <div className="animate-in fade-in rounded-2xl border-2 border-dashed border-slate-100 bg-white p-20 text-center duration-700">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
          <Check size={32} />
        </div>
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Tất cả đã được xử lý</h3>
        <p className="text-[10px] font-bold text-slate-300 uppercase mt-1">Hiện không có đề xuất nào đang chờ phê duyệt</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-700">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
          <AlertCircle size={18} className="text-amber-500" /> Đề xuất chờ phê duyệt
        </h3>
        <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black">{deXuatList.length}</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {deXuatList.map((item) => (
          <div key={item.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400/80" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pl-3">
              <div className="flex-1 space-y-4">
                <div>
                  <h4 className="text-lg font-black text-slate-800 leading-tight">{item.tieu_de}</h4>
                  <div className="mt-2 flex flex-wrap gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <User size={12} className="text-[#026f17]" /> Người đề xuất: {item.nguoi_tao_ten}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <Calendar size={12} className="text-amber-500" /> {new Date(item.created_at).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm font-medium text-slate-500 line-clamp-2">{item.mo_ta || "Không có mô tả chi tiết."}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  disabled={!!processingId}
                  onClick={() => handleReject(item.id)}
                  className="bv103-control-h flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50"
                  title="Từ chối đề xuất"
                >
                  <X size={20} />
                </button>
                <button
                  disabled={!!processingId}
                  onClick={() => setSelectedDeXuat(item)}
                  className="bv103-control-h inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#026f17] px-6 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-[#015a12] disabled:opacity-50"
                >
                  <Edit3 size={16} /> Xem xét & Giao việc
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dialog xem xét và phê duyệt (Chuyển thành giao việc) */}
      {/* modal={false}: cho phép tương tác SearchableSelect (portal) trong Dialog */}
      <Dialog modal={false} open={!!selectedDeXuat} onOpenChange={(open) => !open && setSelectedDeXuat(null)}>
        <DialogContent className="max-w-4xl rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-black text-slate-800 uppercase tracking-tight text-center">Rà soát & Phê duyệt đề xuất</DialogTitle>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mt-2">
              Chỉnh sửa thông tin và giao việc cho nhân sự để kích hoạt nhiệm vụ
            </p>
          </DialogHeader>
          
          {selectedDeXuat && (
            <CongViecForm 
              initialData={selectedDeXuat}
              onSuccess={async () => {
                toast.success("Đã phê duyệt và kích hoạt công việc thành công!");
                setSelectedDeXuat(null);
                await fetchDeXuat();
                onApproved?.();
              }}
              onCancel={() => setSelectedDeXuat(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
