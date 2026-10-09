// Mientras carga una pantalla del panel, el menú lateral se queda y el contenido muestra este
// esqueleto: el clic responde al instante aunque los datos tarden (la base es remota).
export default function AdminLoading() {
  const bloque = "rounded-2xl bg-surface motion-safe:animate-pulse";
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div className="flex flex-col gap-2.5">
        <div className={`${bloque} h-7 w-64`} />
        <div className={`${bloque} h-4 w-full max-w-xl`} />
      </div>
      <div className="flex flex-col gap-3">
        <div className={`${bloque} h-20`} />
        <div className={`${bloque} h-20`} />
        <div className={`${bloque} h-20`} />
      </div>
    </div>
  );
}
