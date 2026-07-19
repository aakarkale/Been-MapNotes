import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-accent text-3xl shadow-lg shadow-accent/30">
          📍
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Been</h1>
        <p className="max-w-xs text-sm text-muted">
          Save the places that matter. Drop notes on the map and get gently
          nudged when you&apos;re nearby.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
