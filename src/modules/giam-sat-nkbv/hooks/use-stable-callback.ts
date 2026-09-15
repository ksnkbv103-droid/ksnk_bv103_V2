"use client";

import React, { useCallback } from "react";

/** Handler ổn định tham chiếu — hàng memo không re-render vì closure mới. */
export function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = React.useRef(fn);
  React.useInsertionEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}
