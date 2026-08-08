"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Clock3, Layers } from "lucide-react";
import type { ExamFormThongTin } from "@/lib/dao-tao/types";
import {
  listKyThiThatCuaToi,
  startThiThatAttempt,
} from "@/modules/dao-tao/actions/dao-tao-attempt.actions";
import { DaoTaoExamInfoForm } from "@/modules/dao-tao/components/DaoTaoExamInfoForm";
import {
  DaoTaoHeader,
  DaoTaoPage,
  DaoTaoPanel,
  daoTaoBtnPrimary,
  daoTaoBtnSecondary,
} from "@/modules/dao-tao/components/DaoTaoChrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { cn } from "@/lib/utils";

type KyRow = {
  id: string;
  ten: string;
  mo_ta: string | null;
  so_cau: number;
  thoi_gian_phut: number;
  diem_dat_pct: number | null;
  soLanDaNop: number;
  conLuot: boolean;
};

export default function ThiThatPage() {
  const router = useRouter();
  const [list, setList] = useState<KyRow[]>([]);
  const [kyThiId, setKyThiId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<ExamFormThongTin>({
    hoTen: "",
    khoaDonVi: "",
    soDienThoai: "",
    email: "",
  });
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void listKyThiThatCuaToi()
      .then((rows) => {
        setList(rows as KyRow[]);
        const first = (rows as KyRow[]).find((r) => r.conLuot);
        if (first) setKyThiId(first.id);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Lỗi tải kỳ thi"))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <DaoTaoPage className="mx-auto max-w-2xl">
      <DaoTaoHeader
        title="Thi thật"
      />

      <DaoTaoPanel className="space-y-3">
        <p className={T.sectionTitle}>1. Kỳ thi được phân công</p>
        {!loaded ? (
          <p className="text-sm text-slate-500">Đang tải…</p>
        ) : list.length === 0 ? (
          <div className="rounded-[var(--radius-control)] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm text-slate-600">
            Hiện không có kỳ thi thật nào dành cho bạn.
            <div className="mt-3">
              <Link href="/dao-tao/thi-thu" className={daoTaoBtnSecondary}>
                Sang thi thử để ôn tập
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            {list.map((k) => {
              const active = kyThiId === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  disabled={!k.conLuot}
                  onClick={() => setKyThiId(k.id)}
                  className={cn(
                    "w-full rounded-[var(--radius-control)] border px-3 py-3 text-left transition",
                    active
                      ? "border-[var(--primary)]/50 bg-[var(--primary)]/[0.04] ring-1 ring-[var(--primary)]/20"
                      : "border-slate-200 bg-white",
                    !k.conLuot && "opacity-55",
                  )}
                >
                  <p className="text-sm font-semibold text-slate-800">{k.ten}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {k.so_cau} câu
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {k.thoi_gian_phut} phút
                    </span>
                    {k.diem_dat_pct != null ? <span>Đạt ≥ {k.diem_dat_pct}%</span> : null}
                    <span>{k.conLuot ? `Còn lượt (đã nộp ${k.soLanDaNop})` : "Hết lượt"}</span>
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </DaoTaoPanel>

      <DaoTaoPanel className="space-y-3">
        <p className={T.sectionTitle}>2. Thông tin thí sinh</p>
        <DaoTaoExamInfoForm value={form} onChange={setForm} />
      </DaoTaoPanel>

      <button
        type="button"
        disabled={pending || !kyThiId}
        className={cn(daoTaoBtnPrimary, "h-11 w-full justify-center text-sm")}
        onClick={() => {
          startTransition(async () => {
            try {
              const res = await startThiThatAttempt({ kyThiId, form });
              toast.success("Bắt đầu thi thật");
              router.push(`/dao-tao/lam-bai/${res.lanThiId}`);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Không bắt đầu được");
            }
          });
        }}
      >
        {pending ? "Đang tạo đề…" : "Bắt đầu làm bài"}
      </button>
    </DaoTaoPage>
  );
}
