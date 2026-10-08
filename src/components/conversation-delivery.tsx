"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';

type DeliveryContext = { busy: boolean; track: (id: string, busy: boolean) => void };
const Context = createContext<DeliveryContext | null>(null);

/** Restart waits for every send in this conversation, including handoffs and follow-ups. */
export function ConversationDeliveryProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const track = useCallback((id: string, busy: boolean) => {
    setPending((current) => {
      if (current.has(id) === busy) return current;
      const next = new Set(current);
      if (busy) next.add(id); else next.delete(id);
      return next;
    });
  }, []);
  const value = useMemo(() => ({ busy: pending.size > 0, track }), [pending.size, track]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useConversationBusy() { return useContext(Context)?.busy ?? false; }
export function useTrackDelivery(busy: boolean) {
  const track = useContext(Context)?.track;
  const id = useId();
  useEffect(() => {
    track?.(id, busy);
    return () => track?.(id, false);
  }, [id, busy, track]);
}
