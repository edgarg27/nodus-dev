import { RecoverPasswordForm } from "@/components/auth/recover-password-form";

export default function RecuperarPage() {
  return (
    <main className="flex min-h-[calc(100vh-64px)] w-full items-center justify-center bg-background px-5 py-10">
      <div className="animate-in fade-in slide-in-from-bottom-2 flex w-full max-w-[460px] flex-col rounded-2xl border border-border bg-card p-9 shadow-[0_24px_48px_-12px_rgba(11,30,61,0.12)] duration-500">
        <RecoverPasswordForm />
      </div>
    </main>
  );
}
