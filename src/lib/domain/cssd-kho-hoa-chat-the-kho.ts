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
};

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
 * Chỉ tính phiếu DA_DUYET (khớp view tồn). `tonHienTai` là tồn thật; nếu danh sách bị cắt
 * (limit) thì tồn đầu = tồn hiện tại − tổng các dòng đang có, nên tồn lũy kế luôn khớp tồn thật.
 */
export function buildTheKho(rows: TheKhoInput[], tonHienTai: number): TheKho {
  const ok = rows
    .filter((r) => r.trang_thai === "DA_DUYET" && Number.isFinite(r.so_luong_co_dau))
    .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")) || a.id.localeCompare(b.id));
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
      ngay: r.created_at,
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
