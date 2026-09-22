import { SignUpForm } from "@/components/auth/sign-up-form";

interface SignUpPageProps {
  searchParams: Promise<{ ref?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { ref } = await searchParams;

  return (
    <main>
      <h1>Crear cuenta</h1>
      <SignUpForm ref={ref} />
    </main>
  );
}
