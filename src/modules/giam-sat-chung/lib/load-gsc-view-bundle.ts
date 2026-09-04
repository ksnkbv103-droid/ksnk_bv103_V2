import type { MasterOption } from "@/lib/master-data/gateway";
import type {
  BangKiemCachTinhDiem,
  BangKiemLoaiGiamSat,
  ChecklistResult,
  ChecklistTemplate,
} from "@/types/giam-sat-chung";
import { getBangKiemByMaOrIdForGscLookup, getTieuChisForGiamSatChung } from "@/lib/mdm-read-gateway";
import {
  getGiamSatChungSessionForViewBundle,
  getGscHeaderDmDropdowns,
  getGscSessionPrintLabels,
} from "../actions/giam-sat-chung.actions";
import {
  gscViewBangKiemLookupKeys,
  pickBangKiemForGscView,
} from "./resolve-gsc-bang-kiem";
import {
  checklistTemplateFromGscBangKiemSnapshot,
  parseGscBangKiemSnapshot,
} from "./gsc-bang-kiem-snapshot";
import {
  pickTieuChiJsonbForGscSession,
  scoredCriterionIdsFromGscResults,
} from "./gsc-session-criteria-hydrate";
import {
  mapTieuChiJsonbToCriterion,
  type TieuChiJsonbRaw,
} from "./gsc-form-template-sync";
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

function templateFromLiveBangKiem(
  bk: Record<string, unknown>,
  tieuChi: TieuChiJsonbRaw[],
): ChecklistTemplate {
  const bkId = String(bk.id ?? "");
  const maBk = String(bk.ma_bk ?? "").trim();
  const tenBk = String(bk.ten_bang_kiem ?? bk.ten_bk ?? "").trim() || "Bảng kiểm";
  const lg = String(bk.loai_giam_sat ?? "").trim().toUpperCase() || null;
  const cach = String(bk.cach_tinh_diem ?? "").trim().toUpperCase() || null;
  return {
    id: maBk || bkId,
    dbId: bkId,
    title: tenBk,
    category: "Giám sát chung",
    criteria: tieuChi.map(mapTieuChiJsonbToCriterion),
    loai_giam_sat: lg as BangKiemLoaiGiamSat | null,
    cach_tinh_diem: cach as BangKiemCachTinhDiem | null,
  };
}

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
      sessionRow = fresh.data as Record<string, unknown>;
    }
  }

  const frozen = parseGscBangKiemSnapshot(
    sessionRow.bang_kiem_snapshot ?? sessionRow.metadata,
  );
  const lookupKeys = gscViewBangKiemLookupKeys({
    loaiBangKiem: sessionRow.loai_bang_kiem,
    frozenBangKiemId: frozen?.bang_kiem_id,
    sessionBangKiemId: sessionRow.bang_kiem_id as string | null | undefined,
  });
  let lookupRow: Record<string, unknown> | null = null;
  const pickerHit = pickBangKiemForGscView({
    dbTemplates,
    loaiBangKiem: sessionRow.loai_bang_kiem,
    frozenBangKiemId: frozen?.bang_kiem_id,
    sessionBangKiemId: String(sessionRow.bang_kiem_id ?? ""),
  });
  if (!frozen && !pickerHit) {
    for (const key of lookupKeys) {
      const found = await getBangKiemByMaOrIdForGscLookup(key);
      if (found.success && found.data) {
        lookupRow = found.data as Record<string, unknown>;
        break;
      }
    }
  }
  const bk = pickBangKiemForGscView({
    dbTemplates,
    loaiBangKiem: sessionRow.loai_bang_kiem,
    frozenBangKiemId: frozen?.bang_kiem_id,
    sessionBangKiemId: String(sessionRow.bang_kiem_id ?? ""),
    lookup: lookupRow,
  });
  const br = bk as
    | {
        id?: string;
        ma_bk?: string | null;
        ten_bang_kiem?: string | null;
        ten_bk?: string | null;
        loai_giam_sat?: string | null;
        cach_tinh_diem?: string | null;
      }
    | undefined;
  const bkId = String(br?.id ?? frozen?.bang_kiem_id ?? "");

  if (!frozen && !bk) {
    return {
      ok: false,
      error: "Không tìm thấy mẫu bảng kiểm (mã hoặc UUID không khớp danh mục).",
    };
  }

  const [tcRes, dropdownRes, labelsRes] = await Promise.all([
    frozen || !bkId ? Promise.resolve(null) : getTieuChisForGiamSatChung(bkId, false),
    getGscHeaderDmDropdowns(),
    getGscSessionPrintLabels({
      khoa_id: sessionRow.khoa_id,
      khu_vuc_id: sessionRow.khu_vuc_id,
      nhan_vien_id: sessionRow.nhan_vien_id,
      nghe_nghiep_id: sessionRow.nghe_nghiep_id,
      nguoi_giam_sat_id: sessionRow.nguoi_giam_sat_id,
    }),
  ]);

  if (!frozen && tcRes && !tcRes.success) {
    return { ok: false, error: "Không thể tải tiêu chí: " + tcRes.error };
  }

  const kRows = dropdownRes.success && dropdownRes.data ? dropdownRes.data.khoas : [];
  const kvRows = dropdownRes.success && dropdownRes.data ? dropdownRes.data.khuVucs : [];
  const nnRows = dropdownRes.success && dropdownRes.data ? dropdownRes.data.ngheNghieps || [] : [];
  const nsRows = dropdownRes.success && dropdownRes.data ? dropdownRes.data.nhanSus || [] : [];

  const liveTieuChi = (tcRes && tcRes.success ? tcRes.data : []) as TieuChiJsonbRaw[];
  const scoredIds = scoredCriterionIdsFromGscResults(sessionRow.results);

  const template: ChecklistTemplate = frozen
    ? checklistTemplateFromGscBangKiemSnapshot(frozen)
    : templateFromLiveBangKiem(
        (br ?? {}) as Record<string, unknown>,
        pickTieuChiJsonbForGscSession({
          frozen: null,
          live: liveTieuChi,
          scoredCriterionIds: scoredIds,
        }),
      );

  const rawResults = (sessionRow.results as {
    criterion_id?: string;
    value?: string;
    note?: string | null;
    weight_type?: "CRITICAL" | "MAJOR" | "MINOR";
    weightType?: "CRITICAL" | "MAJOR" | "MINOR";
    is_red_flag?: boolean;
    isRedFlag?: boolean;
    image_url?: string | null;
    gia_tri_so?: number | null;
    gia_tri_lua_chon?: string | null;
    thoi_diem_ghi?: string | null;
  }[]) || [];
  const results: ChecklistResult[] = rawResults.map((r) => ({
    criterionId: String(r.criterion_id ?? (r as { criterionId?: string }).criterionId ?? ""),
    value: normVal(r.value),
    note: r.note,
    weightType: r.weightType || r.weight_type || "MAJOR",
    isRedFlag: r.isRedFlag !== undefined ? r.isRedFlag : (r.is_red_flag || false),
    image_url: r.image_url ?? null,
    gia_tri_so: r.gia_tri_so ?? null,
    gia_tri_lua_chon: r.gia_tri_lua_chon ?? null,
    thoi_diem_ghi: r.thoi_diem_ghi ?? null,
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
