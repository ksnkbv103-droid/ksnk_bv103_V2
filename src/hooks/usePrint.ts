"use client";

import { useState, useCallback } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { buildPrintFileTitle, type PrintFileLoai } from "@/lib/print/print-file-title";

export type MinimalLabelInput = {
  /** Mã bộ SSOT — QR và chữ in cùng một mã (vd. B01.SET.01). */
  qrCode: string;
  tenBo: string;
  tenKhoa?: string | null;
  tongSoLuong?: number | null;
  soKhoan?: number | null;
  phanLoaiBo?: string | null;
  quyTrinhId?: string | null;
};

export type CycleLabelInput = {
  /** Mã chu trình quét (vd. BV103-CYC-20261104-001 hoặc tương tự) */
  qrCode: string;
  tenBo: string;
  maBo?: string | null;
  tenKhoa?: string | null;
  ngayDongGoi?: string | null;
  hanDung?: string | null;
  nguoiDongGoi?: string | null;
  phuongPhap?: string | null;
  loaiBaoGoi?: string | null;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildMinimalThermalLabelHtml(opts: {
  qrDataUrl: string;
  qrCode: string;
  displayCode: string;
  tenBo: string;
  tenKhoa?: string | null;
  tongSoLuong?: number | null;
  soKhoan?: number | null;
  phanLoaiBo?: string | null;
  kindLabel?: string;
  fileTitle: string;
}): string {
  const code = escapeHtml(opts.displayCode);
  const name = escapeHtml(opts.tenBo);
  const kind = opts.kindLabel ? escapeHtml(opts.kindLabel) : "BỘ DỤNG CỤ · TEM VĨNH VIỄN";
  const khoa = escapeHtml(opts.tenKhoa || "Chưa phân bổ");

  let coSoText = "—";
  if (opts.tongSoLuong != null && opts.soKhoan != null) {
    coSoText = `${opts.tongSoLuong} DC (${opts.soKhoan} khoản)`;
  } else if (opts.tongSoLuong != null) {
    coSoText = `${opts.tongSoLuong} dụng cụ`;
  }

  const phanLoaiRow = opts.phanLoaiBo
    ? `<div class="meta-row"><span class="meta-label">Phân loại:</span><span class="meta-val">${escapeHtml(opts.phanLoaiBo)}</span></div>`
    : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <title>${escapeHtml(opts.fileTitle)}</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        width: 74mm;
        margin: 0 auto;
        padding: 3mm 2mm 3mm;
        color: #000;
        background: #fff;
        text-align: center;
      }
      .header { text-align: center; margin-bottom: 1.5mm; }
      .hospital-name { font-size: 8.5pt; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; line-height: 1.2; }
      .dept-name { font-size: 7.5pt; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; line-height: 1.2; color: #222; }
      .divider { border-bottom: 1.5px solid #000; margin: 1.5mm 0 2mm; }
      .badge-kind {
        display: inline-block;
        font-size: 7pt;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 1px 4px;
        border: 1px solid #000;
        border-radius: 2px;
        margin-bottom: 1.5mm;
      }
      .code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 13pt;
        font-weight: 900;
        letter-spacing: 0.05em;
        line-height: 1.2;
        word-break: break-all;
        margin: 1mm 0;
      }
      .qr { margin: 1.5mm auto; display: flex; justify-content: center; }
      .qr img { width: 32mm; height: 32mm; display: block; image-rendering: pixelated; margin: 0 auto; }
      .name {
        font-size: 10.5pt;
        font-weight: 800;
        line-height: 1.25;
        text-transform: uppercase;
        margin: 1.5mm 0;
        word-break: break-word;
      }
      .meta-box {
        border: 1px solid #000;
        border-radius: 2px;
        padding: 1.5mm 2mm;
        margin-top: 1.5mm;
        text-align: left;
        font-size: 7.5pt;
        line-height: 1.4;
      }
      .meta-row { display: flex; justify-content: space-between; align-items: baseline; gap: 2mm; }
      .meta-label { font-weight: 700; color: #222; white-space: nowrap; }
      .meta-val { font-weight: 600; color: #000; text-align: right; word-break: break-word; }
      .footer-note { margin-top: 2mm; font-size: 6.5pt; color: #444; font-style: italic; text-align: center; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="hospital-name">BỆNH VIỆN QUÂN Y 103</div>
      <div class="dept-name">KHOA KIỂM SOÁT NHIỄM KHUẨN</div>
    </div>
    <div class="divider"></div>
    <div class="badge-kind">${kind}</div>
    <div class="code">${code}</div>
    <div class="qr"><img src="${opts.qrDataUrl}" alt="QR" /></div>
    <div class="name">${name}</div>
    <div class="meta-box">
      <div class="meta-row">
        <span class="meta-label">Khoa sử dụng:</span>
        <span class="meta-val">${khoa}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Cơ số quy chuẩn:</span>
        <span class="meta-val">${coSoText}</span>
      </div>
      ${phanLoaiRow}
    </div>
    <div class="footer-note">* Quét mã QR để nhận diện &amp; đối soát cấu phần bộ *</div>
    <script>
      window.onload = () => {
        setTimeout(() => { window.print(); window.close(); }, 300);
      };
    </script>
  </body>
</html>`;
}

export function buildCycleThermalLabelHtml(opts: {
  qrDataUrl: string;
  qrCode: string;
  displayCode: string;
  tenBo: string;
  maBo?: string | null;
  tenKhoa?: string | null;
  ngayDongGoi?: string | null;
  hanDung?: string | null;
  nguoiDongGoi?: string | null;
  phuongPhap?: string | null;
  loaiBaoGoi?: string | null;
  kindLabel?: string;
  fileTitle: string;
}): string {
  const code = escapeHtml(opts.displayCode);
  const name = escapeHtml(opts.tenBo);
  const kind = opts.kindLabel ? escapeHtml(opts.kindLabel) : "NIÊM PHONG · TEM CHU TRÌNH";
  const khoa = escapeHtml(opts.tenKhoa || "CSSD / Toàn viện");
  const todayStr = new Date().toLocaleDateString("vi-VN");
  const ngayDongGoi = escapeHtml(opts.ngayDongGoi || todayStr);
  const hanDung = escapeHtml(opts.hanDung || "Theo quy định KSNK");
  const nguoiDongGoi = escapeHtml(opts.nguoiDongGoi || "CSSD");

  const maBoRow = opts.maBo
    ? `<div class="sub-code">Mã bộ: <strong>${escapeHtml(opts.maBo)}</strong></div>`
    : "";

  const phuongPhapRow = opts.phuongPhap
    ? `<div class="meta-row"><span class="meta-label">Phương pháp:</span><span class="meta-val">${escapeHtml(opts.phuongPhap)}</span></div>`
    : "";

  const baoGoiRow = opts.loaiBaoGoi
    ? `<div class="meta-row"><span class="meta-label">Bao gói:</span><span class="meta-val">${escapeHtml(opts.loaiBaoGoi)}</span></div>`
    : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <title>${escapeHtml(opts.fileTitle)}</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        width: 74mm;
        margin: 0 auto;
        padding: 3mm 2mm 3mm;
        color: #000;
        background: #fff;
        text-align: center;
      }
      .header { text-align: center; margin-bottom: 1.5mm; }
      .hospital-name { font-size: 8.5pt; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; line-height: 1.2; }
      .dept-name { font-size: 7.5pt; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; line-height: 1.2; color: #222; }
      .divider { border-bottom: 1.5px solid #000; margin: 1.5mm 0 2mm; }
      .badge-kind {
        display: inline-block;
        font-size: 7pt;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 1px 4px;
        border: 1px solid #000;
        border-radius: 2px;
        margin-bottom: 1.5mm;
      }
      .code-sm {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 10.5pt;
        font-weight: 900;
        letter-spacing: 0.03em;
        line-height: 1.2;
        word-break: break-all;
        margin: 1mm 0;
      }
      .sub-code { font-size: 8pt; color: #333; margin-bottom: 1.5mm; }
      .qr { margin: 1.5mm auto; display: flex; justify-content: center; }
      .qr img { width: 32mm; height: 32mm; display: block; image-rendering: pixelated; margin: 0 auto; }
      .name {
        font-size: 10.5pt;
        font-weight: 800;
        line-height: 1.25;
        text-transform: uppercase;
        margin: 1.5mm 0;
        word-break: break-word;
      }
      .meta-box {
        border: 1px solid #000;
        border-radius: 2px;
        padding: 1.5mm 2mm;
        margin-top: 1.5mm;
        text-align: left;
        font-size: 7.5pt;
        line-height: 1.4;
      }
      .meta-row { display: flex; justify-content: space-between; align-items: baseline; gap: 2mm; }
      .meta-label { font-weight: 700; color: #222; white-space: nowrap; }
      .meta-val { font-weight: 600; color: #000; text-align: right; word-break: break-word; }
      .font-bold { font-weight: 800; }
      .ci-check {
        margin-top: 2mm;
        padding-top: 1.5mm;
        border-top: 1px dashed #444;
        font-size: 7.5pt;
        text-align: center;
        font-weight: 600;
      }
      .footer-note { margin-top: 2mm; font-size: 6.5pt; color: #444; font-style: italic; text-align: center; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="hospital-name">BỆNH VIỆN QUÂN Y 103</div>
      <div class="dept-name">KHOA KIỂM SOÁT NHIỄM KHUẨN</div>
    </div>
    <div class="divider"></div>
    <div class="badge-kind">${kind}</div>
    <div class="code-sm">${code}</div>
    <div class="qr"><img src="${opts.qrDataUrl}" alt="QR" /></div>
    <div class="name">${name}</div>
    ${maBoRow}
    <div class="meta-box">
      <div class="meta-row">
        <span class="meta-label">Khoa nhận:</span>
        <span class="meta-val">${khoa}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Ngày đóng gói:</span>
        <span class="meta-val">${ngayDongGoi}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Hạn sử dụng:</span>
        <span class="meta-val font-bold">${hanDung}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">KTV đóng gói:</span>
        <span class="meta-val">${nguoiDongGoi}</span>
      </div>
      ${phuongPhapRow}
      ${baoGoiRow}
    </div>
    <div class="ci-check">
      <span>Chỉ thị hóa học:</span> &nbsp;
      <strong>[ &nbsp; ] ĐẠT</strong> &nbsp;&nbsp;&nbsp;
      <strong>[ &nbsp; ] K.ĐẠT</strong>
    </div>
    <div class="footer-note">* Kiểm tra niêm phong &amp; chỉ thị trước khi sử dụng *</div>
    <script>
      window.onload = () => {
        setTimeout(() => { window.print(); window.close(); }, 300);
      };
    </script>
  </body>
</html>`;
}

async function openMinimalLabelPrint(
  input: MinimalLabelInput,
  kindLabel: string | undefined,
  loai: Extract<PrintFileLoai, "TEMBO" | "TEMMAY" | "TEMCYC">,
): Promise<void> {
  const qrCode = String(input.qrCode || "").trim();
  const tenBo = String(input.tenBo || "").trim() || "Bộ dụng cụ CSSD";
  const displayCode = qrCode;
  const fileTitle = buildPrintFileTitle({ loai, ma: qrCode });

  const qrDataUrl = await QRCode.toDataURL(qrCode, {
    margin: 1,
    width: 320,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const printWindow = window.open("", "_blank", "width=420,height=520");
  if (!printWindow) throw new Error("Vui lòng cho phép mở popup để in");

  printWindow.document.write(
    buildMinimalThermalLabelHtml({
      qrDataUrl,
      qrCode,
      displayCode,
      tenBo,
      tenKhoa: input.tenKhoa,
      tongSoLuong: input.tongSoLuong,
      soKhoan: input.soKhoan,
      phanLoaiBo: input.phanLoaiBo,
      kindLabel,
      fileTitle,
    }),
  );
  printWindow.document.close();
}

async function openCycleLabelPrint(
  input: CycleLabelInput,
): Promise<void> {
  const qrCode = String(input.qrCode || "").trim();
  const tenBo = String(input.tenBo || "").trim() || "Bộ dụng cụ CSSD";
  const displayCode = qrCode;
  const fileTitle = buildPrintFileTitle({ loai: "TEMCYC", ma: qrCode });

  const qrDataUrl = await QRCode.toDataURL(qrCode, {
    margin: 1,
    width: 320,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const printWindow = window.open("", "_blank", "width=420,height=520");
  if (!printWindow) throw new Error("Vui lòng cho phép mở popup để in");

  printWindow.document.write(
    buildCycleThermalLabelHtml({
      qrDataUrl,
      qrCode,
      displayCode,
      tenBo,
      maBo: input.maBo,
      tenKhoa: input.tenKhoa,
      ngayDongGoi: input.ngayDongGoi,
      hanDung: input.hanDung,
      nguoiDongGoi: input.nguoiDongGoi,
      phuongPhap: input.phuongPhap,
      loaiBaoGoi: input.loaiBaoGoi,
      kindLabel: "Niêm phong · Tem chu trình (túi hấp)",
      fileTitle,
    }),
  );
  printWindow.document.close();
}

/** In nhãn nhiệt — tem định danh bộ (danh mục / SUB mới). */
export function usePrint() {
  const [isPrinting, setIsPrinting] = useState(false);

  const printBoLabel = useCallback(async (input: MinimalLabelInput) => {
    setIsPrinting(true);
    const toastId = toast.loading("Đang chuẩn bị nhãn bộ (tem vĩnh viễn)...");
    try {
      await openMinimalLabelPrint(input, "Bộ dụng cụ · Tem vĩnh viễn", "TEMBO");
      toast.success("Đã mở lệnh in nhãn bộ dụng cụ (tem vĩnh viễn)", { id: toastId });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error("Lỗi in: " + msg, { id: toastId });
      throw error;
    } finally {
      setIsPrinting(false);
    }
  }, []);

  const printCycleLabel = useCallback(async (input: CycleLabelInput) => {
    setIsPrinting(true);
    const toastId = toast.loading("Đang chuẩn bị tem chu trình (túi hấp, niêm phong)...");
    try {
      await openCycleLabelPrint(input);
      toast.success("Đã mở lệnh in tem chu trình (dán túi hấp)", { id: toastId });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error("Lỗi in: " + msg, { id: toastId });
      throw error;
    } finally {
      setIsPrinting(false);
    }
  }, []);

  const printMachineLabel = useCallback(async (input: Pick<MinimalLabelInput, "qrCode" | "tenBo">) => {
    setIsPrinting(true);
    const toastId = toast.loading("Đang chuẩn bị nhãn máy...");
    try {
      await openMinimalLabelPrint(
        { qrCode: input.qrCode, tenBo: input.tenBo },
        "Máy · Thiết bị CSSD",
        "TEMMAY",
      );
      toast.success("Đã mở lệnh in nhãn máy", { id: toastId });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error("Lỗi in: " + msg, { id: toastId });
      throw error;
    } finally {
      setIsPrinting(false);
    }
  }, []);

  return { isPrinting, printBoLabel, printCycleLabel, printMachineLabel };
}
