/**
 * Đo runtime một trang (dán vào console trình duyệt, hoặc chạy qua javascript_tool).
 * Trả JSON: depth = số lớp hộp lồng tối đa trong <main>; h/r/fs/fw = tập giá trị duy nhất của
 * chiều cao control (px), bo góc control (px), cỡ chữ (px), độ đậm chữ trong <main>.
 * Dùng cho baseline trước/sau từng lát: scripts/data/ui-audit-runtime-baseline.json
 * Lưu ý: đợi trang tải xong (≥ 5s) — trang còn skeleton cho n rất nhỏ (< 10) = chưa đo được.
 */
(() => {
  const m = document.querySelector("main") || document.body;
  const vis = (e) => e.offsetParent;
  const box = (e) => {
    const s = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return (
      (s.borderTopStyle !== "none" && s.borderTopWidth !== "0px") ||
      s.boxShadow !== "none" ||
      (s.backgroundColor !== "rgba(0, 0, 0, 0)" && r.width > 120 && r.height > 40)
    );
  };
  let depth = 0;
  const walk = (e, d) => {
    d += box(e) ? 1 : 0;
    depth = Math.max(depth, d);
    for (const c of e.children) walk(c, d);
  };
  walk(m, 0);
  const uniq = (a) => [...new Set(a)].sort((x, y) => x - y);
  const controls = [...m.querySelectorAll("button,input,select,textarea")].filter(vis);
  const all = [...m.querySelectorAll("*")].filter(vis);
  return JSON.stringify({
    p: location.pathname,
    depth,
    n: all.length,
    ctl: controls.length,
    h: uniq(controls.map((e) => Math.round(e.getBoundingClientRect().height))),
    r: uniq(controls.map((e) => parseFloat(getComputedStyle(e).borderRadius) || 0)),
    fs: uniq(all.map((e) => parseFloat(getComputedStyle(e).fontSize))),
    fw: uniq(all.map((e) => +getComputedStyle(e).fontWeight)),
  });
})();
