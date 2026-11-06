"use client";

import React, { useState } from "react";
import {
  BarChart3,
  CalendarCheck2,
  Clock,
  History,
  Scale,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { TabNhapSoCan } from "../components/TabNhapSoCan";
import { TabLichSuSuCo } from "../components/TabLichSuSuCo";
import { TabThongKeXuHuong } from "../components/TabThongKeXuHuong";

type TabId = "NHAP_CAN" | "LICH_SU" | "THONG_KE";

export default function ChatThaiDoVaiPage() {
  const [activeTab, setActiveTab] = useState<TabId>("NHAP_CAN");

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Header / Hero */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4" />
                Hậu cần & Môi trường y tế &bull; Bệnh viện Quân y 103
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Quản lý Chất thải y tế & Đồ vải y tế
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                Sổ cân định lượng toàn viện tại nhà rác và đơn vị giặt là, theo dõi sự cố an toàn sinh học và lượng giá 9 chỉ số KSNK cốt lõi.
              </p>
            </div>

            {/* Tab navigation */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveTab("NHAP_CAN")}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "NHAP_CAN"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CalendarCheck2 className="w-3.5 h-3.5" />
                Nhập sổ cân ngày
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("LICH_SU")}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "LICH_SU"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Lịch sử & Sự cố
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("THONG_KE")}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "THONG_KE"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Thống kê & Xu hướng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "NHAP_CAN" && <TabNhapSoCan />}
        {activeTab === "LICH_SU" && <TabLichSuSuCo />}
        {activeTab === "THONG_KE" && <TabThongKeXuHuong />}
      </main>
    </div>
  );
}
