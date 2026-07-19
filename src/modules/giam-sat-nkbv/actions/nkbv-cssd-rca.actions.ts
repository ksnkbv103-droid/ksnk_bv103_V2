"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { resolveCssdQuyTrinhLinkFromMaQr } from "@/lib/cssd-nkbv-trace";
import { readLoTietKhuanId, readIncidentTypeLabel } from "@/modules/cssd-su-co/domain/cssd-incident-attributes";

export type CssdRcaIncidentRow = {
  id: string;
  moTa: string;
  typeLabel: string | null;
  station: string | null;
  createdAt: string | null;
  loTietKhuanId: string | null;
};

export type CssdRcaBundle = {
  quyTrinhId: string;
  maQr: string;
  tenBo: string | null;
  tramHienTai: string | null;
  loTietKhuanId: string | null;
  maLo: string | null;
  ketQuaMe: boolean | null;
  incidents: CssdRcaIncidentRow[];
};

/** RCA: từ QR / quy trình → mẻ QC + sự cố PROCESS liên quan. */
export async function fetchCssdRcaBundle(args: {
  maQr?: string | null;
  quyTrinhId?: string | null;
}): Promise<{ success: true; data: CssdRcaBundle | null } | { success: false; error: string }> {
  try {
    await verifyPermission("GIAM_SAT_NKBV", "view");
    const supabase = createAdminSupabaseClient();

    let quyTrinhId = String(args.quyTrinhId || "").trim();
    let maQr = String(args.maQr || "").trim().toUpperCase();

    if (!quyTrinhId && maQr) {
      const link = await resolveCssdQuyTrinhLinkFromMaQr(supabase, maQr);
      if (link) {
        quyTrinhId = link.quy_trinh_id;
        maQr = link.ma_qr;
      }
    }
    if (!quyTrinhId) return { success: true, data: null };

    const { data: qt, error: qtErr } = await supabase
      .from("v_cssd_quy_trinh_full")
      .select("id, ma_qr_quy_trinh, ma_cycle_qr, ten_bo, ma_trang_thai_hien_tai, lo_tiet_khuan_id")
      .eq("id", quyTrinhId)
      .maybeSingle();
    if (qtErr) throw new Error(qtErr.message);
    if (!qt) return { success: true, data: null };

    const loId = qt.lo_tiet_khuan_id ? String(qt.lo_tiet_khuan_id) : null;
    let maLo: string | null = null;
    let ketQuaMe: boolean | null = null;
    if (loId) {
      const { data: me } = await supabase
        .from("cssd_fact_lo_tiet_khuan")
        .select("ma_lo_tiet_khuan, ket_qua_test")
        .eq("id", loId)
        .maybeSingle();
      maLo = me?.ma_lo_tiet_khuan ? String(me.ma_lo_tiet_khuan) : null;
      ketQuaMe = typeof me?.ket_qua_test === "boolean" ? me.ket_qua_test : null;
    }

    const { data: suCoRows } = await supabase
      .from("cssd_fact_su_co")
      .select("id, mo_ta, ma_tram_phat_hien, attributes, created_at, quy_trinh_id")
      .eq("quy_trinh_id", quyTrinhId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(20);

    const incidents: CssdRcaIncidentRow[] = (suCoRows || []).map((r) => {
      const attrs = (r.attributes && typeof r.attributes === "object" ? r.attributes : {}) as Record<
        string,
        unknown
      >;
      return {
        id: String(r.id),
        moTa: String(r.mo_ta || ""),
        typeLabel: readIncidentTypeLabel(attrs),
        station: r.ma_tram_phat_hien ? String(r.ma_tram_phat_hien) : null,
        createdAt: r.created_at ? String(r.created_at) : null,
        loTietKhuanId: readLoTietKhuanId(attrs),
      };
    });

    return {
      success: true,
      data: {
        quyTrinhId: String(qt.id),
        maQr: String(qt.ma_cycle_qr || qt.ma_qr_quy_trinh || maQr),
        tenBo: qt.ten_bo != null ? String(qt.ten_bo) : null,
        tramHienTai: qt.ma_trang_thai_hien_tai ? String(qt.ma_trang_thai_hien_tai) : null,
        loTietKhuanId: loId,
        maLo,
        ketQuaMe,
        incidents,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Lỗi RCA CSSD" };
  }
}

/** Chiều ngược: mẻ / quy trình → ca NKBV SSI đã gắn. */
export async function fetchNkbvCasesLinkedToCssd(args: {
  loTietKhuanId?: string | null;
  quyTrinhId?: string | null;
}): Promise<
  | {
      success: true;
      cases: Array<{ id: string; maCa: string | null; hoTen: string | null; ngayPhatHien: string | null }>;
    }
  | { success: false; error: string }
> {
  try {
    await verifyPermission("CSSD_WORKFLOW", "view");
    const supabase = createAdminSupabaseClient();
    const loId = String(args.loTietKhuanId || "").trim();
    const qtId = String(args.quyTrinhId || "").trim();
    if (!loId && !qtId) return { success: true, cases: [] };

    let q = supabase
      .from("nkbv_fact_su_kien")
      .select("id, ma_ca, ho_ten_benh_nhan, ngay_phat_hien")
      .eq("is_active", true)
      .limit(20);

    if (loId && qtId) {
      q = q.or(`lo_tiet_khuan_id.eq.${loId},quy_trinh_id.eq.${qtId}`);
    } else if (loId) {
      q = q.eq("lo_tiet_khuan_id", loId);
    } else {
      q = q.eq("quy_trinh_id", qtId);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    return {
      success: true,
      cases: (data || []).map((r) => ({
        id: String(r.id),
        maCa: r.ma_ca != null ? String(r.ma_ca) : null,
        hoTen: r.ho_ten_benh_nhan != null ? String(r.ho_ten_benh_nhan) : null,
        ngayPhatHien: r.ngay_phat_hien != null ? String(r.ngay_phat_hien) : null,
      })),
    };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Lỗi đọc ca NKBV" };
  }
}
