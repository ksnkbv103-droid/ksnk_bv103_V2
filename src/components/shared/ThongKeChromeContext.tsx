"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { KsnkPageChrome } from "@/components/shared/KsnkPageChrome";

type ThongKeChromeContextValue = {
  filtersHost: HTMLDivElement | null;
  actionsHost: HTMLDivElement | null;
};

const ThongKeChromeContext = createContext<ThongKeChromeContextValue | null>(null);

export function ThongKeChromeProvider({
  children,
  tabs,
}: {
  children: React.ReactNode;
  tabs: React.ReactNode;
}) {
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [hosts, setHosts] = useState<ThongKeChromeContextValue>({
    filtersHost: null,
    actionsHost: null,
  });

  useEffect(() => {
    setHosts({
      filtersHost: filtersRef.current,
      actionsHost: actionsRef.current,
    });
  }, []);

  const value = useMemo(() => hosts, [hosts]);

  return (
    <ThongKeChromeContext.Provider value={value}>
      <KsnkPageChrome
        showTitle={false}
        sticky
        tabs={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0 flex-1">{tabs}</div>
            <div
              ref={actionsRef}
              className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 empty:hidden"
            />
          </div>
        }
        filters={<div ref={filtersRef} className="chrome-slot min-w-0" />}
      />
      {children}
    </ThongKeChromeContext.Provider>
  );
}

/** Đẩy filters/actions vào sticky band `/thong-ke` (portal — không shell thứ hai). */
export function ThongKeChromeSlot({
  filters,
  actions,
}: {
  filters?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const ctx = useContext(ThongKeChromeContext);
  if (!ctx) return null;

  return (
    <>
      {filters && ctx.filtersHost ? createPortal(filters, ctx.filtersHost) : null}
      {actions && ctx.actionsHost ? createPortal(actions, ctx.actionsHost) : null}
    </>
  );
}

export function useThongKeChrome(): ThongKeChromeContextValue | null {
  return useContext(ThongKeChromeContext);
}
