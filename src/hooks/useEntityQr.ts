"use client";

import { useEffect, useState } from "react";
import { generateEntityQrDataUrl } from "@/lib/entity-qr/generate-entity-qr";

/** Theo dõi một mã → dataUrl (form in / hiện QR trên UI). */
export function useEntityQrImage(code: string | null | undefined, width = 200) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    const c = String(code || "").trim();
    if (!c) {
      setDataUrl("");
      return;
    }
    let cancelled = false;
    void generateEntityQrDataUrl(c, { width })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [code, width]);
  return dataUrl;
}
