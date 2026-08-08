"use client";

import { useEffect, useState } from "react";

type Props = {
  hanNopLuc: string;
  serverNow: string;
  onExpire: () => void;
};

export function DaoTaoTimer({ hanNopLuc, serverNow, onExpire }: Props) {
  const [offset] = useState(() => Date.now() - new Date(serverNow).getTime());
  const [remainMs, setRemainMs] = useState(
    () => new Date(hanNopLuc).getTime() - (Date.now() - offset),
  );
  const [fired, setFired] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      const rem = new Date(hanNopLuc).getTime() - (Date.now() - offset);
      setRemainMs(rem);
      if (rem <= 0 && !fired) {
        setFired(true);
        onExpire();
      }
    }, 500);
    return () => clearInterval(t);
  }, [hanNopLuc, offset, onExpire, fired]);

  const totalSec = Math.max(0, Math.ceil(remainMs / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const urgent = totalSec <= 60;

  return (
    <div
      className={`rounded-[var(--radius-control)] px-3 py-1.5 font-mono text-sm font-semibold tabular-nums ${
        urgent
          ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
          : "bg-slate-100 text-slate-800 ring-1 ring-slate-200"
      }`}
    >
      Còn lại {mm}:{ss}
    </div>
  );
}
