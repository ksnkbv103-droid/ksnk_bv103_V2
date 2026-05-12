import type { MasterOption } from "@/lib/master-data/gateway";

export type NhanSuLike = { id?: string; ho_ten?: string };

const sameId = (a: unknown, b: unknown) => String(a ?? "").trim() === String(b ?? "").trim();

/** Tên khoa hiển thị: ưu tiên dữ liệu join từ server, sau đó tra dropdown. */
export function resolveGscKhoaTen(
  session: Record<string, unknown>,
  khoas: Array<{ id?: string; ten_danh_muc?: string; ten_khoa?: string }>,
): string {
  const dm = session.danh_muc_khoa as { ten_danh_muc?: string } | undefined;
  const fromDm = String(dm?.ten_danh_muc || "").trim();
  if (fromDm && fromDm !== "—") return fromDm;
  const kid = String(session.khoa_id || "").trim();
  if (!kid) return "—";
  const row = khoas.find((k) => sameId(k.id, kid));
  return String(row?.ten_danh_muc || row?.ten_khoa || "").trim() || "—";
}

export function resolveGscKhuTen(
  session: Record<string, unknown>,
  khuVucs: Array<{ id?: string; ten_danh_muc?: string; ten_khu_vuc?: string }>,
): string {
  const dm = session.danh_muc_khu_vuc as { ten_danh_muc?: string } | undefined;
  const fromDm = String(dm?.ten_danh_muc || "").trim();
  if (fromDm && fromDm !== "—") return fromDm;
  const id = String(session.khu_vuc_id || "").trim();
  if (!id) return "—";
  const row = khuVucs.find((k) => sameId(k.id, id));
  return String(row?.ten_danh_muc || row?.ten_khu_vuc || "").trim() || "—";
}

export function resolveGscNguoiGiamSatTen(session: Record<string, unknown>, nhanSus: NhanSuLike[] = []): string {
  const wrap = session.nguoi_giam_sat as { ho_ten?: string } | undefined;
  const name = String(wrap?.ho_ten || "").trim();
  if (name && name !== "—") return name;
  const id = String(session.nguoi_giam_sat_id || "").trim();
  if (!id) return "—";
  const row = nhanSus.find((n) => sameId(n.id, id));
  return String(row?.ho_ten || "").trim() || id;
}

export function resolveGscDoiTuongTen(session: Record<string, unknown>, nhanSus: NhanSuLike[] = []): string {
  if (session.is_manual_nhan_vien) {
    return String(session.ten_manual_nhan_vien || "").trim() || "—";
  }
  const nv = session.nhan_vien as { ho_ten?: string } | undefined;
  const fromJoin = String(nv?.ho_ten || "").trim();
  if (fromJoin && fromJoin !== "—") return fromJoin;
  const id = String(session.nhan_vien_id || "").trim();
  if (!id) return "—";
  const row = nhanSus.find((n) => sameId(n.id, id));
  return String(row?.ho_ten || "").trim() || "—";
}

export function resolveGscNgheTen(session: Record<string, unknown>, ngheNghieps: MasterOption[] = []): string {
  const dm = session.danh_muc_nghe_nghiep as { ten_danh_muc?: string } | undefined;
  const fromDm = String(dm?.ten_danh_muc || "").trim();
  if (fromDm && fromDm !== "—") return fromDm;
  const nid = String(session.nghe_nghiep_id || "").trim();
  if (!nid) return "—";
  const row = ngheNghieps.find((x) => sameId(x.id, nid));
  // MasterOption maps ten_nghe_nghiep to ten_danh_muc, but we check both for safety
  return String(row?.ten_danh_muc || (row as any)?.ten_nghe_nghiep || "").trim() || "—";
}

/** Nhãn đọc thẳng từ bảng master theo FK (không phụ thuộc dropdown / quyền DANH_MUC). */
export type GscPrintLabelPack = {
  khoa_ten?: string;
  khu_ten?: string;
  ho_ten_doi_tuong?: string;
  nghe_ten?: string;
  ho_ten_nguoi_gs?: string;
};

