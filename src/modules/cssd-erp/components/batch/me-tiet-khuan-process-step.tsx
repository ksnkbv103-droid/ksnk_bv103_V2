"use client";

import React from "react";
import { History } from "lucide-react";
import CSSDSubNav from "../navigation/CSSDSubNav";
import { CSSD_PAGE_OUTER } from "../layout/cssd-page-shell";
import MeTietKhuanProcessScanPanel, { type MeTkItemRow } from "./me-tiet-khuan-process-scan-panel";
import MeTietKhuanProcessQcPanel from "./me-tiet-khuan-process-qc-panel";

type MeRow = { id: string; ma_lo_tiet_khuan?: string };

export default function MeTietKhuanProcessStep({
  activeMe,
  items,
  nguoiUnload,
  setNguoiUnload,
  nhietDo,
  setNhietDo,
  testBI,
  setTestBI,
  testCI,
  setTestCI,
  testBD,
  setTestBD,
  onBackToList,
  onAddItemByCode,
  onFinish,
}: {
  activeMe: MeRow | null;
  items: MeTkItemRow[];
  nguoiUnload: string;
  setNguoiUnload: (v: string) => void;
  nhietDo: string;
  setNhietDo: (v: string) => void;
  testBI: "DAT" | "KHONG_DAT" | "";
  setTestBI: (v: "DAT" | "KHONG_DAT" | "") => void;
  testCI: "DAT" | "KHONG_DAT" | "";
  setTestCI: (v: "DAT" | "KHONG_DAT" | "") => void;
  testBD: "DAT" | "KHONG_DAT" | "NA";
  setTestBD: (v: "DAT" | "KHONG_DAT" | "NA") => void;
  onBackToList: () => void;
  onAddItemByCode: (code: string) => void;
  onFinish: () => void;
}) {
  return (
    <div className={`${CSSD_PAGE_OUTER} animate-in slide-in-from-right-10 duration-500`}>
      <CSSDSubNav />
      <div className="space-y-6">
        <header className="flex items-center justify-between rounded-[40px] bg-[#026f17] p-8 text-white shadow-xl">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">{activeMe?.ma_lo_tiet_khuan}</h2>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest opacity-80">
              Phiếu / mẻ tiệt khuẩn — {items.length} bộ trong mẻ
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToList}
            className="rounded-2xl bg-white/10 p-4 transition-all hover:bg-white/20"
            title="Về danh sách"
          >
            <History size={20} />
          </button>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MeTietKhuanProcessScanPanel items={items} onAddItemByCode={onAddItemByCode} />
          <MeTietKhuanProcessQcPanel
            nguoiUnload={nguoiUnload}
            setNguoiUnload={setNguoiUnload}
            nhietDo={nhietDo}
            setNhietDo={setNhietDo}
            testBI={testBI}
            setTestBI={setTestBI}
            testCI={testCI}
            setTestCI={setTestCI}
            testBD={testBD}
            setTestBD={setTestBD}
            onFinish={onFinish}
          />
        </div>
      </div>
    </div>
  );
}
