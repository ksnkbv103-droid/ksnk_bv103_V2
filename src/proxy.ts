import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isPathBlockedUnderPilotFourModules,
  isPilotFourModulesScopeEnabled,
} from "@/lib/ksnk-pilot-four-modules-scope";

/** Trang đăng nhập / khôi phục mật khẩu — không chặn người chưa đăng nhập. */
function isLoginRoutePath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

function copyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value, {
      domain: c.domain,
      expires: c.expires,
      httpOnly: c.httpOnly,
      maxAge: c.maxAge,
      path: c.path,
      priority: c.priority,
      partitioned: c.partitioned,
      sameSite: c.sameSite as "strict" | "lax" | "none" | undefined,
      secure: c.secure,
    });
  });
}

/**
 * Đồng bộ/làm mới cookie phiên Supabase + chặn route pilot + **bắt buộc đăng nhập**
 * trước RSC / Server Actions (tránh vào dashboard rồi mới lỗi `Bạn chưa đăng nhập.`).
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPilotFourModulesScopeEnabled() && isPathBlockedUnderPilotFourModules(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(
            name,
            value,
            options as Parameters<(typeof supabaseResponse)["cookies"]["set"]>[2],
          );
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isLoginRoutePath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const redirectResponse = NextResponse.redirect(loginUrl);
    copyResponseCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (user && isLoginRoutePath(pathname)) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    const redirectResponse = NextResponse.redirect(homeUrl);
    copyResponseCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
