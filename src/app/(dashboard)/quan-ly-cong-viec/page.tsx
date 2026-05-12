"use client";

import React, { useState, useEffect } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { CongViecDashboardAnalytics } from "@/modules/quan-ly-cong-viec/components/CongViecDashboardAnalytics";
import { Plus, LayoutGrid, Users, BarChart3, X, ArrowLeft, ClipboardCheck, Send } from "lucide-react";
import KsnkPageShell from "@/components/shared/KsnkPageShell";
import { DashboardStats } from "@/modules/quan-ly-cong-viec/components/DashboardStats";
import { CongViecForm } from "@/modules/quan-ly-cong-viec/components/CongViecForm";
import CongViecKanban from "@/modules/quan-ly-cong-viec/components/CongViecKanban";
import { CongViecDetail } from "@/modules/quan-ly-cong-viec/components/CongViecDetail";
import { DeXuatApprovalList } from "@/modules/quan-ly-cong-viec/components/DeXuatApprovalList";
import { DeXuatForm } from "@/modules/quan-ly-cong-viec/components/DeXuatForm";
import { getCongViecList } from "@/modules/quan-ly-cong-viec/actions/cong-viec.actions";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import { useModulePermission } from "@/hooks/useModulePermission";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
} from "@/components/ui/dialog";

