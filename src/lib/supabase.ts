import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isProd = process.env.NODE_ENV === "production";
/** Bật log kết nối (dev): đặt NEXT_PUBLIC_DEBUG_SUPABASE=1 trong .env.local — không bật trên production. */
const debugConnection = !isProd && process.env.NEXT_PUBLIC_DEBUG_SUPABASE === "1";

if (debugConnection) {
  console.log("--- [DEBUG] KIỂM TRA KẾT NỐI SUPABASE (dev, NEXT_PUBLIC_DEBUG_SUPABASE=1) ---");
  console.log("Thời gian:", new Date().toLocaleString("vi-VN"));
  console.log("URL Gốc:", supabaseUrl);
  console.log("KEY Gốc:", supabaseAnonKey ? `${supabaseAnonKey.substring(0, 15)}...` : "MISSING");
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("LỖI NGHIÊM TRỌNG: Thiếu biến môi trường Supabase (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
}

/**
 * LƯU Ý: Nếu gặp lỗi 'ENOTFOUND', hãy kiểm tra:
 * 1. Project ID trong URL có đúng không (Ví dụ: tnmwuxrjounvwhkzmi).
 * 2. Dự án có đang ở trạng thái 'Active' trên Supabase Dashboard không.
 * 3. Mạng bệnh viện có chặn tên miền *.supabase.co không.
 */

/**
 * Browser client SSR: lưu phiên vào cookie (document.cookie), không chỉ localStorage,
 * để Server Actions đọc được qua createServerSupabaseUserClient().
 */
export const supabase = createBrowserClient(
  (supabaseUrl || "").trim() || "https://placeholder.supabase.co",
  (supabaseAnonKey || "").trim() || "placeholder"
);
