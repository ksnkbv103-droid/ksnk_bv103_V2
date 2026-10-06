import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPathBlockedUnderActivePilot } from "@/lib/ksnk-pilot-route-scope";
import { GUEST_STATS_HOME_PATH } from "@/lib/auth/guest-stats-access";
import {
  classifyGuestRoleLookup,
  decideGuestProxyAccess,
  guestLookupFailWantsHtmlPage,
} from "@/lib/auth/proxy-guest-role-gate";

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

/** PA C: 503 khi không tra được roles — HTML có thử lại; action/API nhận JSON ngắn. */
function guestRoleLookupUnavailableResponse(
  request: NextRequest,
  supabaseResponse: NextResponse
): NextResponse {
  const wantsHtml = guestLookupFailWantsHtmlPage(
    request.method,
    request.headers.get("accept")
  );
  const body = wantsHtml
    ? `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"/><title>Không kiểm tra được quyền</title></head><body style="font-family:system-ui;padding:2rem;max-width:32rem"><h1>Không kiểm tra được quyền</h1><p>Hệ thống tạm thời không xác nhận được vai trò tài khoản. Vui lòng thử lại.</p><p><a href="">Thử lại</a></p></body></html>`
    : JSON.stringify({
        error: "Không kiểm tra được quyền, thử lại",
        code: "GUEST_ROLE_LOOKUP_FAILED",
      });
  const res = new NextResponse(body, {
    status: 503,
    headers: {
      "Content-Type": wantsHtml ? "text/html; charset=utf-8" : "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
  copyResponseCookies(supabaseResponse, res);
  return res;
}

/**
 * Đồng bộ/làm mới cookie phiên Supabase + chặn route pilot + **bắt buộc đăng nhập**
 * trước RSC / Server Actions (tránh vào dashboard rồi mới lỗi `Bạn chưa đăng nhập.`).
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPathBlockedUnderActivePilot(pathname)) {
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

  // A) getUser() → /auth/v1/user mỗi navigation. B) getClaims() verify JWT/JWKS local — chọn B.
  // Fallback getUser nếu claims lỗi (symmetric JWT / WebCrypto thiếu).
  let user: { id: string } | null = null;
  try {
    const claimsRes = await supabase.auth.getClaims();
    const sub = claimsRes.data?.claims?.sub;
    if (typeof sub === "string" && sub.length > 0) {
      user = { id: sub };
    } else if (claimsRes.error) {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }
  } catch (err) {
    console.error("[proxy] Supabase auth.getClaims/getUser failed:", err);
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

  if (user) {
    // BE-GUEST-01: allowlist guest chỉ theo roles từ DB — không tin cookie client.
    // Lỗi lookup (throw hoặc `{ error }`) → PA C fail-closed (xem proxy-guest-role-gate).
    let outcome;
    try {
      const { data: permRow, error: permError } = await supabase
        .from("v_sys_user_permissions")
        .select("roles")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      outcome = classifyGuestRoleLookup({
        data: permRow as { roles?: unknown } | null,
        error: permError ?? null,
      });
      if (outcome.kind === "lookup_failed") {
        console.error("[proxy] guest role lookup failed:", permError);
      }
    } catch (err) {
      console.error("[proxy] guest role lookup failed:", err);
      outcome = classifyGuestRoleLookup({ data: null, error: null, threw: true });
    }

    const decision = decideGuestProxyAccess({
      outcome,
      pathname,
      onLoginRoute,
    });

    if (decision.action === "service_unavailable") {
      return guestRoleLookupUnavailableResponse(request, supabaseResponse);
    }

    if (decision.action === "redirect_guest_home") {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = GUEST_STATS_HOME_PATH;
      homeUrl.search = "";
      const redirectResponse = NextResponse.redirect(homeUrl);
      copyResponseCookies(supabaseResponse, redirectResponse);
      return redirectResponse;
    }

    // guest (đã allow) hoặc lookup_failed trên allowlist (/login, thống kê) — không redirect home.
    if (outcome.kind === "guest" || outcome.kind === "lookup_failed") {
      return supabaseResponse;
    }

    if (onLoginRoute) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/";
      const redirectResponse = NextResponse.redirect(homeUrl);
      copyResponseCookies(supabaseResponse, redirectResponse);
      return redirectResponse;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
