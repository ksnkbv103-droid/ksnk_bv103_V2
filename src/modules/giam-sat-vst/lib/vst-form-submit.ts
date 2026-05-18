import type { GiamSatSession } from "@/components/shared/giam-sat-header.types";
import type { MasterOption } from "@/lib/master-data/gateway";
import type { VSTObservation } from "../data";
import { isReplayCameraSupervisionCachThuc } from "@/lib/supervision-session-time";
import { normalizeRecordTime, type ExtendedOpportunity, type VSTFormPerson } from "./vst-form-model";
import { buildVstObservationPersistRow } from "./vst-observation-persist-fields";

export function buildVstObservations(params: {
  persons: VSTFormPerson[];
  session: GiamSatSession;
  ngheNghieps: MasterOption[];
  /** Tên khu vực từ danh mục (form) — bổ sung nhãn text khi legacy trống. */
  sessionTenKhuVuc?: string;
}): VSTObservation[] {
  const { persons, session, ngheNghieps, sessionTenKhuVuc } = params;
  const isReplayCamera = isReplayCameraSupervisionCachThuc(session.cach_thuc_giam_sat);
  return persons
    .filter((p) => p.nhan_vien_id || (p.is_manual && p.ten_manual))
    .map((p) => {
      const tenNghe = ngheNghieps.find((nn) => nn.id === p.nghe_nghiep_id)?.ten_danh_muc || "";
      const loc = buildVstObservationPersistRow({
        sessionKhuVucId: session.khu_vuc_id,
        sessionViTri: session.vi_tri,
        ngheNghiepId: p.nghe_nghiep_id,
      });
      return {
      nhan_vien_id: p.nhan_vien_id || null,
      ten_nhan_vien_ngoai: p.is_manual ? p.ten_manual : undefined,
      khoa_id: session.khoa_id,
      khu_vuc_id: loc.khu_vuc_id,
      khu_vuc: sessionTenKhuVuc || "",
      vi_tri: loc.vi_tri,
      nghe_nghiep_id: loc.nghe_nghiep_id,
      nghe_nghiep: tenNghe,
      hinh_thuc_giam_sat: session.hinh_thuc_giam_sat,
      ngay_giam_sat: session.ngay_giam_sat,
      nguoi_giam_sat_id: session.nguoi_giam_sat_id,
      opportunities: p.opportunities
        .filter((o) => o.thoi_diems.length > 0 && o.hanh_dong !== null)
        .map((o) => ({
          ...o,
          thoi_gian_ghi_nhan: isReplayCamera
            ? undefined
            : normalizeRecordTime(o.thoi_gian_ghi_nhan, session.ngay_giam_sat),
        })) as ExtendedOpportunity[],
    };
    });
}

export function validateOpportunityInput(opp: ExtendedOpportunity): string | null {
  if (!opp.thoi_diems.length) return "Vui lòng chọn ít nhất 1 thời điểm";
  if (!opp.hanh_dong) return "Vui lòng chọn Hành động";
  if (opp.hanh_dong === "Bỏ sót" && opp.co_deo_gang === null) return "Vui lòng đánh giá Lạm dụng găng";
  if (opp.hanh_dong !== "Bỏ sót" && (opp.dung_ky_thuat === null || opp.du_thoi_gian === null)) {
    return "Vui lòng đánh giá Đúng kỹ thuật và Đủ thời gian";
  }
  return null;
}
