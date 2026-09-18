"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { lookupAccountAccessRequestStatusAction } from "@/modules/quan-tri-he-thong/nhan-su/actions/account-access-request.actions";

const STATUS_LABEL: Record<string, string> = {
  CHO_DUYET: "Chờ duyệt",
  DUYET: "Đã duyệt",
  TU_CHOI: "Từ chối",
};

const KIND_LABEL: Record<string, string> = {
  REQUEST: "Xin cấp tài khoản",
  RESET: "Xin đặt lại mật khẩu",
};

export default function TraCuuYeuCauPage() {
  const [email, setEmail] = useState("");
  const [maNv, setMaNv] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    | { found: false }
    | { found: true; status: string; kind: string; reject_reason: string | null; ticket_code: string | null }
    | null
  >(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await lookupAccountAccessRequestStatusAction({
        email,
        ma_nv: maNv || undefined,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      if (!res.found) {
        setResult({ found: false });
        return;
      }
      setResult({
        found: true,
        status: res.status,
        kind: res.kind,
        reject_reason: res.reject_reason,
        ticket_code: res.ticket_code ?? null,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-[var(--radius-shell)] border border-slate-100 bg-white p-8 shadow-[var(--shadow-app-soft)]">
          <h1 className={`text-center ${T.authTitle}`}>Tra cứu yêu cầu</h1>
          <p className={`mt-2 text-center ${T.authSubtitle}`}>
            Nhập email (và mã NV nếu có) để xem trạng thái phiếu xin cấp tài khoản hoặc xin đặt lại mật khẩu.
          </p>
          <form className="mt-8 space-y-[var(--bv103-space-3)]" onSubmit={(e) => void onSubmit(e)}>
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
            <button type="submit" disabled={loading} className={`w-full ${T.btnPrimary}`}>
              {loading ? "Đang tra…" : "Tra cứu"}
            </button>
          </form>

          {result && !result.found ? (
            <p className="mt-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center text-sm text-slate-700">
              Không tìm thấy yêu cầu phù hợp với thông tin đã nhập.
            </p>
          ) : null}

          {result && result.found ? (
            <div className="mt-6 space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-800">
              {result.ticket_code ? (
                <p>
                  <span className="text-slate-500">Mã phiếu:</span>{" "}
                  <strong className="font-mono">{result.ticket_code}</strong>
                </p>
              ) : null}
              <p>
                <span className="text-slate-500">Loại:</span>{" "}
                <strong>{KIND_LABEL[result.kind] || result.kind}</strong>
              </p>
              <p>
                <span className="text-slate-500">Trạng thái:</span>{" "}
                <strong>{STATUS_LABEL[result.status] || result.status}</strong>
              </p>
              {result.status === "TU_CHOI" && result.reject_reason ? (
                <p>
                  <span className="text-slate-500">Lý do từ chối:</span> {result.reject_reason}
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-sm">
            <Link href="/login" className="font-medium text-[var(--primary)] underline">
              Đăng nhập
            </Link>
            <Link href="/login/xin-cap-tai-khoan" className="font-medium text-[var(--primary)] underline">
              Xin cấp TK
            </Link>
            <Link href="/login/forgot-password" className="font-medium text-[var(--primary)] underline">
              Quên mật khẩu
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
