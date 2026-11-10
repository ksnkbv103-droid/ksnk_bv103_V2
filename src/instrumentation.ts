/**
 * Gom lỗi server về một dòng JSON có cấu trúc (tìm được trong log Vercel bằng `"tag":"ksnk_server_error"`).
 * Không ghi query string, header, cookie hay body — tránh lộ dữ liệu người bệnh/nhân sự.
 */
type RequestInfo = { path: string; method: string };
type ErrorContext = {
  routerKind: string;
  routePath: string;
  routeType: string;
  renderSource?: string;
};

export function onRequestError(
  err: unknown,
  request: RequestInfo,
  context: ErrorContext,
): void {
  const e = err as { name?: unknown; message?: unknown; digest?: unknown } | null;
  console.error(
    JSON.stringify({
      tag: "ksnk_server_error",
      at: new Date().toISOString(),
      method: request.method,
      path: String(request.path ?? "").split("?")[0],
      route: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource ?? null,
      digest: typeof e?.digest === "string" ? e.digest : null,
      name: typeof e?.name === "string" ? e.name : "Error",
      message: typeof e?.message === "string" ? e.message.slice(0, 300) : String(err).slice(0, 300),
    }),
  );
}
