/**
 * In HTML qua iframe ẩn — không dùng `window.open` (tránh trình duyệt chặn popup
 * khi mở cửa sổ sau tác vụ bất đồng bộ).
 */
export function printHtmlDocument(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Chỉ in được trên trình duyệt"));
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "Bản in");
    iframe.setAttribute("aria-hidden", "true");
    // Một số trình duyệt cần khung có kích thước tối thiểu để lệnh print hoạt động.
    iframe.style.cssText =
      "position:fixed;left:0;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = win?.document;
    if (!win || !doc) {
      iframe.remove();
      reject(new Error("Không tạo được vùng in"));
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      iframe.remove();
    };

    let settled = false;
    const finishOk = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const finishErr = (err: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err instanceof Error ? err : new Error("Không in được"));
    };

    const doPrint = () => {
      try {
        win.focus();
        const onAfter = () => {
          win.removeEventListener("afterprint", onAfter);
          window.setTimeout(cleanup, 300);
        };
        win.addEventListener("afterprint", onAfter);
        win.print();
        finishOk();
        // Safari / một số trình duyệt không bắn afterprint đáng tin → gỡ iframe sau timeout.
        window.setTimeout(cleanup, 60_000);
      } catch (err) {
        finishErr(err);
      }
    };

    // Chờ layout/paint ngắn trước khi gọi print.
    window.setTimeout(doPrint, 100);
  });
}
