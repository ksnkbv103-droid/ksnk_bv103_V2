"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { GUEST_STATS_PILOT_EMAIL } from "@/lib/auth/guest-stats-pilot";
import {
  getGuestStatsPilotStatusAction,
  setupGuestStatsPilotAccountAction,
  type GuestStatsPilotStatus,
} from "../actions/tai-khoan-nhan-su.actions";

export default function GuestStatsAccountCard({ onUpdated }: { onUpdated?: () => void }) {
  const [status, setStatus] = useState<GuestStatsPilotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState(GUEST_STATS_PILOT_EMAIL);
  const [password, setPassword] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    const res = await getGuestStatsPilotStatusAction();
    setLoading(false);
    if (!res.success) {
      toast.error(res.error || "Không tải được trạng thái tài khoản khách.");
      return;
    }
    setStatus(res.status);
    if (res.status.email) setEmail(res.status.email);
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const onSetup = async () => {
    if (password.length < 8) {
      toast.error("Mật khẩu tối thiểu 8 ký tự.");
      return;
    }
    setSubmitting(true);
    const res = await setupGuestStatsPilotAccountAction({ password, email });
    setSubmitting(false);
    if (!res.success) {
      toast.error(res.error || "Không thiết lập được tài khoản khách.");
      return;
    }
    toast.success(`Đã thiết lập tài khoản khách (${res.email}). Khách có thể đăng nhập trên Vercel.`);
    setPassword("");
    void loadStatus();
    onUpdated?.();
  };

  const ready = Boolean(status?.hasAuth && status?.hasGuestRole);

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-violet-950">Tài khoản khách xem Thống kê (Vercel / cloud)</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-violet-900/80">
            Chỉ xem Thống kê VST/GSC — không nhập liệu. Dùng khi môi trường cloud chưa có user từ seed local.
          </p>
        </div>
        {loading ? (
          <span className="text-xs text-violet-700">Đang kiểm tra…</span>
        ) : ready ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            Sẵn sàng đăng nhập
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
            Chưa thiết lập đủ
          </span>
        )}
      </div>

      {!loading && status ? (
        <ul className="mt-3 grid gap-1 text-xs text-violet-900/90 sm:grid-cols-3">
          <li>Hồ sơ {status.ma_nv}: {status.hasStaff ? "Có" : "Chưa"}</li>
          <li>Tài khoản Auth: {status.hasAuth ? "Có" : "Chưa"}</li>
          <li>Vai trò Khách: {status.hasGuestRole ? "Có" : "Chưa"}</li>
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-violet-900">Email đăng nhập</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bv103-control-h w-full rounded-lg border border-violet-200 bg-white px-3 text-sm"
            autoComplete="off"
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-violet-900">
            {ready ? "Mật khẩu mới" : "Mật khẩu ban đầu"}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tối thiểu 8 ký tự"
            className="bv103-control-h w-full rounded-lg border border-violet-200 bg-white px-3 text-sm"
            autoComplete="new-password"
          />
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void onSetup()}
          className="bv103-control-h shrink-0 rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
        >
          {submitting ? "Đang lưu…" : ready ? "Cập nhật mật khẩu" : "Thiết lập tài khoản khách"}
        </button>
      </div>
    </section>
  );
}
