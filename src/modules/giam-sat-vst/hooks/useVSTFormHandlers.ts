import type { Dispatch, SetStateAction } from "react";
import type { GiamSatSession } from "@/components/shared/giam-sat-header.types";
import type { MasterOption } from "@/lib/master-data/gateway";
import type { SessionInput } from "../actions/vst-write.helpers";
import { ActionType, MomentType, VSTObservation } from "../data";
import { saveVSTSession } from "../actions/vst-write-save-session.actions";
import { toast } from "sonner";
import {
  enqueueOfflineVstSave,
  isLikelyOfflineOrNetworkFailure,
} from "@/lib/offline-pending-supervision-save";
import {
  createDefaultVSTFormPersons,
  createNewOpp,
  type ExtendedOpportunity,
  type VSTFormPerson,
  type VSTOppAssessmentField,
  type VSTPersonUpdatableField,
} from "../lib/vst-form-model";
import { buildVstObservations, validateOpportunityInput } from "../lib/vst-form-submit";
import { isReplayCameraSupervisionCachThuc } from "@/lib/supervision-session-time";

export type { ExtendedOpportunity, VSTFormPerson, VSTOppAssessmentField, VSTPersonUpdatableField };
export { createNewOpp, createDefaultVSTFormPersons };

export function useVSTFormHandlers(
  persons: VSTFormPerson[],
  setPersons: Dispatch<SetStateAction<VSTFormPerson[]>>,
  session: GiamSatSession,
  setSession: Dispatch<SetStateAction<GiamSatSession>>,
  setTimeLeft: Dispatch<SetStateAction<number | null>>,
  ngheNghieps: MasterOption[],
  setLoading: Dispatch<SetStateAction<boolean>>,
  onSuccess: () => void,
  editingSessionId: string | null,
) {
  const mutatePersons = (mutator: (draft: VSTFormPerson[]) => void) => {
    const next = [...persons];
    mutator(next);
    setPersons(next);
  };

  const updatePerson = <K extends VSTPersonUpdatableField>(idx: number, field: K, value: VSTFormPerson[K]) => {
    mutatePersons((next) => {
      const row = next[idx];
      row[field] = value;
    });
  };

  const toggleMoment = (pIdx: number, oIdx: number, moment: MomentType) => {
    mutatePersons((next) => {
      const opp = next[pIdx].opportunities[oIdx];
      const limit = opp.hanh_dong === "Bỏ sót" ? 1 : 2;
      if (opp.thoi_diems.includes(moment)) {
        opp.thoi_diems = opp.thoi_diems.filter((m: MomentType) => m !== moment);
        return;
      }
      const newMoments = [...opp.thoi_diems, moment];
      opp.thoi_diems = newMoments.length > limit ? newMoments.slice(1) : newMoments;
    });
  };

  const updateAction = (pIdx: number, oIdx: number, action: ActionType) => {
    mutatePersons((next) => {
      const opp = next[pIdx].opportunities[oIdx];
      opp.hanh_dong = action;
      if (!isReplayCameraSupervisionCachThuc(session.cach_thuc_giam_sat)) opp.thoi_gian_ghi_nhan = new Date().toISOString();
      if (action === "Bỏ sót") {
        opp.dung_ky_thuat = null;
        opp.du_thoi_gian = null;
        if (opp.thoi_diems.length > 1) {
          const last = opp.thoi_diems[opp.thoi_diems.length - 1];
          if (last !== undefined) opp.thoi_diems = [last];
        }
        return;
      }
      opp.co_deo_gang = null;
    });
  };

  const updateAssessment = (
    pIdx: number,
    oIdx: number,
    field: VSTOppAssessmentField,
    value: boolean | string | null | undefined,
  ) => {
    mutatePersons((next) => {
      const opp = next[pIdx].opportunities[oIdx];
      if (field === "thoi_gian_ghi_nhan") {
        opp.thoi_gian_ghi_nhan =
          value === undefined || value === null ? undefined : typeof value === "string" ? value : String(value);
        return;
      }
      if (field === "dung_ky_thuat") opp.dung_ky_thuat = value as boolean | null;
      else if (field === "du_thoi_gian") opp.du_thoi_gian = value as boolean | null;
      else if (field === "co_deo_gang") opp.co_deo_gang = value as boolean | null;
    });
  };

  const openOpportunity = (pIdx: number, oIdx: number) =>
    mutatePersons((next) => {
      next[pIdx].opportunities[oIdx].isCollapsed = false;
    });

  const handleFinalSave = async () => {
    if (!session.khoa_id) return toast.error("Vui lòng chọn Khoa giám sát");
    if (!session.khu_vuc_id) return toast.error("Vui lòng chọn Khu vực giám sát");
    if (!session.nguoi_giam_sat_id) return toast.error("Không xác định được tài khoản giám sát. Vui lòng đăng nhập lại.");

    const isReplayCamera = isReplayCameraSupervisionCachThuc(session.cach_thuc_giam_sat);
    if (isReplayCamera) {
      const bd = String(session.thoi_gian_bat_dau ?? "").trim();
      const kt = String(session.thoi_gian_ket_thuc ?? "").trim();
      if (!bd || !kt) {
        return toast.error("Giám sát lại qua camera: nhập đủ Ngày giám sát và khung giờ Từ – Đến ở phần đầu phiên.");
      }
    }

    const observations: VSTObservation[] = buildVstObservations({ persons, session, ngheNghieps });

    if (!observations.length) return toast.error("Vui lòng hoàn thành ít nhất 1 cơ hội thực tế");

    const ketThucIso = isReplayCamera ? String(session.thoi_gian_ket_thuc).trim() : new Date().toISOString();
    const sessionPayload = {
      ...(session as GiamSatSession),
      hinh_thuc_giam_sat: session.hinh_thuc_giam_sat || "Giám sát khách quan",
      cach_thuc_giam_sat: session.cach_thuc_giam_sat || "Giám sát trực tiếp tại chỗ",
      thoi_gian_bat_dau: session.thoi_gian_bat_dau,
      thoi_gian_ket_thuc: ketThucIso,
    };

    setLoading(true);
    const sid = String(editingSessionId ?? "").trim();
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueueOfflineVstSave({
          session: sessionPayload as SessionInput,
          observations,
          existingSessionId: sid || null,
        });
        toast.message(
          "Đã lưu vào hàng đợi ngoại tuyến. Hệ thống sẽ gửi phiên khi có mạng trở lại (tự động hoặc khi bạn mở lại ứng dụng).",
        );
        return;
      }
      const res = await saveVSTSession(
        sessionPayload as SessionInput,
        observations,
        sid ? { existingSessionId: sid } : undefined,
      );
      if (res.success) {
        toast.success(res.message);
        setSession((prev) => ({ ...prev, thoi_gian_ket_thuc: ketThucIso }));
        setPersons(createDefaultVSTFormPersons());
        onSuccess();
      } else toast.error(res.error);
    } catch (err: unknown) {
      if (isLikelyOfflineOrNetworkFailure(err)) {
        enqueueOfflineVstSave({
          session: sessionPayload as SessionInput,
          observations,
          existingSessionId: sid || null,
        });
        toast.message("Mạng không ổn định — đã giữ phiên trong hàng đợi ngoại tuyến để gửi sau.");
      } else {
        toast.error(err instanceof Error ? err.message : "Lỗi lưu phiên");
      }
    } finally {
      setLoading(false);
    }
  };

  const submitOpportunity = (pIdx: number, oIdx: number) => {
    const newPersons = [...persons];
    const opp = newPersons[pIdx].opportunities[oIdx];
    const validationMessage = validateOpportunityInput(opp);
    if (validationMessage) return toast.error(validationMessage);
    const isReplayCamera = isReplayCameraSupervisionCachThuc(session.cach_thuc_giam_sat);
    const allOpps = newPersons.flatMap((p) => p.opportunities).filter((o) => o.isCollapsed && o.thoi_gian_ghi_nhan);
    if (allOpps.length === 0 && !isReplayCamera) {
      const firstTime = opp.thoi_gian_ghi_nhan || new Date().toISOString();
      setSession((prev) => ({ ...prev, thoi_gian_bat_dau: firstTime }));
      setTimeLeft(1800);
    }

    if (allOpps.length > 0 && !isReplayCamera) {
      const firstTime = new Date(allOpps[0].thoi_gian_ghi_nhan!).getTime();
      const currentTime = opp.thoi_gian_ghi_nhan ? new Date(opp.thoi_gian_ghi_nhan).getTime() : Date.now();
      if ((currentTime - firstTime) / (1000 * 60) > 30) {
        toast.warning("Phiên giám sát đã vượt 30 phút. Hệ thống tự động lưu.");
        opp.isCollapsed = true;
        setPersons(newPersons);
        handleFinalSave();
        return;
      }
    }

    opp.isCollapsed = true;
    newPersons[pIdx].opportunities.push(createNewOpp());
    setPersons(newPersons);
    toast.success("Đã ghi nhận cơ hội");
  };

  return { updatePerson, toggleMoment, updateAction, updateAssessment, openOpportunity, submitOpportunity, handleFinalSave };
}
