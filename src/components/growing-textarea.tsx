"use client";

import { useEffect, useRef, type ComponentProps, type Ref } from 'react';

/** Grow after wrapping, typing, deletion, and container resizing; then scroll internally. */
export function GrowingTextarea({ ref: forwarded, rows = 1, maxRows = 4, ...props }: ComponentProps<'textarea'> & { maxRows?: number }) {
  const local = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const element = local.current;
    if (!element) return;
    const resize = () => {
      const style = getComputedStyle(element);
      const line = parseFloat(style.lineHeight) || 24;
      const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      element.style.height = 'auto';
      element.style.height = `${Math.min(Math.max(element.scrollHeight + border, rows * line + padding + border), maxRows * line + padding + border)}px`;
      element.style.overflowY = element.scrollHeight > element.clientHeight ? 'auto' : 'hidden';
    };
    resize();
    element.addEventListener('input', resize);
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (width !== element.clientWidth) { width = element.clientWidth; resize(); }
    });
    observer.observe(element);
    return () => { element.removeEventListener('input', resize); observer.disconnect(); };
  }, [props.value, props.defaultValue, rows, maxRows]);
  return <textarea {...props} rows={rows} ref={(node) => {
    local.current = node;
    const ref = forwarded as Ref<HTMLTextAreaElement> | undefined;
    if (typeof ref === 'function') return ref(node);
    if (ref) ref.current = node;
  }} />;
}
