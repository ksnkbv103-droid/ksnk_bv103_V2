export type MasterOption = {
  id: string;
  ma_danh_muc: string;
  ten_danh_muc: string;
  loai_danh_muc: string;
  source: "registry_lookup" | "mdm_dm_khoa_phong" | "mdm_dm_nghe_nghiep";
  is_active?: boolean;
  nhom_mau?: string | null;
  thu_tu?: number | null;
};

type KhoaRow = { id?: string; ma_khoa?: string; ten_khoa?: string; is_active?: boolean };
type DanhMucRow = { id?: string; ma_danh_muc?: string; ten_danh_muc?: string; is_active?: boolean };
type NhanSuDisplayRow = { id?: string; ho_ten?: string };
type NgheDisplayRow = { id?: string; ten_nghe_nghiep?: string };
type QueryPayload = { data: unknown[] | null; error: { message?: string } | null };
type QueryResultLike = PromiseLike<QueryPayload>;
type SelectChain = {
  in: (column: string, values: string[]) => QueryResultLike;
  eq: (column: string, value: string) => SelectChain;
};
type SupabaseMinimal = {
  from: (table: string) => {
    select: (columns: string) => SelectChain;
  };
};

type DisplayMaps = {
  khoaMap: Map<string, string>;
  nhanSuMap: Map<string, string>;
  ngheMap: Map<string, string>;
};

export function toDistinctIds(values: unknown[]): string[] {
  return Array.from(new Set((values || []).map((x) => String(x || "").trim()).filter(Boolean)));
}

export function mapKhoaOptions(rows: KhoaRow[]): MasterOption[] {
  return (rows || []).map((x) => ({
    id: String(x.id || ""),
    ma_danh_muc: String(x.ma_khoa || ""),
    ten_danh_muc: String(x.ten_khoa || ""),
    loai_danh_muc: "KHOA_PHONG",
    source: "mdm_dm_khoa_phong",
    is_active: x.is_active,
  }));
}

export function mapDanhMucOptions(rows: DanhMucRow[], loai: string): MasterOption[] {
  return (rows || []).map((x) => ({
    id: String(x.id || ""),
    ma_danh_muc: String(x.ma_danh_muc || ""),
    ten_danh_muc: String(x.ten_danh_muc || ""),
    loai_danh_muc: loai,
    source: "registry_lookup",
    is_active: x.is_active,
  }));
}

export async function buildDisplayMaps(
  supabase: SupabaseMinimal,
  input: {
    khoaIds?: string[];
    nhanSuIds?: string[];
    ngheIds?: string[];
  }
): Promise<DisplayMaps> {
  const khoaIds = toDistinctIds(input.khoaIds || []);
  const nhanSuIds = toDistinctIds(input.nhanSuIds || []);
  const ngheIds = toDistinctIds(input.ngheIds || []);

  const [khoaRes, nhanSuRes, ngheRes] = (await Promise.all([
    khoaIds.length
      ? supabase.from("mdm_dm_khoa_phong").select("id, ten_khoa").in("id", khoaIds)
      : Promise.resolve({ data: [], error: null }),
    nhanSuIds.length
      ? supabase.from("mdm_nhan_su").select("id, ho_ten").in("id", nhanSuIds)
      : Promise.resolve({ data: [], error: null }),
    ngheIds.length
      ? supabase.from("mdm_dm_nghe_nghiep").select("id, ten_nghe_nghiep").in("id", ngheIds)
      : Promise.resolve({ data: [], error: null }),
  ])) as [QueryPayload, QueryPayload, QueryPayload];

  if (khoaRes.error) throw khoaRes.error;
  if (nhanSuRes.error) throw nhanSuRes.error;
  if (ngheRes.error) throw ngheRes.error;

  const khoaMap = new Map<string, string>();
  const nhanSuMap = new Map<string, string>();
  const ngheMap = new Map<string, string>();

  const khoaRows = (khoaRes.data || []) as KhoaRow[];
  const nhanSuRows = (nhanSuRes.data || []) as NhanSuDisplayRow[];
  const ngheRows = (ngheRes.data || []) as NgheDisplayRow[];

  khoaRows.forEach((x) => khoaMap.set(String(x.id), String(x.ten_khoa || "")));
  nhanSuRows.forEach((x) => nhanSuMap.set(String(x.id), String(x.ho_ten || "")));
  ngheRows.forEach((x) => ngheMap.set(String(x.id), String(x.ten_nghe_nghiep || "")));

  return { khoaMap, nhanSuMap, ngheMap };
}