export function mergeGscSessionWithDbPrintLabels(
  session: Record<string, unknown>,
  pack: GscPrintLabelPack,
): Record<string, unknown> {
  const next = { ...session };
  const kt = String(pack.khoa_ten || "").trim();
  const kv = String(pack.khu_ten || "").trim();
  const nn = String(pack.nghe_ten || "").trim();
  const nv = String(pack.ho_ten_doi_tuong || "").trim();
  const ngs = String(pack.ho_ten_nguoi_gs || "").trim();
  if (kt) next.danh_muc_khoa = { ten_danh_muc: kt };
  if (kv) next.danh_muc_khu_vuc = { ten_danh_muc: kv };
  if (nn) next.danh_muc_nghe_nghiep = { ten_danh_muc: nn };
  if (nv) {
    next.nhan_vien = {
      ...(next.nhan_vien && typeof next.nhan_vien === "object" ? (next.nhan_vien as Record<string, unknown>) : {}),
      ho_ten: nv,
    };
  }
  if (ngs) {
    next.nguoi_giam_sat = {
      ...(next.nguoi_giam_sat && typeof next.nguoi_giam_sat === "object" ? (next.nguoi_giam_sat as Record<string, unknown>) : {}),
      ho_ten: ngs,
    };
  }
  return next;
}

/**
 * Chuẩn hóa session trước khi in: ghi đè `danh_muc_*` / `nhan_vien` bằng kết quả suy ra + join,
 * tránh phiếu A4 bị "—" khi chỉ có UUID hoặc join rỗng một phía.
 */
export function snapshotGscSessionForPrint(
  session: Record<string, unknown>,
  khoas: Array<{ id?: string; ten_danh_muc?: string; ten_khoa?: string }>,
  khuVucs: Array<{ id?: string; ten_danh_muc?: string }>,
  ngheNghieps: MasterOption[] = [],
  nhanSus: NhanSuLike[] = [],
): Record<string, unknown> {
  const pick = (join: string, resolved: string) => {
    const j = join.trim();
    if (j) return j;
    const r = resolved.trim();
    return r && r !== "—" ? r : "—";
  };
  const dmK = String((session.danh_muc_khoa as { ten_danh_muc?: string } | undefined)?.ten_danh_muc || "");
  const dmKv = String((session.danh_muc_khu_vuc as { ten_danh_muc?: string } | undefined)?.ten_danh_muc || "");
  const dmNn = String((session.danh_muc_nghe_nghiep as { ten_danh_muc?: string } | undefined)?.ten_danh_muc || "");
  const nvJoin = String((session.nhan_vien as { ho_ten?: string } | undefined)?.ho_ten || "");
  const doiR = resolveGscDoiTuongTen(session, nhanSus);
  const doiFinal = pick(nvJoin, doiR);

  const gsJoin = String((session.nguoi_giam_sat as { ho_ten?: string } | undefined)?.ho_ten || "");
  const gsR = resolveGscNguoiGiamSatTen(session, nhanSus);
  const gsFinal = pick(gsJoin, gsR);

  return {
    ...session,
    danh_muc_khoa: { ten_danh_muc: pick(dmK, resolveGscKhoaTen(session, khoas)) },
    danh_muc_khu_vuc: { ten_danh_muc: pick(dmKv, resolveGscKhuTen(session, khuVucs)) },
    danh_muc_nghe_nghiep: { ten_danh_muc: pick(dmNn, resolveGscNgheTen(session, ngheNghieps)) },
    nhan_vien: {
      ...(session.nhan_vien && typeof session.nhan_vien === "object" ? (session.nhan_vien as Record<string, unknown>) : {}),
      ho_ten: doiFinal,
    },
    nguoi_giam_sat: {
      ...(session.nguoi_giam_sat && typeof session.nguoi_giam_sat === "object" ? (session.nguoi_giam_sat as Record<string, unknown>) : {}),
      ho_ten: gsFinal,
    },
  };
}
