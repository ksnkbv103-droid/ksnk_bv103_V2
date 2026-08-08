/** Ảnh chụp bổ sung người bệnh trên phiên GSC (metadata) — không ghi đè registry NKBV. */

import {
  NKBV_MDRO_PHENOTYPES,
  type NkbvMdroPhenotype,
  normalizeMdroPhenotype,
} from "@/modules/giam-sat-nkbv/lib/nkbv-mdro";

export type GscBoSungNbFields = {
  bn_tho_may: boolean;
  bn_phau_thuat: boolean;
  bn_cvc: boolean;
  bn_foley: boolean;
  bn_nhiem_mdro: boolean;
  bn_mdro_phenotype: NkbvMdroPhenotype | "";
  bn_nhiem_tac_nhan_nguy_hiem: boolean;
  bn_tac_nhan_nguy_hiem_ten: string;
};

export const EMPTY_GSC_BO_SUNG_NB: GscBoSungNbFields = {
  bn_tho_may: false,
  bn_phau_thuat: false,
  bn_cvc: false,
  bn_foley: false,
  bn_nhiem_mdro: false,
  bn_mdro_phenotype: "",
  bn_nhiem_tac_nhan_nguy_hiem: false,
  bn_tac_nhan_nguy_hiem_ten: "",
};

function asBool(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw;
  const t = String(raw ?? "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "y", "có", "co", "x"].includes(t);
}

export function parseGscBoSungNbFromUnknown(
  raw: Partial<Record<keyof GscBoSungNbFields, unknown>> | null | undefined,
): GscBoSungNbFields {
  const phenotype = normalizeMdroPhenotype(
    raw?.bn_mdro_phenotype != null ? String(raw.bn_mdro_phenotype) : "",
  );
  return {
    bn_tho_may: asBool(raw?.bn_tho_may),
    bn_phau_thuat: asBool(raw?.bn_phau_thuat),
    bn_cvc: asBool(raw?.bn_cvc),
    bn_foley: asBool(raw?.bn_foley),
    bn_nhiem_mdro: asBool(raw?.bn_nhiem_mdro),
    bn_mdro_phenotype: phenotype || "",
    bn_nhiem_tac_nhan_nguy_hiem: asBool(raw?.bn_nhiem_tac_nhan_nguy_hiem),
    bn_tac_nhan_nguy_hiem_ten: String(raw?.bn_tac_nhan_nguy_hiem_ten ?? "").trim(),
  };
}

/** Payload ghi metadata — null khi tắt bổ sung NB. */
export function serializeGscBoSungNbForMetadata(
  fields: GscBoSungNbFields,
  enabled: boolean,
): Record<string, string | boolean | null> {
  if (!enabled) {
    return {
      bn_tho_may: null,
      bn_phau_thuat: null,
      bn_cvc: null,
      bn_foley: null,
      bn_nhiem_mdro: null,
      bn_mdro_phenotype: null,
      bn_nhiem_tac_nhan_nguy_hiem: null,
      bn_tac_nhan_nguy_hiem_ten: null,
    };
  }
  const ph =
    fields.bn_nhiem_mdro && fields.bn_mdro_phenotype
      ? (NKBV_MDRO_PHENOTYPES as readonly string[]).includes(fields.bn_mdro_phenotype)
        ? fields.bn_mdro_phenotype
        : null
      : null;
  const tenNh =
    fields.bn_nhiem_tac_nhan_nguy_hiem
      ? String(fields.bn_tac_nhan_nguy_hiem_ten || "").trim() || null
      : null;
  return {
    bn_tho_may: Boolean(fields.bn_tho_may),
    bn_phau_thuat: Boolean(fields.bn_phau_thuat),
    bn_cvc: Boolean(fields.bn_cvc),
    bn_foley: Boolean(fields.bn_foley),
    bn_nhiem_mdro: Boolean(fields.bn_nhiem_mdro),
    bn_mdro_phenotype: ph,
    bn_nhiem_tac_nhan_nguy_hiem: Boolean(fields.bn_nhiem_tac_nhan_nguy_hiem),
    bn_tac_nhan_nguy_hiem_ten: tenNh,
  };
}

export function formatGscBoSungCanThiepLabel(fields: GscBoSungNbFields): string {
  const parts: string[] = [];
  if (fields.bn_tho_may) parts.push("Thở máy");
  if (fields.bn_phau_thuat) parts.push("Phẫu thuật");
  if (fields.bn_cvc) parts.push("Đường truyền trung tâm (CVC)");
  if (fields.bn_foley) parts.push("Ống thông tiểu");
  return parts.length ? parts.join("; ") : "—";
}
