"use client";

import { useEffect, useState } from "react";
import { getGscModuleLockStatus } from "../actions/gsc-module-lock.actions";

export function useGscModuleLock(ngayGiamSat: string | null | undefined) {
  const [lockedUntilDate, setLockedUntilDate] = useState<string | null>(null);
  const [isLockedForSelectedDate, setIsLockedForSelectedDate] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await getGscModuleLockStatus(ngayGiamSat);
        if (cancelled || !res.success) return;
        setLockedUntilDate(res.lockedUntilDate);
        setIsLockedForSelectedDate(res.isLockedForSelectedDate);
        setLockMessage(res.lockMessage);
      } catch {
        if (!cancelled) {
          setLockedUntilDate(null);
          setIsLockedForSelectedDate(false);
          setLockMessage(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ngayGiamSat]);

  return { lockedUntilDate, isLockedForSelectedDate, lockMessage };
}
