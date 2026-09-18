"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, ClipboardList, Stethoscope, ChevronRight } from "lucide-react";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { usePermission } from "@/hooks/usePermission";
import {
  NAV_GATE_GSC,
  NAV_GATE_NKBV,
  NAV_GATE_VST,
  canSeeNavGate,
} from "@/lib/nav/ksnk-nav-gates";
import { pickSoleWriteHrefForMode } from "@/lib/nav/giam-sat-write-dest";

type HubLink = {
  href: string;
  label: string;
  hint: string;
  icon: typeof Stethoscope;
  visible: boolean;
};

function WriteCta({ link, emphasize }: { link: HubLink; emphasize: boolean }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      prefetch={false}
      className={`group flex touch-manipulation items-center gap-3 rounded-[var(--radius-shell)] border transition-colors active:scale-[0.99] ${
        emphasize
          ? "min-h-[4.5rem] border-[var(--primary)]/35 bg-[var(--primary)] px-4 py-3.5 text-white shadow-md shadow-[var(--primary)]/20 hover:bg-[var(--primary-hover)]"
          : `${bv103LayoutChrome.panelSurface} min-h-[3.75rem] px-4 py-3 hover:border-[var(--primary)]/35 hover:bg-slate-50/90`
      }`}
    >
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          emphasize ? "bg-white/15" : "bg-[var(--primary)]/10 text-[var(--primary)]"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-base font-semibold leading-snug ${
            emphasize ? "text-white" : "text-slate-900 group-hover:text-[var(--primary)]"
          }`}
        >
          {link.label}
        </span>
        <span
          className={`mt-0.5 block text-[12px] leading-snug ${
            emphasize ? "text-white/85" : "text-slate-500"
          }`}
        >
          {link.hint}
        </span>
      </span>
      <ChevronRight
        className={`h-5 w-5 shrink-0 ${emphasize ? "text-white/80" : "text-slate-300 group-hover:text-[var(--primary)]"}`}
        aria-hidden
      />
    </Link>
  );
}

function QuietLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-white hover:text-[var(--primary)]"
    >
      {label}
      <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
    </Link>
  );
}

export default function GiamSatHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, isAdmin, canView } = usePermission(undefined, "view");
  const seeVst = !loading && canSeeNavGate(isAdmin, canView, NAV_GATE_VST);
  const seeGsc = !loading && canSeeNavGate(isAdmin, canView, NAV_GATE_GSC);
  const seeNkbv = !loading && canSeeNavGate(isAdmin, canView, NAV_GATE_NKBV);

  /** P0 giản hóa: 2 CTA chính VST · GSC; NKBV tách «Khác». */
  const primaryWrites: HubLink[] = useMemo(
    () => [
      {
        href: "/giam-sat-vst",
        label: "Vệ sinh tay",
        hint: "Nhập phiên WHO",
        icon: Stethoscope,
        visible: seeVst,
      },
      {
        href: "/giam-sat-chung/tuan-thu",
        label: "Giám sát tuân thủ",
        hint: "Nhập bảng kiểm",
        icon: ClipboardList,
        visible: seeGsc,
      },
    ],
    [seeVst, seeGsc],
  );

  const otherWrites: HubLink[] = useMemo(
    () => [
      {
        href: "/giam-sat-nkbv",
        label: "NKBV (nhiễm khuẩn bệnh viện)",
        hint: "Nhập ca / vi sinh",
        icon: Activity,
        visible: seeNkbv,
      },
    ],
    [seeNkbv],
  );

  const quietLinks = useMemo(() => {
    const out: { href: string; label: string; show: boolean }[] = [
      { href: "/lich-su/vst", label: "Lịch sử VST", show: seeVst },
      { href: "/thong-ke/vst", label: "Thống kê VST", show: seeVst },
      { href: "/lich-su/gsc", label: "Lịch sử GSC", show: seeGsc },
      { href: "/thong-ke/gsc", label: "Thống kê GSC", show: seeGsc },
      { href: "/qr", label: "Quét QR", show: seeVst || seeGsc || seeNkbv },
      { href: "/giam-sat-nkbv?tab=cases", label: "Danh sách NKBV", show: seeNkbv },
    ];
    return out.filter((l) => l.show);
  }, [seeVst, seeGsc, seeNkbv]);

  const visiblePrimary = primaryWrites.filter((l) => l.visible);
  const visibleOther = otherWrites.filter((l) => l.visible);
  const hasAny = visiblePrimary.length > 0 || visibleOther.length > 0 || quietLinks.length > 0;
  const soleWrite = visiblePrimary.length === 1 && visibleOther.length === 0;
  const visibleWriteHrefs = useMemo(
    () => [...visiblePrimary, ...visibleOther].map((l) => l.href),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- href list from permission flags
    [seeVst, seeGsc, seeNkbv],
  );
  const modeParam = searchParams.get("mode");

  useEffect(() => {
    if (loading) return;
    const target = pickSoleWriteHrefForMode(modeParam, visibleWriteHrefs);
    if (target) router.replace(target);
  }, [loading, router, modeParam, visibleWriteHrefs]);

  return (
    <div className={`${T.pageOuter} space-y-[var(--bv103-space-3)]`}>
      {!loading && !hasAny ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Tài khoản chưa có quyền giám sát. Liên hệ khoa KSNK.
        </p>
      ) : null}

      {visiblePrimary.length > 0 ? (
        <section className="space-y-2">
          <h2 className="bv103-type-label">Nhập giám sát</h2>
          <p className="text-[11px] text-slate-500">Chọn một loại — VST hoặc bảng kiểm tuân thủ.</p>
          <div className={`grid gap-2 ${soleWrite ? "max-w-xl" : "sm:grid-cols-2"}`}>
            {visiblePrimary.map((link) => (
              <WriteCta key={link.href} link={link} emphasize={soleWrite} />
            ))}
          </div>
        </section>
      ) : null}

      {visibleOther.length > 0 ? (
        <section className="space-y-2">
          <h2 className="bv103-type-label">Khác</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleOther.map((link) => (
              <WriteCta key={link.href} link={link} emphasize={false} />
            ))}
          </div>
        </section>
      ) : null}

      {quietLinks.length > 0 ? (
        <section className={`${bv103LayoutChrome.panelInset} px-3 py-2`}>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Lịch sử · Thống kê · QR
          </p>
          <div className="flex flex-wrap gap-0.5">
            {quietLinks.map((l) => (
              <QuietLink key={l.href + l.label} href={l.href} label={l.label} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
