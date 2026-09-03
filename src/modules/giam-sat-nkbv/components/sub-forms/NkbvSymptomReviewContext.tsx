"use client";

import React, { createContext, useContext } from "react";
import type { NkbvSymptomReviewEntry, NkbvSymptomReviewMap } from "../../lib/nkbv-symptom-review";
import { emptySymptomReview } from "../../lib/nkbv-symptom-review";

type Ctx = {
  review: NkbvSymptomReviewMap;
  onReviewChange: (key: string, patch: Partial<NkbvSymptomReviewEntry>) => void;
};

const SymptomReviewContext = createContext<Ctx>({
  review: {},
  onReviewChange: () => {},
});

export function NkbvSymptomReviewProvider({
  review,
  onReviewChange,
  children,
}: Ctx & { children: React.ReactNode }) {
  return (
    <SymptomReviewContext.Provider value={{ review, onReviewChange }}>
      {children}
    </SymptomReviewContext.Provider>
  );
}

export function useNkbvSymptomReview(formField: string): {
  entry: NkbvSymptomReviewEntry;
  onChange: (patch: Partial<NkbvSymptomReviewEntry>) => void;
} {
  const { review, onReviewChange } = useContext(SymptomReviewContext);
  return {
    entry: review[formField] || emptySymptomReview(),
    onChange: (patch) => onReviewChange(formField, patch),
  };
}
