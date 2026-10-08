"use client";

import { useEffect } from "react";
import { isEditable, isFocusShortcut, shouldLeaveOnEscape } from "@/lib/compose-keys";

// Issue 015: page-wide keys for desktop. "/" focuses the page's main text box
// (marked data-shortcut-focus) when focus is not already in one. Escape leaves
// the focused text box; with no text box focused it closes the open source or
// policy row around the focused element. Nothing here submits anything.
export function KeyboardShortcuts() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      const target = e.target instanceof Element ? e.target : null;
      if (isFocusShortcut({ key: e.key, inEditable: isEditable(target), metaKey: e.metaKey, ctrlKey: e.ctrlKey, altKey: e.altKey })) {
        const box = document.querySelector<HTMLElement>("[data-shortcut-focus]:not(:disabled)");
        if (box) { e.preventDefault(); box.focus(); }
        return;
      }
      if (!shouldLeaveOnEscape({ key: e.key, isComposing: e.isComposing })) return;
      if (isEditable(target)) { (target as HTMLElement).blur(); return; }
      const open = target?.closest<HTMLDetailsElement>("details[open]");
      if (open) { open.open = false; open.querySelector<HTMLElement>("summary")?.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  return null;
}
