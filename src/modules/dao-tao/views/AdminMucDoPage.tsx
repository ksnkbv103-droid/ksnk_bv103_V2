"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  listMucDoThiThu,
  updateMucDoThiThu,
} from "@/modules/dao-tao/actions/dao-tao-admin.actions";
import {
  DaoTaoField,
  DaoTaoHeader,
  DaoTaoPage,
  DaoTaoPanel,
  daoTaoBtnPrimary,
  daoTaoInputClass,
} from "@/modules/dao-tao/components/DaoTaoChrome";

type BloomKey = "1" | "2" | "3" | "4" | "5";

type MucDo = {
  id: string;
  ma: string;
  ten: string;
  so_cau: number;
  thoi_gian_phut: number;
  bloom_quota?: Record<string, number> | null;
};

const BLOOM_LABELS: Record<BloomKey, string> = {
  "1": "M1 Nhớ",
  "2": "M2 Hiểu",
  "3": "M3 Vận dụng",
  "4": "M4 Phân tích",
  "5": "M5 Đánh giá",
};

function quotaToPct(q: Record<string, number> | null | undefined): Record<BloomKey, number> {
  const out: Record<BloomKey, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const k of Object.keys(out) as BloomKey[]) {
    const v = Number(q?.[k] ?? 0);
    out[k] = Math.round(v * 1000) / 10; // 1 decimal %
  }
  return out;
}

function pctToQuota(pct: Record<BloomKey, number>): Record<string, number> {
  const sum = (Object.values(pct) as number[]).reduce((a, b) => a + (Number(b) || 0), 0);
  if (sum <= 0) {
    return { "1": 0.4, "2": 0.4, "3": 0.2, "4": 0, "5": 0 };
  }
  const out: Record<string, number> = {};
  for (const k of Object.keys(pct) as BloomKey[]) {
    out[k] = Math.round(((Number(pct[k]) || 0) / sum) * 1000) / 1000;
  }
  return out;
}

export default function AdminMucDoPage() {
  const [rows, setRows] = useState<
    Array<MucDo & { bloomPct: Record<BloomKey, number> }>
  >([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void listMucDoThiThu()
      .then((d) =>
        setRows(
          (d as MucDo[]).map((r) => ({
            ...r,
            bloomPct: quotaToPct(r.bloom_quota ?? undefined),
          })),
        ),
      )
      .catch((e) => toast.error(e instanceof Error ? e.message : "Lỗi"));
  }, []);

  return (
    <DaoTaoPage className="mx-auto max-w-3xl">
      <DaoTaoHeader
        title="Mức độ thi thử"
        subtitle="Số câu, thời gian và tỷ lệ Bloom khi rút đề (tự chuẩn hóa về tổng 100%)."
      />
      <div className="space-y-3">
        {rows.map((r) => (
          <DaoTaoPanel key={r.id} className="space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              {r.ten}{" "}
              <span className="text-[11px] font-medium text-slate-400">({r.ma})</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <DaoTaoField label="Số câu">
                <input
                  type="number"
                  className={daoTaoInputClass}
                  value={r.so_cau}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((x) =>
                        x.id === r.id ? { ...x, so_cau: Number(e.target.value) } : x,
                      ),
                    )
                  }
                />
              </DaoTaoField>
              <DaoTaoField label="Thời gian (phút)">
                <input
                  type="number"
                  className={daoTaoInputClass}
                  value={r.thoi_gian_phut}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((x) =>
                        x.id === r.id
                          ? { ...x, thoi_gian_phut: Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                />
              </DaoTaoField>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Tỷ lệ Bloom (%)
              </p>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(BLOOM_LABELS) as BloomKey[]).map((k) => (
                  <DaoTaoField key={k} label={BLOOM_LABELS[k]}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      className={daoTaoInputClass}
                      value={r.bloomPct[k]}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, bloomPct: { ...x.bloomPct, [k]: v } }
                              : x,
                          ),
                        );
                      }}
                    />
                  </DaoTaoField>
                ))}
              </div>
            </div>
            <button
              type="button"
              disabled={pending}
              className={daoTaoBtnPrimary}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await updateMucDoThiThu({
                      id: r.id,
                      so_cau: r.so_cau,
                      thoi_gian_phut: r.thoi_gian_phut,
                      bloom_quota: pctToQuota(r.bloomPct),
                    });
                    toast.success(`Đã lưu ${r.ten}`);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Lưu thất bại");
                  }
                });
              }}
            >
              Lưu
            </button>
          </DaoTaoPanel>
        ))}
      </div>
    </DaoTaoPage>
  );
}
