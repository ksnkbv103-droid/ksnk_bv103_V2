// src/components/shared/GiamSatHeaderFields.tsx
"use client";

import React, { useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { usePermission } from "@/hooks/usePermission";
import { AlertCircle, UserPlus, ShieldCheck } from "lucide-react";
import type { MasterOption } from "@/lib/master-data/gateway";
import type { VstSessionLocationHistoryRow } from "@/modules/quan-tri-he-thong/danh-muc/actions/master-data-gateway.actions";
import {
  HINH_THUC_CHUYEN_TRACH,
  HINH_THUC_GIAM_SAT_CHEO,
  HINH_THUC_TU_GIAM_SAT,
} from "@/lib/supervision-policy";
import {
  combineLocalNgayAndTime,
  isReplayCameraSupervisionCachThuc,
  timeLocalHmFromIso,
} from "@/lib/supervision-session-time";
import type { GiamSatSession, NhanSuOption } from "./giam-sat-header.types";
import SearchableSelect from "./SearchableSelect";
import RegistrySelect from "./RegistrySelect";
import {
  buildKhuVucGroupedSelectOptions,
  filterKhuVucsForKhoa,
  khuVucZoneBadgeClass,
  KHU_VUC_ZONE_LABELS,
  zoneFromKhuVucMa,
  type KhuVucZoneCode,
} from "@/lib/khu-vuc-giam-sat-ui";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

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
  /** Context module để áp dụng giá trị mặc định (vst | gsc) */
  moduleContext?: "vst" | "gsc";
  hinhThucGiamSats?: MasterOption[];
  cachThucGiamSats?: MasterOption[];
}

const normalize = (v: string | null | undefined) =>
  String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const isKsnkDepartment = (khoaName: string | null | undefined) => {
  const n = normalize(khoaName);
  return n.includes("kiem soat nhiem khuan") || n.includes("ksnk");
};

