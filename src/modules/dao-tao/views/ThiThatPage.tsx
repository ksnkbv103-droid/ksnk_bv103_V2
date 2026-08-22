"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Clock3, Layers } from "lucide-react";
import {
  listKyThiThatCuaToi,
  startThiThatAttempt,
} from "@/modules/dao-tao/actions/dao-tao-attempt.actions";
import { DaoTaoThiSinhBanner } from "@/modules/dao-tao/components/DaoTaoThiSinhBanner";
import { useDaoTaoThiSinhForm } from "@/modules/dao-tao/hooks/use-dao-tao-thi-sinh-form";
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
  const { form, setForm, complete, banner } = useDaoTaoThiSinhForm();
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
      <DaoTaoHeader title="Thi chính thức" />

      <DaoTaoPanel className="space-y-3">
        <p className={T.sectionTitle}>Kỳ thi của khoa bạn</p>
        {!loaded ? (
          <p className="text-sm text-slate-500">Đang tải…</p>
        ) : list.length === 0 ? (
          <div className="rounded-[var(--radius-control)] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm text-slate-600">
            Phòng KSNK chưa mở kỳ thi cho khoa của bạn. Liên hệ phòng KSNK nếu cần thi chính thức.
            <div className="mt-3">
              <Link href="/dao-tao/thi-thu" className={daoTaoBtnSecondary}>
                Ôn tập trước
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
                    "w-full rounded-[var(--radius-control)] border px-3 py-3 text-left transition touch-manipulation",
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

      <DaoTaoPanel>
        <DaoTaoThiSinhBanner form={form} onChange={setForm} complete={complete} banner={banner} />
      </DaoTaoPanel>

      <button
        type="button"
        disabled={pending || !kyThiId || !form.hoTen.trim() || !form.khoaDonVi.trim()}
        className={cn(daoTaoBtnPrimary, "h-11 w-full justify-center text-sm")}
        onClick={() => {
          startTransition(async () => {
            try {
              const res = await startThiThatAttempt({ kyThiId, form });
              toast.success("Bắt đầu thi");
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
