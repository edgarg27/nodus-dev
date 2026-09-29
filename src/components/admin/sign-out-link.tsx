"use client";

import { createClient } from "@/lib/supabase/client";

export function SignOutLink() {
  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={cerrarSesion}
      className="relative cursor-pointer text-[13px] font-semibold whitespace-nowrap text-text-muted transition-colors duration-150 ease-out after:absolute after:inset-x-0 after:-bottom-[3px] after:h-[1.5px] after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-200 after:ease-[cubic-bezier(0.22,1,0.36,1)] after:content-[''] hover:text-[#14315C] hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none"
    >
      Cerrar sesión
    </button>
  );
}
