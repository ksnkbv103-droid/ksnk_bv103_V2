import { createServerSupabaseUserClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import type { User, SupabaseClient } from "@supabase/supabase-js";

export type DbRole = "user" | "admin";

/**
 * Lấy thông tin user / actor hiện tại từ auth session.
 * Sử dụng createServerSupabaseUserClient().auth.getUser() theo chuẩn Next.js Server Components / Actions.
 */
export async function getActor(): Promise<User | null> {
  try {
    const supabase = await createServerSupabaseUserClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Alias cho getActor() để tương thích ngữ cảnh resolveCurrentActor.
 */
export async function resolveCurrentActor(): Promise<User | null> {
  return getActor();
}

/**
 * Trả về Supabase client tương ứng:
 * - "user" (hoặc mặc định): Client đọc cookie session của user hiện tại (tuân thủ RLS).
 * - "admin": Client service_role (chỉ dùng sau khi đã verify gate quyền nghiệp vụ).
 */
export async function getDb(role: DbRole = "user"): Promise<SupabaseClient> {
  if (role === "admin") {
    return createAdminSupabaseClient();
  }
  return (await createServerSupabaseUserClient()) as unknown as SupabaseClient;
}

/**
 * Helper gọi RPC an toàn qua db client tương ứng với role.
 */
export async function callRpc<T = unknown>(
  name: string,
  args?: Record<string, unknown>,
  role: DbRole = "user",
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const db = await getDb(role);
    const { data, error } = await db.rpc(name, args ?? {});
    if (error) {
      const errObj = error as unknown;
      const msg =
        typeof errObj === "object" && errObj !== null && "message" in errObj
          ? String((errObj as { message: unknown }).message)
          : String(error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error(msg),
      };
    }
    return { data: (data as T) ?? null, error: null };
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
