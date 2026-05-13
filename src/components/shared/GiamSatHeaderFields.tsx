// src/components/shared/GiamSatHeaderFields.tsx
"use client";

import React, { type Dispatch, type SetStateAction, useEffect, useMemo } from "react";
import { usePermission } from "@/hooks/usePermission";
import { AlertCircle, UserPlus, ShieldCheck } from "lucide-react";
import type { MasterOption } from "@/lib/master-data/gateway";
import type { VstSessionLocationHistoryRow } from "@/modules/quan-tri-he-thong/danh-muc/actions/master-data-gateway.actions";
import { getDanhMucAdminPath } from "@/lib/master-data/danh-muc-admin-routes";
import { HINH_THUC_KHACH_QUAN, HINH_THUC_TU_GIAM_SAT } from "@/lib/supervision-policy";
import {
  combineLocalNgayAndTime,
  isReplayCameraSupervisionCachThuc,
  timeLocalHmFromIso,
} from "@/lib/supervision-session-time";
import type { GiamSatSession, NhanSuOption } from "./giam-sat-header.types";
import SearchableSelect from "./SearchableSelect";

interface GiamSatHeaderFieldsProps {
  session: GiamSatSession;
  setSession: Dispatch<SetStateAction<GiamSatSession>>;
  khoas: MasterOption[];
  khuVucs: MasterOption[];
  allNhanSus: NhanSuOption[];
  historyLocations: string[];
  /** Khi có: gợi ý vị trí lọc theo khoa phiên đang chọn (giống lọc nhân sự). */
  historyLocationRows?: VstSessionLocationHistoryRow[];
  /** GSC: không hiện khung gợi ý cho đến khi có chữ; gợi ý lọc theo từ khóa (vẫn theo khoa). */
  deferLocationHistoryUntilTyped?: boolean;
  loading: boolean;
  /** Khóa chọn NG — luôn dùng UUID hồ sơ đăng nhập hiện tại */
  lockedSupervisorHoSoId?: string | null;
  /** Ẩn banner Quản trị viên / chưa liên kết (khi bundle MDM lỗi). */
  suppressStaffIdentityBanner?: boolean;
}

const CACH_THUC_GIAM_SAT_OPTIONS = [
  "Giám sát trực tiếp tại chỗ",
  "Giám sát trực tiếp qua camera",
  "Giám sát lại qua camera",
] as const;

const normalize = (v: string | null | undefined) =>
  String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const isNetworkRole = (roleName: string | null | undefined) => normalize(roleName).includes("mang luoi");

function inferHinhThuc(
  session: Pick<GiamSatSession, "khoa_id" | "nguoi_giam_sat_id">,
  allNhanSus: NhanSuOption[],
) {
  const selected = allNhanSus.find(
    (ns) => String(ns.id || "") === String(session.nguoi_giam_sat_id || ""),
  );
  if (!selected) return "";
  const networkAtSelectedKhoa = isNetworkRole(selected.vai_tro_he_thong_ksnk) && String(selected.khoa_id || "") === String(session.khoa_id || "");
  return networkAtSelectedKhoa ? HINH_THUC_TU_GIAM_SAT : HINH_THUC_KHACH_QUAN;
}

