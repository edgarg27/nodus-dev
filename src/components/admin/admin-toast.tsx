"use client";

import { CheckIcon } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

interface AdminToastContextValue {
  showToast: (message: string) => void;
}

const AdminToastContext = createContext<AdminToastContextValue | null>(null);

const DURACION_MS = 3200;

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [mensaje, setMensaje] = useState("");
  const [visible, setVisible] = useState(false);
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((texto: string) => {
    if (temporizadorRef.current) clearTimeout(temporizadorRef.current);
    setMensaje(texto);
    setVisible(true);
    temporizadorRef.current = setTimeout(() => setVisible(false), DURACION_MS);
  }, []);

  return (
    <AdminToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`fixed right-6 bottom-6 z-[70] flex max-w-[340px] items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm ring-1 ring-foreground/10 transition-all duration-200 ease-out motion-reduce:transition-none ${
          visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <CheckIcon className="size-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
        <span>{mensaje}</span>
      </div>
    </AdminToastContext.Provider>
  );
}

export function useAdminToast(): AdminToastContextValue {
  const context = useContext(AdminToastContext);
  if (!context) {
    throw new Error("useAdminToast debe usarse dentro de un AdminToastProvider");
  }
  return context;
}
