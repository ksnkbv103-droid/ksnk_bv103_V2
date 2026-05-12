import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isPathBlockedUnderPilotFourModules,
  isPilotFourModulesScopeEnabled,
} from "@/lib/ksnk-pilot-four-modules-scope";

/** Đồng bộ/làm mới cookie phiên Supabase trước Server Actions & RSC — bắt buộc để auth.getUser() thấy user. */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPilotFourModulesScopeEnabled() && isPathBlockedUnderPilotFourModules(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return response;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