export default function QuanLyCongViecPage() {
  const [activeTab, setActiveTab] = useState("NOI_BO");
  const [isAdding, setIsAdding] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);

  const { isAdmin, allowed } = useModulePermission("CONG_VIEC");

  // Kiểm tra quyền phê duyệt (Admin hoặc có quyền APPROVE)
  const canApprove = isAdmin || allowed.edit; // Giả định edit/manage là có quyền duyệt hoặc thêm logic APPROVE cụ thể

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await getCongViecList();
      setTasks(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");

  const filteredTasks = tasks.filter(t => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (t.tieu_de?.toLowerCase().includes(term) || 
            t.nguoi_phu_trach_ten?.toLowerCase().includes(term));
  });

  const columns = [
    {
      header: "Nhiệm vụ",
      accessorKey: "tieu_de",
      cell: (row: any) => (
        <div className="flex flex-col gap-1 py-1 text-left">
          <span className="font-bold text-slate-800">{row.tieu_de}</span>
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{row.loai_cong_viec}</span>
        </div>
      ),
      sortable: true,
    },
    {
      header: "Ưu tiên",
      accessorKey: "muc_do_uu_tien",
      cell: (row: any) => {
        const priorityColors: any = {
          "CAO": "text-red-600 bg-red-50 border-red-100",
          "TRUNG_BINH": "text-amber-600 bg-amber-50 border-amber-100",
          "THAP": "text-slate-500 bg-slate-50 border-slate-100",
        };
        const color = priorityColors[row.muc_do_uu_tien] || priorityColors["TRUNG_BINH"];
        return (
          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${color}`}>
            {row.muc_do_uu_tien || "TRUNG_BINH"}
          </span>
        );
      }
    },
    {
      header: "Phụ trách",
      accessorKey: "nguoi_phu_trach_ten",
      cell: (row: any) => <span className="text-sm font-semibold text-slate-600">{row.nguoi_phu_trach_ten || "---"}</span>,
    },
    {
      header: "Tiến độ",
      accessorKey: "phan_tram_hoan_thanh",
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-[#026f17] w-8">{row.phan_tram_hoan_thanh || 0}%</span>
          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#026f17]" style={{ width: `${row.phan_tram_hoan_thanh || 0}%` }} />
          </div>
        </div>
      ),
    },
    {
      header: "Hạn chót",
      accessorKey: "han_hoan_thanh",
      cell: (row: any) => (
        <span className="text-[11px] font-black text-slate-500">
          {row.han_hoan_thanh ? new Date(row.han_hoan_thanh).toLocaleDateString("vi-VN") : "---"}
        </span>
      ),
    },
    {
      header: "Trạng thái",
      accessorKey: "trang_thai",
      cell: (row: any) => {
        const styles: any = {
          "CHUA_BAT_DAU": "bg-slate-100 text-slate-500",
          "DANG_THUC_HIEN": "bg-amber-50 text-amber-600",
          "HOAN_THANH": "bg-emerald-50 text-emerald-600",
          "QUA_HAN": "bg-red-50 text-red-600",
          "DA_HUY": "bg-slate-100 text-slate-400 strike-through",
        };
        return (
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${styles[row.trang_thai] || styles["CHUA_BAT_DAU"]}`}>
            {row.trang_thai?.replace(/_/g, " ")}
          </span>
        );
      }
    }
  ];

  return (
    <KsnkPageShell>
      <div className="max-w-[1600px] mx-auto space-y-8 p-6 animate-in fade-in duration-700 relative">
        
        {/* Detail Panel (Slide-over) - Được nới rộng tối đa */}
        {selectedTaskId && (
          <div className="fixed inset-0 z-[300] flex justify-end animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedTaskId(null)} />
            <div className="relative w-full max-w-7xl bg-slate-50 h-full overflow-y-auto shadow-2xl border-l border-white p-8 animate-in slide-in-from-right duration-500">
              <button 
                onClick={() => setSelectedTaskId(null)}
                className="mb-8 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft size={16} /> Quay lại danh sách
              </button>
              <CongViecDetail 
                id={selectedTaskId} 
                onClose={() => setSelectedTaskId(null)} 
                onRefreshList={fetchTasks}
              />
            </div>
          </div>
        )}

        {/* Header Section (Minimalist) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Quản lý Công việc</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Điều phối và giám sát nhiệm vụ khoa KSNK 103</p>
          </div>
          
          <div className="flex gap-3">
            {/* Nút Đề xuất */}
            <Dialog open={isSuggesting} onOpenChange={setIsSuggesting}>
              <DialogTrigger asChild>
                <button
                  className="flex items-center gap-2 h-10 px-5 bg-white text-slate-700 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Send size={16} /> Đề xuất việc mới
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-xl bg-slate-50 rounded-3xl p-8 border-white shadow-2xl">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight">Gửi đề xuất công việc</DialogTitle>
                </DialogHeader>
                <DeXuatForm 
                  onSuccess={() => { setIsSuggesting(false); fetchTasks(); }} 
                  onCancel={() => setIsSuggesting(false)} 
                />
              </DialogContent>
            </Dialog>

            {/* Nút Tạo trực tiếp */}
            {(isAdmin || allowed.create) && (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 h-10 px-5 bg-[#026f17] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-[#025a12] transition-all"
              >
                <Plus size={16} /> Tạo công việc
              </button>
            )}
          </div>
        </div>

        <DashboardStats tasks={filteredTasks} />

        {isAdding && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl relative p-8 border border-white">
              <button 
                onClick={() => setIsAdding(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white text-slate-400 hover:text-red-500 transition-colors shadow-sm"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tight">Thêm nhiệm vụ mới</h2>
              <CongViecForm 
                onSuccess={() => { setIsAdding(false); fetchTasks(); }} 
                onCancel={() => setIsAdding(false)} 
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8">
          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <Tabs.List className="flex p-1 bg-slate-100/50 rounded-xl w-fit overflow-x-auto max-w-full">
                {[
                  { id: "NOI_BO", label: "Nội bộ Khoa", icon: LayoutGrid, visible: true },
                  { id: "MANG_LUOI", label: "Mạng lưới", icon: Users, visible: true },
                  { id: "PHE_DUYET", label: "Phê duyệt", icon: ClipboardCheck, visible: canApprove },
                  { id: "THONG_KE", label: "Thống kê & Báo cáo", icon: BarChart3, visible: true },
                ].filter(t => t.visible).map((t) => (
                  <Tabs.Trigger
                    key={t.id}
                    value={t.id}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 ${
                      activeTab === t.id 
                        ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/50" 
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <t.icon size={16} strokeWidth={2} /> {t.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              {/* Bộ lọc tinh tế */}
              {(activeTab === "NOI_BO" || activeTab === "MANG_LUOI") && (
                <div className="relative max-w-sm w-full">
                  <input 
                    type="text" 
                    placeholder="Tìm tên việc, người phụ trách..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-10 pl-4 pr-10 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#026f17]/20 focus:border-[#026f17] transition-all placeholder:text-slate-400"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm("")} className="absolute right-3 top-3 text-slate-300 hover:text-red-500">
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <Tabs.Content value="NOI_BO" className="outline-none space-y-6">
               <CongViecKanban 
                  tasks={filteredTasks.filter(t => t.loai_pham_vi === "NOI_BO")} 
                  onTaskClick={(task) => setSelectedTaskId(task.id)}
               />
               <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                  <AdvancedDataTable
                    columns={columns}
                    data={filteredTasks.filter(t => t.loai_pham_vi === "NOI_BO")}
                    loading={loading}
                    onRowClick={(item) => setSelectedTaskId(item.id)}
                    hideSearch
                    tableClassName="w-full text-sm border-collapse"
                  />
               </div>
            </Tabs.Content>

            <Tabs.Content value="MANG_LUOI" className="outline-none space-y-6">
               <CongViecKanban 
                  tasks={filteredTasks.filter(t => t.loai_pham_vi === "MANG_LUOI")} 
                  onTaskClick={(task) => setSelectedTaskId(task.id)}
               />
               <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                  <AdvancedDataTable
                    columns={columns}
                    data={filteredTasks.filter(t => t.loai_pham_vi === "MANG_LUOI")}
                    loading={loading}
                    onRowClick={(item) => setSelectedTaskId(item.id)}
                    hideSearch
                    tableClassName="w-full text-sm border-collapse"
                  />
               </div>
            </Tabs.Content>

            <Tabs.Content value="PHE_DUYET" className="outline-none space-y-6">
               <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
                  <DeXuatApprovalList />
               </div>
            </Tabs.Content>

            <Tabs.Content value="THONG_KE" className="outline-none space-y-6">
               <CongViecDashboardAnalytics tasks={tasks} />
            </Tabs.Content>
          </Tabs.Root>
        </div>
      </div>
    </KsnkPageShell>
  );
}
