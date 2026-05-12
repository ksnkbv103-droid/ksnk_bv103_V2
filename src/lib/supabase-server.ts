import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Client đọc phiên đăng nhập từ cookie (Server Actions / Server Components).
 * Bắt buộc cho auth.getUser() — không dùng service_role để suy luận user.
 */
export async function createServerSupabaseUserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Thiếu biến môi trường Supabase trong .env.local');
  }
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* Server Component / read-only cookie scope */
        }
      },
    },
  });
}

/**
 * Client anon (không cookie phiên đăng nhập) — **không** dùng cho đọc bảng có RLS theo `authenticated`.
 * Đọc/ghi theo user: `createServerSupabaseUserClient()`; bypass sau verify: `createAdminSupabaseClient()`.
 */
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Thiếu biến môi trường Supabase trong .env.local');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    }
  });
};

/**
 * Supabase **service role** — **bypass hoàn toàn RLS**.
 *
 * Chỉ dùng trong Server Actions / Route Handlers sau khi đã xác thực người dùng
 * và gọi `verifyPermission` (hoặc tương đương như `ensureRbacAdmin`).
 * Không dùng tên “safe”: mọi thao tác DB vẫn phụ thuộc gate tầng app — bỏ sót gate = rủi ro lộ/ghi dữ liệu.
 *
 * Đọc/ghi theo phiên user (RLS): `createServerSupabaseUserClient()`.
 */
export const createAdminSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Thiếu biến môi trường Admin (service_role) trong .env');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
};
