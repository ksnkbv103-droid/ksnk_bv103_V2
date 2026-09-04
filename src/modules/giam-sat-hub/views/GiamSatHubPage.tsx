"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, ClipboardList, History, QrCode, Stethoscope, ChevronRight } from "lucide-react";
import { KsnkSupervisionHero } from "@/components/shared/ksnk-supervision-chrome";
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

function ReadLinkRow({ link }: { link: HubLink }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      prefetch={false}
      className="group flex min-h-11 touch-manipulation items-center gap-2.5 rounded-[var(--radius-control)] border border-transparent px-2 py-2 transition-colors hover:border-slate-200 hover:bg-white active:scale-[0.99]"
    >
      <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[var(--primary)]" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800 group-hover:text-[var(--primary)]">
          {link.label}
        </span>
        <span className="block text-[11px] text-slate-500 line-clamp-1">{link.hint}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
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

  const writeLinks: HubLink[] = useMemo(
    () => [
      {
        href: "/giam-sat-vst",
        label: "Vệ sinh tay (WHO)",
        hint: "Nhập phiên quan sát",
        icon: Stethoscope,
        visible: seeVst,
      },
      {
        href: "/giam-sat-chung/tuan-thu",
        label: "Giám sát tuân thủ KSNK",
        hint: "Nhập bảng kiểm tuân thủ",
        icon: ClipboardList,
        visible: seeGsc,
      },
      {
        href: "/giam-sat-nkbv",
        label: "Giám sát NKBV",
        hint: "Nhập sự kiện / vi sinh",
        icon: Activity,
        visible: seeNkbv,
      },
    ],
    [seeVst, seeGsc, seeNkbv],
  );

  const readLinks: HubLink[] = useMemo(
    () => [
      {
        href: "/qr",
        label: "Quét QR truy vết",
        hint: "Mở lại phiếu / tem",
        icon: QrCode,
        visible: seeVst || seeGsc || seeNkbv,
      },
      { href: "/lich-su/vst", label: "Lịch sử VST", hint: "Phiên đã lưu", icon: History, visible: seeVst },
      { href: "/lich-su/gsc", label: "Lịch sử GSC", hint: "Phiên đã lưu", icon: History, visible: seeGsc },
      {
        href: "/giam-sat-nkbv?tab=cases",
        label: "Danh sách NKBV",
        hint: "Ca đã lưu",
        icon: History,
        visible: seeNkbv,
      },
    ],
    [seeVst, seeGsc, seeNkbv],
  );

  const visibleWrites = writeLinks.filter((l) => l.visible);
  const visibleReads = readLinks.filter((l) => l.visible);
  const hasAny = visibleWrites.length > 0 || visibleReads.length > 0;
  const soleWrite = visibleWrites.length === 1;
  const visibleWriteHrefs = useMemo(
    () => visibleWrites.map((l) => l.href),
    // seeVst/Gsc/Nkbv already gate writeLinks
    // eslint-disable-next-line react-hooks/exhaustive-deps -- href list from permission flags
    [seeVst, seeGsc, seeNkbv],
  );
  const modeParam = searchParams.get("mode");

  // mode=write + đúng 1 đích ghi → bỏ click hub thừa (SXHD).
  useEffect(() => {
    if (loading) return;
    const target = pickSoleWriteHrefForMode(modeParam, visibleWriteHrefs);
    if (target) router.replace(target);
  }, [loading, router, modeParam, visibleWriteHrefs]);

  return (
    <div className={`${T.pageOuter}`}>
      <KsnkSupervisionHero
        eyebrow="Giám sát"
        title="Giám sát"
        description={
          soleWrite
            ? "Một phân hệ — chạm để nhập liệu."
            : "Chọn phân hệ để nhập liệu. Deep-link VST / GSC / NKBV vẫn mở form trực tiếp."
        }
      />
      {!loading && !hasAny ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Tài khoản chưa có quyền giám sát. Liên hệ khoa KSNK.
        </p>
      ) : null}

      {visibleWrites.length > 0 ? (
        <section className="space-y-2">
          <h2 className="bv103-type-label">Nhập liệu</h2>
          <div className={`grid gap-2 ${soleWrite ? "max-w-xl" : "sm:grid-cols-1 lg:grid-cols-3"}`}>
            {visibleWrites.map((link) => (
              <WriteCta key={link.href} link={link} emphasize={soleWrite} />
            ))}
          </div>
        </section>
      ) : null}

      {visibleReads.length > 0 ? (
        <section className="mt-[var(--bv103-space-3)] space-y-1.5">
          <h2 className="bv103-type-label">Mở lại phiếu</h2>
          <div className={`${bv103LayoutChrome.panelInset} divide-y divide-slate-100 px-2 py-1`}>
            {visibleReads.map((link) => (
              <ReadLinkRow key={link.href} link={link} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
