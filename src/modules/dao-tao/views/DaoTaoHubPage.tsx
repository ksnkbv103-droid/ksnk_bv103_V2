"use client";

import Link from "next/link";
import {
  BookOpen,
  ClipboardCheck,
  FileSpreadsheet,
  Gauge,
  GraduationCap,
  ListChecks,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import { useModulePermission } from "@/hooks/useModulePermission";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import {
  DaoTaoHeader,
  DaoTaoPage,
  DaoTaoPanel,
} from "@/modules/dao-tao/components/DaoTaoChrome";

const TILES = [
  {
    href: "/dao-tao/thi-thu",
    title: "Thi thử",
    desc: "Ôn tập theo mức độ",
    icon: PenLine,
  },
  {
    href: "/dao-tao/thi-that",
    title: "Thi thật",
    desc: "Kỳ thi được phân công",
    icon: ClipboardCheck,
  },
] as const;

const ADMIN_LINKS = [
  { href: "/dao-tao/admin/ngan-hang", label: "Ngân hàng câu hỏi", icon: BookOpen },
  { href: "/dao-tao/admin/muc-do", label: "Mức độ thi thử", icon: Gauge },
  { href: "/dao-tao/admin/ky-thi", label: "Kỳ thi thật", icon: ListChecks },
  { href: "/dao-tao/admin/ket-qua", label: "Kết quả thi thật", icon: FileSpreadsheet },
] as const;

export default function DaoTaoHubPage() {
  const { allowed, isAdmin, loading } = useModulePermission("DAO_TAO");
  const canAdmin = isAdmin || allowed.edit || allowed.import || allowed.create;

  if (loading) {
    return (
      <DaoTaoPage>
        <div className={T.skeletonBlock + " h-40"} />
      </DaoTaoPage>
    );
  }

  if (!allowed.view && !isAdmin) {
    return (
      <DaoTaoPage>
        <DaoTaoPanel>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-slate-400" aria-hidden />
            <div>
              <p className={T.sectionTitle}>Chưa có quyền Đào tạo</p>
              <p className="mt-1 text-sm text-slate-600">
                Liên hệ quản trị viên để được cấp quyền module <span className="font-mono text-xs">DAO_TAO</span>.
              </p>
            </div>
          </div>
        </DaoTaoPanel>
      </DaoTaoPage>
    );
  }

  return (
    <DaoTaoPage>
      <DaoTaoHeader
        backHref={null}
        title={
          <span className="inline-flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-[var(--primary)]" aria-hidden />
            Đào tạo / Thi KSNK
          </span>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.href}
              href={tile.href}
              title={tile.desc}
              className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-[var(--primary)]/35 hover:text-[var(--primary)]"
            >
              <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span className="min-w-0 truncate">{tile.title}</span>
              <span className="ml-auto hidden text-[11px] font-normal text-slate-500 sm:inline">{tile.desc}</span>
            </Link>
          );
        })}
      </div>

      {canAdmin ? (
        <DaoTaoPanel className="!p-4 sm:!p-4">
          <p className={T.navGroupLabel}>Quản trị</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ADMIN_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[var(--primary)]/30 hover:bg-white hover:text-[var(--primary)]"
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </DaoTaoPanel>
      ) : null}
    </DaoTaoPage>
  );
}
