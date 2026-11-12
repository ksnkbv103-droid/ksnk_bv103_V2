"use client";

import React, { useCallback } from "react";
import type { NkbvBaMultiTimelineWorkspaceProps } from "../components/nkbv-ba-workspace.types";
import { type BaGridCdhaCell } from "../lib/nkbv-ba-grid-engine";
import { DEVICE_CRITERIA_META, isDeviceDateInStay } from "../lib/nkbv-ba-device-timeline";
import type { DeviceCriteriaKey } from "../lib/nkbv-criteria-matrix";
import { softDeleteNkbvBaTimelineByKey, softDeleteNkbvBaTimelineMilestone, toggleNkbvBaNgayDungCu, upsertNkbvBaNgayKhoa, upsertNkbvBaTimelineMilestone } from "../actions/giam-sat-nkbv.actions";
import { toast } from "sonner";
import type { BaWorkspaceSplit } from "./useNkbvBaWorkspaceGridData";

export function useNkbvBaWorkspaceMutations({
  maBenhAn,
  ngayVaoVien,
  ngayRaVien,
  allowedEdit,
  split,
  cdhaList,
  cdhaKey,
  inFlightRef,
  localSsiTc,
  setLocalCdha,
  setLocalSsiTc,
  setKhoaByDate,
  onReload,
  onTimelineUpsertLocal,
  onTimelineRemoveLocal,
}: {
  maBenhAn: string;
  ngayVaoVien: string;
  ngayRaVien: NkbvBaMultiTimelineWorkspaceProps["ngayRaVien"];
  allowedEdit: boolean;
  split: BaWorkspaceSplit;
  cdhaList: BaGridCdhaCell[];
  cdhaKey: (x: Pick<BaGridCdhaCell, "ngay" | "tieu_chuan_key">) => string;
  inFlightRef: React.MutableRefObject<Set<string>>;
  localSsiTc: Array<{ id: string; ngay: string; key: string; label: string }>;
  setLocalCdha: React.Dispatch<React.SetStateAction<BaGridCdhaCell[]>>;
  setLocalSsiTc: React.Dispatch<
    React.SetStateAction<Array<{ id: string; ngay: string; key: string; label: string }>>
  >;
  setKhoaByDate: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onReload: NkbvBaMultiTimelineWorkspaceProps["onReload"];
  onTimelineUpsertLocal: NkbvBaMultiTimelineWorkspaceProps["onTimelineUpsertLocal"];
  onTimelineRemoveLocal: NkbvBaMultiTimelineWorkspaceProps["onTimelineRemoveLocal"];
}) {
  const toggleDevice = async (date: string, key: DeviceCriteriaKey) => {
    if (!allowedEdit) return;
    const meta = DEVICE_CRITERIA_META[key];
    const bucket = split.deviceByDate[meta.bucket];
    const existing = (bucket[date] || [])[0];
    const flightKey = `ct|${date}|${key}`;
    if (inFlightRef.current.has(flightKey)) return;
    if (!existing) {
      const bound = isDeviceDateInStay(date, ngayVaoVien, ngayRaVien);
      if (!bound.ok) {
        toast.error(bound.reason || "Ngày can thiệp ngoài đợt nằm viện");
        return;
      }
    }
    inFlightRef.current.add(flightKey);
    const res = await toggleNkbvBaNgayDungCu({
      ma_benh_an: maBenhAn,
      ngay_lich: date,
      criteria_key: key,
      on: !existing,
    });
    inFlightRef.current.delete(flightKey);
    if (!res.success) {
      toast.error(res.error || "Chưa lưu can thiệp");
      onReload();
      return;
    }
    onReload();
  };

  const changeKhoa = async (date: string, nextKhoaId: string) => {
    if (!allowedEdit) return;
    setKhoaByDate((p) => {
      const n = { ...p };
      if (nextKhoaId) n[date] = nextKhoaId;
      else delete n[date];
      return n;
    });
    const res = await upsertNkbvBaNgayKhoa({
      ma_benh_an: maBenhAn,
      ngay_lich: date,
      khoa_id: nextKhoaId || null,
    });
    if (!res.success) {
      toast.error(res.error || "Chưa lưu khoa");
      onReload();
    }
  };

  const applyUpsertRow = (data: Record<string, unknown> | null | undefined) => {
    if (!data?.id || !onTimelineUpsertLocal) {
      onReload();
      return;
    }
    onTimelineUpsertLocal({
      id: String(data.id),
      milestone_kind: String(data.milestone_kind || ""),
      milestone_date: String(data.milestone_date || "").slice(0, 10),
      title: String(data.title || ""),
      detail: data.detail != null ? String(data.detail) : null,
      specimen_hint: data.specimen_hint != null ? String(data.specimen_hint) : null,
      criteria_key: data.criteria_key != null ? String(data.criteria_key) : null,
    });
  };

  /** Tick CĐHA: chọn = thêm, bỏ chọn = xóa theo khóa (BA+ngày+criteria) — không mở form phân tích. */
  const toggleCdha = async (
    date: string,
    criteriaKey: string,
    title: string,
    milestoneKind: string,
  ) => {
    if (!allowedEdit) return;
    const flightKey = `cdha|${date}|${criteriaKey}`;
    if (inFlightRef.current.has(flightKey)) return;
    const existing = cdhaList.find(
      (x) => x.ngay.slice(0, 10) === date && (x.tieu_chuan_key || "imaging_chest") === criteriaKey,
    );
    if (existing) {
      // Untick: bỏ local ngay + soft-delete TẤT CẢ bản cùng khóa (chống XQ hiện lại)
      inFlightRef.current.add(flightKey);
      setLocalCdha((p) => p.filter((x) => cdhaKey(x) !== `${date}|${criteriaKey}`));
      onTimelineRemoveLocal?.(existing.id);
      // Xóa luôn các id khác cùng khóa còn trong timeline (dữ liệu trùng cũ)
      for (const c of split.cdha) {
        if (
          c.ngay.slice(0, 10) === date &&
          (c.tieu_chuan_key || "imaging_chest") === criteriaKey &&
          c.id !== existing.id
        ) {
          onTimelineRemoveLocal?.(c.id);
        }
      }
      const res = await softDeleteNkbvBaTimelineByKey({
        ma_benh_an: maBenhAn,
        milestone_date: date,
        criteria_key: criteriaKey,
      });
      inFlightRef.current.delete(flightKey);
      if (!res.success) {
        toast.error(res.error || "Không xóa được CĐHA");
        onReload();
      }
      return;
    }
    // Kết quả CĐHA là 1 trong 3 lựa chọn/ngày: chọn kết quả khác = sửa cùng mốc (giữ id + ghi chú)
    const RESULT_KEYS = ["imaging_chest_normal", "imaging_chest", "abscess_imaging"];
    const other = RESULT_KEYS.includes(criteriaKey)
      ? cdhaList.find(
          (x) =>
            x.ngay.slice(0, 10) === date &&
            !x.id.startsWith("local-") &&
            RESULT_KEYS.includes(x.tieu_chuan_key || "imaging_chest") &&
            (x.tieu_chuan_key || "imaging_chest") !== criteriaKey,
        )
      : undefined;
    if (other) {
      inFlightRef.current.add(flightKey);
      const sw = await upsertNkbvBaTimelineMilestone({
        id: other.id,
        ma_benh_an: maBenhAn,
        milestone_kind: milestoneKind,
        milestone_date: date,
        title,
        detail: other.ghi_chu ?? null,
        criteria_key: criteriaKey as never,
      });
      inFlightRef.current.delete(flightKey);
      if (!sw.success) toast.error(sw.error || "Không đổi kết quả CĐHA");
      else applyUpsertRow(sw.data as Record<string, unknown> | undefined);
      return;
    }
    inFlightRef.current.add(flightKey);
    const localId = `local-cdha-${date}-${criteriaKey}`;
    setLocalCdha((p) => [
      ...p.filter((x) => cdhaKey(x) !== `${date}|${criteriaKey}`),
      {
        id: localId,
        ngay: date,
        loai: criteriaKey.includes("abscess") ? "CT" : "XQ",
        mo_ta_benh_ly: title,
        tieu_chuan_key: criteriaKey as BaGridCdhaCell["tieu_chuan_key"],
      },
    ]);
    const res = await upsertNkbvBaTimelineMilestone({
      ma_benh_an: maBenhAn,
      milestone_kind: milestoneKind,
      milestone_date: date,
      title,
      criteria_key: criteriaKey as never,
    });
    inFlightRef.current.delete(flightKey);
    if (!res.success) {
      setLocalCdha((p) => p.filter((x) => x.id !== localId));
      toast.error(res.error || "Chưa lưu CĐHA");
      return;
    }
    setLocalCdha((p) => p.filter((x) => x.id !== localId));
    applyUpsertRow(res.data as Record<string, unknown> | undefined);
  };

  const editCdhaDate = async (id: string, nextDate: string) => {
    if (!allowedEdit || !id || id.startsWith("local-")) return;
    const cell = cdhaList.find((x) => x.id === id);
    if (!cell) return;
    const res = await upsertNkbvBaTimelineMilestone({
      id,
      ma_benh_an: maBenhAn,
      milestone_kind: "IMAGING_CHEST",
      milestone_date: nextDate,
      title: cell.mo_ta_benh_ly || "CĐHA",
      detail: cell.ghi_chu ?? null,
      criteria_key: (cell.tieu_chuan_key || "imaging_chest") as never,
    });
    if (!res.success) toast.error(res.error || "Không sửa ngày CĐHA");
    else applyUpsertRow(res.data as Record<string, unknown> | undefined);
  };

  /** Ghi chú tự do của mốc CĐHA (lưu ở detail). */
  const editCdhaNote = async (id: string, note: string) => {
    if (!allowedEdit || !id || id.startsWith("local-")) return;
    const cell = cdhaList.find((x) => x.id === id);
    if (!cell || (cell.ghi_chu ?? "") === note.trim()) return;
    const res = await upsertNkbvBaTimelineMilestone({
      id,
      ma_benh_an: maBenhAn,
      milestone_kind: "IMAGING_CHEST",
      milestone_date: cell.ngay.slice(0, 10),
      title: cell.mo_ta_benh_ly || "CĐHA",
      detail: note.trim() || null,
      criteria_key: (cell.tieu_chuan_key || "imaging_chest") as never,
    });
    if (!res.success) toast.error(res.error || "Không lưu ghi chú CĐHA");
    else applyUpsertRow(res.data as Record<string, unknown> | undefined);
  };

  const addSurgery = async (date: string) => {
    if (!allowedEdit) return;
    if ((split.surgeryByDate[date] || []).length) {
      // Đã có ngày mổ — chỉ neo Index khi user bấm chip, không tự mở lại
      return;
    }
    const res = await upsertNkbvBaTimelineMilestone({
      ma_benh_an: maBenhAn,
      milestone_kind: "PROCEDURE_SURGERY",
      milestone_date: date,
      title: "Ngày phẫu thuật (Day 1 SP)",
      criteria_key: "procedure_surgery",
    });
    if (!res.success) {
      toast.error(res.error || "Chưa lưu ngày mổ");
      return;
    }
    applyUpsertRow(res.data as Record<string, unknown> | undefined);
  };

  const removeMilestone = async (id: string | undefined) => {
    if (!allowedEdit || !id || id.startsWith("local-")) return;
    onTimelineRemoveLocal?.(id);
    const res = await softDeleteNkbvBaTimelineMilestone(id);
    if (!res.success) {
      toast.error(res.error || "Không xóa được");
      onReload();
    }
  };

  const toggleSsiTc = async (date: string, criteriaKey: string, title: string) => {
    if (!allowedEdit) return;
    const flightKey = `ssi|${date}|${criteriaKey}`;
    if (inFlightRef.current.has(flightKey)) return;
    const existing =
      (split.tieuChuanChuyenBietByDate[date] || []).find((x) => x.key === criteriaKey) ||
      localSsiTc.find((x) => x.ngay === date && x.key === criteriaKey);
    if (existing) {
      inFlightRef.current.add(flightKey);
      setLocalSsiTc((p) => p.filter((x) => !(x.ngay === date && x.key === criteriaKey)));
      if (existing.id) onTimelineRemoveLocal?.(existing.id);
      const res = await softDeleteNkbvBaTimelineByKey({
        ma_benh_an: maBenhAn,
        milestone_date: date,
        criteria_key: criteriaKey,
      });
      inFlightRef.current.delete(flightKey);
      if (!res.success) {
        toast.error(res.error || "Không xóa được TC SSI");
        onReload();
      }
      return;
    }
    inFlightRef.current.add(flightKey);
    const localId = `local-ssi-${date}-${criteriaKey}`;
    setLocalSsiTc((p) => [
      ...p.filter((x) => !(x.ngay === date && x.key === criteriaKey)),
      { id: localId, ngay: date, key: criteriaKey, label: title },
    ]);
    const res = await upsertNkbvBaTimelineMilestone({
      ma_benh_an: maBenhAn,
      milestone_kind: "SYMPTOM",
      milestone_date: date,
      title,
      criteria_key: criteriaKey as never,
    });
    inFlightRef.current.delete(flightKey);
    if (!res.success) {
      setLocalSsiTc((p) => p.filter((x) => x.id !== localId));
      toast.error(res.error || "Chưa lưu TC SSI");
      return;
    }
    setLocalSsiTc((p) => p.filter((x) => x.id !== localId));
    // Chỉ gắn bằng chứng — không mở bảng phân tích SSI (gây lag)
    applyUpsertRow(res.data as Record<string, unknown> | undefined);
  };

  const persistPanelLamSang = useCallback(
    async (date: string, criteriaKey: string, title: string, turnOn: boolean) => {
      if (!allowedEdit) return;
      const flightKey = `ls|${date}|${criteriaKey}`;
      if (inFlightRef.current.has(flightKey)) return;
      // TC SSI chẩn đoán nằm ở giỏ tieuChuanChuyenBiet, LS hội chứng ở trieuChungLamSang
      const existing =
        (split.trieuChungLamSangByDate[date] || []).find((x) => x.key === criteriaKey) ||
        (split.tieuChuanChuyenBietByDate[date] || []).find((x) => x.key === criteriaKey);
      if (!turnOn) {
        inFlightRef.current.add(flightKey);
        if (existing?.id) onTimelineRemoveLocal?.(existing.id);
        const res = await softDeleteNkbvBaTimelineByKey({
          ma_benh_an: maBenhAn,
          milestone_date: date,
          criteria_key: criteriaKey,
        });
        inFlightRef.current.delete(flightKey);
        if (!res.success) {
          toast.error(res.error || "Không xóa được");
          onReload();
        }
        return;
      }
      if (turnOn && !existing) {
        inFlightRef.current.add(flightKey);
        const res = await upsertNkbvBaTimelineMilestone({
          ma_benh_an: maBenhAn,
          milestone_kind: "SYMPTOM",
          milestone_date: date,
          title,
          criteria_key: criteriaKey as never,
        });
        inFlightRef.current.delete(flightKey);
        if (!res.success) toast.error(res.error || "Chưa lưu LS lên BA");
        else if (res.data?.id && onTimelineUpsertLocal) {
          onTimelineUpsertLocal({
            id: String(res.data.id),
            milestone_kind: String(
              (res.data as { milestone_kind?: string }).milestone_kind || "SYMPTOM",
            ),
            milestone_date: date,
            title,
            criteria_key: criteriaKey,
          });
        } else onReload();
      }
    },
    [
      allowedEdit,
      split.trieuChungLamSangByDate,
      split.tieuChuanChuyenBietByDate,
      maBenhAn,
      onReload,
      onTimelineUpsertLocal,
      onTimelineRemoveLocal,
    ],
  );

  return {
    toggleDevice,
    changeKhoa,
    toggleCdha,
    editCdhaDate,
    editCdhaNote,
    addSurgery,
    removeMilestone,
    toggleSsiTc,
    persistPanelLamSang,
  };
}
