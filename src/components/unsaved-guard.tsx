"use client";

import { useEffect } from "react";

// Warns before leaving the page while a knowledge form has edits that were
// neither saved nor published. Submitting the form clears the guard.
export function UnsavedGuard({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    let dirty = false;
    const onInput = () => { dirty = true; };
    const onSubmit = () => { dirty = false; };
    const onBeforeUnload = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    form.addEventListener("input", onInput);
    form.addEventListener("submit", onSubmit);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      form.removeEventListener("input", onInput);
      form.removeEventListener("submit", onSubmit);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [formId]);
  return null;
}
