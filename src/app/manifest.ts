import type { MetadataRoute } from "next";

const ICON = "/brand/logo-bv103.png";

/** “Thêm vào Màn hình chính” / shortcut — tên + icon (Chrome, Edge Android; iOS dùng thêm apple-touch-icon trong metadata). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KSNK 103 — Bệnh viện Quân y 103",
    short_name: "KSNK 103",
    description: "Hệ thống Kiểm soát nhiễm khuẩn — Bệnh viện Quân y 103",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    icons: [
      { src: ICON, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: ICON, sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
