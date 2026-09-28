"use client";

import { cn } from "cn";
import { type ReactNode, useEffect, useRef, useState } from "react";

interface RevealProps {
  children: ReactNode;
  delayMs?: number;
  className?: string;
  id?: string;
}

export function Reveal({ children, delayMs = 0, className, id }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.IntersectionObserver) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      id={id}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={cn(
        "translate-y-5 opacity-0 transition-all duration-500 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none",
        visible && "translate-y-0 opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
