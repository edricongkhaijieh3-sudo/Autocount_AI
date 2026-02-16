"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface PageContextData {
  currentPage: string;
  currentAction?: string;
  pageDescription?: string;
  formData?: Record<string, unknown>;
  availableActions?: string[];
}

interface PageContextValue {
  context: PageContextData;
  setPageContext: (ctx: Partial<PageContextData>) => void;
  updateFormData: (data: Record<string, unknown>) => void;
  clearContext: () => void;
}

const defaultContext: PageContextData = {
  currentPage: "dashboard",
};

const PageContext = createContext<PageContextValue>({
  context: defaultContext,
  setPageContext: () => {},
  updateFormData: () => {},
  clearContext: () => {},
});

export function PageContextProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<PageContextData>(defaultContext);

  const setPageContext = useCallback((ctx: Partial<PageContextData>) => {
    setContext((prev) => ({ ...prev, ...ctx }));
  }, []);

  const updateFormData = useCallback((data: Record<string, unknown>) => {
    setContext((prev) => ({
      ...prev,
      formData: { ...(prev.formData || {}), ...data },
    }));
  }, []);

  const clearContext = useCallback(() => {
    setContext(defaultContext);
  }, []);

  return (
    <PageContext.Provider value={{ context, setPageContext, updateFormData, clearContext }}>
      {children}
    </PageContext.Provider>
  );
}

export function usePageContext() {
  return useContext(PageContext);
}
