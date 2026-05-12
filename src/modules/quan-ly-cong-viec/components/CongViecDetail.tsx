"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Clock, User, Users, Building2, CheckCircle2, MessageSquare, ArrowRight } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActivityTimeline } from "./ActivityTimeline";
import { CreateSubTaskForm } from "./CreateSubTaskForm";
import { CongViecForm } from "./CongViecForm";
import { HoatDongForm } from "./HoatDongForm";
import { getCongViecDetail, xacNhanHoanThanh, deleteCongViec } from "../actions/cong-viec.actions";
import { createHoatDong } from "../actions/hoat-dong.actions";

interface Props {
  id: string;
  onClose: () => void;
  onRefreshList?: () => void;
}

export function CongViecDetail({ id, onClose, onRefreshList }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeId, setActiveId] = useState(id);
  const [isCreateSubOpen, setIsCreateSubOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await getCongViecDetail(activeId);
      setData(res);
    } catch (err) {
      console.error("Lỗi tải chi tiết:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [activeId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#026f17] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return <div className="p-8 text-center text-slate-400 font-bold uppercase">Không tìm thấy dữ liệu</div>;

  const statusLabel = data.trang_thai?.replace(/_/g, " ");

  return (
    <div className="space-y-10 pb-20 animate-in slide-in-from-right-10 duration-500">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
               {statusLabel}
             </span>
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{data.id?.slice(0, 8)}</span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 leading-tight">{data.tieu_de}</h2>
          <p className="text-sm font-medium text-slate-500 max-w-2xl">{data.mo_ta || "Không có mô tả chi tiết cho nhiệm vụ này."}</p>
        </div>

        <div className="flex gap-3 flex-shrink-0">
          {data.trang_thai !== "HOAN_THANH" && (
            <Dialog open={isCreateSubOpen} onOpenChange={setIsCreateSubOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-50 shrink-0">
                  <Plus size={18} /> Tạo việc con
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl bg-slate-50 rounded-[3rem] p-8 border-white">
                <DialogHeader className="mb-8">
                  <DialogTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Tạo nhiệm vụ con</DialogTitle>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Phụ thuộc: {data.tieu_de}</p>
                </DialogHeader>
                <CreateSubTaskForm 
                  parentTaskId={data.id} 
                  onSuccess={() => { setIsCreateSubOpen(false); fetchDetail(); onRefreshList?.(); }} 
                  onCancel={() => setIsCreateSubOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}

          {data.trang_thai === "CHUA_BAT_DAU" && (
            <Button 
              className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 shrink-0 transition-all hover:scale-[1.05]"
              onClick={async () => {
                try {
                  await createHoatDong({
                    id_cong_viec: data.id,
                    loai_hoat_dong: "CAP_NHAT",
                    noi_dung: "Đã nhận nhiệm vụ và bắt đầu thực hiện.",
                    phan_tram_hoan_thanh: 1, 
                  });
                  toast.success("Đã nhận nhiệm vụ thành công!");
                  fetchDetail();
                  onRefreshList?.();
                } catch(e: any) {
                  toast.error(e.message || "Không thể nhận nhiệm vụ");
                }
              }}
            >
              Nhận nhiệm vụ
            </Button>
          )}

          {data.phan_tram_hoan_thanh === 100 && data.trang_thai !== "HOAN_THANH" && (
            <>
              <Button 
                variant="outline"
                className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 shrink-0 transition-all"
                onClick={async () => {
                  const lyDo = prompt("Nhập lý do chưa đạt (yêu cầu làm lại):");
                  if (!lyDo) return;
                  try {
                    await createHoatDong({
                      id_cong_viec: data.id,
                      loai_hoat_dong: "CAP_NHAT",
                      noi_dung: "Nghiệm thu không đạt. Yêu cầu làm lại: " + lyDo,
                      phan_tram_hoan_thanh: 90,
                    });
                    toast.success("Đã trả về yêu cầu thực hiện lại!");
                    fetchDetail();
                    onRefreshList?.();
                  } catch(e: any) {
                    toast.error(e.message || "Lỗi khi xử lý");
                  }
                }}
              >
                Yêu cầu làm lại
              </Button>

              <Button 
                className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-[#026f17] hover:bg-[#026f17]/90 text-white shadow-lg shadow-[#026f17]/20 shrink-0 transition-all hover:scale-[1.05]"
                onClick={async () => {
                  if (!confirm("Xác nhận nghiệm thu và đóng công việc này?")) return;
                  try {
                    await xacNhanHoanThanh(data.id);
                    toast.success("Đã nghiệm thu và hoàn thành công việc!");
                    fetchDetail();
                    onRefreshList?.();
                  } catch(e: any) {
                    toast.error(e.message || "Lỗi khi xử lý");
                  }
                }}
              >
                Nghiệm thu & Đóng
              </Button>
            </>
          )}

          {data.trang_thai !== "HOAN_THANH" && (
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#026f17]/20 hover:scale-[1.05] transition-all shrink-0">
                  Sửa nhiệm vụ
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl bg-slate-50 rounded-[3rem] p-8 border-white">
                <DialogHeader className="mb-8">
                  <DialogTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Chỉnh sửa nhiệm vụ</DialogTitle>
                </DialogHeader>
                <CongViecForm 
                  initialData={data} 
                  onSuccess={() => { setIsEditOpen(false); fetchDetail(); onRefreshList?.(); }} 
                  onCancel={() => setIsEditOpen(false)} 
                />
              </DialogContent>
            </Dialog>
          )}

          {data.trang_thai !== "HOAN_THANH" && (
            <Button 
              variant="ghost" 
              className="h-12 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50"
              onClick={async () => {
                if (confirm("Xác nhận xóa công việc này?")) {
                  try {
                    await deleteCongViec(data.id);
                    toast.success("Đã xóa công việc!");
                    onClose();
                    onRefreshList?.();
                  } catch (err: any) {
                    toast.error(err.message);
                  }
                }
              }}
            >
              Xóa
            </Button>
          )}
        </div>
      </div>

      {/* 2. Quick Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Phụ trách", val: data.nguoi_phu_trach?.ho_ten || "---", icon: User },
          { label: "Khoa/Phòng", val: data.khoa?.ten_khoa || "---", icon: Building2 },
          { label: "Tổ công tác", val: data.to_cong_tac?.ten_to || "---", icon: Users },
          { label: "Hạn chót", val: data.han_hoan_thanh ? new Date(data.han_hoan_thanh).toLocaleDateString("vi-VN") : "---", icon: Clock },
          { label: "Tiến độ", val: `${data.phan_tram_hoan_thanh || 0}%`, icon: CheckCircle2, color: "text-[#026f17]" },
        ].map((item, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
              <item.icon size={12} className={item.color || "text-slate-300"} /> {item.label}
            </div>
            <div className={`text-xs font-black text-slate-700 ${item.color || ""}`}>{item.val}</div>
          </div>
        ))}
      </div>

      {/* 2.5. Báo cáo tiến độ */}
      {data.trang_thai !== "HOAN_THANH" && (
        <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 px-1">
            <CheckCircle2 size={16} className="text-[#026f17]" />
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Cập nhật tiến độ</h3>
          </div>
          <HoatDongForm 
            congViecId={data.id} 
            onSuccess={() => { fetchDetail(); onRefreshList?.(); }} 
          />
        </div>
      )}

      {/* 3. Subtasks List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Danh sách việc con</h3>
          <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-400">{data.cong_viec_con?.length || 0}</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {data.cong_viec_con?.map((sub: any) => (
            <div key={sub.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-[#026f17] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#026f17]/10 group-hover:text-[#026f17]">
                  <ArrowRight size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-700">{sub.tieu_de}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sub.trang_thai?.replace(/_/g, " ")}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                 <div className="text-right hidden sm:block">
                   <div className="text-[11px] font-black text-[#026f17]">{sub.phan_tram_hoan_thanh || 0}%</div>
                   <div className="w-20 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                     <div className="h-full bg-[#026f17]" style={{ width: `${sub.phan_tram_hoan_thanh || 0}%` }} />
                   </div>
                 </div>
                 <Button 
                   variant="outline" 
                   className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50"
                   onClick={() => setActiveId(sub.id)}
                 >
                   Xem
                 </Button>
              </div>
            </div>
          ))}
          {(!data.cong_viec_con || data.cong_viec_con.length === 0) && (
            <div className="py-12 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Chưa có công việc con</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Activity Timeline */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 px-1">
          <MessageSquare size={16} className="text-[#026f17]" />
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Lịch sử hoạt động</h3>
        </div>
        <ActivityTimeline activities={data.hoat_dong || []} />
      </div>
    </div>
  );
}
