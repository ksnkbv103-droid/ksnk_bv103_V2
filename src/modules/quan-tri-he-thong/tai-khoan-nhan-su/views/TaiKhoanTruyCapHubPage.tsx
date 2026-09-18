"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, Users, Shield, BookOpen, ClipboardList } from "lucide-react";
import { countPendingAccountRequestsAction } from "@/modules/quan-tri-he-thong/nhan-su/actions/account-access-request.actions";
import GuestStatsAccountCard from "../components/GuestStatsAccountCard";
import { quanTriHubHref } from "@/lib/master-data/quan-tri-paths";

/**
 * Hub nhẹ «Tài khoản & truy cập» — phiếu chờ, lối tắt Nhân sự / Phân quyền / đổi MK.
 */
export default function TaiKhoanTruyCapHubPage() {
  const [pending, setPending] = useState<number | null>(null);
  const [pendingErr, setPendingErr] = useState<string | null>(null);

  useEffect(() => {
    void countPendingAccountRequestsAction().then((res) => {
      if (!res.success) {
        setPendingErr(res.error || "Không tải được số phiếu chờ.");
        setPending(0);
        return;
      }
      setPending(res.count);
    });
  }, []);

  return (
    <div className="bv103-stack-page animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
      <p className="max-w-2xl text-sm text-slate-600">
        Cấp tài khoản, đặt lại mật khẩu và phân quyền. Hồ sơ nhân sự ở Nhân sự; đổi mật khẩu cá nhân tại trang của bạn.
      </p>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/quan-tri-he-thong/nhan-su?pending=1"
          className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm transition hover:border-amber-300 hover:bg-amber-50"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-white p-2 text-amber-700 shadow-sm">
              <ClipboardList size={18} aria-hidden />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900">Phiếu chờ duyệt</div>
              <p className="mt-1 text-xs text-slate-600">
                Xin cấp TK và xin admin đặt lại MK — lọc «Chỉ chờ duyệt» trên Nhân sự.
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-amber-900">
                {pending == null ? "…" : pending}
              </p>
              {pendingErr ? <p className="mt-1 text-[11px] text-rose-600">{pendingErr}</p> : null}
            </div>
          </div>
        </Link>

        <Link
          href="/quan-tri-he-thong/nhan-su"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-slate-50 p-2 text-slate-700">
              <Users size={18} aria-hidden />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900">Nhân sự</div>
              <p className="mt-1 text-xs text-slate-600">
                Tạo TK, đặt lại MK, duyệt / từ chối phiếu trên cột Tài khoản.
              </p>
            </div>
          </div>
        </Link>

        <Link
          href={quanTriHubHref("PHAN_QUYEN")}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-slate-50 p-2 text-slate-700">
              <Shield size={18} aria-hidden />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900">Phân quyền</div>
              <p className="mt-1 text-xs text-slate-600">Ma trận RBAC và gói quyền theo vai trò.</p>
            </div>
          </div>
        </Link>

        <Link
          href="/tai-khoan/doi-mat-khau"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-slate-50 p-2 text-slate-700">
              <KeyRound size={18} aria-hidden />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900">Đổi mật khẩu của tôi</div>
              <p className="mt-1 text-xs text-slate-600">
                Self-service khi đã biết mật khẩu hiện tại. Quên MK: email hoặc xin admin từ trang đăng nhập.
              </p>
            </div>
          </div>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-2">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BookOpen size={16} aria-hidden />
            Gợi ý vận hành
          </div>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
            <li>
              Đặt lại / duyệt MK: luôn nhập lại mật khẩu đăng nhập của bạn trước khi đổi mật khẩu người khác.
            </li>
            <li>
              Không dùng nút «Đặt lại MK» trên hồ sơ của chính mình — hãy đổi MK tại «Đổi mật khẩu của tôi»
              hoặc dùng quên mật khẩu / xin admin khác.
            </li>
            <li>
              Người dùng tra cứu phiếu tại{" "}
              <Link href="/login/tra-cuu-yeu-cau" className="font-medium text-[var(--primary)] underline">
                /login/tra-cuu-yeu-cau
              </Link>
              .
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-800">Tài khoản khách pilot</h2>
        <GuestStatsAccountCard />
      </section>
    </div>
  );
}
