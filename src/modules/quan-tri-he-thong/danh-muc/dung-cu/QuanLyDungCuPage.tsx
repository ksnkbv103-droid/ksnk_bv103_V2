"use client";

import React, { useState } from "react";
import { LayoutGrid, Database, List } from "lucide-react";
import { LoaiDungCuPageContent } from "./LoaiDungCuPage";
import { BoDungCuPageContent } from "./BoDungCuPage";
import { DungCuChiTietPageContent } from "./dung-cu-chi-tiet-page-content";
import { DmMasterPageGuard } from "../views/dm-master-page-guard";

export default function QuanLyDungCuPage() {
  const [activeTab, setActiveTab] = useState<"loai" | "bo" | "chi-tiet">("loai");

  return (
    <DmMasterPageGuard moduleKey="LOAI_DC" label="Quản lý dụng cụ">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-black text-[#026f17] uppercase tracking-tight flex items-center gap-3">
              <LayoutGrid size={24} className="text-[#026f17]" /> Quản lý dụng cụ
            </h1>
            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">
              Phân hệ đồng bộ Master Data • CSSD
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("loai")}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeTab === "loai"
                  ? "bg-white text-[#026f17] shadow-md scale-[1.02]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid size={14} /> Danh mục Loại dụng cụ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bo")}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeTab === "bo"
                  ? "bg-white text-[#026f17] shadow-md scale-[1.02]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Database size={14} /> Danh mục Bộ dụng cụ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("chi-tiet")}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeTab === "chi-tiet"
                  ? "bg-white text-[#026f17] shadow-md scale-[1.02]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List size={14} /> Dụng cụ thành phần
            </button>
          </div>
        </div>

        <div className="transition-all duration-300">
          {activeTab === "loai" && <LoaiDungCuPageContent />}
          {activeTab === "bo" && <BoDungCuPageContent />}
          {activeTab === "chi-tiet" && <DungCuChiTietPageContent />}
        </div>
      </div>
    </DmMasterPageGuard>
  );
}
