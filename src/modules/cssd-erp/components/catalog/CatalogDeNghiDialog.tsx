"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createCatalogDeNghiAction,
  listKhoaOptionsForDeNghiAction,
  loadCatalogDeNghiPrefillAction,
} from "@/modules/cssd-erp/actions/cssd-catalog-de-nghi.actions";
import {
  CSSD_CATALOG_DE_NGHI_KIND_LABEL,
  type CssdCatalogDeNghiBomLine,
  type CssdCatalogDeNghiItem,
  type CssdCatalogDeNghiKind,
} from "@/lib/domain/cssd-catalog-de-nghi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CatalogDeNghiPhieuDialog } from "./CatalogDeNghiPhieuPreview";
import { useCatalogDeNghiCart } from "./CatalogDeNghiCart";

export type CatalogDeNghiDialogTarget = {
  kind: Exclude<CssdCatalogDeNghiKind, "MIXED">;
  targetId?: string | null;
  targetMa?: string | null;
  targetTen?: string | null;
  ma?: string | null;
  ten?: string | null;
  isChiuNhiet?: boolean | null;
  bomLines?: Array<{
    chiTietId?: string | null;
    loaiDungCuId?: string | null;
    maLoai?: string | null;
    tenDungCuLe?: string | null;
    soLuong?: number | null;
    maxSudsCount?: number | null;
    trongLuong?: number | string | null;
    ghiChu?: string | null;
  }>;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: CatalogDeNghiDialogTarget | null;
  onSubmitted?: () => void;
};

type BomEditRow = {
  key: string;
  chiTietId: string;
  loaiDungCuId: string;
  maLoai: string;
  tenDungCuLe: string;
  soLuong: number;
  maxSudsCount: string;
  trongLuong: string;
  ghiChu: string;
  remove: boolean;
};

const inputCls = "mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm";
const labelCls = "text-[11px] font-medium text-slate-600";

