import { useEffect, useState } from "react";

export function useDebouncedValue<T>(valor: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setDebounced(valor), delayMs);
    return () => clearTimeout(temporizador);
  }, [valor, delayMs]);

  return debounced;
}
