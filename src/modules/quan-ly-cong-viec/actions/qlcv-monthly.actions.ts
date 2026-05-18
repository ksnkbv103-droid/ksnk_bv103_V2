"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getActorNhanSuId } from "@/lib/actor-auth-server";
import { computeQlcvFinalScore } from "../lib/qlcv-monthly-score";
import type { QlcvMonthlyEvalRow } from "../types";

function assertMonthStart(d: string): string {
  const x = String(d || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) throw new Error("Tháng không hợp lệ (YYYY-MM-DD).");
  const dt = new Date(`${x}T12:00:00Z`);
  if (Number.isNaN(dt.getTime())) throw new Error("Ngày không hợp lệ.");
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth();
  const first = new Date(Date.UTC(y, m, 1));
  const iso = first.toISOString().slice(0, 10);
  if (iso !== x) throw new Error("Chỉ chấp nhận ngày đầu tháng (ví dụ 2026-05-01).");
  return iso;
}

/** KPI tháng từ RPC + bản ghi đánh giá đã lưu (merge theo nhan_su_id). */
export async function getQlcvMonthlyKpiRows(monthStart: string): Promise<QlcvMonthlyEvalRow[]> {
  await verifyPermission("CONG_VIEC", "view");
  const thang = assertMonthStart(monthStart);
  const supabase = createAdminSupabaseClient();

  const [{ data: rpcData, error: rpcErr }, { data: evalData, error: evalErr }] = await Promise.all([
    supabase.rpc("fn_qlcv_tong_hop_thang", { p_thang: thang }),
    supabase.from("fact_qlcv_danh_gia_thang").select("*").eq("thang", thang),
  ]);

  if (rpcErr) {
    console.error("[QLCV] fn_qlcv_tong_hop_thang", rpcErr);
    throw new Error(
      rpcErr.message?.includes("function") || rpcErr.code === "42883"
        ? "Chưa áp dụng migration KPI tháng (fn_qlcv_tong_hop_thang). Chạy supabase db push."
        : `Không tải KPI tháng: ${rpcErr.message}`,
    );
  }
  if (evalErr) {
    console.error("[QLCV] fact_qlcv_danh_gia_thang", evalErr);
    throw new Error(`Không tải đánh giá đã lưu: ${evalErr.message}`);
  }

  const evalByStaff = new Map<string, Record<string, unknown>>();
  for (const e of evalData || []) {
    evalByStaff.set(String((e as { nhan_su_id: string }).nhan_su_id), e as Record<string, unknown>);
  }

  const rows = (rpcData || []) as Record<string, unknown>[];
  return rows.map((r) => {
    const sid = String(r.nhan_su_id);
    const saved = evalByStaff.get(sid);
    const onTime = Number(r.on_time_pct ?? 0);
    const completion = Number(r.completion_pct ?? 0);
    const qSaved = saved?.quality_score != null ? Number(saved.quality_score) : null;
    const fs =
      saved?.final_score != null && Number.isFinite(Number(saved.final_score))
        ? Number(saved.final_score)
        : computeQlcvFinalScore(onTime, completion, qSaved);
    return {
      id: saved?.id != null ? String(saved.id) : undefined,
      nhan_su_id: sid,
      ho_ten: String(r.ho_ten ?? ""),
      phieu_trong_thang: Number(r.phieu_trong_thang ?? 0),
      hoan_thanh_trong_thang: Number(r.hoan_thanh_trong_thang ?? 0),
      dung_han: Number(r.dung_han ?? 0),
      on_time_pct: onTime,
      completion_pct: completion,
      quality_score: Number.isFinite(qSaved) ? qSaved : null,
      final_score: fs,
      manager_comment: saved?.manager_comment != null ? String(saved.manager_comment) : null,
      evaluated_at: saved?.evaluated_at != null ? String(saved.evaluated_at) : null,
    };
  });
}

export async function upsertQlcvMonthEvaluation(input: {
  thang: string;
  nhan_su_id: string;
  quality_score: number | null;
  manager_comment: string | null;
}): Promise<void> {
  await verifyPermission("CONG_VIEC", "edit");
  const actor = await getActorNhanSuId();
  if (!actor) throw new Error("Cần hồ sơ nhân sự (mdm_nhan_su) để lưu đánh giá.");

  const thang = assertMonthStart(input.thang);
  const supabase = createAdminSupabaseClient();

  const { data: rpcData, error: rpcErr } = await supabase.rpc("fn_qlcv_tong_hop_thang", { p_thang: thang });
  if (rpcErr) throw new Error(rpcErr.message);

  const row = ((rpcData || []) as Record<string, unknown>[]).find(
    (r) => String(r.nhan_su_id) === String(input.nhan_su_id),
  );
  if (!row) throw new Error("Không có dòng KPI RPC cho nhân sự này trong tháng đã chọn.");

  const onTime = Number(row.on_time_pct ?? 0);
  const completion = Number(row.completion_pct ?? 0);
  const q: number | null = input.quality_score;
  if (q != null) {
    if (!Number.isInteger(q) || q < 1 || q > 5) throw new Error("Chất lượng phải từ 1 đến 5 hoặc để trống.");
  }
  const final = computeQlcvFinalScore(onTime, completion, q);

  const payload = {
    nhan_su_id: input.nhan_su_id,
    thang,
    on_time_rate: onTime,
    completion_rate: completion,
    quality_score: q,
    final_score: final,
    manager_comment: input.manager_comment?.trim() || null,
    evaluated_by: actor,
    evaluated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("fact_qlcv_danh_gia_thang").upsert(payload, {
    onConflict: "nhan_su_id,thang",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/quan-ly-cong-viec");
}

export async function exportQlcvMonthlyKpiCsv(monthStart: string): Promise<string> {
  await verifyPermission("CONG_VIEC", "view");
  const rows = await getQlcvMonthlyKpiRows(monthStart);
  const header = [
    "nhan_su_id",
    "ho_ten",
    "phieu_trong_thang",
    "hoan_thanh_trong_thang",
    "dung_han",
    "on_time_pct",
    "completion_pct",
    "quality_score",
    "final_score",
    "manager_comment",
    "evaluated_at",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const esc = (s: string | number | null | undefined) => {
      if (s == null) return "";
      const t = String(s);
      if (/[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
      return t;
    };
    lines.push(
      [
        esc(r.nhan_su_id),
        esc(r.ho_ten),
        r.phieu_trong_thang,
        r.hoan_thanh_trong_thang,
        r.dung_han,
        r.on_time_pct,
        r.completion_pct,
        r.quality_score ?? "",
        r.final_score ?? "",
        esc(r.manager_comment),
        esc(r.evaluated_at),
      ].join(","),
    );
  }
  return "\uFEFF" + lines.join("\n");
}
