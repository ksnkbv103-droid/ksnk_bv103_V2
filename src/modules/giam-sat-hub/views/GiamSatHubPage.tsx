"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Building2, ClipboardList, Hand, ScrollText, Stethoscope, ChevronRight } from "lucide-react";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { VE_SINH_TAY_ENTRIES } from "@/lib/domain/ve-sinh-tay-catalog";
import { usePermission } from "@/hooks/usePermission";
import {
  NAV_GATE_GSC,
  NAV_GATE_NKBV,
  NAV_GATE_VST,
  canSeeNavGate,
} from "@/lib/nav/ksnk-nav-gates";
import { pickSoleWriteHrefForMode } from "@/lib/nav/giam-sat-write-dest";
import { isRouteInPilotScope } from "@/lib/ksnk-pilot-route-scope";
import { GSC_ROUTE_CHROME } from "@/modules/giam-sat-chung/lib/gsc-app-paths";
import { Bv103EmptyState } from "@/components/shared/Bv103EmptyState";

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
  const seeNkbv =
    !loading &&
    canSeeNavGate(isAdmin, canView, NAV_GATE_NKBV) &&
    isRouteInPilotScope("/giam-sat-nkbv");

  /** Khối Vệ sinh tay = 3 mẫu riêng (WHO + BM.07.02 + BM.07.03). */
  const veSinhTayLinks: HubLink[] = useMemo(
    () =>
      VE_SINH_TAY_ENTRIES.map((e) => ({
        href: e.href,
        label: e.label,
        hint: e.hint,
        icon: e.kind === "who" ? Hand : Stethoscope,
        visible: e.kind === "who" ? seeVst : seeGsc,
      })),
    [seeVst, seeGsc],
  );

  /** GSC chung — chuyên đề khác (PPE, bundle, …); không thay khối Vệ sinh tay. */
  const primaryWrites: HubLink[] = useMemo(
    () => [
      {
        href: GSC_ROUTE_CHROME.TUAN_THU.href,
        label: "Giám sát tuân thủ",
        hint: "Bảng kiểm chuyên đề khác",
        icon: ClipboardList,
        visible: seeGsc,
      },
      {
        href: GSC_ROUTE_CHROME.NHAT_KY_VAN_HANH.href,
        label: "Nhật ký vận hành",
        hint: "Số liệu thiết bị và môi trường",
        icon: ScrollText,
        visible: seeGsc,
      },
      {
        href: GSC_ROUTE_CHROME.DANH_GIA_HE_THONG.href,
        label: "Đánh giá hệ thống",
        hint: "SOP và thanh tra nội bộ",
        icon: Building2,
        visible: seeGsc,
      },
    ],
    [seeGsc],
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
      { href: "/lich-su/gsc", label: "Lịch sử giám sát chung", show: seeGsc },
      { href: "/thong-ke/gsc", label: "Thống kê giám sát chung", show: seeGsc },
      { href: "/qr", label: "Quét QR", show: seeVst || seeGsc || seeNkbv },
      { href: "/giam-sat-nkbv?tab=cases", label: "Danh sách phiếu NKBV", show: seeNkbv },
    ];
    return out.filter((l) => l.show);
  }, [seeVst, seeGsc, seeNkbv]);

  const visibleVeSinhTay = veSinhTayLinks.filter((l) => l.visible);
  const visiblePrimary = primaryWrites.filter((l) => l.visible);
  const visibleOther = otherWrites.filter((l) => l.visible);
  const hasAny =
    visibleVeSinhTay.length > 0 ||
    visiblePrimary.length > 0 ||
    visibleOther.length > 0 ||
    quietLinks.length > 0;

  /** Sole-write: chỉ WHO hoặc chỉ GSC chung hoặc chỉ NKBV — khớp write-dest registry. */
  const visibleWriteHrefs = useMemo(() => {
    const hrefs: string[] = [];
    if (seeVst) hrefs.push("/giam-sat-vst");
    if (seeGsc) hrefs.push("/giam-sat-chung/tuan-thu");
    if (seeNkbv) hrefs.push("/giam-sat-nkbv");
    return hrefs;
  }, [seeVst, seeGsc, seeNkbv]);
  const modeParam = searchParams.get("mode");

  useEffect(() => {
    if (loading) return;
    const target = pickSoleWriteHrefForMode(modeParam, visibleWriteHrefs);
    if (target) router.replace(target);
  }, [loading, router, modeParam, visibleWriteHrefs]);

  return (
    <div className={`${T.pageOuter} space-y-[var(--bv103-space-3)]`}>
      {!loading && !hasAny ? (
        <Bv103EmptyState
          title="Tài khoản chưa có quyền giám sát. Liên hệ khoa KSNK."
          action={
            <Link href="/bao-cao-tong-hop" prefetch={false} className={bv103LayoutChrome.btnPrimary}>
              Về Báo cáo chính thức
            </Link>
          }
        />
      ) : null}

      {visibleVeSinhTay.length > 0 ? (
        <section className="space-y-2">
          <h2 className="bv103-type-label">Vệ sinh tay</h2>
          <p className="text-[11px] text-slate-500">
            Ba mẫu riêng — WHO 5 thời điểm · kỹ thuật thường quy · ngoại khoa. Không gộp một form.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {visibleVeSinhTay.map((link) => (
              <WriteCta key={link.href} link={link} emphasize={false} />
            ))}
          </div>
        </section>
      ) : null}

      {visiblePrimary.length > 0 ? (
        <section className="space-y-2">
          <h2 className="bv103-type-label">Nhập giám sát khác</h2>
          <p className="text-[11px] text-slate-500">
            Ba loại giám sát chung: tuân thủ, nhật ký vận hành, đánh giá hệ thống.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {visiblePrimary.map((link) => (
              <WriteCta key={link.href} link={link} emphasize={false} />
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
          <p className="mb-1 text-[11px] leading-snug text-slate-500">
            Thống kê khoa và tra cứu ca. Bản ký gửi Ban Giám đốc ở{" "}
            <Link href="/bao-cao-tong-hop" prefetch={false} className="font-medium text-[var(--primary)] underline">
              Báo cáo chính thức
            </Link>
            .
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
