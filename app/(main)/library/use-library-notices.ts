"use client";

import { useCallback, useState } from "react";

export function useLibraryNotices() {
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const clearConflictNotice = useCallback(() => {
    setConflictNotice(null);
  }, []);

  const clearActionNotice = useCallback(() => {
    setActionNotice(null);
  }, []);

  const clearAllNotices = useCallback(() => {
    setConflictNotice(null);
    setActionNotice(null);
  }, []);

  const showConflictNotice = useCallback((message: string) => {
    setConflictNotice(message);
  }, []);

  const showActionNotice = useCallback((message: string) => {
    setActionNotice(message);
  }, []);

  return {
    conflictNotice,
    actionNotice,
    clearConflictNotice,
    clearActionNotice,
    clearAllNotices,
    showConflictNotice,
    showActionNotice,
  };
}