const isNetworkRoleLabel = (roleName: string | null | undefined) => normalize(roleName).includes("mang luoi");

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
  moduleContext = "vst",
  hinhThucGiamSats = [],
  cachThucGiamSats = [],
}: GiamSatHeaderFieldsProps) {
  const locked = String(lockedSupervisorHoSoId || "").trim();
  const { isAdmin, loading: permLoading } = usePermission();

  const supervisorProfile = useMemo(() => {
    return allNhanSus.find((ns: NhanSuOption) => String(ns.id || "") === String(session.nguoi_giam_sat_id || ""));
  }, [allNhanSus, session.nguoi_giam_sat_id]);

  const isKsnkStaff = useMemo(() => {
    if (!supervisorProfile) return false;
    const khoa = khoas.find((k: MasterOption) => k.id === supervisorProfile.khoa_id);
    return isKsnkDepartment(khoa?.ten_danh_muc);
  }, [supervisorProfile, khoas]);

  const isNetworkStaff = useMemo(() => {
    if (!supervisorProfile) return false;
    return isNetworkRoleLabel(supervisorProfile.vai_tro_he_thong_ksnk as string);
  }, [supervisorProfile]);

  // === Tự động derive hình thức giám sát ===
  const derivedHinhThuc = useMemo((): { label: string; dmRow: (typeof hinhThucGiamSats)[number] | undefined } => {
    const supervisorKhoaId = String(supervisorProfile?.khoa_id || "").trim();
    const selectedKhoaId = String(session.khoa_id || "").trim();
    const isCrossKhoa = Boolean(
      selectedKhoaId && supervisorKhoaId && supervisorKhoaId !== selectedKhoaId,
    );
    const isNetworkAtKhoa = Boolean(isNetworkStaff && selectedKhoaId && supervisorKhoaId === selectedKhoaId);

    let label: string;
    if (isNetworkAtKhoa) {
      label = HINH_THUC_TU_GIAM_SAT;
    } else if (isKsnkStaff) {
      label = isCrossKhoa ? HINH_THUC_CHUYEN_TRACH : HINH_THUC_TU_GIAM_SAT;
    } else if (isCrossKhoa) {
      label = HINH_THUC_GIAM_SAT_CHEO;
    } else {
      label = HINH_THUC_TU_GIAM_SAT;
    }
    const dmRow = hinhThucGiamSats.find((h) => h.ten_danh_muc === label);
    return { label, dmRow };
  }, [supervisorProfile, session.khoa_id, isKsnkStaff, isNetworkStaff, hinhThucGiamSats]);

  const locationPoolByKhoa = useMemo(() => {
    const kid = String(session.khoa_id || "").trim();
    if (historyLocationRows && historyLocationRows.length > 0) {
      const rows = kid ? historyLocationRows.filter((r: VstSessionLocationHistoryRow) => r.khoa_id && r.khoa_id === kid) : historyLocationRows;
      return Array.from(new Set(rows.map((r: VstSessionLocationHistoryRow) => r.vi_tri_cu_the).filter(Boolean))) as string[];
    }
    return historyLocations;
  }, [historyLocationRows, historyLocations, session.khoa_id]);

  const locationChipsSource = useMemo(() => {
    if (!deferLocationHistoryUntilTyped) return locationPoolByKhoa;
    const q = String(session.vi_tri || "").trim();
    if (!q) return [];
    const nq = normalize(q);
    return locationPoolByKhoa.filter((loc: string) => normalize(loc).includes(nq));
  }, [deferLocationHistoryUntilTyped, locationPoolByKhoa, session.vi_tri]);

  const selectedKhoa = useMemo(() => {
    if (!session.khoa_id) return null;
    return khoas.find((k) => k.id === session.khoa_id);
  }, [khoas, session.khoa_id]);

  const filteredKhuVucs = useMemo(() => {
    if (!session.khoa_id || khuVucs.length === 0) return khuVucs;

    const allowedRaw = selectedKhoa?.specs?.allowed_khu_vucs;
    const allowedKhuVucs = Array.isArray(allowedRaw)
      ? allowedRaw.map((x: string) => String(x || "").toUpperCase())
      : null;

    return filterKhuVucsForKhoa(khuVucs, allowedKhuVucs);
  }, [khuVucs, session.khoa_id, selectedKhoa]);

  const khuVucSelectOptions = useMemo(() => buildKhuVucGroupedSelectOptions(filteredKhuVucs), [filteredKhuVucs]);

  const selectedKhuVucZone = useMemo(() => {
    const row = filteredKhuVucs.find((kv) => String(kv.id) === String(session.khu_vuc_id || ""));
    if (!row) return null;
    const zone = zoneFromKhuVucMa(row.ma_danh_muc || "", row.nhom_mau);
    if (!(zone in KHU_VUC_ZONE_LABELS)) return null;
    return zone as KhuVucZoneCode;
  }, [filteredKhuVucs, session.khu_vuc_id]);

  const headerIdentityReady = !loading && !permLoading;

  // Tự động sync hình thức giám sát + gợi ý cách thức ban đầu
  useEffect(() => {
    if (loading || !supervisorProfile) return;

    setSession((prev: GiamSatSession) => {
      // Hình thức: luôn sync theo derive (không cho chọn tay)
      const nextHinhThucId = derivedHinhThuc.dmRow?.id || prev.hinh_thuc_id;

      // Cách thức: chỉ gợi ý ban đầu khi trường trống
      let nextCachThucId = prev.cach_thuc_id;
      const cameraVst = cachThucGiamSats.find(c => c.ten_danh_muc === "Giám sát trực tiếp qua camera");
      const tạiChỗ = cachThucGiamSats.find(c => c.ten_danh_muc === "Giám sát trực tiếp tại chỗ");
      if (!prev.cach_thuc_id) {
        if (isKsnkStaff && moduleContext === "vst" && cameraVst) nextCachThucId = cameraVst.id;
        else if (tạiChỗ) nextCachThucId = tạiChỗ.id;
      }

      if (nextHinhThucId === prev.hinh_thuc_id && nextCachThucId === prev.cach_thuc_id) return prev;
      return { ...prev, hinh_thuc_id: nextHinhThucId, cach_thuc_id: nextCachThucId };
    });
  }, [loading, supervisorProfile, isKsnkStaff, derivedHinhThuc, moduleContext, cachThucGiamSats, setSession]);

  useEffect(() => {
    if (!locked) return;
    setSession((prev: GiamSatSession) => {
      if (prev.nguoi_giam_sat_id === locked) return prev;
      return { ...prev, nguoi_giam_sat_id: locked };
    });
  }, [locked, setSession]);

  // Tự động reset khu_vuc_id nếu khu vực đang chọn không còn hợp lệ ở khoa mới
  useEffect(() => {
    if (loading || khuVucs.length === 0 || !session.khoa_id || !session.khu_vuc_id) return;

    const isValid = filteredKhuVucs.some((kv) => String(kv.id) === String(session.khu_vuc_id));
    if (!isValid) {
      setSession((prev: GiamSatSession) => ({ ...prev, khu_vuc_id: "" }));
    }
  }, [session.khoa_id, session.khu_vuc_id, filteredKhuVucs, khuVucs.length, loading, setSession]);

  return (
    <div className="min-w-0 space-y-4">
      {!locked && headerIdentityReady && !suppressStaffIdentityBanner && (
        <div
          className={`rounded-lg border px-3 py-3 sm:px-4 ${
            isAdmin ? "border-indigo-200/80 bg-indigo-50/70" : "border-amber-200/80 bg-amber-50/70"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`shrink-0 rounded-md p-1.5 ${isAdmin ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"}`}
            >
              {isAdmin ? <ShieldCheck className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <p className={`mb-0.5 ${T.sectionTitle} ${isAdmin ? "text-indigo-900" : "text-amber-900"}`}>
                  {isAdmin ? "Chế độ Quản trị viên (Hệ thống)" : "Tài khoản chưa liên kết hồ sơ"}
                </p>
                <p className={`text-[11px] font-medium leading-snug ${isAdmin ? "text-indigo-800" : "text-amber-800"}`}>
                  {isAdmin
                    ? "Bạn đang truy cập với quyền Quản trị. Để thực hiện các thao tác ghi nhận dữ liệu (Giám sát), vui lòng chọn một nhân sự đại diện dưới đây."
                    : "Tài khoản của bạn chưa được liên kết với hồ sơ nhân sự. Vui lòng liên kết để thực hiện các nghiệp vụ giám sát chuyên sâu."}
                </p>
              </div>

              {isAdmin ? (
                <div className="space-y-1 pt-0.5">
                  <label className={`block ${C.labelField} text-indigo-700`}>Chọn người thực hiện giám sát</label>
                  <RegistrySelect
                    loaiDanhMuc="NHAN_SU"
                    value={session.nguoi_giam_sat_id}
                    onChange={(val: string) => setSession((prev: GiamSatSession) => ({ ...prev, nguoi_giam_sat_id: val }))}
                    staticOptions={allNhanSus.map((ns: NhanSuOption) => ({
                      id: String(ns.id),
                      label: String(ns.ho_ten || ""),
                      ma: String(ns.ma_nv || ""),
                      keywords: [String(ns.ma_nv || "")],
                    }))}
                    placeholder="Tìm nhân sự thực hiện..."
                    searchPlaceholder="Tìm nhân sự..."
                    className="h-10 bg-white"
                    searchable={true}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/quan-tri-he-thong/tai-khoan-nhan-su")}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-amber-700"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Đi đến trang liên kết hồ sơ
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="min-w-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-x-4 xl:gap-y-4">
          <div id="vst-khoa-select" className="flex min-h-0 min-w-0 flex-col gap-1">
            <label className={C.labelField}>1. Khoa</label>
            <RegistrySelect
              loaiDanhMuc="KHOA_PHONG"
              value={session.khoa_id}
              onChange={(nextKhoaId: string) =>
                setSession((prev: GiamSatSession) => ({
                  ...prev,
                  khoa_id: nextKhoaId,
                  nhan_vien_id: "",
                }))
              }
              staticOptions={khoas.map((k: MasterOption) => ({
                id: String(k.id),
                label: String(k.ten_danh_muc || ""),
                ma: String(k.ma_danh_muc || ""),
                keywords: [String(k.ma_danh_muc || ""), String(k.loai_danh_muc || "")],
              }))}
              placeholder={loading ? "Đang tải..." : "Chọn Khoa..."}
              searchPlaceholder="Tìm khoa..."
              disabled={loading}
              searchable={true}
            />
          </div>

          <div className="flex min-h-0 min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <label className={C.labelField}>2. Chức năng phòng</label>
              {selectedKhuVucZone ? (
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${khuVucZoneBadgeClass(selectedKhuVucZone)}`}
                  title={KHU_VUC_ZONE_LABELS[selectedKhuVucZone]}
                >
                  {selectedKhuVucZone}
                </span>
              ) : null}
            </div>
            <RegistrySelect
              loaiDanhMuc="KHU_VUC_GIAM_SAT"
              value={session.khu_vuc_id}
              onChange={(nextKhuVucId: string) => setSession((prev: GiamSatSession) => ({ ...prev, khu_vuc_id: nextKhuVucId }))}
              staticOptions={khuVucSelectOptions}
              placeholder={loading ? "Đang tải..." : "Chọn chức năng phòng..."}
              searchPlaceholder="Tìm chức năng phòng..."
              disabled={loading}
              searchable={true}
            />
          </div>

          <div className="flex min-h-0 min-w-0 flex-col gap-1">
            <label className={C.labelField}>3. Số phòng / vị trí</label>
            <input
              className={C.controlInput}
              placeholder={deferLocationHistoryUntilTyped ? "Gõ số phòng; gợi ý khi có chữ" : "Số phòng, giường, khu…"}
              autoComplete="off"
              value={session.vi_tri}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const nextVal = e.target.value;
                setSession((prev: GiamSatSession) => ({ ...prev, vi_tri: nextVal }));
              }}
            />
            {locationChipsSource.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {locationChipsSource.slice(0, 5).map((loc: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSession((prev: GiamSatSession) => ({ ...prev, vi_tri: loc }))}
                    className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
                  >
                    {loc}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex min-h-0 min-w-0 flex-col gap-1">
            <label className={C.labelField}>4. Cách thức</label>
            <RegistrySelect
              loaiDanhMuc="CACH_THUC_GIAM_SAT"
              value={session.cach_thuc_id || ""}
              onChange={(nextId: string) => setSession((prev: GiamSatSession) => ({ ...prev, cach_thuc_id: nextId }))}
              staticOptions={cachThucGiamSats.map((ct) => ({
                id: ct.id,
                label: ct.ten_danh_muc,
                ma: ct.ma_danh_muc,
                keywords: [ct.ten_danh_muc.replaceAll("Giám sát", "").trim()],
              }))}
              placeholder="Chọn cách thức..."
              disabled={loading}
              searchable
            />
          </div>
        </div>
      </div>

      {isReplayCameraSupervisionCachThuc(
        cachThucGiamSats.find(c => c.id === session.cach_thuc_id)?.ten_danh_muc
      ) && (
        <div className="space-y-3 rounded-lg border border-amber-200/70 bg-amber-50/40 p-3 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
          <p className={`md:col-span-3 ${T.sectionTitle} text-amber-900`}>
            Giám sát lại qua camera — nhập một lần cho cả phiên (không nhập lại từng cơ hội)
          </p>
          <div className="space-y-1.5">
            <label className={C.labelField}>Ngày giám sát</label>
            <input
              type="date"
              className={C.controlInput}
              value={session.ngay_giam_sat || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const v = e.target.value;
                setSession((prev: GiamSatSession) => {
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
          <div className="space-y-1.5">
            <label className={C.labelField}>Từ giờ</label>
            <input
              type="time"
              step={60}
              className={C.controlInput}
              value={timeLocalHmFromIso(session.thoi_gian_bat_dau)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSession((prev: GiamSatSession) => {
                  const iso = combineLocalNgayAndTime(prev.ngay_giam_sat || "", e.target.value);
                  if (!iso) return prev;
                  return { ...prev, thoi_gian_bat_dau: iso };
                });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className={C.labelField}>Đến giờ</label>
            <input
              type="time"
              step={60}
              className={C.controlInput}
              value={timeLocalHmFromIso(session.thoi_gian_ket_thuc)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSession((prev: GiamSatSession) => {
                  const iso = combineLocalNgayAndTime(prev.ngay_giam_sat || "", e.target.value);
                  if (!iso) return prev;
                  return { ...prev, thoi_gian_ket_thuc: iso };
                });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
