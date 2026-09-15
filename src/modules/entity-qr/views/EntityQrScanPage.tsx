"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import QrScanInput from "@/components/shared/QrScanInput";
import { resolveEntityQrAction } from "@/lib/entity-qr/resolve-entity-qr.action";
import { KsnkSupervisionPanel } from "@/components/shared/ksnk-supervision-chrome";

/**
 * Cổng quét QR toàn viện — mở lại đúng phiếu / truy vết CSSD.
 */
export default function EntityQrScanPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [lastCode, setLastCode] = useState("");

  const onScan = useCallback(
    async (code: string) => {
      const normalized = String(code || "").trim();
      if (!normalized || busy) return;
      setBusy(true);
      setLastCode(normalized.toUpperCase());
      try {
        const res = await resolveEntityQrAction(normalized);
        if (!res.success || !res.data?.href) {
          toast.error(res.error || "Không nhận diện mã QR");
          return;
        }
        toast.success(`Mở ${res.data.label}`);
        router.push(res.data.href);
      } catch {
        toast.error("Lỗi xử lý mã QR");
      } finally {
        setBusy(false);
      }
    },
    [busy, router],
  );

  return (
    <div className="bv103-stack-page">
      <KsnkSupervisionPanel className="space-y-[var(--bv103-space-3)] p-4 sm:p-6">
        <QrScanInput
          disabled={busy}
          autoFocus
          placeholder="Quét hoặc gõ mã QR rồi Enter…"
          cameraTitle="Quét QR toàn viện"
          onEnter={(c) => void onScan(c)}
          onCameraScan={(c) => void onScan(c)}
        />
        {busy ? (
          <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang mở bản ghi…
          </p>
        ) : null}
        {lastCode ? (
          <p className="font-mono text-xs text-slate-500">
            Mã vừa quét: <span className="font-bold text-slate-700">{lastCode}</span>
          </p>
        ) : null}
      </KsnkSupervisionPanel>
    </div>
  );
}
