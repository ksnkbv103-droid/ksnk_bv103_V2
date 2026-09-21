"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createCatalogDeNghiAction,
  listKhoaOptionsForDeNghiAction,
  lookupLoaiByMaForDeNghiAction,
  suggestNextBoMaForDeNghiAction,
  suggestNextChiTietMaForDeNghiAction,
} from "@/modules/cssd-erp/actions/cssd-catalog-de-nghi.actions";
import {
  CSSD_CATALOG_DE_NGHI_KIND_LABEL,
  type CssdCatalogDeNghiItem,
} from "@/lib/domain/cssd-catalog-de-nghi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CatalogDeNghiPhieuDialog } from "./CatalogDeNghiPhieuPreview";
import { useCatalogDeNghiCart } from "./CatalogDeNghiCart";
import { LoaiDungCuTypeahead } from "@/modules/quan-tri-he-thong/danh-muc/dung-cu/loai-dung-cu-typeahead";

type Kind = "LOAI" | "BO" | "BOM";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: Kind;
  /** BOM: bộ đích để bổ sung dòng */
  boDungCuId?: string | null;
  boMa?: string | null;
  boTen?: string | null;
  onSubmitted?: () => void;
};

const inputCls = "mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm";
const labelCls = "text-[11px] font-medium text-slate-600";

