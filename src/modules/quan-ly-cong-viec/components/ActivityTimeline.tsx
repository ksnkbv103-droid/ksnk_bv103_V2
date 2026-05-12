"use client";

import React from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { 
  User, 
  CheckCircle, 
  Clock, 
  FileText, 
  Award 
} from "lucide-react";

interface Activity {
  id: string;
  loai_hoat_dong: string;
  noi_dung: string | null;
  phan_tram_hoan_thanh: number | null;
  created_at: string;
  nguoi: {
    ho_ten: string;
  } | null;
  files?: Array<{ id: string; file_url: string; ten_file: string | null }>;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

const getActivityConfig = (loai: string) => {
  switch (loai) {
    case "PHAN_CONG":
      return { 
        icon: <User className="h-4 w-4" />, 
        color: "bg-blue-50 text-blue-700 border-blue-100",
        label: "Phân công" 
      };
    case "BAO_CAO_TIEN_DO":
      return { 
        icon: <CheckCircle className="h-4 w-4" />, 
        color: "bg-emerald-50 text-emerald-700 border-emerald-100",
        label: "Báo cáo tiến độ" 
      };
    case "DE_XUAT":
      return { 
        icon: <FileText className="h-4 w-4" />, 
        color: "bg-purple-50 text-purple-700 border-purple-100",
        label: "Đề xuất" 
      };
    case "PHE_DUYET":
      return { 
        icon: <Award className="h-4 w-4" />, 
        color: "bg-green-50 text-green-700 border-green-100",
        label: "Phê duyệt" 
      };
    case "HOAN_THANH":
      return { 
        icon: <CheckCircle className="h-4 w-4" />, 
        color: "bg-emerald-50 text-emerald-700 border-emerald-100",
        label: "Hoàn thành" 
      };
    default:
      return { 
        icon: <Clock className="h-4 w-4" />, 
        color: "bg-slate-50 text-slate-700 border-slate-100",
        label: loai.replace(/_/g, " ")
      };
  }
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
        <div className="mx-auto w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
          <Clock className="h-8 w-8 text-slate-300" />
        </div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Chưa có hoạt động nào được ghi nhận</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[21px] before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100">
      {activities.map((activity, index) => {
        const config = getActivityConfig(activity.loai_hoat_dong);
        
        return (
          <div key={activity.id} className="relative flex gap-6 group animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
            {/* Timeline Dot */}
            <div className="flex flex-col items-center z-10">
              <div className={`p-2.5 rounded-full border-2 bg-white shadow-sm transition-all group-hover:scale-110 ${config.color}`}>
                {config.icon}
              </div>
            </div>

            {/* Content Card */}
            <div className="flex-1 pb-8">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm group-hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-slate-800">
                      {activity.nguoi?.ho_ten || "Hệ thống"}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {format(new Date(activity.created_at), "HH:mm • dd/MM/yyyy", { locale: vi })}
                  </span>
                </div>

                {activity.noi_dung && (
                  <p className="text-sm font-medium text-slate-600 leading-relaxed">
                    {activity.noi_dung}
                  </p>
                )}

                {activity.phan_tram_hoan_thanh !== null && activity.phan_tram_hoan_thanh > 0 && (
                  <div className="mt-4 flex items-center gap-4 bg-slate-50/50 p-3 rounded-2xl">
                    <div className="text-[11px] font-black text-[#026f17] w-10">
                      {activity.phan_tram_hoan_thanh}%
                    </div>
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#026f17] transition-all duration-1000" 
                        style={{ width: `${activity.phan_tram_hoan_thanh}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Hiển thị File đính kèm */}
                {activity.files && activity.files.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tệp đính kèm</h5>
                    <div className="flex flex-wrap gap-2">
                      {activity.files.map(f => (
                        <a 
                          key={f.id} 
                          href={f.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-600 hover:border-[#026f17] hover:text-[#026f17] hover:bg-emerald-50 transition-all p-3 rounded-2xl w-fit"
                        >
                          <FileText size={16} />
                          <span className="text-xs font-bold">{f.ten_file || "Tệp đính kèm"}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
