"use client";

import { useEffect } from "react";
import { usePageContext, type PageContextData } from "@/lib/page-context";

/**
 * Sets page context on mount and clears on unmount.
 * Use this in any page component to tell the AI assistant where the user is.
 */
export function usePageTracking(context: PageContextData) {
  const { setPageContext, clearContext } = usePageContext();

  useEffect(() => {
    setPageContext(context);
    return () => clearContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.currentPage, context.currentAction]);
}

/**
 * Updates form data in the page context without re-mounting.
 * Use this when form fields change to keep the AI aware of what the user has filled in.
 */
export function useFormTracking(formData: Record<string, unknown>) {
  const { updateFormData } = usePageContext();

  useEffect(() => {
    updateFormData(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formData)]);
}
