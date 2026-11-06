"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock3, Layers, UserCheck, BookOpenCheck, ShieldCheck, Sparkles } from "lucide-react";
import { listMucDoThiThu } from "@/modules/dao-tao/actions/dao-tao-admin.actions";
import { startThiThuAttempt } from "@/modules/dao-tao/actions/dao-tao-attempt.actions";
import { listChuDeDaoTao } from "@/modules/dao-tao/actions/dao-tao-bank.actions";
import { DaoTaoThiSinhBanner } from "@/modules/dao-tao/components/DaoTaoThiSinhBanner";
import { useDaoTaoThiSinhForm } from "@/modules/dao-tao/hooks/use-dao-tao-thi-sinh-form";
import {
  DaoTaoHeader,
  DaoTaoPage,
  DaoTaoPanel,
  daoTaoBtnPrimary,
} from "@/modules/dao-tao/components/DaoTaoChrome";
import { CANONICAL_TARGET_ROLES, type TargetRolePreset } from "@/lib/dao-tao/types";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { cn } from "@/lib/utils";

type MucDo = {
  id: string;
  ma: string;
  ten: string;
  so_cau: number;
  thoi_gian_phut: number;
};

type ChuDe = {
  id: string;
  ma: string;
  ten: string;
};

export default function ThiThuPage() {
  const router = useRouter();
  const [mucDos, setMucDos] = useState<MucDo[]>([]);
  const [mucDoId, setMucDoId] = useState("");
  const [chuDes, setChuDes] = useState<ChuDe[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("ROLE_PHYSICIAN_SPECIALTY");
  const [selectedTopic, setSelectedTopic] = useState<string>("ALL");
  const [loadError, setLoadError] = useState<string | null>(null);
  const { form, setForm, complete, banner } = useDaoTaoThiSinhForm();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void Promise.all([listMucDoThiThu(), listChuDeDaoTao()])
      .then(([mRows, cRows]) => {
        setMucDos(mRows as MucDo[]);
        if (mRows[0]?.id) setMucDoId(mRows[0].id);
        setChuDes(cRows as ChuDe[]);
        setLoadError(null);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Không tải được danh mục";
        setLoadError(msg);
        toast.error(msg);
      });
  }, []);

  const currentRolePreset = CANONICAL_TARGET_ROLES.find((r) => r.code === selectedRole);

  const handleSelectRole = (roleCode: string) => {
    setSelectedRole(roleCode);
    const preset = CANONICAL_TARGET_ROLES.find((r) => r.code === roleCode);
    if (preset && mucDos.length > 0) {
      const matched = mucDos.find((m) => m.so_cau === preset.defaultQuestions);
      if (matched) {
        setMucDoId(matched.id);
      }
    }
  };

  const selected = mucDos.find((m) => m.id === mucDoId);

  return (
    <DaoTaoPage className="mx-auto max-w-2xl">
      <DaoTaoHeader
        title="Ôn luyện năng lực KSNK"
        subtitle="Hệ thống ngân hàng câu hỏi chuẩn NBME & 35 chuyên đề / SOP Bệnh viện Quân y 103."
      />

      {loadError ? (
        <DaoTaoPanel className="border-rose-200 bg-rose-50/50">
          <p className="text-sm font-medium text-rose-800">
            Hệ thống chưa sẵn sàng — liên hệ khoa Kiểm soát nhiễm khuẩn.
          </p>
        </DaoTaoPanel>
      ) : null}

      {/* 1. Chọn vị trí việc làm (Role-based Practice) */}
      <DaoTaoPanel className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-blue-600" />
            <p className={T.sectionTitle}>1. Định hướng theo vị trí công tác (9 nhóm chuẩn BM.02)</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedRole("ALL")}
            className={cn(
              "rounded px-2 py-0.5 text-[11px] font-medium transition",
              selectedRole === "ALL"
                ? "bg-blue-600 text-white font-semibold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            Tất cả vị trí (Toàn viện)
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Cấu trúc câu hỏi phân định tách bạch theo vị trí việc làm, tuân thủ Thông tư 16/2018/TT-BYT và Ma trận nhu cầu đào tạo KSNK BV103.
        </p>

        <div className="grid gap-2 sm:grid-cols-3">
          {CANONICAL_TARGET_ROLES.map((r: TargetRolePreset) => {
            const active = selectedRole === r.code;
            return (
              <button
                key={r.code}
                type="button"
                onClick={() => handleSelectRole(r.code)}
                className={cn(
                  "flex flex-col justify-between rounded-[var(--radius-control)] border p-2.5 text-left transition touch-manipulation",
                  active
                    ? "border-[var(--primary)] bg-[var(--primary)]/[0.06] text-[var(--primary)] font-semibold ring-1 ring-[var(--primary)]/20 shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {r.badge}
                    </span>
                    <span className="rounded bg-slate-100 px-1 py-0.2 text-[11px] font-medium text-slate-500">
                      {r.defaultQuestions}c / {r.durationMinutes}p
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold leading-snug">{r.label}</p>
                </div>
                <p className="mt-2 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {r.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Thông tin chi tiết về chuẩn năng lực của vai trò được chọn */}
        {currentRolePreset && (
          <div className="mt-2 rounded-[var(--radius-control)] border border-blue-200/70 bg-blue-50/40 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-blue-900">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Chuẩn năng lực và Trọng tâm nghiệp vụ: {currentRolePreset.label}</span>
            </div>
            <p className="mt-1 text-slate-700 leading-relaxed font-normal">
              {currentRolePreset.scopeSummary}
            </p>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-blue-800 font-medium">
              <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
              <span>
                Cấu trúc đề thi định chuẩn: <strong>{currentRolePreset.defaultQuestions} câu trắc nghiệm</strong> trong <strong>{currentRolePreset.durationMinutes} phút</strong>.
              </span>
            </div>
          </div>
        )}
      </DaoTaoPanel>

      {/* 2. Chọn chuyên đề / Quy trình SOP */}
      <DaoTaoPanel className="space-y-2.5">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="h-4 w-4 text-emerald-600" />
          <p className={T.sectionTitle}>2. Phạm vi chuyên đề / Quy trình kỹ thuật (SOP)</p>
        </div>
        <p className="text-xs text-slate-500">
          Chọn toàn bộ ngân hàng hoặc tập trung ôn luyện một quy trình cụ thể (35 bài giảng BV103).
        </p>
        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="w-full rounded-[var(--radius-control)] border border-slate-300 bg-white px-3 py-2.5 text-xs font-medium text-slate-800 shadow-xs focus:border-[var(--primary)] focus:outline-hidden"
        >
          <option value="ALL">Toàn bộ ngân hàng (Đầy đủ 35 chuyên đề KSNK)</option>
          {chuDes.map((c) => (
            <option key={c.ma} value={c.ma}>
              {c.ten}
            </option>
          ))}
        </select>
      </DaoTaoPanel>

      {/* 3. Chọn quy mô câu hỏi & thời gian */}
      <DaoTaoPanel className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-600" />
          <p className={T.sectionTitle}>3. Quy mô bài ôn luyện</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {mucDos.map((m) => {
            const active = mucDoId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMucDoId(m.id)}
                className={cn(
                  "flex flex-col items-start rounded-[var(--radius-control)] border p-3 text-left transition touch-manipulation",
                  active
                    ? "border-[var(--primary)] bg-[var(--primary)]/[0.04] ring-1 ring-[var(--primary)]/20 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300",
                )}
              >
                <span className="text-xs font-bold text-slate-800">{m.ten}</span>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {m.so_cau} câu
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {m.thoi_gian_phut}p
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </DaoTaoPanel>

      {/* 4. Thông tin thí sinh */}
      <DaoTaoPanel>
        <DaoTaoThiSinhBanner form={form} onChange={setForm} complete={complete} banner={banner} />
      </DaoTaoPanel>

      {/* Nút hành động */}
      <button
        type="button"
        disabled={pending || !mucDoId || !!loadError || !form.hoTen.trim() || !form.khoaDonVi.trim()}
        className={cn(daoTaoBtnPrimary, "h-11 w-full justify-center text-sm font-semibold shadow-sm")}
        onClick={() => {
          startTransition(async () => {
            try {
              const res = await startThiThuAttempt({
                mucDoId,
                form,
                targetRole: selectedRole !== "ALL" ? selectedRole : undefined,
                chuDeMas: selectedTopic !== "ALL" ? [selectedTopic] : undefined,
              });
              toast.success(
                selected
                  ? `Bắt đầu ôn luyện: ${selected.so_cau} câu / ${selected.thoi_gian_phut} phút`
                  : "Đã bắt đầu bài ôn luyện",
              );
              router.push(`/dao-tao/lam-bai/${res.lanThiId}`);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Không bắt đầu được bài ôn luyện");
            }
          });
        }}
      >
        {pending ? "Đang rút đề theo ma trận Bloom…" : "Bắt đầu ôn luyện ngay"}
      </button>
    </DaoTaoPage>
  );
}
