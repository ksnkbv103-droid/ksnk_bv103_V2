"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock3, Layers } from "lucide-react";
import { listMucDoThiThu } from "@/modules/dao-tao/actions/dao-tao-admin.actions";
import { startThiThuAttempt } from "@/modules/dao-tao/actions/dao-tao-attempt.actions";
import { DaoTaoThiSinhBanner } from "@/modules/dao-tao/components/DaoTaoThiSinhBanner";
import { useDaoTaoThiSinhForm } from "@/modules/dao-tao/hooks/use-dao-tao-thi-sinh-form";
import {
  DaoTaoHeader,
  DaoTaoPage,
  DaoTaoPanel,
  daoTaoBtnPrimary,
} from "@/modules/dao-tao/components/DaoTaoChrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { cn } from "@/lib/utils";

type MucDo = {
  id: string;
  ma: string;
  ten: string;
  so_cau: number;
  thoi_gian_phut: number;
};

export default function ThiThuPage() {
  const router = useRouter();
  const [mucDos, setMucDos] = useState<MucDo[]>([]);
  const [mucDoId, setMucDoId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const { form, setForm, complete, banner } = useDaoTaoThiSinhForm();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void listMucDoThiThu()
      .then((rows) => {
        setMucDos(rows as MucDo[]);
        if (rows[0]?.id) setMucDoId(rows[0].id);
        setLoadError(null);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Không tải được mức ôn tập";
        setLoadError(msg);
        toast.error(msg);
      });
  }, []);

  const selected = mucDos.find((m) => m.id === mucDoId);

  return (
    <DaoTaoPage className="mx-auto max-w-2xl">
      <DaoTaoHeader title="Ôn tập" subtitle="Không tính chứng nhận." />

      {loadError ? (
        <DaoTaoPanel className="border-rose-200 bg-rose-50/50">
          <p className="text-sm font-medium text-rose-800">Hệ thống chưa sẵn sàng — liên hệ phòng KSNK.</p>
        </DaoTaoPanel>
      ) : null}

      <DaoTaoPanel className="space-y-3">
        <p className={T.sectionTitle}>Chọn mức</p>
        <div className="grid gap-2">
          {mucDos.map((m) => {
            const active = mucDoId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMucDoId(m.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-[var(--radius-control)] border px-3 py-3 text-left transition touch-manipulation",
                  active
                    ? "border-[var(--primary)]/50 bg-[var(--primary)]/[0.04] ring-1 ring-[var(--primary)]/20"
                    : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <span className="text-sm font-semibold text-slate-800">{m.ten}</span>
                <span className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    {m.so_cau} câu
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {m.thoi_gian_phut} phút
                  </span>
                </span>
              </button>
            );
          })}
          {!loadError && mucDos.length === 0 ? (
            <p className="text-sm text-slate-500">Đang tải…</p>
          ) : null}
        </div>
      </DaoTaoPanel>

      <DaoTaoPanel>
        <DaoTaoThiSinhBanner form={form} onChange={setForm} complete={complete} banner={banner} />
      </DaoTaoPanel>

      <button
        type="button"
        disabled={pending || !mucDoId || !!loadError || !form.hoTen.trim() || !form.khoaDonVi.trim()}
        className={cn(daoTaoBtnPrimary, "h-11 w-full justify-center text-sm")}
        onClick={() => {
          startTransition(async () => {
            try {
              const res = await startThiThuAttempt({ mucDoId, form });
              toast.success(
                selected
                  ? `Bắt đầu: ${selected.so_cau} câu / ${selected.thoi_gian_phut} phút`
                  : "Đã bắt đầu",
              );
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
