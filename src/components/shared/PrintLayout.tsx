// src/components/shared/PrintLayout.tsx
"use client";

import React, { useEffect, useRef } from "react";

interface PrintLayoutProps {
  children: React.ReactNode;
  title?: string;
  /** Dòng phụ dưới tiêu đề chính. Mặc định không dùng cho phiếu in phẳng. */
  subtitle?: string;
  headerTitle?: string;
  departmentTitle?: string;
  showFooter?: boolean;
  leftSignatureTitle?: string;
  rightSignatureTitle?: string;
  /** compact — giảm khoảng trống header/footer cho phiếu dày nội dung (CSSD…) */
  density?: "default" | "compact";
  /** QR / phụ lục in sau chữ ký (cuối trang). */
  afterFooter?: React.ReactNode;
  /**
   * Tên file gợi ý khi Lưu PDF / hộp thoại in (`{LOAI}_{MA}`).
   * Truyền hàm để ghép lại lúc beforeprint.
   */
  fileTitle?: string | (() => string);
}

/**
 * PrintLayout - Wrapper chuẩn A4 cho tất cả trang in ấn hệ thống KSNK 103.
 */
const PrintLayout: React.FC<PrintLayoutProps> = ({ 
  children, 
  title = "PHIẾU GIÁM SÁT",
  subtitle,
  headerTitle = "BỆNH VIỆN QUÂN Y 103",
  departmentTitle = "KHOA KIỂM SOÁT NHIỄM KHUẨN",
  showFooter = true,
  leftSignatureTitle = "NGƯỜI GIÁM SÁT",
  rightSignatureTitle = "ĐẠI DIỆN ĐƠN VỊ ĐƯỢC GIÁM SÁT",
  density = "default",
  afterFooter,
  fileTitle,
}) => {
  const compact = density === "compact";
  const headerMb = compact ? 10 : 32;
  const titleMb = compact ? 8 : 20;
  const footerMt = compact ? 14 : 32;
  const signBoxH = compact ? 56 : 80;
  const fileTitleRef = useRef(fileTitle);
  fileTitleRef.current = fileTitle;

  /** Đặt document.title = tên file lưu trữ; khôi phục sau in. */
  useEffect(() => {
    const saved = document.title;
    const onBefore = () => {
      const ft = fileTitleRef.current;
      const next = typeof ft === "function" ? ft() : String(ft || "").trim();
      document.title = next || saved;
    };
    const onAfter = () => {
      document.title = saved;
    };
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
    };
  }, []);

  return (
    <div id="print-area" className="hidden print:block print-area" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      <div className="print-a4-page">
        {/* === HEADER: ĐƠN VỊ & TIÊU NGỮ === */}
        <div className="print-header" style={{ 
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          marginBottom: headerMb, color: "#000"
        }}>
          <div style={{ textAlign: "center", width: "45%" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, textTransform: "uppercase", margin: "0 0 2px 0" }}>
              {headerTitle}
            </p>
            <p style={{ 
              fontSize: "14px", fontWeight: 900, textTransform: "uppercase",
              borderBottom: "1.5px solid #000", display: "inline-block", paddingBottom: "4px", margin: 0 
            }}>
              {departmentTitle}
            </p>
          </div>
          <div style={{ textAlign: "center", width: "55%" }}>
            <p style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", margin: "0 0 2px 0" }}>
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </p>
            <p style={{ 
              fontSize: "14px", fontWeight: 800,
              borderBottom: "1.5px solid #000", display: "inline-block", paddingBottom: "4px", margin: 0 
            }}>
              Độc lập - Tự do - Hạnh phúc
            </p>
          </div>
        </div>

        {/* === TIÊU ĐỀ BẢN IN: phẳng, cân chữ === */}
        <div style={{ textAlign: "center", marginBottom: titleMb, paddingBottom: compact ? 4 : 8 }}>
          <h1
            style={{
              fontSize: "19px",
              fontWeight: 800,
              textTransform: "uppercase",
              color: "#000",
              letterSpacing: "0.02em",
              margin: "0 0 6px 0",
              lineHeight: 1.35,
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#000", lineHeight: 1.4 }}>
              {subtitle}
            </p>
          ) : null}
        </div>

        {/* === NỘI DUNG CHÍNH === */}
        <div className="print-content" style={{ fontSize: compact ? 13 : 14, lineHeight: 1.4, color: "#111" }}>
          {children}
        </div>

        {/* === FOOTER KÝ TÊN === */}
        {showFooter && (
          <div className="print-footer" style={{ 
            marginTop: footerMt, 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr",
            textAlign: "center", 
            pageBreakInside: "avoid",
            color: "#000"
          }}>
            <div style={{ padding: "0 20px" }}>
              <p style={{ fontWeight: 800, textTransform: "uppercase", margin: "0 0 4px 0", fontSize: "13px" }}>
                {leftSignatureTitle}
              </p>
              <p style={{ fontStyle: "italic", fontSize: "12px", margin: 0 }}>
                (Ký, ghi rõ họ tên)
              </p>
              <div style={{ height: signBoxH }}></div>
            </div>
            <div style={{ padding: "0 20px" }}>
              <p style={{ fontWeight: 900, textTransform: "uppercase", margin: "0 0 4px 0", fontSize: "13px" }}>
                {rightSignatureTitle}
              </p>
              <p style={{ fontStyle: "italic", fontSize: "12px", margin: 0 }}>
                (Ký, ghi rõ họ tên và đóng dấu)
              </p>
              <div style={{ height: signBoxH }}></div>
            </div>
          </div>
        )}

        {afterFooter ? (
          <div
            style={{
              marginTop: compact ? 10 : 16,
              pageBreakInside: "avoid",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
            {afterFooter}
          </div>
        ) : null}

      </div>
    </div>
  );
};

export default PrintLayout;
