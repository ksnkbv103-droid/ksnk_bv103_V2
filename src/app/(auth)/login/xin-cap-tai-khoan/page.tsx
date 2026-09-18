"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import SearchableSelect from "@/components/shared/SearchableSelect";
import {
  listPublicChucDanhOptionsForAccountRequestAction,
  listPublicKhoaOptionsForAccountRequestAction,
  submitAccountAccessRequestAction,
} from "@/modules/quan-tri-he-thong/nhan-su/actions/account-access-request.actions";

type KhoaOpt = { id: string; ten_khoa: string; ma_khoa: string };
type ChucDanhOpt = { id: string; ten_chuc_danh: string; ma_chuc_danh: string };

export default function XinCapTaiKhoanPage() {
  const [hoTen, setHoTen] = useState("");
  const [maNv, setMaNv] = useState("");
  const [email, setEmail] = useState("");
  const [sdt, setSdt] = useState("");
  const [khoaId, setKhoaId] = useState("");
  const [chucDanhId, setChucDanhId] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [khoas, setKhoas] = useState<KhoaOpt[]>([]);
  const [chucDanhs, setChucDanhs] = useState<ChucDanhOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [ticketCode, setTicketCode] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      listPublicKhoaOptionsForAccountRequestAction(),
      listPublicChucDanhOptionsForAccountRequestAction(),
    ]).then(([khoaRes, cdRes]) => {
      if (khoaRes.success) setKhoas(khoaRes.data);
      if (cdRes.success) setChucDanhs(cdRes.data);
      if (!khoaRes.success) toast.error(khoaRes.error || "Không tải được danh mục khoa.");
      if (!cdRes.success) toast.error(cdRes.error || "Không tải được danh mục chức danh.");
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!khoaId) {
      toast.error("Chọn khoa / phòng từ danh mục.");
      return;
    }
    if (!chucDanhId) {
      toast.error("Chọn chức danh từ danh mục.");
      return;
    }
    setLoading(true);
    try {
      const res = await submitAccountAccessRequestAction({
        ho_ten: hoTen,
        email,
        khoa_id: khoaId,
        chuc_danh_id: chucDanhId,
        ma_nv: maNv || undefined,
        so_dien_thoai: sdt || undefined,
        ly_do: lyDo,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setDone(true);
      setTicketCode(res.ticket_code || null);
      toast.success("Đã gửi yêu cầu. Quản trị sẽ duyệt trước khi cấp tài khoản đăng nhập.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-[var(--radius-shell)] border border-slate-100 bg-white p-8 shadow-[var(--shadow-app-soft)]">
          <h1 className={`text-center ${T.authTitle}`}>Xin cấp tài khoản</h1>
          <p className={`mt-2 text-center ${T.authSubtitle}`}>
            Điền đúng khoa và chức danh theo danh mục để quản trị mở hồ sơ nhân sự và cấp quyền đăng nhập.
            Tài khoản chưa được tạo ngay — bạn nhận mật khẩu tạm sau khi được duyệt.
          </p>

          {done ? (
            <div className="mt-8 space-y-4 text-center">
              <p className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
                Yêu cầu đã được ghi nhận (trạng thái chờ duyệt).
                {ticketCode ? (
                  <>
                    {" "}
                    Mã phiếu: <strong className="font-mono">{ticketCode}</strong> — ghi lại để hỏi quản trị.
                  </>
                ) : (
                  <> Liên hệ quản trị KSNK nếu cần hỗ trợ.</>
                )}
              </p>
              <p className="text-sm text-slate-600">
                Tra cứu trạng thái tại{" "}
                <Link href="/login/tra-cuu-yeu-cau" className="font-medium text-[var(--primary)] underline">
                  /login/tra-cuu-yeu-cau
                </Link>
                .
              </p>
              <Link href="/login" className={`inline-flex ${T.btnPrimary}`}>
                Quay lại đăng nhập
              </Link>
            </div>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
              <div>
                <label className={T.authLabel}>Họ và tên *</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={hoTen}
                  onChange={(e) => setHoTen(e.target.value)}
                  className={T.authInput}
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className={T.authLabel}>Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={T.authInput}
                  placeholder="ten@bv103.vn"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className={T.authLabel}>Khoa / phòng *</label>
                <SearchableSelect
                  value={khoaId}
                  onChange={setKhoaId}
                  required
                  placeholder="Chọn khoa / phòng"
                  searchPlaceholder="Tìm khoa phòng…"
                  options={khoas.map((k) => ({
                    id: k.id,
                    label: k.ma_khoa ? `${k.ten_khoa} (${k.ma_khoa})` : k.ten_khoa,
                  }))}
                />
              </div>
              <div>
                <label className={T.authLabel}>Chức danh *</label>
                <SearchableSelect
                  value={chucDanhId}
                  onChange={setChucDanhId}
                  required
                  placeholder="Chọn chức danh"
                  searchPlaceholder="Tìm chức danh…"
                  options={chucDanhs.map((c) => ({
                    id: c.id,
                    label: c.ma_chuc_danh ? `${c.ten_chuc_danh} (${c.ma_chuc_danh})` : c.ten_chuc_danh,
                  }))}
                />
              </div>
              <div>
                <label className={T.authLabel}>Lý do xin cấp tài khoản *</label>
                <textarea
                  required
                  minLength={5}
                  rows={3}
                  value={lyDo}
                  onChange={(e) => setLyDo(e.target.value)}
                  className={`${T.authInput} min-h-[88px] resize-y`}
                  placeholder="Mô tả ngắn: công việc / đơn vị cần truy cập hệ thống…"
                />
              </div>
              <div>
                <label className={T.authLabel}>Mã nhân viên (tuỳ chọn)</label>
                <input
                  type="text"
                  value={maNv}
                  onChange={(e) => setMaNv(e.target.value)}
                  className={T.authInput}
                  placeholder="VD: NV001"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={T.authLabel}>Số điện thoại (tuỳ chọn)</label>
                <input
                  type="tel"
                  value={sdt}
                  onChange={(e) => setSdt(e.target.value)}
                  className={T.authInput}
                  placeholder="09…"
                  autoComplete="tel"
                />
              </div>
              <p className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                Không nhập mật khẩu hay phân quyền trên phiếu này. Quản trị mở hồ sơ (đã điền sẵn khoa/chức danh),
                gán vai trò hệ thống rồi duyệt cấp tài khoản.
              </p>
              <button type="submit" disabled={loading} className={`w-full ${T.btnPrimary}`}>
                {loading ? "Đang gửi…" : "Gửi yêu cầu"}
              </button>
            </form>
          )}

          {!done ? (
            <p className="mt-6 text-center text-sm">
              <Link href="/login" className="font-medium text-[var(--primary)] underline">
                Quay lại đăng nhập
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
