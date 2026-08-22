"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import type { TraLoi } from "@/lib/dao-tao/types";
import { getLanThiForTake } from "@/modules/dao-tao/actions/dao-tao-attempt.actions";
import { DaoTaoQuestionCard } from "@/modules/dao-tao/components/DaoTaoQuestionCard";
import {
  DaoTaoHeader,
  DaoTaoPage,
  DaoTaoPanel,
  daoTaoBtnSecondary,
} from "@/modules/dao-tao/components/DaoTaoChrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { formatDateTimeVi } from "@/lib/format-datetime-vi";
import { labelLoaiCau } from "@/lib/dao-tao/labels";
import { cn } from "@/lib/utils";

export default function KetQuaPage() {
  const params = useParams<{ lanThiId: string }>();
  const [data, setData] = useState<Awaited<ReturnType<typeof getLanThiForTake>> | null>(
    null,
  );
  const [filter, setFilter] = useState<"all" | "sai" | "dung">("all");

  useEffect(() => {
    void getLanThiForTake(params.lanThiId)
      .then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Lỗi tải kết quả"));
  }, [params.lanThiId]);

  if (!data) {
    return (
      <DaoTaoPage>
        <div className={T.skeletonBlock + " h-40"} />
      </DaoTaoPage>
    );
  }

  const { lanThi, questions } = data;
  const visible = questions.filter((q) => {
    const dung = (q as { dung?: boolean | null }).dung;
    if (filter === "sai") return dung === false;
    if (filter === "dung") return dung === true;
    return true;
  });
  const datLabel =
    lanThi.cheDo === "thi_that" && lanThi.dat != null
      ? lanThi.dat
        ? "Đạt"
        : "Chưa đạt"
      : null;

  return (
    <DaoTaoPage className="mx-auto max-w-3xl">
      <DaoTaoHeader
        title="Kết quả bài thi"
        subtitle={lanThi.cheDo === "thi_thu" ? "Không tính chứng nhận." : undefined}
        actions={
          <Link href="/dao-tao" className={daoTaoBtnSecondary}>
            Về cổng thi
          </Link>
        }
      />

      <DaoTaoPanel>
        <p className={T.statValue}>
          {lanThi.diemSo ?? 0}
          <span className="text-lg font-medium text-slate-400">
            /{lanThi.diemToiDa ?? lanThi.soCau}
          </span>
          <span className="ml-2 text-base font-medium text-slate-500">
            ({lanThi.diemPct ?? 0}%)
          </span>
        </p>
        {datLabel ? (
          <p
            className={`mt-2 text-sm font-semibold ${
              lanThi.dat ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {datLabel}
          </p>
        ) : null}
        <p className="mt-1 text-[11px] text-slate-500">
          {lanThi.trangThai === "het_gio" ? "Nộp khi hết giờ" : "Đã nộp"}
          {lanThi.nopLuc ? ` · ${formatDateTimeVi(lanThi.nopLuc)}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          {(
            [
              ["all", "Tất cả"],
              ["sai", "Câu sai"],
              ["dung", "Câu đúng"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn(
                "inline-flex h-9 items-center rounded-[var(--radius-control)] px-3 text-sm font-medium touch-manipulation",
                filter === id
                  ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "text-slate-600 hover:bg-slate-50",
              )}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </DaoTaoPanel>

      <div className="space-y-4">
        {visible.map((q) => (
          <div key={q.id} className="space-y-1.5">
            <p className={T.labelBlock}>
              Câu {q.thuTu} · {labelLoaiCau(q.loai)}
            </p>
            <DaoTaoQuestionCard
              loai={q.loai}
              stem={q.stem}
              options={q.options as never}
              value={(q.traLoi as TraLoi) ?? null}
              onChange={() => {}}
              disabled
              showResult
              dung={(q as { dung?: boolean | null }).dung}
              giaiThich={(q as { giaiThich?: string | null }).giaiThich}
            />
          </div>
        ))}
        {visible.length === 0 ? (
          <p className="text-sm text-slate-500">Không có câu trong nhóm này.</p>
        ) : null}
      </div>
    </DaoTaoPage>
  );
}
