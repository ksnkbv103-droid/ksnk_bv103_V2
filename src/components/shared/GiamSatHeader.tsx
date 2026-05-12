// src/components/shared/GiamSatHeader.tsx
"use client";

import React, { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { MasterOption } from "@/lib/master-data/gateway";
import { matchesNhanSuProfessionFilter } from "@/lib/master-data/nhan-su-enrich";
import { mdmGetSupervisionMasterDataBundle } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.actions";
import GiamSatHeaderPersonalFields from "./GiamSatHeaderPersonalFields";
import GiamSatHeaderFields from "./GiamSatHeaderFields";
import type { GiamSatSession, NhanSuOption } from "./giam-sat-header.types";

export type { GiamSatSession, NhanSuOption };

interface GiamSatHeaderProps {
  session: GiamSatSession;
  setSession: Dispatch<SetStateAction<GiamSatSession>>;
  historyLocations?: string[];
  khoas?: MasterOption[];
  khuVucs?: MasterOption[];
  ngheNghieps?: MasterOption[];
  nhanSus?: NhanSuOption[];
  /** Khi khoas/khuVucs do hook cha cung cấp: hiển thị trạng thái tải của cha */
  headerDataLoading?: boolean;
  showGiamSatCaNhan?: boolean;
  /** VST: khóa “Người giám sát” = hồ sơ đăng nhập (đồng bộ SSO). */
  lockedSupervisorHoSoId?: string | null;
  /** Khi tải bundle MDM thất bại: ẩn banner “Quản trị viên / chưa liên kết” (tránh hiểu nhầm khi chưa có dữ liệu). */
  suppressStaffIdentityBanner?: boolean;
}

export default function GiamSatHeader({ 
  session, setSession, 
  historyLocations: externalHistory,
  khoas: externalKhoas, khuVucs: externalKhuVucs,
  ngheNghieps: externalNgheNghieps,
  nhanSus: externalNhanSus,
  headerDataLoading = false,
  showGiamSatCaNhan = true,
  lockedSupervisorHoSoId = null,
  suppressStaffIdentityBanner = false,
}: GiamSatHeaderProps) {
  const toText = (value: unknown): string => String(value ?? "").trim();
  const resolveNhanSuKhoaId = (ns: NhanSuOption): string => {
    const direct = toText(ns.khoa_id);
    if (direct) return direct;
    const fallbackKeys = ["khoa_phong_id", "dm_khoa_phong_id", "khoaId"] as const;
    for (const key of fallbackKeys) {
      const value = toText((ns as Record<string, unknown>)[key]);
      if (value) return value;
    }
    const khoaObject = (ns as Record<string, unknown>).khoa as Record<string, unknown> | undefined;
    return toText(khoaObject?.id);
  };
  const [khoasLocal, setKhoasLocal] = useState<MasterOption[]>([]);
  const [khuVucsLocal, setKhuVucsLocal] = useState<MasterOption[]>([]);
  const [ngheNghiepsLocal, setNgheNghiepsLocal] = useState<MasterOption[]>([]);
  const [allNhanSusLocal, setAllNhanSusLocal] = useState<NhanSuOption[]>([]);
  const [historyLocationsLocal, setHistoryLocationsLocal] = useState<string[]>([]);
  const [loadingSelf, setLoadingSelf] = useState(true);

  const parentFeedsKhoaKhu = externalKhoas !== undefined && externalKhuVucs !== undefined;
  const displayKhoas = parentFeedsKhoaKhu ? externalKhoas : khoasLocal;
  const displayKhuVucs = parentFeedsKhoaKhu ? externalKhuVucs : khuVucsLocal;
  const displayNgheNghieps = externalNgheNghieps !== undefined ? externalNgheNghieps : ngheNghiepsLocal;
  const displayNhanSus = externalNhanSus !== undefined ? externalNhanSus : allNhanSusLocal;
  const displayHistory = externalHistory !== undefined ? externalHistory : historyLocationsLocal;
  const loading = parentFeedsKhoaKhu ? headerDataLoading : loadingSelf;

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (parentFeedsKhoaKhu) {
        setLoadingSelf(false);
        return;
      }
      setLoadingSelf(true);
      try {
        const result = await mdmGetSupervisionMasterDataBundle({ permissionContext: "admin" });
        if (cancelled) return;
        if (result.success) {
          setKhoasLocal(result.data.khoas || []);
          setKhuVucsLocal(result.data.khuVucs || []);
          setNgheNghiepsLocal(result.data.ngheNghieps || []);
          setAllNhanSusLocal((result.data.nhanSus || []) as NhanSuOption[]);
          setHistoryLocationsLocal(result.data.historyLocations || []);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("[GiamSatHeader] loadData error:", error);
      } finally {
        if (!cancelled) setLoadingSelf(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [parentFeedsKhoaKhu]);

  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredNhanSus = useMemo(
    () =>
      displayNhanSus.filter((ns) => {
        const selectedKhoa = toText(session.khoa_id);
        const khoaValue = resolveNhanSuKhoaId(ns);
        const matchKhoa = !selectedKhoa || !khoaValue || khoaValue === selectedKhoa;
        const matchNghe = matchesNhanSuProfessionFilter(
          ns as Record<string, unknown>,
          String(session.nghe_nghiep_id || ""),
          displayNgheNghieps,
        );
        return matchKhoa && matchNghe;
      }),
    [displayNhanSus, session.khoa_id, session.nghe_nghiep_id, displayNgheNghieps],
  );

  const selectedKhoaName = displayKhoas.find(k => k.id === session.khoa_id)?.ten_danh_muc || "Chưa chọn khoa";
  const selectedKhuVucName = displayKhuVucs.find(k => k.id === session.khu_vuc_id)?.ten_danh_muc || "Chưa chọn khu vực";

  return (
    <div className={`premium-card glass-panel overflow-visible bg-white/95 border-b-4 border-[#026f17] shadow-xl animate-in fade-in slide-in-from-top-4 transition-all duration-500 ${isCollapsed ? 'p-3' : 'p-6 space-y-6'}`}>
      <div className={`flex items-center justify-between ${!isCollapsed ? 'border-b border-slate-100 pb-4' : ''}`}>
        <div className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
          <div className="flex items-center gap-3">
            <div className={`bg-[#026f17] rounded-full shrink-0 transition-all ${isCollapsed ? 'w-1 h-4' : 'w-2 h-8'}`} />
            <div>
              <h2 className={`font-black text-[#026f17] uppercase tracking-widest transition-all ${isCollapsed ? 'text-[10px]' : 'text-sm'}`}>
                {isCollapsed ? `Phiên GS: ${selectedKhoaName} - ${selectedKhuVucName}` : 'Thông tin phiên giám sát'}
              </h2>
              {isCollapsed && <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Nhấn để mở rộng cấu hình</p>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {loading && <div className="text-[10px] font-bold text-[#026f17] animate-pulse">Đang đồng bộ...</div>}
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-black text-slate-500 hover:bg-slate-100 transition-all uppercase tracking-widest"
          >
            {isCollapsed ? 'Mở rộng' : 'Thu gọn'}
          </button>

          {!isCollapsed && showGiamSatCaNhan && (
            <label className="flex items-center gap-2 cursor-pointer group">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter group-hover:text-[#026f17] transition-colors">
                Giám sát cá nhân?
              </span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-[#026f17]"
                checked={Boolean(session.is_giam_sat_ca_nhan)}
                onChange={(e) =>
                  setSession((prev) => ({
                    ...prev,
                    is_giam_sat_ca_nhan: e.target.checked,
                    ...(e.target.checked
                      ? {}
                      : { nghe_nghiep_id: "", nhan_vien_id: "", is_manual_nhan_vien: false, ten_manual_nhan_vien: "" }),
                  }))
                }
              />
            </label>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 gap-6 overflow-visible md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <GiamSatHeaderFields
            session={session}
            setSession={setSession}
            khoas={displayKhoas}
            khuVucs={displayKhuVucs}
            allNhanSus={displayNhanSus}
            historyLocations={displayHistory}
            loading={loading}
            lockedSupervisorHoSoId={lockedSupervisorHoSoId ?? undefined}
            suppressStaffIdentityBanner={suppressStaffIdentityBanner}
          />
          
          {showGiamSatCaNhan && session.is_giam_sat_ca_nhan && (
            <GiamSatHeaderPersonalFields session={session} setSession={setSession} ngheNghieps={displayNgheNghieps} filteredNhanSus={filteredNhanSus} />
          )}
        </div>
      )}
    </div>
  );
}
