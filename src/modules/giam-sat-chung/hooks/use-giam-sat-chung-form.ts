"use client";

import { useState, useEffect, useMemo, type SetStateAction } from "react";
import type { GiamSatSession } from "@/components/shared/giam-sat-header.types";
import type { ChecklistResult, ChecklistTemplate } from "@/types/giam-sat-chung";
import { saveGiamSatChung } from "../actions/giam-sat-chung.actions";
import type { GscSessionInput } from "../actions/giam-sat-chung-write-helpers";
import { loadGscTemplateOptions, switchGscTemplateByBangKiemId, type GscTemplateOption } from "../lib/gsc-form-template-sync";
import { toast } from "sonner";
import { useGiamSatHeader } from "@/hooks/useGiamSatHeader";
import { mergeGscSessionWithDbPrintLabels, snapshotGscSessionForPrint } from "../lib/gsc-session-labels";
import { useGscDbPrintLabels } from "./use-gsc-db-print-labels";
import { formatUnknownError } from "@/lib/supabase-error-message";
import { isReplayCameraSupervisionCachThuc } from "@/lib/supervision-session-time";
import {
  enqueueOfflineGscSave,
  isLikelyOfflineOrNetworkFailure,
} from "@/lib/offline-pending-supervision-save";

function hasSessionDiff(
  prev: Record<string, unknown>,
  nextPatch: Record<string, unknown>,
): boolean {
  for (const [key, nextValue] of Object.entries(nextPatch)) {
    if (prev[key] !== nextValue) return true;
  }
  return false;
}

