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

  // Chẩn đoán hổng kiến thức theo chuyên đề / bài giảng
  const topicStats = new Map<string, { ten: string; total: number; correct: number }>();
  for (const q of questions as any[]) {
    const ma = q.chuDeMa || "Chung";
    const ten = q.chuDeTen || ma;
    const stat = topicStats.get(ma) || { ten, total: 0, correct: 0 };
    stat.total += 1;
    if (q.dung) stat.correct += 1;
    topicStats.set(ma, stat);
  }
  const topicBreakdown = [...topicStats.entries()].map(([ma, s]) => ({
    ma,
    ten: s.ten,
    total: s.total,
    correct: s.correct,
    pct: Math.round((s.correct / s.total) * 100),
  })).sort((a, b) => a.pct - b.pct); // Ưu tiên xếp các chuyên đề yếu lên đầu để lưu ý!

  const datLabel =
    lanThi.cheDo === "thi_that" && lanThi.dat != null
      ? lanThi.dat
        ? "Đạt"
        : "Chưa đạt"
      : null;

  return (
    <DaoTaoPage className="mx-auto max-w-3xl">
      <DaoTaoHeader
        title="Báo cáo kết quả & Chẩn đoán năng lực"
        subtitle={lanThi.cheDo === "thi_thu" ? "Chế độ ôn luyện năng lực chuyên môn KSNK." : "Kỳ kiểm tra sát hạch chính thức."}
        actions={
          <Link href="/dao-tao" className={daoTaoBtnSecondary}>
            Về cổng thi
          </Link>
        }
      />

      <DaoTaoPanel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={T.statValue}>
              {lanThi.diemSo ?? 0}
              <span className="text-lg font-medium text-slate-400">
                /{lanThi.diemToiDa ?? lanThi.soCau}
              </span>
              <span className="ml-2 text-base font-semibold text-slate-600">
                ({lanThi.diemPct ?? 0}%)
              </span>
            </p>
            {datLabel ? (
              <p
                className={`mt-1 text-sm font-bold ${
                  lanThi.dat ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                Kết quả: {datLabel}
              </p>
            ) : null}
            <p className="mt-1 text-[11px] text-slate-500">
              {lanThi.trangThai === "het_gio" ? "Nộp khi hết giờ" : "Đã nộp bài"}
              {lanThi.nopLuc ? ` · ${formatDateTimeVi(lanThi.nopLuc)}` : ""}
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/dao-tao/thi-thu"
              className="inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
            >
              Ôn luyện tiếp
            </Link>
          </div>
        </div>

        {/* Chẩn đoán hổng kiến thức */}
        {topicBreakdown.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Phân tích năng lực theo chuyên đề / SOP
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {topicBreakdown.map((t) => (
                <div
                  key={t.ma}
                  className="rounded border border-slate-200/80 bg-slate-50/60 p-2 text-xs"
                >
                  <div className="flex items-center justify-between font-medium text-slate-800 mb-1">
                    <span className="truncate max-w-[200px]" title={t.ten}>
                      {t.ten}
                    </span>
                    <span
                      className={cn(
                        "font-bold",
                        t.pct >= 80
                          ? "text-emerald-700"
                          : t.pct >= 50
                            ? "text-amber-700"
                            : "text-rose-700",
                      )}
                    >
                      {t.correct}/{t.total} ({t.pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        t.pct >= 80
                          ? "bg-emerald-500"
                          : t.pct >= 50
                            ? "bg-amber-500"
                            : "bg-rose-500",
                      )}
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-1 border-t border-slate-100 pt-3">
          {(
            [
              ["all", "Tất cả câu"],
              ["sai", "Câu làm sai"],
              ["dung", "Câu làm đúng"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn(
                "inline-flex h-8 items-center rounded-[var(--radius-control)] px-3 text-xs font-semibold touch-manipulation transition",
                filter === id
                  ? "bg-[var(--primary)] text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              )}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </DaoTaoPanel>

      <div className="space-y-[var(--bv103-space-3)]">
        {visible.map((q: any) => (
          <div key={q.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                Câu {q.thuTu} · {labelLoaiCau(q.loai)}
              </span>
              {q.chuDeTen && (
                <span className="truncate max-w-[280px] text-[11px] text-slate-500">
                  {q.chuDeTen}
                </span>
              )}
            </div>
            <DaoTaoQuestionCard
              loai={q.loai}
              stem={q.stem}
              clinicalVignette={q.clinicalVignette}
              bloomCode={q.bloomCode}
              targetRoles={q.targetRoles}
              sopRefs={q.sopRefs}
              options={q.options as never}
              value={(q.traLoi as TraLoi) ?? null}
              onChange={() => {}}
              disabled
              showResult
              dung={q.dung}
              giaiThich={q.giaiThich}
              distractorRationales={q.distractorRationales}
              evidenceLock={q.evidenceLock}
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
