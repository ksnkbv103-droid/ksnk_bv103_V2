"use client";

import React from "react";
import { Clock, ChevronRight, ListTree } from "lucide-react";

interface Task {
  id: string;
  tieu_de: string;
  trang_thai: string;
  muc_do_uu_tien: string;
  nguoi_phu_trach_ten?: string;
  to_cong_tac_ten?: string;
  phan_tram_hoan_thanh: number;
  cong_viec_con_count?: number;
}

interface Props {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export default function CongViecKanban({ tasks, onTaskClick }: Props) {
  const columns = [
    { id: "CHUA_BAT_DAU", title: "Chờ thực hiện", color: "bg-slate-400" },
    { id: "DANG_THUC_HIEN", title: "Đang làm", color: "bg-blue-500" },
    { id: "HOAN_THANH", title: "Hoàn thành", color: "bg-emerald-500" },
  ];

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case "CAO": return "text-red-600 bg-red-50";
      case "TRUNG_BINH": return "text-amber-600 bg-amber-50";
      default: return "text-blue-600 bg-blue-50";
    }
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 min-h-[600px] snap-x snap-mandatory">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.trang_thai === col.id);
        
        return (
          <div key={col.id} className="flex flex-col w-[350px] shrink-0 bg-slate-50/50 rounded-[2.5rem] p-4 border border-slate-100 snap-center">
            <div className="flex justify-between items-center px-4 mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">{col.title}</h3>
                <span className="ml-2 px-2 py-0.5 bg-white rounded-full text-[10px] font-black text-slate-400 border border-slate-100">{colTasks.length}</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto max-h-[700px] scrollbar-hide">
              {colTasks.map((task) => (
                <div 
                  key={task.id} 
                  onClick={() => onTaskClick?.(task)}
                  className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:scale-[1.02] hover:border-[#026f17]/30 transition-all cursor-pointer group relative"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${getPriorityStyle(task.muc_do_uu_tien)}`}>
                      {task.muc_do_uu_tien}
                    </span>
                    <div className="p-1.5 rounded-full bg-slate-50 text-slate-300 group-hover:bg-[#026f17]/10 group-hover:text-[#026f17] transition-all">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                  
                  <h4 className="text-sm font-black text-slate-800 leading-tight mb-4 group-hover:text-[#026f17] transition-colors line-clamp-2">
                    {task.tieu_de}
                  </h4>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-300 uppercase">Phụ trách / Tổ</span>
                      <span className="text-[10px] font-black text-slate-500">
                        {task.nguoi_phu_trach_ten || "Chưa phân công"}
                        {task.to_cong_tac_ten ? ` - ${task.to_cong_tac_ten}` : ""}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-slate-400" title="Công việc con">
                        <ListTree size={12} />
                        <span className="text-[10px] font-black">{task.cong_viec_con_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                         <Clock size={12} className="text-[#026f17]" />
                         <span className="text-[10px] font-black text-[#026f17]">{task.phan_tram_hoan_thanh || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {colTasks.length === 0 && (
                <div className="py-10 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-[2rem]">
                  Trống
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
