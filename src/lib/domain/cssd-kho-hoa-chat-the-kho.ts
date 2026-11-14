/** Thẻ kho một mặt hàng: sổ nhập, xuất đã duyệt kèm tồn lũy kế. Thuần, không I/O. */

export type TheKhoInput = {
  id: string;
  ma_phieu: string;
  loai_giao_dich: string;
  so_luong_co_dau: number;
  ma_lo: string | null;
  han_su_dung: string | null;
  ly_do_xuat?: string | null;
  trang_thai?: string | null;
  created_at: string | null;
  duyet_at?: string | null;
};

export type NgayHieuLucInput = Pick<TheKhoInput, "id" | "created_at" | "duyet_at">;

/** Ngày hiệu lực = lúc tồn thật sự đổi: `duyet_at`; phiếu cũ chưa có `duyet_at` thì `created_at` (CSSD-033, CSSD-036). */
export function ngayHieuLuc(r: Pick<TheKhoInput, "created_at" | "duyet_at">): string | null {
  return r.duyet_at ?? r.created_at;
}

const epoch = (iso: string | null): number => {
  const t = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
};

/**
 * So tăng dần theo thời điểm thật của ngày hiệu lực, hòa thì theo id. Không so chuỗi: PostgREST trả `+00:00`,
 * phần lẻ giây dài ngắn khác nhau nên `localeCompare` xếp sai.
 */
export function soSanhHieuLuc(a: NgayHieuLucInput, b: NgayHieuLucInput): number {
  const ta = epoch(ngayHieuLuc(a));
  const tb = epoch(ngayHieuLuc(b));
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.id.localeCompare(b.id);
}

export type TheKhoDong = {
  id: string;
  ngay: string | null;
  ma_phieu: string;
  loai: string;
  ma_lo: string | null;
  han_su_dung: string | null;
  ly_do_xuat: string | null;
  nhap: number;
  xuat: number;
  ton_sau: number;
};

export type TheKho = { ton_dau: number; dong: TheKhoDong[]; tong_nhap: number; tong_xuat: number; ton_cuoi: number };

/**
 * Chỉ tính phiếu DA_DUYET (khớp view tồn). Tồn chỉ đổi lúc DUYỆT nên xếp và ghi ngày theo `ngayHieuLuc`,
 * không theo ngày lập (CSSD-036). `tonHienTai` là tồn thật; nếu danh sách bị cắt (limit) thì tồn đầu =
 * tồn hiện tại − tổng các dòng đang có, nên tồn lũy kế luôn khớp tồn thật (từng dòng đúng khi `rows` là
 * đoạn cuối của thứ tự ngày hiệu lực — action thẻ kho lấy cửa sổ cùng khóa).
 */
export function buildTheKho(rows: TheKhoInput[], tonHienTai: number): TheKho {
  const ok = rows
    .filter((r) => r.trang_thai === "DA_DUYET" && Number.isFinite(r.so_luong_co_dau))
    .sort(soSanhHieuLuc);
  const tong = ok.reduce((s, r) => s + r.so_luong_co_dau, 0);
  const tonDau = tonHienTai - tong;
  let ton = tonDau;
  let tongNhap = 0;
  let tongXuat = 0;
  const dong = ok.map((r) => {
    const q = r.so_luong_co_dau;
    ton += q;
    if (q > 0) tongNhap += q;
    else tongXuat += -q;
    return {
      id: r.id,
      ngay: ngayHieuLuc(r),
      ma_phieu: r.ma_phieu,
      loai: r.loai_giao_dich,
      ma_lo: r.ma_lo,
      han_su_dung: r.han_su_dung,
      ly_do_xuat: r.ly_do_xuat ?? null,
      nhap: q > 0 ? q : 0,
      xuat: q < 0 ? -q : 0,
      ton_sau: ton,
    };
  });
  return { ton_dau: tonDau, dong, tong_nhap: tongNhap, tong_xuat: tongXuat, ton_cuoi: ton };
}