export function useGiamSatChungForm(
  initialTemplate: ChecklistTemplate,
  onSuccess: () => void,
  opts?: {
    editPayload?: {
      session: Partial<GiamSatSession>;
      results: ChecklistResult[];
    } | null;
    editingSessionId?: string | null;
  },
) {
  const [template, setTemplate] = useState(initialTemplate);
  const [dbTemplates, setDbTemplates] = useState<GscTemplateOption[]>([]);
  const {
    khoas,
    khuVucs,
    loading: headerLoading,
    selectedKhoa,
    setSelectedKhoa,
    selectedKhuVuc,
    setSelectedKhuVuc,
    ngayGiamSat,
    setNgayGiamSat,
    ngheNghieps,
    hinhThucGiamSats,
    cachThucGiamSats,
    nhanSus,
    historyLocations,
    historyLocationRows,
    currentHoSoId,
  } = useGiamSatHeader("gsc", true);

  const editSession = opts?.editPayload?.session;
  const editResults = opts?.editPayload?.results;

  const [session, setSession] = useState({
    vi_tri: "",
    hinh_thuc_giam_sat: "Giám sát chuyên trách",
    cach_thuc_giam_sat: "Giám sát trực tiếp tại chỗ",
    nguoi_giam_sat_id: "",
    is_giam_sat_ca_nhan: false,
    nghe_nghiep_id: "",
    nhan_vien_id: "",
    is_manual_nhan_vien: false,
    ten_manual_nhan_vien: "",
    is_bo_sung_nguoi_benh: false,
    ma_nguoi_benh: "",
    ten_nguoi_benh: "",
    so_giuong_nguoi_benh: "",
    ghi_chu_chung: "",
    thoi_gian_bat_dau: "" as string | undefined,
    thoi_gian_ket_thuc: "" as string | undefined,
  });

  const [results, setResults] = useState<ChecklistResult[]>(
    initialTemplate.criteria.map((c) => ({ criterionId: c.id, value: "NA" })),
  );

  // Prefill khi ở chế độ sửa.
  useEffect(() => {
    if (!editSession) return;
    const s = editSession as Partial<GiamSatSession>;
    if (s.khoa_id !== undefined) setSelectedKhoa(String(s.khoa_id ?? ""));
    if (s.khu_vuc_id !== undefined) setSelectedKhuVuc(String(s.khu_vuc_id ?? ""));
    if (s.ngay_giam_sat !== undefined) setNgayGiamSat(String(s.ngay_giam_sat ?? ""));

    setSession((prev) => ({
      ...prev,
      vi_tri: String(s.vi_tri ?? ""),
      hinh_thuc_giam_sat: String(s.hinh_thuc_giam_sat ?? prev.hinh_thuc_giam_sat ?? "Giám sát chuyên trách"),
      cach_thuc_giam_sat: String(s.cach_thuc_giam_sat ?? prev.cach_thuc_giam_sat ?? "Giám sát trực tiếp tại chỗ"),
      nguoi_giam_sat_id: String(s.nguoi_giam_sat_id ?? prev.nguoi_giam_sat_id ?? ""),
      is_giam_sat_ca_nhan: Boolean(s.is_giam_sat_ca_nhan),
      nghe_nghiep_id: String(s.nghe_nghiep_id ?? ""),
      nhan_vien_id: String(s.nhan_vien_id ?? ""),
      is_manual_nhan_vien: Boolean(s.is_manual_nhan_vien),
      ten_manual_nhan_vien: String(s.ten_manual_nhan_vien ?? ""),
      ghi_chu_chung: String(s.ghi_chu_chung ?? ""),
      thoi_gian_bat_dau: s.thoi_gian_bat_dau,
      thoi_gian_ket_thuc: s.thoi_gian_ket_thuc,
      is_bo_sung_nguoi_benh: Boolean(s.is_bo_sung_nguoi_benh),
      ma_nguoi_benh: String(s.ma_nguoi_benh ?? ""),
      ten_nguoi_benh: String(s.ten_nguoi_benh ?? ""),
      so_giuong_nguoi_benh: String(s.so_giuong_nguoi_benh ?? ""),
    }));
  }, [editSession, setSelectedKhoa, setSelectedKhuVuc, setNgayGiamSat]);

  useEffect(() => {
    if (!editResults || !Array.isArray(editResults) || editResults.length === 0) return;
    const m = new Map(editResults.map((r) => [String(r.criterionId), r]));
    setResults(
      template.criteria.map((c) => {
        const r = m.get(c.id);
        return {
          criterionId: c.id,
          value: (r?.value === "DAT" || r?.value === "KHONG_DAT" || r?.value === "NA" ? r.value : "NA") as
            | "DAT"
            | "KHONG_DAT"
            | "NA",
          note: r?.note ?? null,
        };
      }),
    );
  }, [editResults, template.criteria, template]);
  const [loading, setLoading] = useState(false);
  const dbPrintLabels = useGscDbPrintLabels({
    khoa_id: selectedKhoa,
    khu_vuc_id: selectedKhuVuc,
    nhan_vien_id: session.nhan_vien_id,
    nghe_nghiep_id: session.nghe_nghiep_id,
    nguoi_giam_sat_id: session.nguoi_giam_sat_id,
  });

  useEffect(() => {
    if (!currentHoSoId) return;
    setSession((prev) => ({
      ...prev,
      nguoi_giam_sat_id: prev.nguoi_giam_sat_id || currentHoSoId,
    }));
  }, [currentHoSoId]);

  useEffect(() => {
    void loadGscTemplateOptions().then(setDbTemplates);
  }, []);

  const handleSwitchTemplate = async (bkId: string) => {
    setLoading(true);
    const out = await switchGscTemplateByBangKiemId(bkId, dbTemplates);
    setLoading(false);
    if (!out.ok) {
      toast.error(out.error);
      return;
    }
    setTemplate(out.template);
    setResults(out.results);
    toast.success("Đã chuyển mẫu: " + out.template.title);
  };

  const handleSave = async () => {
    if (!selectedKhoa || !selectedKhuVuc) {
      toast.error("Vui lòng chọn Khoa và Khu vực");
      return;
    }
    const evaluatedCount = results.filter((r) => r.value !== "NA").length;
    if (evaluatedCount === 0) {
      toast.error("Vui lòng đánh giá ít nhất 1 tiêu chí");
      return;
    }
    if (isReplayCameraSupervisionCachThuc(session.cach_thuc_giam_sat)) {
      const bd = String(session.thoi_gian_bat_dau ?? "").trim();
      const kt = String(session.thoi_gian_ket_thuc ?? "").trim();
      if (!bd || !kt) {
        toast.error("Giám sát lại qua camera: nhập đủ Ngày giám sát và khung giờ Từ – Đến ở phần đầu phiên.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        ...session,
        khoa_id: selectedKhoa,
        khu_vuc_id: selectedKhuVuc,
        ngay_giam_sat: ngayGiamSat,
        loai_bang_kiem: template.id,
      } as GscSessionInput;
      const sid = String(opts?.editingSessionId ?? "").trim();

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueueOfflineGscSave({
          session: payload,
          results,
          existingSessionId: sid || null,
        });
        toast.message(
          "Đã lưu vào hàng đợi ngoại tuyến. Hệ thống sẽ gửi phiên khi có mạng trở lại (tự động hoặc khi bạn mở lại ứng dụng).",
        );
        return;
      }

      const res = await saveGiamSatChung(payload, results, sid ? { existingSessionId: sid } : undefined);
      if (res.success) {
        toast.success(sid ? "Đã cập nhật phiên giám sát." : "Đã lưu kết quả!");
        onSuccess();
      } else toast.error("Lỗi: " + res.error);
    } catch (error: unknown) {
      if (isLikelyOfflineOrNetworkFailure(error)) {
        const payload = {
          ...session,
          khoa_id: selectedKhoa,
          khu_vuc_id: selectedKhuVuc,
          ngay_giam_sat: ngayGiamSat,
          loai_bang_kiem: template.id,
        } as GscSessionInput;
        const sid = String(opts?.editingSessionId ?? "").trim();
        enqueueOfflineGscSave({
          session: payload,
          results,
          existingSessionId: sid || null,
        });
        toast.message("Mạng không ổn định — đã giữ phiên trong hàng đợi ngoại tuyến để gửi sau.");
      } else {
        toast.error("Lỗi: " + formatUnknownError(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const score = Math.round(
    (results.filter((r) => r.value === "DAT").length / Math.max(1, results.filter((r) => r.value !== "NA").length)) *
      100,
  );

  const sessionForPrint = useMemo(() => {
    let row = {
      ...session,
      khoa_id: selectedKhoa,
      khu_vuc_id: selectedKhuVuc,
      ngay_giam_sat: ngayGiamSat,
    } as Record<string, unknown>;
    if (dbPrintLabels) row = mergeGscSessionWithDbPrintLabels(row, dbPrintLabels);
    return snapshotGscSessionForPrint(
      row,
      khoas,
      khuVucs,
      ngheNghieps,
      (nhanSus as { id?: string; ho_ten?: string }[]) || [],
    );
  }, [session, selectedKhoa, selectedKhuVuc, ngayGiamSat, khoas, khuVucs, ngheNghieps, nhanSus, dbPrintLabels]);

  const setSessionFromHeader = (action: SetStateAction<GiamSatSession>) => {
    const base: GiamSatSession = {
      ...session,
      khoa_id: selectedKhoa,
      khu_vuc_id: selectedKhuVuc,
      ngay_giam_sat: ngayGiamSat,
    };
    const newVal = typeof action === "function" ? action(base) : action;
    if (newVal.khoa_id !== undefined && newVal.khoa_id !== selectedKhoa) setSelectedKhoa(newVal.khoa_id);
    if (newVal.khu_vuc_id !== undefined && newVal.khu_vuc_id !== selectedKhuVuc) setSelectedKhuVuc(newVal.khu_vuc_id);
    if (newVal.ngay_giam_sat !== undefined && newVal.ngay_giam_sat !== ngayGiamSat) setNgayGiamSat(newVal.ngay_giam_sat);
    const { khoa_id: _khoaId, khu_vuc_id: _khuVucId, ngay_giam_sat: _ngayGiamSat, ...rest } = newVal;
    setSession((prev) => {
      const patch = rest as Record<string, unknown>;
      if (!hasSessionDiff(prev as Record<string, unknown>, patch)) return prev;
      return { ...prev, ...rest };
    });
  };

  return {
    template,
    dbTemplates,
    currentHoSoId,
    session,
    setSession,
    results,
    setResults,
    loading,
    headerLoading,
    selectedKhoa,
    selectedKhuVuc,
    ngayGiamSat,
    khoas,
    khuVucs,
    ngheNghieps,
    hinhThucGiamSats,
    cachThucGiamSats,
    nhanSus,
    historyLocations,
    historyLocationRows,
    handleSwitchTemplate,
    handleSave,
    score,
    sessionForPrint,
    setSessionFromHeader,
  };
}