export function CatalogDeNghiCreateDialog({
  open,
  onOpenChange,
  kind,
  boDungCuId,
  boMa,
  boTen,
  onSubmitted,
}: Props) {
  const cart = useCatalogDeNghiCart();
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<CssdCatalogDeNghiItem | null>(null);
  const [khoaOptions, setKhoaOptions] = useState<Array<{ id: string; label: string }>>([]);

  // LOAI
  const [maLoai, setMaLoai] = useState("");
  const [maLoaiDupHint, setMaLoaiDupHint] = useState<string | null>(null);
  const [maLoaiChecking, setMaLoaiChecking] = useState(false);
  const [tenLoai, setTenLoai] = useState("");
  const [hinhDang, setHinhDang] = useState("");
  const [kichThuoc, setKichThuoc] = useState("");
  const [congDung, setCongDung] = useState("");
  const [isChiuNhiet, setIsChiuNhiet] = useState<"true" | "false">("true");
  const [ppTk, setPpTk] = useState("STEAM_134");
  const [spaulding, setSpaulding] = useState("CRITICAL");
  const [phanLoai, setPhanLoai] = useState("PHAU_THUAT");
  const [khoDuPhong, setKhoDuPhong] = useState(0);

  // BO
  const [maBo, setMaBo] = useState("");
  const [tenBo, setTenBo] = useState("");
  const [khoaId, setKhoaId] = useState("");
  const [phanLoaiBo, setPhanLoaiBo] = useState("PHAU_THUAT");
  const [quyCach, setQuyCach] = useState("");
  const [ghiChuBo, setGhiChuBo] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  // BOM line
  const [maChiTiet, setMaChiTiet] = useState("");
  const [loaiIdBom, setLoaiIdBom] = useState("");
  const [maLoaiBom, setMaLoaiBom] = useState("");
  const [tenLe, setTenLe] = useState("");
  const [soLuong, setSoLuong] = useState(1);

  useEffect(() => {
    if (!open) return;
    setNote("");
    setMaLoai("");
    setMaLoaiDupHint(null);
    setTenLoai("");
    setHinhDang("");
    setKichThuoc("");
    setCongDung("");
    setIsChiuNhiet("true");
    setPpTk("STEAM_134");
    setSpaulding("CRITICAL");
    setPhanLoai("PHAU_THUAT");
    setKhoDuPhong(0);
    setMaBo("");
    setTenBo("");
    setKhoaId("");
    setPhanLoaiBo("PHAU_THUAT");
    setQuyCach("");
    setGhiChuBo("");
    setMaChiTiet("");
    setLoaiIdBom("");
    setMaLoaiBom("");
    setTenLe("");
    setSoLuong(1);

    if (kind === "BO") {
      void listKhoaOptionsForDeNghiAction().then((res) => {
        if (res.success) setKhoaOptions(res.data);
      });
    }
    if (kind === "BOM" && boDungCuId) {
      void suggestNextChiTietMaForDeNghiAction(boDungCuId).then((res) => {
        if (res.success) setMaChiTiet(res.ma_chi_tiet);
      });
    }
  }, [open, kind, boDungCuId]);

  useEffect(() => {
    if (!open || kind !== "BO" || !khoaId.trim()) return;
    let cancelled = false;
    setSuggesting(true);
    void suggestNextBoMaForDeNghiAction(khoaId).then((res) => {
      if (cancelled) return;
      setSuggesting(false);
      if (res.success) setMaBo(res.ma_bo);
      else toast.message(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [open, kind, khoaId]);

  const buildAfter = (): Record<string, unknown> | null => {
    if (kind === "LOAI") {
      if (!maLoai.trim() || !tenLoai.trim()) {
        toast.error("Nhập mã loại và tên loại.");
        return null;
      }
      return {
        ma_loai: maLoai.trim().toUpperCase(),
        ten_loai: tenLoai.trim(),
        hinh_dang: hinhDang,
        kich_thuoc: kichThuoc,
        cong_dung: congDung,
        is_chiu_nhiet: isChiuNhiet === "true",
        phuong_phap_tiet_khuan_chi_dinh: ppTk,
        phan_loai_spaulding: spaulding,
        phan_loai: phanLoai,
        so_luong_kho_du_phong: khoDuPhong,
        is_active: true,
      };
    }
    if (kind === "BO") {
      if (!maBo.trim() || !tenBo.trim()) {
        toast.error("Cần mã bộ (gợi ý theo khoa) và tên bộ.");
        return null;
      }
      if (!khoaId.trim()) {
        toast.error("Chọn khoa để gợi ý mã bộ.");
        return null;
      }
      return {
        ma_bo: maBo.trim().toUpperCase(),
        ten_bo: tenBo.trim(),
        khoa_su_dung_id: khoaId,
        phan_loai_bo: phanLoaiBo,
        quy_cach: quyCach,
        ghi_chu: ghiChuBo,
        trang_thai: "ACTIVE",
        co_ma_dinh_danh_rieng: true,
        is_active: true,
      };
    }
    if (!boDungCuId) {
      toast.error("Thiếu bộ đích để bổ sung thành phần.");
      return null;
    }
    if (!loaiIdBom.trim()) {
      toast.error("Chọn loại dụng cụ từ danh mục (không nhập tay UUID).");
      return null;
    }
    return {
      lines: [
        {
          op: "UPSERT",
          loaiDungCuId: loaiIdBom.trim(),
          maLoai: maLoaiBom.trim(),
          maChiTiet: maChiTiet.trim().toUpperCase() || null,
          tenDungCuLe: tenLe.trim(),
          soLuong,
        },
      ],
    };
  };

  const buildItem = (): CssdCatalogDeNghiItem | null => {
    const after = buildAfter();
    if (!after) return null;
    const targetMa =
      kind === "LOAI" ? maLoai.trim().toUpperCase() : kind === "BO" ? maBo.trim().toUpperCase() : boMa || "";
    const targetTen =
      kind === "LOAI" ? tenLoai.trim() : kind === "BO" ? tenBo.trim() : boTen || "Thành phần";
    return {
      kind,
      op: "CREATE",
      targetId: kind === "BOM" ? boDungCuId : null,
      targetMa,
      targetTen,
      before: { __op: "CREATE" },
      after: { ...after, __op: "CREATE" },
    };
  };


  useEffect(() => {
    if (kind !== "LOAI" || !open) {
      setMaLoaiDupHint(null);
      return;
    }
    const ma = maLoai.trim().toUpperCase();
    if (ma.length < 2) {
      setMaLoaiDupHint(null);
      return;
    }
    let alive = true;
    setMaLoaiChecking(true);
    const tmr = window.setTimeout(() => {
      void lookupLoaiByMaForDeNghiAction(ma).then((res) => {
        if (!alive) return;
        setMaLoaiChecking(false);
        if (!res.success) {
          setMaLoaiDupHint(null);
          return;
        }
        if (res.found) {
          const inactive = res.isActive === false ? " (đang ngưng dùng)" : "";
          setMaLoaiDupHint(
            (res.message || `Mã ${res.ma} đã có: «${res.ten}»`) + inactive,
          );
        } else {
          setMaLoaiDupHint(null);
        }
      });
    }, 350);
    return () => {
      alive = false;
      window.clearTimeout(tmr);
    };
  }, [kind, open, maLoai]);

  const submit = async (toBatch: boolean) => {
    if (kind === "LOAI" && maLoaiDupHint) {
      toast.error(maLoaiDupHint);
      return;
    }

    const item = buildItem();
    if (!item) return;
    if (toBatch) {
      cart.addItem(item);
      onOpenChange(false);
      return;
    }
    setPreviewItem(item);
    setPreviewOpen(true);
  };

  const confirmSendCreate = async () => {
    const item = previewItem || buildItem();
    if (!item) return;
    setSaving(true);
    const res = await createCatalogDeNghiAction({
      targetKind: kind,
      targetId: item.targetId,
      targetMa: item.targetMa,
      targetTen: item.targetTen,
      payloadBefore: item.before,
      payloadAfter: item.after,
      note,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Đã gửi đề nghị bổ sung — chờ admin duyệt.");
    setPreviewOpen(false);
    setPreviewItem(null);
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[min(92dvh,800px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Đề nghị bổ sung — {CSSD_CATALOG_DE_NGHI_KIND_LABEL[kind]}</DialogTitle>
        </DialogHeader>
        <p className="text-[12px] text-slate-600">
          Bổ sung mới loại/bộ (hoặc thành phần gắn loại đã có). Không dùng để điều chuyển —
          dùng tab Luân chuyển. Gửi chỉ sau khi xem phiếu; admin duyệt mới vào master.
        </p>
        <p className="text-[12px] text-slate-600">
          Nhân viên nhập liệu. Admin duyệt mới đưa vào danh mục chính thức.
        </p>

        {kind === "LOAI" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={`${labelCls} sm:col-span-2`}>
              Mã loại (tự nhập) *
              <input
                className={`${inputCls} ${maLoaiDupHint ? "border-red-400 focus:border-red-500" : ""}`}
                value={maLoai}
                onChange={(e) => setMaLoai(e.target.value.toUpperCase())}
                autoComplete="off"
              />
              {maLoaiChecking ? (
                <span className="mt-1 block text-[11px] text-slate-400">Đang rà danh mục…</span>
              ) : maLoaiDupHint ? (
                <span className="mt-1 block text-[11px] font-medium text-red-700">{maLoaiDupHint}</span>
              ) : maLoai.trim().length >= 2 ? (
                <span className="mt-1 block text-[11px] text-emerald-700">Mã chưa trùng trong danh mục.</span>
              ) : null}
            </label>
            <label className={labelCls}>
              Tên loại *
              <input className={inputCls} value={tenLoai} onChange={(e) => setTenLoai(e.target.value)} />
            </label>
            <label className={labelCls}>
              Hình dáng
              <input className={inputCls} value={hinhDang} onChange={(e) => setHinhDang(e.target.value)} />
            </label>
            <label className={labelCls}>
              Kích thước
              <input className={inputCls} value={kichThuoc} onChange={(e) => setKichThuoc(e.target.value)} />
            </label>
            <label className={`${labelCls} sm:col-span-2`}>
              Công dụng
              <input className={inputCls} value={congDung} onChange={(e) => setCongDung(e.target.value)} />
            </label>
            <label className={labelCls}>
              Chịu nhiệt
              <select className={inputCls} value={isChiuNhiet} onChange={(e) => setIsChiuNhiet(e.target.value as "true" | "false")}>
                <option value="true">Chịu nhiệt cao</option>
                <option value="false">Nhạy nhiệt</option>
              </select>
            </label>
            <label className={labelCls}>
              Spaulding
              <select className={inputCls} value={spaulding} onChange={(e) => setSpaulding(e.target.value)}>
                <option value="CRITICAL">Critical</option>
                <option value="SEMI_CRITICAL">Semi-critical</option>
                <option value="NON_CRITICAL">Non-critical</option>
              </select>
            </label>
            <label className={labelCls}>
              Phương pháp TK
              <select className={inputCls} value={ppTk} onChange={(e) => setPpTk(e.target.value)}>
                <option value="STEAM_134">Hơi 134°C</option>
                <option value="STEAM_121">Hơi 121°C</option>
                <option value="PLASMA">Plasma</option>
                <option value="EO">EO</option>
              </select>
            </label>
            <label className={labelCls}>
              Phân loại
              <select className={inputCls} value={phanLoai} onChange={(e) => setPhanLoai(e.target.value)}>
                <option value="PHAU_THUAT">Phẫu thuật</option>
                <option value="THU_THUAT">Thủ thuật</option>
              </select>
            </label>
            <label className={labelCls}>
              Kho dự phòng
              <input type="number" min={0} className={inputCls} value={khoDuPhong} onChange={(e) => setKhoDuPhong(parseInt(e.target.value) || 0)} />
            </label>
          </div>
        ) : null}

        {kind === "BO" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={`${labelCls} sm:col-span-2`}>
              Khoa sử dụng * (mã bộ tự gợi ý lũy tiến)
              <select className={inputCls} value={khoaId} onChange={(e) => setKhoaId(e.target.value)}>
                <option value="">— Chọn khoa —</option>
                {khoaOptions.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              Mã bộ {suggesting ? "(đang gợi ý…)" : "(tự gợi ý)"}
              <input className={inputCls} value={maBo} onChange={(e) => setMaBo(e.target.value.toUpperCase())} />
            </label>
            <label className={labelCls}>
              Tên bộ *
              <input className={inputCls} value={tenBo} onChange={(e) => setTenBo(e.target.value)} />
            </label>
            <label className={labelCls}>
              Phân loại bộ
              <select className={inputCls} value={phanLoaiBo} onChange={(e) => setPhanLoaiBo(e.target.value)}>
                <option value="PHAU_THUAT">Phẫu thuật</option>
                <option value="THU_THUAT">Thủ thuật</option>
              </select>
            </label>
            <label className={labelCls}>
              Quy cách
              <input className={inputCls} value={quyCach} onChange={(e) => setQuyCach(e.target.value)} />
            </label>
            <label className={`${labelCls} sm:col-span-2`}>
              Ghi chú
              <input className={inputCls} value={ghiChuBo} onChange={(e) => setGhiChuBo(e.target.value)} />
            </label>
          </div>
        ) : null}

        {kind === "BOM" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <p className="sm:col-span-2 text-[12px] text-slate-600">
              Bộ: <span className="font-mono font-semibold">{boMa || "—"}</span> {boTen || ""}
            </p>
            <label className={labelCls}>
              Mã chi tiết (gợi ý)
              <input className={inputCls} value={maChiTiet} onChange={(e) => setMaChiTiet(e.target.value.toUpperCase())} />
            </label>
            <label className={labelCls}>
              Số lượng chuẩn
              <input type="number" min={1} className={inputCls} value={soLuong} onChange={(e) => setSoLuong(Math.max(1, parseInt(e.target.value) || 1))} />
            </label>
            <div className="sm:col-span-2">
              <LoaiDungCuTypeahead
                label="Loại dụng cụ * (tìm theo mã / tên)"
                valueId={loaiIdBom}
                onChange={(id, opt) => {
                  setLoaiIdBom(id);
                  setMaLoaiBom(opt?.ma_danh_muc || "");
                  if (opt?.ten_danh_muc) setTenLe(opt.ten_danh_muc);
                }}
              />
            </div>
            <label className={`${labelCls} sm:col-span-2`}>
              Tên thành phần trong bộ
              <input className={inputCls} value={tenLe} onChange={(e) => setTenLe(e.target.value)} />
            </label>
          </div>
        ) : null}

        <label className={`block ${labelCls}`}>
          Ghi chú
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600">
            Hủy
          </button>
          <button type="button" disabled={saving || Boolean(kind === "LOAI" && (maLoaiDupHint || maLoaiChecking))} onClick={() => void submit(true)} className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-[12px] font-semibold text-violet-900 disabled:opacity-50">
            Thêm vào phiếu lô
          </button>
          <button type="button" disabled={saving || Boolean(maLoaiDupHint) || maLoaiChecking} onClick={() => void submit(false)} className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">
            Xem trước & gửi
          </button>
        </div>
      </DialogContent>
    </Dialog>
    <CatalogDeNghiPhieuDialog
      open={previewOpen}
      onOpenChange={(v) => {
        setPreviewOpen(v);
        if (!v) setPreviewItem(null);
      }}
      title="Xem trước phiếu đề nghị bổ sung"
      items={previewItem ? [previewItem] : []}
      note={note}
      mode="send"
      busy={saving}
      onConfirmSend={() => void confirmSendCreate()}
    />
    </>
  );
}
