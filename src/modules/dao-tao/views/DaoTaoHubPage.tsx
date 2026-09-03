"use client";

import { useEffect, useState } from "react";
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
import { labelCheDoThi } from "@/lib/dao-tao/labels";
import { formatDateTimeVi } from "@/lib/format-datetime-vi";
import { listLanThiCuaToi } from "@/modules/dao-tao/actions/dao-tao-attempt.actions";
import DaoTaoChungChiBanner from "@/modules/dao-tao/components/DaoTaoChungChiBanner";
import {
  DaoTaoHeader,
  DaoTaoPage,
  DaoTaoPanel,
} from "@/modules/dao-tao/components/DaoTaoChrome";

const TILES = [
  {
    href: "/dao-tao/thi-thu",
    title: "Ôn tập",
    desc: "Làm bài theo mức dễ / vừa / khó",
    icon: PenLine,
  },
  {
    href: "/dao-tao/thi-that",
    title: "Thi chính thức",
    desc: "Kỳ thi phòng KSNK đã mở cho khoa",
    icon: ClipboardCheck,
  },
] as const;

const ADMIN_LINKS = [
  { href: "/dao-tao/admin/ngan-hang", label: "Ngân hàng câu hỏi", icon: BookOpen },
  { href: "/dao-tao/admin/muc-do", label: "Mức ôn tập", icon: Gauge },
  { href: "/dao-tao/admin/ky-thi", label: "Kỳ thi", icon: ListChecks },
  { href: "/dao-tao/admin/ket-qua", label: "Kết quả", icon: FileSpreadsheet },
] as const;

type HistoryRow = Awaited<ReturnType<typeof listLanThiCuaToi>>[number];

export default function DaoTaoHubPage() {
  const { allowed, isAdmin, loading } = useModulePermission("DAO_TAO");
  const canAdmin = isAdmin || allowed.edit || allowed.import || allowed.create;
  const [history, setHistory] = useState<HistoryRow[]>([]);

  useEffect(() => {
    if (!allowed.view && !isAdmin) return;
    void listLanThiCuaToi()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [allowed.view, isAdmin]);

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
              <p className={T.sectionTitle}>Chưa có quyền thi KSNK</p>
              <p className="mt-1 text-sm text-slate-600">
                Liên hệ quản trị viên để được cấp quyền Thi KSNK.
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
            Thi KSNK
          </span>
        }
      />

      <DaoTaoChungChiBanner />

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
              <span className="ml-auto hidden text-[11px] font-normal text-slate-500 sm:inline">
                {tile.desc}
              </span>
            </Link>
          );
        })}
      </div>

      {history.length > 0 ? (
        <DaoTaoPanel className="!p-0 overflow-hidden">
          <p className={`${T.navGroupLabel} px-3 pt-3`}>Bài của tôi</p>
          <ul className="divide-y divide-slate-100">
            {history.map((row) => {
              const href =
                row.trangThai === "dang_lam"
                  ? `/dao-tao/lam-bai/${row.id}`
                  : `/dao-tao/ket-qua/${row.id}`;
              return (
                <li key={row.id}>
                  <Link
                    href={href}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="font-medium text-slate-800">{row.kyTen}</span>
                      <span className="ml-2 text-[11px] text-slate-500">
                        {labelCheDoThi(row.cheDo)}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-500">
                      {row.trangThai === "dang_lam"
                        ? "Đang làm"
                        : `${row.diemPct ?? 0}%`}
                      {row.nopLuc ? ` · ${formatDateTimeVi(row.nopLuc)}` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </DaoTaoPanel>
      ) : null}

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
