import type { MomentType, ActionType } from "../data";
import type { ExtendedOpportunity } from "./vst-form-model";

export function toggleMomentInOpp(opp: ExtendedOpportunity, moment: MomentType) {
  const limit = opp.hanh_dong === "Bỏ sót" ? 1 : 2;
  if (opp.thoi_diems.includes(moment)) {
    opp.thoi_diems = opp.thoi_diems.filter((m) => m !== moment);
    return;
  }
  const newMoments = [...opp.thoi_diems, moment];
  opp.thoi_diems = newMoments.length > limit ? newMoments.slice(1) : newMoments;
}

/** Cập nhật hành động cơ hội. `suppressPerOppRecordTime`: true = giám sát lại qua camera (không ghi ISO từng lần đổi hành động). */
export function updateActionInOpp(opp: ExtendedOpportunity, action: ActionType, suppressPerOppRecordTime: boolean) {
  opp.hanh_dong = action;
  if (!suppressPerOppRecordTime) opp.thoi_gian_ghi_nhan = new Date().toISOString();
  
  if (action === "Bỏ sót") {
    opp.dung_ky_thuat = null;
    opp.du_thoi_gian = null;
    if (opp.thoi_diems.length > 1) {
      const last = opp.thoi_diems[opp.thoi_diems.length - 1];
      if (last !== undefined) opp.thoi_diems = [last];
    }
  } else {
    opp.co_deo_gang = null;
  }
}
