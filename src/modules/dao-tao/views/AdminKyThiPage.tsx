"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createKyThiThat,
  listKhoaPhongOptions,
  listKyThiThatAdmin,
  listNhanSuOptions,
  setKyThiGan,
  updateKyThiThat,
} from "@/modules/dao-tao/actions/dao-tao-admin.actions";
import { listChuDeDaoTao } from "@/modules/dao-tao/actions/dao-tao-bank.actions";
import {
  DaoTaoField,
  DaoTaoHeader,
  DaoTaoPage,
  DaoTaoPanel,
  daoTaoBtnPrimary,
  daoTaoBtnSecondary,
  daoTaoInputClass,
} from "@/modules/dao-tao/components/DaoTaoChrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { formatKhoaPickerLabel } from "@/lib/domain/khoa-display";
import { cn } from "@/lib/utils";

type Ky = {
  id: string;
  ten: string;
  so_cau: number;
  thoi_gian_phut: number;
  diem_dat_pct: number | null;
  so_lan_cho_phep?: number;
  shuffle_cau?: boolean;
  shuffle_dap_an?: boolean;
  chu_de_mas?: string[];
  trang_thai: string;
  gan?: { khoa_ids?: string[]; nhan_su_ids?: string[] };
};

function MultiCheckList(props: {
  label: string;
  items: Array<{ id: string; label: string; hint?: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
  emptyText: string;
}) {
  return (
    <div>
      <p className={cn(T.labelBlock, "mb-1.5")}>{props.label}</p>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-[var(--radius-control)] border border-slate-200 bg-slate-50/50 p-2.5 text-sm">
        {props.items.map((it) => (
          <label key={it.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white">
            <input
              type="checkbox"
              checked={props.selected.includes(it.id)}
              onChange={(e) => {
                props.onChange(
                  e.target.checked
                    ? [...props.selected, it.id]
                    : props.selected.filter((id) => id !== it.id),
                );
              }}
            />
            <span className="text-slate-700">
              {it.label}{" "}
              {it.hint ? <span className="text-[11px] text-slate-400">({it.hint})</span> : null}
            </span>
          </label>
        ))}
        {props.items.length === 0 ? (
          <p className="px-1 py-2 text-sm text-slate-500">{props.emptyText}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminKyThiPage() {
  const [list, setList] = useState<Ky[]>([]);
  const [khoas, setKhoas] = useState<Array<{ id: string; ten_khoa: string; ma_khoa: string }>>(
    [],
  );
  const [nhanSus, setNhanSus] = useState<
    Array<{ id: string; ho_ten: string | null; ma_nv: string | null; khoa_id: string | null }>
  >([]);
  const [chuDes, setChuDes] = useState<Array<{ ma: string; ten: string }>>([]);
  const [ten, setTen] = useState("");
  const [soCau, setSoCau] = useState(20);
  const [phut, setPhut] = useState(25);
  const [diemDat, setDiemDat] = useState(70);
  const [soLan, setSoLan] = useState(1);
  const [shuffleCau, setShuffleCau] = useState(true);
  const [shuffleDapAn, setShuffleDapAn] = useState(true);
  const [selectedChuDe, setSelectedChuDe] = useState<string[]>([]);
  const [selectedKhoa, setSelectedKhoa] = useState<string[]>([]);
  const [selectedNv, setSelectedNv] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const reload = async () => {
    const [kys, kp, ns, cd] = await Promise.all([
      listKyThiThatAdmin(),
      listKhoaPhongOptions(),
      listNhanSuOptions(
        selectedKhoa.length ? { khoaIds: selectedKhoa } : undefined,
      ),
      listChuDeDaoTao(),
    ]);
    setList(kys as Ky[]);
    setKhoas(kp as never);
    setNhanSus(ns as never);
    setChuDes(cd.map((c) => ({ ma: c.ma, ten: c.ten })));
  };

  useEffect(() => {
    void reload().catch((e) => toast.error(e instanceof Error ? e.message : "Lỗi"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load lần đầu
  }, []);

  useEffect(() => {
    void listNhanSuOptions(selectedKhoa.length ? { khoaIds: selectedKhoa } : undefined)
      .then((ns) => setNhanSus(ns as never))
      .catch(() => undefined);
  }, [selectedKhoa]);

  const khoaItems = useMemo(
    () =>
      khoas.map((k) => ({
        id: k.id,
        label: formatKhoaPickerLabel({ ma_khoa: k.ma_khoa, ten_khoa: k.ten_khoa }),
        hint: k.ma_khoa || undefined,
      })),
    [khoas],
  );
  const nvItems = useMemo(
    () =>
      nhanSus.map((n) => ({
        id: n.id,
        label: n.ho_ten || n.ma_nv || n.id.slice(0, 8),
        hint: n.ma_nv ?? undefined,
      })),
    [nhanSus],
  );
  const chuDeItems = useMemo(
    () => chuDes.map((c) => ({ id: c.ma, label: c.ten, hint: c.ma })),
    [chuDes],
  );

  const ganCount = selectedKhoa.length + selectedNv.length;

  return (
    <DaoTaoPage className="mx-auto max-w-4xl">
      <DaoTaoHeader title="Kỳ thi thật" />

      <DaoTaoPanel className="space-y-3">
        <p className={T.sectionTitle}>Tạo kỳ mới</p>
        <DaoTaoField label="Tên kỳ thi">
          <input
            className={daoTaoInputClass}
            placeholder="Ví dụ: Kiểm tra phòng ngừa SSI Q3"
            value={ten}
            onChange={(e) => setTen(e.target.value)}
          />
        </DaoTaoField>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DaoTaoField label="Số câu">
            <input
              type="number"
              className={daoTaoInputClass}
              value={soCau}
              onChange={(e) => setSoCau(Number(e.target.value))}
            />
          </DaoTaoField>
          <DaoTaoField label="Phút">
            <input
              type="number"
              className={daoTaoInputClass}
              value={phut}
              onChange={(e) => setPhut(Number(e.target.value))}
            />
          </DaoTaoField>
          <DaoTaoField label="Điểm đạt %">
            <input
              type="number"
              className={daoTaoInputClass}
              value={diemDat}
              onChange={(e) => setDiemDat(Number(e.target.value))}
            />
          </DaoTaoField>
          <DaoTaoField label="Số lần thi">
            <input
              type="number"
              min={1}
              className={daoTaoInputClass}
              value={soLan}
              onChange={(e) => setSoLan(Math.max(1, Number(e.target.value) || 1))}
            />
          </DaoTaoField>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shuffleCau}
              onChange={(e) => setShuffleCau(e.target.checked)}
            />
            Đảo thứ tự câu
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shuffleDapAn}
              onChange={(e) => setShuffleDapAn(e.target.checked)}
            />
            Đảo thứ tự đáp án
          </label>
        </div>
        <MultiCheckList
          label="Chủ đề ngân hàng (trống = mọi chủ đề active)"
          items={chuDeItems}
          selected={selectedChuDe}
          onChange={setSelectedChuDe}
          emptyText="Chưa có chủ đề trong ngân hàng."
        />
        <MultiCheckList
          label="Gán khoa (có thể chọn nhiều)"
          items={khoaItems}
          selected={selectedKhoa}
          onChange={setSelectedKhoa}
          emptyText="Không tải được danh mục khoa."
        />
        <MultiCheckList
          label="Gán nhân sự (tuỳ chọn — lọc theo khoa đã chọn nếu có)"
          items={nvItems}
          selected={selectedNv}
          onChange={setSelectedNv}
          emptyText="Không có nhân sự (hoặc chưa chọn khoa có NV)."
        />
        {ganCount === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Chưa gán khoa/NV — sau khi publish, học viên thường <strong>không vào được</strong> kỳ
            (trừ tài khoản quản trị Đào tạo).
          </p>
        ) : null}
        <button
          type="button"
          disabled={pending || !ten.trim()}
          className={daoTaoBtnPrimary}
          onClick={() => {
            startTransition(async () => {
              try {
                const ky = await createKyThiThat({
                  ten: ten.trim(),
                  so_cau: soCau,
                  thoi_gian_phut: phut,
                  diem_dat_pct: diemDat,
                  so_lan_cho_phep: soLan,
                  shuffle_cau: shuffleCau,
                  shuffle_dap_an: shuffleDapAn,
                  chu_de_mas: selectedChuDe,
                });
                await setKyThiGan({
                  kyThiId: ky.id,
                  khoaPhongIds: selectedKhoa,
                  nhanSuIds: selectedNv,
                });
                toast.success("Đã tạo kỳ (draft)");
                setTen("");
                await reload();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Tạo thất bại");
              }
            });
          }}
        >
          Tạo kỳ thi
        </button>
      </DaoTaoPanel>

      <div className="space-y-3">
        {list.map((ky) => {
          const nKhoa = ky.gan?.khoa_ids?.length ?? 0;
          const nNv = ky.gan?.nhan_su_ids?.length ?? 0;
          return (
            <DaoTaoPanel key={ky.id} className="!p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{ky.ten}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    {ky.so_cau} câu · {ky.thoi_gian_phut} phút · đạt {ky.diem_dat_pct}% ·{" "}
                    {ky.so_lan_cho_phep ?? 1} lần ·{" "}
                    {ky.shuffle_cau !== false ? "đảo câu" : "cố định câu"} ·{" "}
                    {ky.shuffle_dap_an !== false ? "đảo ĐA" : "cố định ĐA"} ·{" "}
                    <span className="uppercase">{ky.trang_thai}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Gán {nKhoa} khoa · {nNv} NV
                    {(ky.chu_de_mas?.length ?? 0) > 0
                      ? ` · chủ đề: ${ky.chu_de_mas!.join(", ")}`
                      : " · mọi chủ đề"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ky.trang_thai !== "closed" ? (
                    <button
                      type="button"
                      className={daoTaoBtnSecondary}
                      onClick={() => {
                        startTransition(async () => {
                          try {
                            if (selectedKhoa.length + selectedNv.length === 0) {
                              toast.error("Chọn khoa/NV ở form tạo phía trên rồi bấm Gán");
                              return;
                            }
                            await setKyThiGan({
                              kyThiId: ky.id,
                              khoaPhongIds: selectedKhoa,
                              nhanSuIds: selectedNv,
                            });
                            toast.success("Đã cập nhật gán khoa/NV");
                            await reload();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Lỗi");
                          }
                        });
                      }}
                    >
                      Gán theo form
                    </button>
                  ) : null}
                  {ky.trang_thai !== "published" && ky.trang_thai !== "closed" ? (
                    <button
                      type="button"
                      className={daoTaoBtnPrimary}
                      onClick={() => {
                        startTransition(async () => {
                          try {
                            if (nKhoa + nNv === 0) {
                              toast.error(
                                "Chưa gán khoa/NV — chọn ở form trên rồi bấm «Gán theo form»",
                              );
                              return;
                            }
                            await updateKyThiThat(ky.id, { trang_thai: "published" });
                            toast.success("Đã publish");
                            await reload();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Lỗi");
                          }
                        });
                      }}
                    >
                      Publish
                    </button>
                  ) : ky.trang_thai === "published" ? (
                    <button
                      type="button"
                      className={daoTaoBtnSecondary}
                      onClick={() => {
                        startTransition(async () => {
                          try {
                            await updateKyThiThat(ky.id, { trang_thai: "closed" });
                            toast.success("Đã đóng");
                            await reload();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Lỗi");
                          }
                        });
                      }}
                    >
                      Đóng
                    </button>
                  ) : null}
                </div>
              </div>
            </DaoTaoPanel>
          );
        })}
      </div>
    </DaoTaoPage>
  );
}
