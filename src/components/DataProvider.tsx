"use client";

// Client-side in-memory data store. There is no database: the app boots from the
// bundled synthetic seed dataset and holds readings in React state. Regenerating or
// uploading a CSV replaces/extends that state and everything downstream recomputes.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Reading } from "@/lib/types";
import { computeDataset, type Dataset } from "@/lib/dataStore";
import { generateReadings } from "@/lib/generateData";
import seed from "@/data/seed.json";

interface DataContextValue extends Dataset {
  /** Reset to the deterministic synthetic seed dataset. */
  regenerate: () => void;
  /** Replace the dataset with imported readings. */
  replaceReadings: (readings: Reading[]) => void;
  /** Append imported readings to the current dataset. */
  appendReadings: (readings: Reading[]) => void;
  /** True when the current data came from the bundled seed. */
  isSeed: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

const SEED = seed as Reading[];

export function DataProvider({ children }: { children: ReactNode }) {
  const [readings, setReadings] = useState<Reading[]>(SEED);
  const [isSeed, setIsSeed] = useState(true);

  const dataset = useMemo(() => computeDataset(readings), [readings]);

  const regenerate = useCallback(() => {
    setReadings(generateReadings());
    setIsSeed(true);
  }, []);

  const replaceReadings = useCallback((next: Reading[]) => {
    setReadings(next);
    setIsSeed(false);
  }, []);

  const appendReadings = useCallback((next: Reading[]) => {
    setReadings((prev) => [...prev, ...next]);
    setIsSeed(false);
  }, []);

  const value: DataContextValue = {
    ...dataset,
    regenerate,
    replaceReadings,
    appendReadings,
    isSeed,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
