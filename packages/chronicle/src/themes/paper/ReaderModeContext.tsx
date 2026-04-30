'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface ReaderModeContextValue {
  readerMode: boolean;
  toggleReaderMode: () => void;
}

const ReaderModeContext = createContext<ReaderModeContextValue>({
  readerMode: false,
  toggleReaderMode: () => {},
});

export function ReaderModeProvider({ children }: { children: ReactNode }) {
  const [readerMode, setReaderMode] = useState(false);
  return (
    <ReaderModeContext.Provider
      value={{ readerMode, toggleReaderMode: () => setReaderMode(v => !v) }}
    >
      {children}
    </ReaderModeContext.Provider>
  );
}

export function useReaderMode() {
  return useContext(ReaderModeContext);
}
