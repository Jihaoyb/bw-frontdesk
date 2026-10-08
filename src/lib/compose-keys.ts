// Keyboard submission rules for text fields (issue 011 f). Enter sends only
// with a fine pointer (desktop); on touch devices Enter inserts a newline and
// the button sends. Shift+Enter always inserts a newline. A key event raised
// while an IME is composing (Japanese, Chinese, Korean input) never submits.

export type KeyFacts = { key: string; shiftKey: boolean; isComposing: boolean; finePointer: boolean };

export function shouldSendOnEnter(k: KeyFacts): boolean {
  return k.key === "Enter" && !k.shiftKey && !k.isComposing && k.finePointer;
}

/** Read the facts off a React keyboard event in the browser. */
export function keyFacts(e: { key: string; shiftKey: boolean; nativeEvent: KeyboardEvent }): KeyFacts {
  const native = e.nativeEvent;
  const isComposing = native.isComposing || native.keyCode === 229;
  const finePointer = typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(pointer: fine)").matches : true;
  return { key: e.key, shiftKey: e.shiftKey, isComposing, finePointer };
}
