import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isPathBlockedUnderPilotCoreModules,
  isPilotCoreModulesScopeEnabled,
} from "@/lib/ksnk-pilot-core-modules-scope";
import {
  isPathBlockedUnderPilotFourModules,
  isPilotFourModulesScopeEnabled,
} from "@/lib/ksnk-pilot-four-modules-scope";

/** Trang đăng nhập / khôi phục mật khẩu — không chặn người chưa đăng nhập. */
function isLoginRoutePath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

/** Cookie phiên Supabase (@supabase/ssr) — chỉ gọi Auth API khi có dấu hiệu đã đăng nhập. */
function hasSupabaseAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.includes("auth-token") || c.name.startsWith("sb-"));
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
  if (isPilotCoreModulesScopeEnabled() && isPathBlockedUnderPilotCoreModules(pathname)) {
    return new NextResponse(null, { status: 404 });
  } else if (
    isPilotFourModulesScopeEnabled() &&
    !isPilotCoreModulesScopeEnabled() &&
    isPathBlockedUnderPilotFourModules(pathname)
  ) {
    return new NextResponse(null, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Thiếu cấu hình Auth — không pass-through trang bảo vệ (BE-AUTH-04).
    if (!isLoginRoutePath(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      return NextResponse.redirect(loginUrl);
    }
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
        cookiesToSet.forEach(({ name, value, options: _options }) => {
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

  const onLoginRoute = isLoginRoutePath(pathname);
  const mayHaveSession = hasSupabaseAuthCookies(request);

  // Không có cookie phiên → chuyển login ngay, tránh gọi Auth API (~100–800ms mỗi request dev).
  if (!onLoginRoute && !mayHaveSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  // Khách vào /login: không gọi Supabase Auth (tránh treo ~10s khi mạng/Cloudflare timeout).
  if (onLoginRoute && !mayHaveSession) {
    return supabaseResponse;
  }

  // Prefetch link (hover menu): bỏ qua getUser() — navigation thật vẫn xác minh JWT.
  const isPrefetch =
    request.headers.get("Next-Router-Prefetch") === "1" ||
    request.headers.get("Purpose") === "prefetch";
  if (isPrefetch && mayHaveSession) {
    return supabaseResponse;
  }

  // IMPORTANT: getUser() xác minh JWT qua Supabase Auth API (server-side),
  // không chỉ đọc cookie như getSession() — ngăn JWT spoofing.
  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.error("[proxy] Supabase auth.getUser failed:", err);
    if (!onLoginRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      const redirectResponse = NextResponse.redirect(loginUrl);
      copyResponseCookies(supabaseResponse, redirectResponse);
      return redirectResponse;
    }
    return supabaseResponse;
  }

  if (!user && !onLoginRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    const redirectResponse = NextResponse.redirect(loginUrl);
    copyResponseCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (user && onLoginRoute) {
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