export default function GiamSatHeaderFields({
  session,
  setSession,
  khoas,
  khuVucs,
  allNhanSus,
  historyLocations,
  historyLocationRows,
  deferLocationHistoryUntilTyped = false,
  loading,
  lockedSupervisorHoSoId,
  suppressStaffIdentityBanner = false,
}: GiamSatHeaderFieldsProps) {
  const locked = String(lockedSupervisorHoSoId || "").trim();
  const { isAdmin, loading: permLoading } = usePermission();

  const locationPoolByKhoa = useMemo(() => {
    const kid = String(session.khoa_id || "").trim();
    if (historyLocationRows && historyLocationRows.length > 0) {
      const rows = kid
        ? historyLocationRows.filter((r) => r.khoa_id && r.khoa_id === kid)
        : historyLocationRows;
      return Array.from(new Set(rows.map((r) => r.vi_tri_cu_the).filter(Boolean)));
    }
    return historyLocations;
  }, [historyLocationRows, historyLocations, session.khoa_id]);

  const locationChipsSource = useMemo(() => {
    if (!deferLocationHistoryUntilTyped) return locationPoolByKhoa;
    const q = String(session.vi_tri || "").trim();
    if (!q) return [];
    const nq = normalize(q);
    return locationPoolByKhoa.filter((loc) => normalize(loc).includes(nq));
  }, [deferLocationHistoryUntilTyped, locationPoolByKhoa, session.vi_tri]);
  /** Tránh flash: khi bundle MDM chưa trả `currentHoSoId`, tạm coi là chưa biết — không hiện banner QT/chọn người. */
  const headerIdentityReady = !loading && !permLoading;

  useEffect(() => {
    if (!locked) return;
    setSession((prev) => {
      if (prev.nguoi_giam_sat_id === locked) return prev;
      const next = { ...prev, nguoi_giam_sat_id: locked };
      return {
        ...next,
        hinh_thuc_giam_sat: inferHinhThuc(next, allNhanSus),
        cach_thuc_giam_sat: prev.cach_thuc_giam_sat || "Giám sát trực tiếp tại chỗ",
      };
    });
  }, [locked, setSession, allNhanSus]);

  return (
    <div className="min-w-0 space-y-5">
      {/* 
        Người giám sát Flow:
        1. Nếu đã liên kết: Ẩn (đã khóa theo hồ sơ).
        2. Nếu chưa liên kết + Admin: Cho phép chọn người giám sát bất kỳ.
        3. Nếu chưa liên kết + User: Hiện cảnh báo yêu cầu liên kết.
      */}
      {!locked && headerIdentityReady && !suppressStaffIdentityBanner && (
        <div className={`p-4 rounded-2xl border-2 transition-all ${
          isAdmin ? "bg-indigo-50 border-indigo-100 shadow-sm" : "bg-amber-50 border-amber-100 animate-in fade-in slide-in-from-top-1"
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-xl ${isAdmin ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"}`}>
              {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className={`text-[11px] font-black uppercase tracking-tight mb-0.5 ${isAdmin ? "text-indigo-800" : "text-amber-800"}`}>
                  {isAdmin ? "🔧 Chế độ Quản trị viên (Hệ thống)" : "⚠️ Tài khoản chưa liên kết hồ sơ"}
                </p>
                <p className={`text-[10px] font-bold leading-tight ${isAdmin ? "text-indigo-700" : "text-amber-700"}`}>
                  {isAdmin 
                    ? "Bạn đang truy cập với quyền Quản trị. Để thực hiện các thao tác ghi nhận dữ liệu (Giám sát), vui lòng chọn một nhân sự đại diện dưới đây."
                    : "Tài khoản của bạn chưa được liên kết với hồ sơ nhân sự. Vui lòng liên kết để thực hiện các nghiệp vụ giám sát chuyên sâu."}
                </p>
              </div>

              {isAdmin ? (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Chọn người thực hiện giám sát</label>
                  <SearchableSelect
                    value={session.nguoi_giam_sat_id}
                    onChange={(val) => setSession(prev => ({ 
                      ...prev, 
                      nguoi_giam_sat_id: val,
                      hinh_thuc_giam_sat: inferHinhThuc({ ...prev, nguoi_giam_sat_id: val }, allNhanSus)
                    }))}
                    options={allNhanSus.map(ns => ({
                      id: String(ns.id),
                      label: String(ns.ho_ten || ""),
                      keywords: [String(ns.ma_nv || "")]
                    }))}
                    placeholder="Tìm nhân sự thực hiện..."
                    className="h-10 bg-white"
                  />
                </div>
              ) : (
                <button 
                  onClick={() => window.location.href = "/quan-tri-he-thong/tai-khoan-nhan-su"}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[10px] font-bold hover:bg-amber-700 transition-colors shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Đi đến trang liên kết hồ sơ
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white p-3 shadow-sm sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
          <div className="flex h-full min-h-0 min-w-0 flex-col gap-1.5 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">1. Khoa</label>
            <SearchableSelect
              value={session.khoa_id}
              onChange={(nextKhoaId) =>
                setSession({
                  ...session,
                  khoa_id: nextKhoaId,
                  nhan_vien_id: "",
                  hinh_thuc_giam_sat: inferHinhThuc({ ...session, khoa_id: nextKhoaId }, allNhanSus),
                })
              }
              options={khoas.map((k) => ({
                id: String(k.id),
                label: String(k.ten_danh_muc || ""),
                keywords: [String(k.ma_danh_muc || ""), String(k.loai_danh_muc || "")],
              }))}
              placeholder={loading ? "Đang tải..." : "Chọn Khoa..."}
              searchPlaceholder="Tìm khoa..."
              disabled={loading}
            />
          </div>

          <div className="flex h-full min-h-0 min-w-0 flex-col gap-1.5 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">2. Khu vực</label>
            <SearchableSelect
              value={session.khu_vuc_id}
              onChange={(nextKhuVucId) => setSession({ ...session, khu_vuc_id: nextKhuVucId })}
              options={khuVucs.map((kv) => ({
                id: String(kv.id),
                label: String(kv.ten_danh_muc || ""),
                keywords: [String(kv.ma_danh_muc || ""), String(kv.loai_danh_muc || "")],
              }))}
              placeholder={loading ? "Đang tải..." : "Chọn Khu vực..."}
              searchPlaceholder="Tìm khu vực..."
              disabled={loading}
            />
            {!loading && khuVucs.length === 0 && (
              <div className="mt-1 space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-2">
                <p className="text-[9px] font-semibold leading-snug text-amber-700">
                  Chưa có khu vực trong <code className="text-[8px]">dm_khu_vuc_giam_sat</code>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = getDanhMucAdminPath("KHU_VUC_GIAM_SAT");
                  }}
                  className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-amber-600 px-2 text-[9px] font-bold text-white hover:bg-amber-700 transition-colors"
                >
                  Khai báo khu vực
                </button>
              </div>
            )}
          </div>

          <div className="flex h-full min-h-0 min-w-0 flex-col gap-1.5 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:col-span-2 lg:col-span-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">3. Vị trí</label>
            <input
              className="input h-11 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 text-sm font-bold text-slate-700 transition-all outline-none focus:border-[#026f17] focus:bg-white lg:h-12 lg:rounded-2xl lg:px-4"
              placeholder={
                deferLocationHistoryUntilTyped
                  ? "Gõ vị trí; gợi ý khi có chữ"
                  : "Phòng, giường, khu…"
              }
              autoComplete="off"
              value={session.vi_tri}
              onChange={(e) => {
                const nextVal = e.target.value;
                setSession((prev) => ({ ...prev, vi_tri: nextVal }));
              }}
            />
            {String(session.khoa_id || "").trim() &&
            historyLocationRows &&
            historyLocationRows.length > 0 &&
            locationPoolByKhoa.length === 0 ? (
              <p className="text-[9px] leading-snug text-slate-500">
                Chưa có vị trí đã lưu cho khoa này — gõ tay.
              </p>
            ) : null}
            {deferLocationHistoryUntilTyped &&
            String(session.vi_tri || "").trim() &&
            locationPoolByKhoa.length > 0 &&
            locationChipsSource.length === 0 ? (
              <p className="text-[9px] leading-snug text-slate-500">Không trùng từ khóa — gõ tay nếu cần.</p>
            ) : null}
            {locationChipsSource.length > 0 ? (
              <div className="min-w-0 space-y-1 rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                <p className="px-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-400">Gợi ý</p>
                <div className="flex max-h-[8.5rem] min-h-0 flex-wrap gap-1 overflow-y-auto overscroll-contain custom-scrollbar">
                  {locationChipsSource.slice(0, 80).map((loc, idx) => (
                    <button
                      key={`${idx}-${loc.slice(0, 48)}`}
                      type="button"
                      className="max-w-full truncate rounded-md border border-slate-200 bg-white px-2 py-0.5 text-left text-[9px] font-semibold text-slate-700 shadow-sm transition-colors hover:border-[#026f17]/40 hover:bg-[#026f17]/5"
                      title={loc}
                      onClick={() => setSession((prev) => ({ ...prev, vi_tri: loc }))}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
                {locationChipsSource.length > 80 ? (
                  <p className="px-0.5 text-[8px] text-slate-400">80 / {locationChipsSource.length}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex h-full min-h-0 min-w-0 flex-col gap-1.5 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:col-span-2 lg:col-span-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">4. Cách thức</label>
            <SearchableSelect
              value={session.cach_thuc_giam_sat || ""}
              onChange={(nextCachThuc) =>
                setSession((prev) => ({
                  ...prev,
                  cach_thuc_giam_sat: nextCachThuc,
                }))
              }
              options={CACH_THUC_GIAM_SAT_OPTIONS.map((ct) => ({ id: ct, label: ct, keywords: [ct.replaceAll("Giám sát", "").trim()] }))}
              placeholder="-- Chọn --"
              searchPlaceholder="Tìm…"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {isReplayCameraSupervisionCachThuc(session.cach_thuc_giam_sat) ? (
        <div className="space-y-3 rounded-2xl border-2 border-amber-200/80 bg-amber-50/50 p-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
          <p className="md:col-span-3 text-[10px] font-black uppercase tracking-widest text-amber-800">
            Giám sát lại qua camera — nhập một lần cho cả phiên (không nhập lại từng cơ hội)
          </p>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ngày giám sát</label>
            <input
              type="date"
              className="input h-11 w-full rounded-xl border-2 border-slate-100 bg-white px-3 text-xs font-bold text-slate-800"
              value={session.ngay_giam_sat || ""}
              onChange={(e) => {
                const v = e.target.value;
                setSession((prev) => {
                  const tBat = timeLocalHmFromIso(prev.thoi_gian_bat_dau);
                  const tKt = timeLocalHmFromIso(prev.thoi_gian_ket_thuc);
                  const isoBat = tBat ? combineLocalNgayAndTime(v, tBat) : undefined;
                  const isoKt = tKt ? combineLocalNgayAndTime(v, tKt) : undefined;
                  return {
                    ...prev,
                    ngay_giam_sat: v,
                    ...(isoBat ? { thoi_gian_bat_dau: isoBat } : {}),
                    ...(isoKt ? { thoi_gian_ket_thuc: isoKt } : {}),
                  };
                });
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Từ giờ</label>
            <input
              type="time"
              step={60}
              className="input h-11 w-full rounded-xl border-2 border-slate-100 bg-white px-3 text-xs font-bold text-slate-800"
              value={timeLocalHmFromIso(session.thoi_gian_bat_dau)}
              onChange={(e) => {
                setSession((prev) => {
                  const iso = combineLocalNgayAndTime(prev.ngay_giam_sat || "", e.target.value);
                  if (!iso) return prev;
                  return { ...prev, thoi_gian_bat_dau: iso };
                });
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Đến giờ</label>
            <input
              type="time"
              step={60}
              className="input h-11 w-full rounded-xl border-2 border-slate-100 bg-white px-3 text-xs font-bold text-slate-800"
              value={timeLocalHmFromIso(session.thoi_gian_ket_thuc)}
              onChange={(e) => {
                setSession((prev) => {
                  const iso = combineLocalNgayAndTime(prev.ngay_giam_sat || "", e.target.value);
                  if (!iso) return prev;
                  return { ...prev, thoi_gian_ket_thuc: iso };
                });
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
