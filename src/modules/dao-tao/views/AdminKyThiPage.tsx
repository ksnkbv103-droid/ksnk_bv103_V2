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
import { DaoTaoAdminTabs } from "@/modules/dao-tao/components/DaoTaoAdminTabs";
import { DaoTaoMultiCheckList } from "@/modules/dao-tao/components/DaoTaoMultiCheckList";
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
import { parseHanChungChiThang } from "@/lib/dao-tao/chung-chi";
import { labelTrangThaiKy } from "@/lib/dao-tao/labels";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  gan?: { khoa_ids?: string[]; nhan_su_ids?: string[]; han_chung_chi_thang?: number };
};

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
  const [hanThang, setHanThang] = useState(12);
  const [ganKy, setGanKy] = useState<Ky | null>(null);
  const [ganKhoa, setGanKhoa] = useState<string[]>([]);
  const [ganNv, setGanNv] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const reload = async () => {
    const [kys, kp, ns, cd] = await Promise.all([
      listKyThiThatAdmin(),
      listKhoaPhongOptions(),
      listNhanSuOptions(selectedKhoa.length ? { khoaIds: selectedKhoa } : undefined),
      listChuDeDaoTao(),
    ]);
    setList(kys as Ky[]);
    setKhoas(kp as never);
    setNhanSus(ns as never);
    setChuDes(cd.map((c) => ({ ma: c.ma, ten: c.ten })));
  };

  useEffect(() => {
    void reload().catch((e) => toast.error(e instanceof Error ? e.message : "Lỗi"));
  }, []);

  useEffect(() => {
    void listNhanSuOptions(selectedKhoa.length ? { khoaIds: selectedKhoa } : undefined)
      .then((ns) => setNhanSus(ns as never))
      .catch(() => undefined);
  }, [selectedKhoa]);

  useEffect(() => {
    if (!ganKy) return;
    void listNhanSuOptions(ganKhoa.length ? { khoaIds: ganKhoa } : undefined)
      .then((ns) => setNhanSus(ns as never))
      .catch(() => undefined);
  }, [ganKy, ganKhoa]);

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
      <DaoTaoHeader title="Kỳ thi" tabs={<DaoTaoAdminTabs />} />

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
        <DaoTaoField label="Hạn chứng chỉ (tháng)">
          <input
            type="number"
            min={1}
            max={60}
            className={daoTaoInputClass}
            value={hanThang}
            onChange={(e) => setHanThang(Math.min(60, Math.max(1, Number(e.target.value) || 12)))}
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Đạt thi chính thức thì chứng chỉ còn hạn bấy nhiêu tháng; sắp hết / hết hạn hiện nhắc học lại trên trang Thi KSNK.
          </p>
        </DaoTaoField>
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
        <DaoTaoMultiCheckList
          label="Chủ đề ngân hàng (trống = mọi chủ đề đang dùng)"
          items={chuDeItems}
          selected={selectedChuDe}
          onChange={setSelectedChuDe}
          emptyText="Chưa có chủ đề trong ngân hàng."
        />
        <DaoTaoMultiCheckList
          label="Gán khoa"
          items={khoaItems}
          selected={selectedKhoa}
          onChange={setSelectedKhoa}
          emptyText="Không tải được danh mục khoa."
        />
        <DaoTaoMultiCheckList
          label="Gán nhân sự (tuỳ chọn)"
          items={nvItems}
          selected={selectedNv}
          onChange={setSelectedNv}
          emptyText="Không có nhân sự."
        />
        {ganCount === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Chưa gán khoa hoặc nhân viên — học viên thường không vào được kỳ sau khi mở thi.
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
                  han_chung_chi_thang: hanThang,
                });
                await setKyThiGan({
                  kyThiId: ky.id,
                  khoaPhongIds: selectedKhoa,
                  nhanSuIds: selectedNv,
                  hanChungChiThang: hanThang,
                });
                toast.success("Đã tạo kỳ (nháp)");
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
          const han = parseHanChungChiThang(ky.gan);
          return (
            <DaoTaoPanel key={ky.id} className="!p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{ky.ten}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    {ky.so_cau} câu · {ky.thoi_gian_phut} phút · đạt {ky.diem_dat_pct}% ·{" "}
                    {ky.so_lan_cho_phep ?? 1} lần · chứng chỉ {han} tháng · {labelTrangThaiKy(ky.trang_thai)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Gán {nKhoa} khoa · {nNv} NV
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ky.trang_thai !== "closed" ? (
                    <button
                      type="button"
                      className={daoTaoBtnSecondary}
                      onClick={() => {
                        setGanKy(ky);
                        setGanKhoa(ky.gan?.khoa_ids ?? []);
                        setGanNv(ky.gan?.nhan_su_ids ?? []);
                      }}
                    >
                      Gán khoa / NV
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
                              toast.error("Chưa gán khoa hoặc nhân viên — bấm Gán khoa / NV");
                              return;
                            }
                            await updateKyThiThat(ky.id, { trang_thai: "published" });
                            toast.success("Đã mở thi");
                            await reload();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Lỗi");
                          }
                        });
                      }}
                    >
                      Mở thi
                    </button>
                  ) : ky.trang_thai === "published" ? (
                    <button
                      type="button"
                      className={daoTaoBtnSecondary}
                      onClick={() => {
                        startTransition(async () => {
                          try {
                            await updateKyThiThat(ky.id, { trang_thai: "closed" });
                            toast.success("Đã kết thúc");
                            await reload();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Lỗi");
                          }
                        });
                      }}
                    >
                      Kết thúc
                    </button>
                  ) : null}
                </div>
              </div>
            </DaoTaoPanel>
          );
        })}
      </div>

      <Dialog open={!!ganKy} onOpenChange={(o) => !o && setGanKy(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gán khoa / nhân viên{ganKy ? ` — ${ganKy.ten}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <DaoTaoMultiCheckList
              label="Khoa"
              items={khoaItems}
              selected={ganKhoa}
              onChange={setGanKhoa}
              emptyText="Không tải được danh mục khoa."
            />
            <DaoTaoMultiCheckList
              label="Nhân sự (tuỳ chọn)"
              items={nvItems}
              selected={ganNv}
              onChange={setGanNv}
              emptyText="Không có nhân sự."
            />
          </div>
          <DialogFooter>
            <button type="button" className={daoTaoBtnSecondary} onClick={() => setGanKy(null)}>
              Hủy
            </button>
            <button
              type="button"
              className={daoTaoBtnPrimary}
              disabled={pending || !ganKy}
              onClick={() => {
                if (!ganKy) return;
                startTransition(async () => {
                  try {
                    await setKyThiGan({
                      kyThiId: ganKy.id,
                      khoaPhongIds: ganKhoa,
                      nhanSuIds: ganNv,
                    });
                    toast.success("Đã cập nhật danh sách thi");
                    setGanKy(null);
                    await reload();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Lỗi");
                  }
                });
              }}
            >
              Lưu gán
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DaoTaoPage>
  );
}
