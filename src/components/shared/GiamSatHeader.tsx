// src/components/shared/GiamSatHeader.tsx
"use client";

import React, { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { MasterOption } from "@/lib/master-data/gateway";
import { matchesNhanSuProfessionFilter } from "@/lib/master-data/nhan-su-enrich";
import { mdmGetSupervisionMasterDataBundle } from "@/modules/quan-tri-he-thong/actions/mdm-gateway.actions";
import GiamSatHeaderPersonalFields from "./GiamSatHeaderPersonalFields";
import GiamSatHeaderPatientFields from "./GiamSatHeaderPatientFields";
import GiamSatHeaderFields from "./GiamSatHeaderFields";
import type { GiamSatSession, NhanSuOption } from "./giam-sat-header.types";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import type { VstSessionLocationHistoryRow } from "@/modules/quan-tri-he-thong/danh-muc/actions/master-data-gateway.actions";

export type { GiamSatSession, NhanSuOption };

interface GiamSatHeaderProps {
  session: GiamSatSession;
  setSession: Dispatch<SetStateAction<GiamSatSession>>;
  historyLocations?: string[];
  historyLocationRows?: VstSessionLocationHistoryRow[];
  khoas?: MasterOption[];
  khuVucs?: MasterOption[];
  ngheNghieps?: MasterOption[];
  nhanSus?: NhanSuOption[];
  hinhThucGiamSats?: MasterOption[];
  cachThucGiamSats?: MasterOption[];
  /** Khi khoas/khuVucs do hook cha cung cấp: hiển thị trạng thái tải của cha */
  headerDataLoading?: boolean;
  showGiamSatCaNhan?: boolean;
  /** VST: khóa “Người giám sát” = hồ sơ đăng nhập (đồng bộ SSO). */
  lockedSupervisorHoSoId?: string | null;
  /** Khi tải bundle MDM thất bại: ẩn banner “Quản trị viên / chưa liên kết” (tránh hiểu nhầm khi chưa có dữ liệu). */
  suppressStaffIdentityBanner?: boolean;
  /** GSC: gợi ý vị trí chỉ sau khi gõ; lọc theo từ khóa + khoa. */
  deferLocationHistoryUntilTyped?: boolean;
  /** GSC: hiện tùy chọn bổ sung mã/tên/giường người bệnh. */
  showBoSungNguoiBenhToggle?: boolean;
  /** Context module để áp dụng giá trị mặc định (vst | gsc) */
  moduleContext?: "vst" | "gsc";
}

export default function GiamSatHeader({ 
  session, setSession, 
  historyLocations: externalHistory,
  historyLocationRows: externalHistoryRows,
  khoas: externalKhoas, khuVucs: externalKhuVucs,
  ngheNghieps: externalNgheNghieps,
  hinhThucGiamSats: externalHinhThuc,
  cachThucGiamSats: externalCachThuc,
  nhanSus: externalNhanSus,
  headerDataLoading = false,
  showGiamSatCaNhan = true,
  lockedSupervisorHoSoId = null,
  suppressStaffIdentityBanner = false,
  deferLocationHistoryUntilTyped = false,
  showBoSungNguoiBenhToggle = false,
  moduleContext = "vst",
}: GiamSatHeaderProps) {
  const toText = (value: unknown): string => String(value ?? "").trim();
  const resolveNhanSuKhoaId = (ns: NhanSuOption): string => {
    const direct = toText(ns.khoa_id);
    if (direct) return direct;
    const fallbackKeys = ["khoa_phong_id", "mdm_dm_khoa_phong_id", "khoaId"] as const;
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
  const [hinhThucLocal, setHinhThucLocal] = useState<MasterOption[]>([]);
  const [cachThucLocal, setCachThucLocal] = useState<MasterOption[]>([]);
  const [allNhanSusLocal, setAllNhanSusLocal] = useState<NhanSuOption[]>([]);
  const [historyLocationsLocal, setHistoryLocationsLocal] = useState<string[]>([]);
  const [historyLocationRowsLocal, setHistoryLocationRowsLocal] = useState<VstSessionLocationHistoryRow[]>([]);
  const [loadingSelf, setLoadingSelf] = useState(true);

  const parentFeedsKhoaKhu = externalKhoas !== undefined && externalKhuVucs !== undefined;
  const displayKhoas = parentFeedsKhoaKhu ? externalKhoas : khoasLocal;
  const displayKhuVucs = parentFeedsKhoaKhu ? externalKhuVucs : khuVucsLocal;
  const displayNgheNghieps = externalNgheNghieps !== undefined ? externalNgheNghieps : ngheNghiepsLocal;
  const displayHinhThuc = externalHinhThuc !== undefined ? externalHinhThuc : hinhThucLocal;
  const displayCachThuc = externalCachThuc !== undefined ? externalCachThuc : cachThucLocal;
  const displayNhanSus = externalNhanSus !== undefined ? externalNhanSus : allNhanSusLocal;
  const displayHistory = externalHistory !== undefined ? externalHistory : historyLocationsLocal;
  const displayHistoryRows = externalHistoryRows !== undefined ? externalHistoryRows : historyLocationRowsLocal;
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
          setHinhThucLocal((result.data as any).hinhThucGiamSats || []);
          setCachThucLocal((result.data as any).cachThucGiamSats || []);
          setAllNhanSusLocal((result.data.nhanSus || []) as NhanSuOption[]);
          setHistoryLocationsLocal(result.data.historyLocations || []);
          setHistoryLocationRowsLocal(result.data.historyLocationRows || []);
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

  const [isCollapsed, setIsCollapsed] = useState(true);

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

  const showPersonalPanel = Boolean(showGiamSatCaNhan && session.is_giam_sat_ca_nhan);
  const showPatientPanel = Boolean(showBoSungNguoiBenhToggle && session.is_bo_sung_nguoi_benh);
  
  const selectedKhoaName = displayKhoas.find(k => k.id === session.khoa_id)?.ten_danh_muc || "Chưa chọn khoa";
  const selectedKhuVucName = displayKhuVucs.find(k => k.id === session.khu_vuc_id)?.ten_danh_muc || "Chưa chọn khu vực";

  return (
    <div
      id="vst-session-header"
      className={`overflow-visible rounded-[var(--radius-shell)] border border-slate-200/90 bg-white shadow-sm transition-[padding] duration-200 ${isCollapsed ? "sticky top-4 z-30 p-3 max-md:static max-md:z-auto" : "space-y-4 p-4 sm:p-5"}`}
    >
      <div className={`flex items-center justify-between gap-3 ${!isCollapsed ? "border-b border-slate-100 pb-3" : ""}`}>
        <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-3" onClick={() => setIsCollapsed(!isCollapsed)}>
          <div className="flex items-center gap-3">
            <div className={`shrink-0 rounded-full bg-[var(--primary)] transition-all ${isCollapsed ? "h-4 w-1" : "h-7 w-1.5"}`} />
            <div>
              <h2 className={`${T.sectionTitle} transition-all ${isCollapsed ? "text-sm" : ""}`}>
                {isCollapsed ? `Phiên giám sát: ${selectedKhoaName} — ${selectedKhuVucName}` : "Thông tin phiên giám sát"}
              </h2>
              {isCollapsed ? <p className={T.pageEyebrow}>Nhấn để mở rộng cấu hình</p> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {loading ? <div className={`${T.pageEyebrow} animate-pulse text-[var(--primary)]`}>Đang đồng bộ…</div> : null}
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`${C.btnSecondary} h-auto min-h-0 gap-2 px-3 py-1.5 text-[11px]`}
          >
            {isCollapsed ? 'Mở rộng' : 'Thu gọn'}
          </button>

          {!isCollapsed && (
            <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
              {showGiamSatCaNhan && (
                <label className="flex cursor-pointer items-center gap-2 group">
                  <span className={`${T.labelBlock} group-hover:text-slate-700 transition-colors`}>
                    Giám sát nhân viên
                  </span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--primary)]"
                    checked={Boolean(session.is_giam_sat_ca_nhan)}
                    onChange={(e) =>
                      setSession((prev) => ({
                        ...prev,
                        is_giam_sat_ca_nhan: e.target.checked,
                        ...(e.target.checked
                          ? {}
                          : {
                              nghe_nghiep_id: "",
                              nhan_vien_id: "",
                              is_manual_nhan_vien: false,
                              ten_manual_nhan_vien: "",
                            }),
                      }))
                    }
                  />
                </label>
              )}
              {showBoSungNguoiBenhToggle && (
                <label className="flex cursor-pointer items-center gap-2 group">
                  <span className={`${T.labelBlock} group-hover:text-slate-700 transition-colors`}>
                    Bổ sung người bệnh
                  </span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--primary)]"
                    checked={Boolean(session.is_bo_sung_nguoi_benh)}
                    onChange={(e) =>
                      setSession((prev) => ({
                        ...prev,
                        is_bo_sung_nguoi_benh: e.target.checked,
                        ...(e.target.checked
                          ? {}
                          : {
                              ma_nguoi_benh: "",
                              ten_nguoi_benh: "",
                              so_giuong_nguoi_benh: "",
                            }),
                      }))
                    }
                  />
                </label>
              )}
            </div>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-6">
          <GiamSatHeaderFields
            session={session}
            setSession={setSession}
            khoas={displayKhoas}
            khuVucs={displayKhuVucs}
            allNhanSus={displayNhanSus}
            historyLocations={displayHistory}
            historyLocationRows={displayHistoryRows}
            hinhThucGiamSats={displayHinhThuc}
            cachThucGiamSats={displayCachThuc}
            deferLocationHistoryUntilTyped={deferLocationHistoryUntilTyped}
            loading={loading}
            lockedSupervisorHoSoId={lockedSupervisorHoSoId ?? undefined}
            suppressStaffIdentityBanner={suppressStaffIdentityBanner}
            moduleContext={moduleContext}
          />

          {(showPersonalPanel || showPatientPanel) && (
            <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5`}>
              {showPersonalPanel && (
                <GiamSatHeaderPersonalFields
                  session={session}
                  setSession={setSession}
                  ngheNghieps={displayNgheNghieps}
                  filteredNhanSus={filteredNhanSus}
                />
              )}

              {showPatientPanel && (
                <GiamSatHeaderPatientFields
                  session={session}
                  setSession={setSession}
                  labelStartIndex={showPersonalPanel ? 8 : 5}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
