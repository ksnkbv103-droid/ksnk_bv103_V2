import type { MasterOption } from "@/lib/master-data/gateway";
import type { ChecklistResult, ChecklistTemplate } from "@/types/giam-sat-chung";
import { getTieuChisForGiamSatChung } from "@/lib/mdm-read-gateway";
import {
  getGiamSatChungSessionForViewBundle,
  getGscHeaderDmDropdowns,
  getGscSessionPrintLabels,
} from "../actions/giam-sat-chung.actions";
import { findBangKiemForSessionLoai } from "./resolve-gsc-bang-kiem";
import { mergeGscSessionWithDbPrintLabels, snapshotGscSessionForPrint } from "./gsc-session-labels";

export type GscViewBundle = {
  session: Record<string, unknown>;
  results: ChecklistResult[];
  template: ChecklistTemplate;
  khoas: Array<{ id?: string; ten_danh_muc?: string; ten_khoa?: string }>;
  khuVucs: Array<{ id?: string; ten_danh_muc?: string }>;
  ngheNghieps: MasterOption[];
  nhanSus: Array<{ id?: string; ho_ten?: string }>;
};

const normVal = (v: unknown): ChecklistResult["value"] =>
  v === "DAT" || v === "KHONG_DAT" || v === "NA" ? v : "NA";

/** Chuẩn bị template + kết quả + dropdown khoa/khu để xem/in phiên lịch sử. */
export async function loadGscViewBundle(
  dbTemplates: Record<string, unknown>[],
  session: Record<string, unknown>,
): Promise<{ ok: true; bundle: GscViewBundle } | { ok: false; error: string }> {
  const sid = String(session.id ?? "").trim();
  let sessionRow = session as Record<string, unknown>;
  if (sid) {
    const fresh = await getGiamSatChungSessionForViewBundle(sid);
    if (fresh.success) {
      const incomingResults = sessionRow.results;
      const hasIncoming = Array.isArray(incomingResults) && incomingResults.length > 0;
      sessionRow = {
        ...fresh.data,
        results: hasIncoming ? incomingResults : fresh.data.results,
      } as Record<string, unknown>;
    }
  }

  const bk = findBangKiemForSessionLoai(dbTemplates, sessionRow.loai_bang_kiem);
  if (!bk) {
    return {
      ok: false,
      error: "Không tìm thấy mẫu bảng kiểm (mã hoặc UUID không khớp danh mục).",
    };
  }

  const br = bk as { id?: string; ma_bk?: string | null; ten_bang_kiem?: string | null; ten_bk?: string | null };
  const bkId = String(br.id ?? "");
  const maBk = String(br.ma_bk ?? "").trim();
  const tenBk = String(br.ten_bang_kiem ?? br.ten_bk ?? "").trim() || "Bảng kiểm";

  const [tcRes, dropdownRes, labelsRes] = await Promise.all([
    getTieuChisForGiamSatChung(bkId),
    getGscHeaderDmDropdowns(),
    getGscSessionPrintLabels({
      khoa_id: sessionRow.khoa_id,
      khu_vuc_id: sessionRow.khu_vuc_id,
      nhan_vien_id: sessionRow.nhan_vien_id,
      nghe_nghiep_id: sessionRow.nghe_nghiep_id,
      nguoi_giam_sat_id: sessionRow.nguoi_giam_sat_id,
    }),
  ]);

  if (!tcRes.success) {
    return { ok: false, error: "Không thể tải tiêu chí: " + tcRes.error };
  }

  const kRows = dropdownRes.success && dropdownRes.data ? dropdownRes.data.khoas : [];
  const kvRows = dropdownRes.success && dropdownRes.data ? dropdownRes.data.khuVucs : [];
  const nnRows = dropdownRes.success && dropdownRes.data ? dropdownRes.data.ngheNghieps || [] : [];
  const nsRows = dropdownRes.success && dropdownRes.data ? dropdownRes.data.nhanSus || [] : [];

  const criteria = tcRes.data || [];
  const template: ChecklistTemplate = {
    id: maBk || bkId,
    dbId: bkId,
    title: tenBk,
    category: "Giám sát chung",
    criteria: criteria.map((c: {
      id: string;
      noi_dung?: string | null;
      stt: number;
      diem_toi_da?: number;
      weight_type?: 'CRITICAL' | 'MAJOR' | 'MINOR';
      weightType?: 'CRITICAL' | 'MAJOR' | 'MINOR';
      is_red_flag?: boolean;
      isRedFlag?: boolean;
    }) => ({
      id: c.id,
      label: String(c.noi_dung ?? "").trim() || "Tiêu chí",
      maxScore: c.diem_toi_da || 1,
      weightType: c.weightType || c.weight_type || 'MAJOR',
      isRedFlag: c.isRedFlag !== undefined ? c.isRedFlag : (c.is_red_flag || false),
    })),
  };

  const rawResults = (sessionRow.results as {
    criterion_id?: string;
    value?: string;
    note?: string | null;
    weight_type?: 'CRITICAL' | 'MAJOR' | 'MINOR';
    weightType?: 'CRITICAL' | 'MAJOR' | 'MINOR';
    is_red_flag?: boolean;
    isRedFlag?: boolean;
    image_url?: string | null;
  }[]) || [];
  const results: ChecklistResult[] = rawResults.map((r) => ({
    criterionId: String(r.criterion_id),
    value: normVal(r.value),
    note: r.note,
    weightType: r.weightType || r.weight_type || 'MAJOR',
    isRedFlag: r.isRedFlag !== undefined ? r.isRedFlag : (r.is_red_flag || false),
    image_url: r.image_url ?? null,
  }));

  let sessionObj = sessionRow;
  if (labelsRes.success) {
    sessionObj = mergeGscSessionWithDbPrintLabels(sessionObj, labelsRes.data);
  }
  const printSession = snapshotGscSessionForPrint(sessionObj, kRows, kvRows, nnRows, nsRows);
  return {
    ok: true,
    bundle: {
      session: printSession,
      results,
      template,
      khoas: kRows,
      khuVucs: kvRows,
      ngheNghieps: nnRows,
      nhanSus: nsRows,
    },
  };
}
