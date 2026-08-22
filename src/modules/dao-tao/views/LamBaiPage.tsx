"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TraLoi } from "@/lib/dao-tao/types";
import {
  getLanThiForTake,
  saveTraLoiCau,
  submitLanThi,
} from "@/modules/dao-tao/actions/dao-tao-attempt.actions";
import { DaoTaoQuestionCard } from "@/modules/dao-tao/components/DaoTaoQuestionCard";
import { DaoTaoTimer } from "@/modules/dao-tao/components/DaoTaoTimer";
import {
  DaoTaoPage,
  daoTaoBtnPrimary,
  daoTaoBtnSecondary,
} from "@/modules/dao-tao/components/DaoTaoChrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { cn } from "@/lib/utils";

type Q = {
  id: string;
  thuTu: number;
  loai: string;
  bloomLevel: number;
  stem: string;
  options: Array<{ id: string; noiDung: string; displayIndex: number }>;
  traLoi: TraLoi | null;
};

export default function LamBaiPage() {
  const params = useParams<{ lanThiId: string }>();
  const lanThiId = params.lanThiId;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hanNop, setHanNop] = useState("");
  const [serverNow, setServerNow] = useState("");
  const [trangThai, setTrangThai] = useState("dang_lam");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);

  const load = useCallback(async () => {
    const data = await getLanThiForTake(lanThiId);
    setHanNop(data.lanThi.hanNopLuc);
    setServerNow(data.serverNow);
    setTrangThai(data.lanThi.trangThai);
    setQuestions(data.questions as Q[]);
    if (data.lanThi.trangThai !== "dang_lam") {
      router.replace(`/dao-tao/ket-qua/${lanThiId}`);
    }
  }, [lanThiId, router]);

  useEffect(() => {
    void load()
      .catch((e) => toast.error(e instanceof Error ? e.message : "Lỗi tải bài"))
      .finally(() => setLoading(false));
  }, [load]);

  const doSubmit = useCallback(() => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    startTransition(async () => {
      try {
        await submitLanThi(lanThiId);
        toast.success("Đã nộp bài");
        router.replace(`/dao-tao/ket-qua/${lanThiId}`);
      } catch (e) {
        submittingRef.current = false;
        toast.error(e instanceof Error ? e.message : "Nộp bài thất bại");
      }
    });
  }, [lanThiId, router]);

  const current = questions[idx];
  const answered = questions.filter((q) => q.traLoi != null).length;

  if (loading) {
    return (
      <DaoTaoPage>
        <div className={T.skeletonBlock + " h-48"} />
      </DaoTaoPage>
    );
  }

  if (!current || trangThai !== "dang_lam") {
    return (
      <DaoTaoPage>
        <p className="text-sm text-slate-500">Đang chuyển kết quả…</p>
      </DaoTaoPage>
    );
  }

  return (
    <DaoTaoPage className="mx-auto max-w-3xl">
      <div className="sticky top-0 z-20 -mx-3 mb-3 border-b border-slate-200/80 bg-white/95 px-3 py-2.5 backdrop-blur sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Câu {idx + 1}/{questions.length}
            </p>
            <p className="text-[11px] text-slate-500">
              Đã trả lời {answered}/{questions.length}
            </p>
          </div>
          {hanNop && serverNow ? (
            <DaoTaoTimer hanNopLuc={hanNop} serverNow={serverNow} onExpire={doSubmit} />
          ) : null}
        </div>
        <div className="mx-auto mt-2 flex max-w-3xl gap-1 overflow-x-auto pb-0.5">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setIdx(i)}
              className={cn(
                "inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] px-1.5 text-xs font-semibold touch-manipulation",
                i === idx
                  ? "bg-[var(--primary)] text-white"
                  : q.traLoi != null
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-100 text-slate-600",
              )}
              aria-label={`Câu ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <DaoTaoQuestionCard
        loai={current.loai}
        stem={current.stem}
        options={current.options}
        value={current.traLoi}
        onChange={(v) => {
          setQuestions((prev) =>
            prev.map((q, i) => (i === idx ? { ...q, traLoi: v } : q)),
          );
          void saveTraLoiCau({ lanThiId, cauId: current.id, traLoi: v }).catch(() => {
            toast.error("Không lưu được đáp án");
          });
        }}
      />

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          className={daoTaoBtnSecondary}
          disabled={idx === 0}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
        >
          Câu trước
        </button>
        <button
          type="button"
          className={daoTaoBtnSecondary}
          disabled={idx >= questions.length - 1}
          onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
        >
          Câu sau
        </button>
        <button
          type="button"
          className={cn(daoTaoBtnPrimary, "ml-auto")}
          disabled={pending}
          onClick={doSubmit}
        >
          {pending ? "Đang nộp…" : "Nộp bài"}
        </button>
      </div>
    </DaoTaoPage>
  );
}
