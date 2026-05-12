// src/hooks/usePrint.ts
"use client";

import { useState, useCallback } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";

/**
 * Hook quản lý in ấn nhãn QR (Thermal 80mm) và tài liệu A4
 * Tối ưu cho CSSD ERP với cấu trúc linh hoạt.
 */
export function usePrint() {
  const [isPrinting, setIsPrinting] = useState(false);

  /**
   * In nhãn QR cho bộ dụng cụ (Thermal Printer 80mm)
   */
  const printLabel = useCallback(async (data: {
    qrCode: string;
    tenBoDungCu: string;
    maLo?: string;
    tram: string;
    nguoiThucHien: string;
    thoiGian: string;
  }) => {
    setIsPrinting(true);
    const toastId = toast.loading("Đang chuẩn bị nhãn in...");

    try {
      // Tạo mã QR base64
      const qrDataUrl = await QRCode.toDataURL(data.qrCode, { 
        margin: 1, 
        width: 300,
        color: { dark: '#000000', light: '#ffffff' }
      });
      
      const printWindow = window.open('', '_blank', 'width=450,height=600');
      if (!printWindow) throw new Error("Vui lòng cho phép mở popup để in");

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Label ${data.qrCode}</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                width: 70mm; margin: 0 auto; padding: 5mm 0; 
                text-align: center; color: #000;
              }
              .qr-box img { width: 55mm; height: 55mm; }
              .qr-text { font-size: 18pt; font-weight: 900; margin: 2mm 0 4mm; letter-spacing: 1px; }
              .details { 
                text-align: left; font-size: 10pt; border-top: 1.5pt solid #000; 
                padding-top: 3mm; line-height: 1.5; margin: 0 2mm;
              }
              .details b { font-weight: 900; text-transform: uppercase; font-size: 8pt; }
              .footer { 
                font-size: 7pt; margin-top: 5mm; border-top: 0.5pt dashed #ccc; 
                padding-top: 2mm; font-weight: bold; opacity: 0.6;
              }
            </style>
          </head>
          <body>
            <div class="qr-box"><img src="${qrDataUrl}" /></div>
            <div class="qr-text">${data.qrCode}</div>
            <div class="details">
              <div><b>Bộ dụng cụ:</b> ${data.tenBoDungCu}</div>
              ${data.maLo ? `<div><b>Mã lô:</b> ${data.maLo}</div>` : ''}
              <div><b>Trạm:</b> ${data.tram}</div>
              <div><b>Người thực hiện:</b> ${data.nguoiThucHien}</div>
              <div><b>Thời gian:</b> ${data.thoiGian}</div>
            </div>
            <div class="footer">BỆNH VIỆN QUÂN Y 103 - KHOA KSNK</div>
            <script>
              window.onload = () => { 
                setTimeout(() => { window.print(); window.close(); }, 300); 
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      toast.success("Đã mở lệnh in nhãn nhiệt", { id: toastId });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error("Lỗi in: " + msg, { id: toastId });
    } finally {
      setIsPrinting(false);
    }
  }, []);

  return { isPrinting, printLabel };
}
