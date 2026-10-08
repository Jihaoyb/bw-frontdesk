// Keyboard rules for text fields (issue 011 f, extended in issue 015). Enter
// sends only with a fine pointer (desktop); on touch devices Enter inserts a
// newline and the button sends. Shift+Enter always inserts a newline.
// Cmd/Ctrl+Enter always sends. A key event raised while an IME is composing
// (Japanese, Chinese, Korean input) never submits.

export type KeyFacts = { key: string; shiftKey: boolean; isComposing: boolean; finePointer: boolean; metaKey?: boolean; ctrlKey?: boolean };

export function shouldSendOnEnter(k: KeyFacts): boolean {
  if (k.key !== "Enter" || k.isComposing) return false;
  if (k.metaKey || k.ctrlKey) return true; // explicit send on any pointer
  return !k.shiftKey && k.finePointer;
}

/** Escape leaves the focused text box (blur). Never while an IME is composing: Escape cancels the candidate then. */
export function shouldLeaveOnEscape(k: Pick<KeyFacts, "key" | "isComposing">): boolean {
  return k.key === "Escape" && !k.isComposing;
}

export type FocusShortcutFacts = { key: string; inEditable: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean };

/** A bare "/" outside any text box focuses the page's main text box, as in most inboxes. */
export function isFocusShortcut(k: FocusShortcutFacts): boolean {
  return k.key === "/" && !k.inEditable && !k.metaKey && !k.ctrlKey && !k.altKey;
}

/** Read the facts off a React keyboard event in the browser. */
export function keyFacts(e: { key: string; shiftKey: boolean; metaKey?: boolean; ctrlKey?: boolean; nativeEvent: KeyboardEvent }): KeyFacts {
  const native = e.nativeEvent;
  const isComposing = native.isComposing || native.keyCode === 229;
  const finePointer = typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(pointer: fine)").matches : true;
  return { key: e.key, shiftKey: e.shiftKey, isComposing, finePointer, metaKey: e.metaKey ?? false, ctrlKey: e.ctrlKey ?? false };
}

/** Is the element a place where typing goes (so "/" must type, not focus)? */
export function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable === true;
}
