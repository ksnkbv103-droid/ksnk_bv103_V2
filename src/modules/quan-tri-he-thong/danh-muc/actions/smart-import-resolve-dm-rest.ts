import type { SupabaseClient } from "@supabase/supabase-js";
import { lookupKhoaByTenFlexible, looksLikeShortBusinessCode, UUID_RE } from "./smart-import-resolvers-shared";

export async function resolveLoaiDungCuForBoImport(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<{ ok: true; row: Record<string, unknown> } | { ok: false; error: string }> {
  const sb = supabase;
  const out = { ...row };
  const raw = String(out.loai_dung_cu_id || "").trim();
  const maLoai = String((out.ma_loai_dung_cu ?? "") || "").trim().toUpperCase();
  const tenLoai = String((out.ten_loai_dung_cu ?? "") || "").trim();
  if (!raw && !maLoai && !tenLoai) return { ok: true, row: { ...out, loai_dung_cu_id: null } };
  if (raw && UUID_RE.test(raw)) return { ok: true, row: { ...out, loai_dung_cu_id: raw } };
  let ref: { id: string } | null = null;
  const maLookup = raw && !UUID_RE.test(raw) ? raw.toUpperCase() : maLoai;
  if (maLookup) {
    const { data, error } = await sb
      .from("dm_loai_dung_cu")
      .select("id")
      .eq("ma_loai_dung_cu", maLookup)
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    ref = data as { id: string } | null;
  }
  if (!ref && tenLoai) {
    const { data, error } = await sb
      .from("dm_loai_dung_cu")
      .select("id")
      .eq("ten_loai_dung_cu", tenLoai)
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    ref = data as { id: string } | null;
  }
  if (!ref) return { ok: false, error: `Không tìm thấy loại dụng cụ từ loai_dung_cu_id/ma_loai_dung_cu/ten_loai_dung_cu (${raw || maLoai || tenLoai}).` };
  out.loai_dung_cu_id = ref.id;
  delete (out as Record<string, unknown>).ma_loai_dung_cu;
  delete (out as Record<string, unknown>).ten_loai_dung_cu;
  return { ok: true, row: out };
}

export async function resolveKhoaUsageForBoImport(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<{ ok: true; row: Record<string, unknown> } | { ok: false; error: string }> {
  const sb = supabase;
  const out = { ...row };
  const raw = String(out.khoa_su_dung_id || "").trim();
  const maKhoaCol = String((out.ma_khoa_su_dung ?? "") || "").trim();
  const tenKhoa = String((out.ten_khoa_su_dung ?? "") || "").trim();
  if (!raw && !maKhoaCol && !tenKhoa) return { ok: true, row: { ...out, khoa_su_dung_id: null } };
  if (raw && UUID_RE.test(raw)) return { ok: true, row: { ...out, khoa_su_dung_id: raw } };

  let nameGuess = tenKhoa;
  if (!nameGuess && maKhoaCol && !looksLikeShortBusinessCode(maKhoaCol)) nameGuess = maKhoaCol;
  if (!nameGuess && raw && !UUID_RE.test(raw) && !looksLikeShortBusinessCode(raw)) nameGuess = raw;

  let ref: { id: string } | null = null;
  const maLookupCandidate = raw && !UUID_RE.test(raw) ? raw : maKhoaCol;
  if (maLookupCandidate && looksLikeShortBusinessCode(maLookupCandidate)) {
    const m = maLookupCandidate.toUpperCase();
    const { data, error } = await sb.from("dm_khoa_phong").select("id").eq("ma_khoa", m).maybeSingle();
    if (error) return { ok: false, error: error.message };
    ref = data as { id: string } | null;
  }
  if (!ref && tenKhoa) {
    const { data, error } = await sb.from("dm_khoa_phong").select("id").eq("ten_khoa", tenKhoa).maybeSingle();
    if (error) return { ok: false, error: error.message };
    ref = data as { id: string } | null;
  }
  if (!ref && nameGuess) ref = await lookupKhoaByTenFlexible(sb, nameGuess);

  const debugBits = raw || maKhoaCol || tenKhoa || nameGuess;
  if (!ref) return { ok: false, error: `Không tìm thấy khoa sử dụng (ghi rõ ma_khoa trong cột \"Mã khoa\", hoặc ten_khoa_su_dung / tên khoa đầy đủ trong cột đúng). Gợi ý ô đang gây nhầm: ${debugBits}.` };

  out.khoa_su_dung_id = ref.id;
  delete (out as Record<string, unknown>).ma_khoa_su_dung;
  delete (out as Record<string, unknown>).ten_khoa_su_dung;
  return { ok: true, row: out };
}

export async function resolveKhoiForKhoaPhongImport(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<{ ok: true; row: Record<string, unknown> } | { ok: false; error: string }> {
  const sb = supabase;
  const out = { ...row };
  const maKhoiRaw = String((out.ma_khoi ?? "") || "").trim();
  let tenKhoi = String((out.ten_khoi ?? "") || "").trim();
  if (!maKhoiRaw && !tenKhoi) return { ok: true, row: out };

  async function lookupByTen(name: string) {
    const t = name.trim();
    if (!t) return null as { id: string } | null;
    const ex = await sb.from("dm_khoi_khoa").select("id").eq("ten_khoi", t).maybeSingle();
    if (ex.error) return null;
    if (ex.data?.id) return ex.data as { id: string };
    const like = await sb
      .from("dm_khoi_khoa")
      .select("id")
      .ilike("ten_khoi", `%${t.replace(/%/g, "\\%")}%`)
      .limit(1)
      .maybeSingle();
    if (!like.error && like.data?.id) return like.data as { id: string };
    return null;
  }

  let data: { id: string } | null = null;
  const maProbe = maKhoiRaw.toUpperCase();

  if (maKhoiRaw && looksLikeShortBusinessCode(maKhoiRaw)) {
    const r = await sb.from("dm_khoi_khoa").select("id").eq("ma_khoi", maProbe).maybeSingle();
    if (r.error) return { ok: false, error: r.error.message };
    data = (r.data as { id: string }) || null;
  }
  if (!data && maKhoiRaw && !looksLikeShortBusinessCode(maKhoiRaw) && !tenKhoi) tenKhoi = maKhoiRaw;

  if (!data && tenKhoi) data = await lookupByTen(tenKhoi);

  if (!data?.id) {
    out.khoi_id = null;
    out.__import_notes__ = `ma_khoi/ten_khoi không khớp danh mục KHOI_KHOA (${maProbe || tenKhoi}) -> để trống khoi_id.`;
    delete (out as Record<string, unknown>).ma_khoi;
    delete (out as Record<string, unknown>).ten_khoi;
    return { ok: true, row: out };
  }
  out.khoi_id = data.id;
  delete (out as Record<string, unknown>).ma_khoi;
  delete (out as Record<string, unknown>).ten_khoi;
  return { ok: true, row: out };
}

export async function resolveLoaiDungCuForChiTietImport(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<{ ok: true; row: Record<string, unknown> } | { ok: false; error: string }> {
  const sb = supabase;
  const out = { ...row };
  const raw = String(out.loai_dung_cu_id || "").trim();
  const maLoai = String((out.ma_loai_dung_cu ?? "") || "").trim().toUpperCase();
  const tenLoai = String((out.ten_loai_dung_cu ?? "") || "").trim();
  if (!raw && !maLoai && !tenLoai) return { ok: true, row: { ...out, loai_dung_cu_id: null } };
  if (raw && UUID_RE.test(raw)) return { ok: true, row: { ...out, loai_dung_cu_id: raw } };
  let ref: { id: string; ten_loai_dung_cu?: string } | null = null;
  const maLookup = raw && !UUID_RE.test(raw) ? raw.toUpperCase() : maLoai;
  if (maLookup) {
    const { data, error } = await sb
      .from("dm_loai_dung_cu")
      .select("id, ten_loai_dung_cu")
      .eq("ma_loai_dung_cu", maLookup)
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    ref = data as { id: string; ten_loai_dung_cu?: string } | null;
  }
  if (!ref && tenLoai) {
    const { data, error } = await sb
      .from("dm_loai_dung_cu")
      .select("id, ten_loai_dung_cu")
      .eq("ten_loai_dung_cu", tenLoai)
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    ref = data as { id: string; ten_loai_dung_cu?: string } | null;
  }
  if (!ref) return { ok: false, error: `Không tìm thấy loại dụng cụ từ loai_dung_cu_id/ma_loai_dung_cu/ten_loai_dung_cu (${raw || maLoai || tenLoai}).` };
  out.loai_dung_cu_id = ref.id;
  delete (out as Record<string, unknown>).ma_loai_dung_cu;
  delete (out as Record<string, unknown>).ten_loai_dung_cu;
  return { ok: true, row: out };
}
