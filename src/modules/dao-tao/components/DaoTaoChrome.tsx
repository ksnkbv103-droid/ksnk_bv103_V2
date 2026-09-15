"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { KsnkPageChrome } from "@/components/shared/KsnkPageChrome";
import { cn } from "@/lib/utils";

export function DaoTaoPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // Padding ngang đã thuộc KsnkPageShell — không cộng thêm (dialect Admin).
  return <div className={cn(T.pageOuter, className)}>{children}</div>;
}

export function DaoTaoHeader({
  title,
  subtitle,
  actions,
  tabs,
  backHref = "/dao-tao",
  backLabel = "Thi KSNK",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  backHref?: string | null;
  backLabel?: string;
}) {
  return (
    <div className="space-y-2">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 transition-colors hover:text-[var(--primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {backLabel}
        </Link>
      ) : null}
      <KsnkPageChrome
        title={title}
        subtitle={subtitle}
        actions={actions}
        tabs={tabs}
        showTitle={false}
      />
    </div>
  );
}

export function DaoTaoPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-shell)] border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.02] sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function DaoTaoField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className={T.labelBlock}>{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

export const daoTaoInputClass = T.authInput;
export const daoTaoBtnPrimary = T.btnPrimary;
export const daoTaoBtnSecondary = T.btnSecondary;