export function CatalogDeNghiDialog({ open, onOpenChange, target, onSubmitted }: Props) {
  const kind = target?.kind || "LOAI";
  const cart = useCatalogDeNghiCart();
  const [khoaOptions, setKhoaOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [targetMa, setTargetMa] = useState("");
  const [targetTen, setTargetTen] = useState("");
  const [before, setBefore] = useState<Record<string, unknown>>({});
  const [note, setNote] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<CssdCatalogDeNghiItem | null>(null);
  const [saving, setSaving] = useState(false);

  // LOAI
  const [maLoai, setMaLoai] = useState("");
  const [tenLoai, setTenLoai] = useState("");
  const [moTa, setMoTa] = useState("");
  const [hinhDang, setHinhDang] = useState("");
  const [kichThuoc, setKichThuoc] = useState("");
  const [congDung, setCongDung] = useState("");
  const [isChiuNhiet, setIsChiuNhiet] = useState<"true" | "false">("true");
  const [ppTk, setPpTk] = useState("STEAM_134");
  const [spaulding, setSpaulding] = useState("CRITICAL");
  const [phanLoai, setPhanLoai] = useState("PHAU_THUAT");
  const [khoDuPhong, setKhoDuPhong] = useState(0);
  const [loaiActive, setLoaiActive] = useState(true);

  // BO
  const [maBo, setMaBo] = useState("");
  const [tenBo, setTenBo] = useState("");
  const [loaiDungCuId, setLoaiDungCuId] = useState("");
  const [khoaId, setKhoaId] = useState("");
  const [quyCach, setQuyCach] = useState("");
  const [ghiChuBo, setGhiChuBo] = useState("");
  const [trangThai, setTrangThai] = useState("ACTIVE");
  const [phanLoaiBo, setPhanLoaiBo] = useState("PHAU_THUAT");
  const [coMaRieng, setCoMaRieng] = useState(true);
  const [boActive, setBoActive] = useState(true);

  // BOM
  const [bomRows, setBomRows] = useState<BomEditRow[]>([]);

  useEffect(() => {
    if (!open || !target) return;
    let cancelled = false;
    setNote("");
    setLoadingPrefill(true);
    if (target.kind === "BO") {
      void listKhoaOptionsForDeNghiAction().then((res) => {
        if (!cancelled && res.success) setKhoaOptions(res.data);
      });
    }
    void loadCatalogDeNghiPrefillAction({
      kind: target.kind,
      targetId: target.targetId,
      targetMa: target.ma || target.targetMa,
    }).then((res) => {
      if (cancelled) return;
      setLoadingPrefill(false);
      if (!res.success) {
        // fallback thin prefill from target props
        setTargetId(String(target.targetId || ""));
        setTargetMa(String(target.ma || target.targetMa || ""));
        setTargetTen(String(target.ten || target.targetTen || ""));
        if (target.kind === "LOAI") {
          setMaLoai(String(target.ma || target.targetMa || ""));
          setTenLoai(String(target.ten || target.targetTen || ""));
          setIsChiuNhiet(target.isChiuNhiet === false ? "false" : "true");
          setBefore({
            ma_loai: target.ma || target.targetMa,
            ten_loai: target.ten || target.targetTen,
            is_chiu_nhiet: target.isChiuNhiet ?? null,
          });
        } else if (target.kind === "BO") {
          setMaBo(String(target.ma || target.targetMa || ""));
          setTenBo(String(target.ten || target.targetTen || ""));
          setBefore({
            ma_bo: target.ma || target.targetMa,
            ten_bo: target.ten || target.targetTen,
          });
        } else {
          setBomRows(
            (target.bomLines || []).map((l, i) => ({
              key: String(l.chiTietId || i),
              chiTietId: String(l.chiTietId || ""),
              loaiDungCuId: String(l.loaiDungCuId || ""),
              maLoai: String(l.maLoai || ""),
              tenDungCuLe: String(l.tenDungCuLe || ""),
              soLuong: Number(l.soLuong) || 0,
              maxSudsCount: l.maxSudsCount != null ? String(l.maxSudsCount) : "",
              trongLuong: l.trongLuong != null ? String(l.trongLuong) : "",
              ghiChu: String(l.ghiChu || ""),
              remove: false,
            })),
          );
          setBefore({ lines: target.bomLines || [] });
        }
        toast.message(res.error || "Prefill mỏng — kiểm tra migrate bảng đề nghị.");
        return;
      }
      setTargetId(res.targetId);
      setTargetMa(res.targetMa);
      setTargetTen(res.targetTen);
      if (res.kind === "LOAI") {
        const f = res.fields;
        setBefore({ ...f });
        setMaLoai(String(f.ma_loai || ""));
        setTenLoai(String(f.ten_loai || ""));
        setMoTa(String(f.mo_ta || ""));
        setHinhDang(String(f.hinh_dang || ""));
        setKichThuoc(String(f.kich_thuoc || ""));
        setCongDung(String(f.cong_dung || ""));
        setIsChiuNhiet(f.is_chiu_nhiet === false ? "false" : "true");
        setPpTk(String(f.phuong_phap_tiet_khuan_chi_dinh || "STEAM_134"));
        setSpaulding(String(f.phan_loai_spaulding || "CRITICAL"));
        setPhanLoai(String(f.phan_loai || "PHAU_THUAT"));
        setKhoDuPhong(Number(f.so_luong_kho_du_phong || 0));
        setLoaiActive(f.is_active !== false);
      } else if (res.kind === "BO") {
        const f = res.fields;
        setBefore({ ...f });
        setMaBo(String(f.ma_bo || ""));
        setTenBo(String(f.ten_bo || ""));
        setLoaiDungCuId(String(f.loai_dung_cu_id || ""));
        setKhoaId(String(f.khoa_su_dung_id || ""));
        setQuyCach(String(f.quy_cach || ""));
        setGhiChuBo(String(f.ghi_chu || ""));
        setTrangThai(String(f.trang_thai || "ACTIVE"));
        setPhanLoaiBo(String(f.phan_loai_bo || "PHAU_THUAT"));
        setCoMaRieng(f.co_ma_dinh_danh_rieng !== false);
        setBoActive(f.is_active !== false);
      } else {
        const lines = res.fields.lines || [];
        setBefore({ lines });
        setBomRows(
          lines.map((l, i) => ({
            key: String(l.chiTietId || i),
            chiTietId: String(l.chiTietId || ""),
            loaiDungCuId: String(l.loaiDungCuId || ""),
            maLoai: String(l.maLoai || ""),
            tenDungCuLe: String(l.tenDungCuLe || ""),
            soLuong: Number(l.soLuong) || 0,
            maxSudsCount: l.maxSudsCount != null ? String(l.maxSudsCount) : "",
            trongLuong: l.trongLuong != null ? String(l.trongLuong) : "",
            ghiChu: String(l.ghiChu || ""),
            remove: false,
          })),
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, target]);

  const buildItem = (): CssdCatalogDeNghiItem | null => {
    if (!target) return null;
    if (kind === "LOAI") {
      const after = {
        ma_loai: maLoai.trim().toUpperCase(),
        ten_loai: tenLoai.trim(),
        mo_ta: moTa,
        hinh_dang: hinhDang,
        kich_thuoc: kichThuoc,
        cong_dung: congDung,
        is_chiu_nhiet: isChiuNhiet === "true",
        phuong_phap_tiet_khuan_chi_dinh: ppTk,
        phan_loai_spaulding: spaulding,
        phan_loai: phanLoai,
        so_luong_kho_du_phong: khoDuPhong,
        is_active: loaiActive,
      };
      return {
        kind: "LOAI",
        targetId: targetId || target.targetId,
        targetMa: targetMa || maLoai,
        targetTen: targetTen || tenLoai,
        before,
        after,
      };
    }
    if (kind === "BO") {
      const after = {
        ma_bo: maBo.trim().toUpperCase(),
        ten_bo: tenBo.trim(),
        loai_dung_cu_id: loaiDungCuId.trim() || null,
        khoa_su_dung_id: khoaId.trim() || null,
        quy_cach: quyCach,
        ghi_chu: ghiChuBo,
        trang_thai: trangThai,
        phan_loai_bo: phanLoaiBo,
        co_ma_dinh_danh_rieng: coMaRieng,
        is_active: boActive,
      };
      return {
        kind: "BO",
        targetId: targetId || target.targetId,
        targetMa: targetMa || maBo,
        targetTen: targetTen || tenBo,
        before,
        after,
      };
    }
    const lines: CssdCatalogDeNghiBomLine[] = bomRows.map((r) =>
      r.remove
        ? {
            op: "DELETE",
            chiTietId: r.chiTietId || null,
            loaiDungCuId: r.loaiDungCuId || null,
            maLoai: r.maLoai,
            tenDungCuLe: r.tenDungCuLe,
          }
        : {
            op: "UPSERT",
            chiTietId: r.chiTietId || null,
            loaiDungCuId: r.loaiDungCuId || null,
            maLoai: r.maLoai,
            tenDungCuLe: r.tenDungCuLe,
            soLuong: r.soLuong,
            maxSudsCount: r.maxSudsCount === "" ? null : Number(r.maxSudsCount),
            trongLuong: r.trongLuong === "" ? null : r.trongLuong,
            ghiChu: r.ghiChu,
          },
    );
    return {
      kind: "BOM",
      targetId: targetId || target.targetId,
      targetMa: targetMa || target.ma || target.targetMa,
      targetTen: targetTen || target.ten || target.targetTen,
      before,
      after: { lines },
    };
  };

  const onSubmitSingle = () => {
    const item = buildItem();
    if (!item) return;
    setPreviewItem(item);
    setPreviewOpen(true);
  };

  const confirmSendSingle = async () => {
    const item = previewItem || buildItem();
    if (!item) return;
    setSaving(true);
    const res = await createCatalogDeNghiAction({
      targetKind: item.kind,
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
    toast.success("Đã gửi đề nghị — chờ admin duyệt.");
    setPreviewOpen(false);
    setPreviewItem(null);
    onOpenChange(false);
    onSubmitted?.();
  };

  const onAddToBatch = () => {
    const item = buildItem();
    if (!item) return;
    cart.addItem(item);
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[min(92dvh,860px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Đề nghị sửa — {CSSD_CATALOG_DE_NGHI_KIND_LABEL[kind]}</DialogTitle>
        </DialogHeader>
        <p className="text-[12px] text-slate-600">
          Chỉ sửa thuộc tính loại/bộ (hoặc BOM gắn loại đã có). Không dùng để điều chuyển số lượng —
          dùng tab Luân chuyển. Master chỉ đổi sau khi admin xem phiếu và duyệt.
        </p>
        <p className="text-[12px] text-slate-600">
          Sửa đủ trường rồi gửi phiếu riêng, hoặc thêm vào phiếu lô để gửi nhiều mục một lần. Master chỉ
          đổi sau khi admin duyệt.
        </p>
        {loadingPrefill ? (
          <p className="text-[12px] text-slate-500">Đang tải giá trị hiện tại…</p>
        ) : null}

        {kind === "LOAI" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={labelCls}>Mã loại<input className={inputCls} value={maLoai} onChange={(e) => setMaLoai(e.target.value)} /></label>
            <label className={labelCls}>Tên loại<input className={inputCls} value={tenLoai} onChange={(e) => setTenLoai(e.target.value)} /></label>
            <label className={labelCls}>Hình dáng<input className={inputCls} value={hinhDang} onChange={(e) => setHinhDang(e.target.value)} /></label>
            <label className={labelCls}>Kích thước<input className={inputCls} value={kichThuoc} onChange={(e) => setKichThuoc(e.target.value)} /></label>
            <label className={`${labelCls} sm:col-span-2`}>Công dụng<input className={inputCls} value={congDung} onChange={(e) => setCongDung(e.target.value)} /></label>
            <label className={`${labelCls} sm:col-span-2`}>Mô tả<input className={inputCls} value={moTa} onChange={(e) => setMoTa(e.target.value)} /></label>
            <label className={labelCls}>Chịu nhiệt
              <select className={inputCls} value={isChiuNhiet} onChange={(e) => setIsChiuNhiet(e.target.value as "true" | "false")}>
                <option value="true">Chịu nhiệt cao</option>
                <option value="false">Nhạy nhiệt</option>
              </select>
            </label>
            <label className={labelCls}>Spaulding
              <select className={inputCls} value={spaulding} onChange={(e) => setSpaulding(e.target.value)}>
                <option value="CRITICAL">Critical</option>
                <option value="SEMI_CRITICAL">Semi-critical</option>
                <option value="NON_CRITICAL">Non-critical</option>
              </select>
            </label>
            <label className={labelCls}>Phương pháp TK
              <select className={inputCls} value={ppTk} onChange={(e) => setPpTk(e.target.value)}>
                <option value="STEAM_134">Hơi 134°C</option>
                <option value="STEAM_121">Hơi 121°C</option>
                <option value="PLASMA">Plasma</option>
                <option value="EO">EO</option>
              </select>
            </label>
            <label className={labelCls}>Phân loại
              <select className={inputCls} value={phanLoai} onChange={(e) => setPhanLoai(e.target.value)}>
                <option value="PHAU_THUAT">Phẫu thuật</option>
                <option value="THU_THUAT">Thủ thuật</option>
              </select>
            </label>
            <label className={labelCls}>Kho dự phòng
              <input type="number" min={0} className={inputCls} value={khoDuPhong} onChange={(e) => setKhoDuPhong(parseInt(e.target.value) || 0)} />
            </label>
            <label className={`${labelCls} flex items-center gap-2 pt-5`}>
              <input type="checkbox" checked={loaiActive} onChange={(e) => setLoaiActive(e.target.checked)} />
              Đang hoạt động
            </label>
          </div>
        ) : null}

        {kind === "BO" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={labelCls}>Mã bộ<input className={inputCls} value={maBo} onChange={(e) => setMaBo(e.target.value)} /></label>
            <label className={labelCls}>Tên bộ<input className={inputCls} value={tenBo} onChange={(e) => setTenBo(e.target.value)} /></label>
            <label className={`${labelCls} sm:col-span-2`}>Khoa sử dụng (mã khoa — tên)
              <select className={inputCls} value={khoaId} onChange={(e) => setKhoaId(e.target.value)}>
                <option value="">— Chọn khoa —</option>
                {khoaOptions.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>Phân loại bộ
              <select className={inputCls} value={phanLoaiBo} onChange={(e) => setPhanLoaiBo(e.target.value)}>
                <option value="PHAU_THUAT">Phẫu thuật</option>
                <option value="THU_THUAT">Thủ thuật</option>
              </select>
            </label>
            <label className={labelCls}>Trạng thái<input className={inputCls} value={trangThai} onChange={(e) => setTrangThai(e.target.value)} /></label>
            <label className={`${labelCls} sm:col-span-2`}>Quy cách<input className={inputCls} value={quyCach} onChange={(e) => setQuyCach(e.target.value)} /></label>
            <label className={`${labelCls} sm:col-span-2`}>Ghi chú<input className={inputCls} value={ghiChuBo} onChange={(e) => setGhiChuBo(e.target.value)} /></label>
            <label className={`${labelCls} flex items-center gap-2`}>
              <input type="checkbox" checked={coMaRieng} onChange={(e) => setCoMaRieng(e.target.checked)} />
              Có mã định danh riêng
            </label>
            <label className={`${labelCls} flex items-center gap-2`}>
              <input type="checkbox" checked={boActive} onChange={(e) => setBoActive(e.target.checked)} />
              Đang hoạt động
            </label>
          </div>
        ) : null}

        {kind === "BOM" ? (
          <div className="space-y-2">
            {bomRows.length === 0 ? (
              <p className="text-[12px] text-slate-500">Chưa có thành phần.</p>
            ) : (
              bomRows.map((r) => (
                <div
                  key={r.key}
                  className={`space-y-1 rounded-lg border px-2 py-2 ${r.remove ? "border-red-200 bg-red-50/50 opacity-70" : "border-slate-200"}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-violet-700">{r.maLoai || "—"}</span>
                    <input
                      className="min-w-[8rem] flex-1 rounded border border-slate-200 px-1.5 py-1 text-sm"
                      value={r.tenDungCuLe}
                      disabled={r.remove}
                      onChange={(e) =>
                        setBomRows((rows) =>
                          rows.map((x) => (x.key === r.key ? { ...x, tenDungCuLe: e.target.value } : x)),
                        )
                      }
                    />
                    <input
                      type="number"
                      min={0}
                      className="w-16 rounded border border-slate-200 px-1 py-1 text-center text-sm"
                      disabled={r.remove}
                      value={r.soLuong}
                      onChange={(e) =>
                        setBomRows((rows) =>
                          rows.map((x) =>
                            x.key === r.key
                              ? { ...x, soLuong: Math.floor(Number(e.target.value)) || 0 }
                              : x,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-red-700 hover:underline"
                      onClick={() =>
                        setBomRows((rows) =>
                          rows.map((x) => (x.key === r.key ? { ...x, remove: !x.remove } : x)),
                        )
                      }
                    >
                      {r.remove ? "Hoàn" : "Xóa"}
                    </button>
                  </div>
                  {!r.remove ? (
                    <div className="grid grid-cols-3 gap-1">
                      <input
                        placeholder="Max SUDs"
                        className="rounded border border-slate-200 px-1 py-1 text-[11px]"
                        value={r.maxSudsCount}
                        onChange={(e) =>
                          setBomRows((rows) =>
                            rows.map((x) => (x.key === r.key ? { ...x, maxSudsCount: e.target.value } : x)),
                          )
                        }
                      />
                      <input
                        placeholder="Trọng lượng"
                        className="rounded border border-slate-200 px-1 py-1 text-[11px]"
                        value={r.trongLuong}
                        onChange={(e) =>
                          setBomRows((rows) =>
                            rows.map((x) => (x.key === r.key ? { ...x, trongLuong: e.target.value } : x)),
                          )
                        }
                      />
                      <input
                        placeholder="Ghi chú"
                        className="rounded border border-slate-200 px-1 py-1 text-[11px]"
                        value={r.ghiChu}
                        onChange={(e) =>
                          setBomRows((rows) =>
                            rows.map((x) => (x.key === r.key ? { ...x, ghiChu: e.target.value } : x)),
                          )
                        }
                      />
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        ) : null}

        <label className={`block ${labelCls}`}>
          Ghi chú
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lý do (tuỳ chọn)" />
        </label>

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600">
            Hủy
          </button>
          <button type="button" disabled={saving || loadingPrefill} onClick={onAddToBatch} className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-[12px] font-semibold text-violet-900 disabled:opacity-50">
            Thêm vào phiếu lô
          </button>
          <button type="button" disabled={saving || loadingPrefill} onClick={() => onSubmitSingle()} className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">
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
      title="Xem trước phiếu đề nghị sửa"
      items={previewItem ? [previewItem] : []}
      note={note}
      mode="send"
      busy={saving}
      onConfirmSend={() => void confirmSendSingle()}
    />
    </>
  );
}
