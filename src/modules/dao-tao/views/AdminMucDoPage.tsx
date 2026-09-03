"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  listMucDoThiThu,
  updateMucDoThiThu,
} from "@/modules/dao-tao/actions/dao-tao-admin.actions";
import { DaoTaoAdminTabs } from "@/modules/dao-tao/components/DaoTaoAdminTabs";
import {
  DaoTaoField,
  DaoTaoHeader,
  DaoTaoPage,
  DaoTaoPanel,
  daoTaoBtnPrimary,
  daoTaoInputClass,
} from "@/modules/dao-tao/components/DaoTaoChrome";

type MucDo = {
  id: string;
  ma: string;
  ten: string;
  so_cau: number;
  thoi_gian_phut: number;
};

export default function AdminMucDoPage() {
  const [rows, setRows] = useState<MucDo[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void listMucDoThiThu()
      .then((d) => setRows(d as MucDo[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Lỗi"));
  }, []);

  return (
    <DaoTaoPage className="mx-auto max-w-3xl">
      <DaoTaoHeader title="Mức ôn tập" tabs={<DaoTaoAdminTabs />} />
      <div className="space-y-3">
        {rows.map((r) => (
          <DaoTaoPanel key={r.id} className="space-y-3">
            <p className="text-sm font-semibold text-slate-800">{r.ten}</p>
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
