"use client";

import { useEffect } from "react";
import "./globals.css";

/** Lỗi ở tầng gốc (layout): không còn khung ứng dụng nên tự dựng html tối giản. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error({ module: "app", action: "global-error", digest: error.digest, error: error.message });
  }, [error]);

  return (
    <html lang="vi">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <div style={{ maxWidth: 480, margin: "20vh auto", padding: 16, textAlign: "center" }}>
          <p>Hệ thống gặp lỗi khi khởi động. Anh/chị thử tải lại; nếu vẫn lỗi, báo quản trị hệ thống.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ marginTop: 12, minHeight: 44, padding: "0 20px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", fontSize: 16 }}
          >
            Tải lại
          </button>
        </div>
      </body>
    </html>
  );
}
