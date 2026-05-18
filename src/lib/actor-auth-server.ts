import { createServerSupabaseUserClient } from "@/lib/supabase-server";

/** `auth.users.id` của phiên hiện tại — chỉ import từ Server Actions / RSC. */
export async function getActorAuthUserId(): Promise<string | null> {
  const sb = await createServerSupabaseUserClient();
  const {
    data: { session },
  } = await sb.auth.getSession();
  return session?.user?.id ?? null;
}

/** `mdm_nhan_su.id` của người dùng hiện tại gắn qua `auth_user_id`. */
export async function getActorNhanSuId(): Promise<string | null> {
  const authId = await getActorAuthUserId();
  if (!authId) return null;
  const sb = await createServerSupabaseUserClient();
  const { data, error } = await sb
    .from("mdm_nhan_su")
    .select("id")
    .eq("auth_user_id", authId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}
