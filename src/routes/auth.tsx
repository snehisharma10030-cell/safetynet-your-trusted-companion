import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSafetyStore } from "@/lib/safety-store";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to SafetyNet" },
      {
        name: "description",
        content:
          "Sign in or create a SafetyNet account to sync journeys, check-ins and trusted contacts privately — or open demo mode with no signup.",
      },
      { property: "og:title", content: "Sign in to SafetyNet" },
      {
        property: "og:description",
        content: "Private, per-account journey safety tracking. Demo mode needs no signup.",
      },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const { mode, startDemo } = useSafetyStore();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "cloud") void navigate({ to: "/app" });
  }, [mode, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast.success("Account created. If email confirmation is on, check your inbox.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success("Signed in.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      setFieldError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <Link to="/" className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <span className="font-display text-lg font-bold">SafetyNet</span>
      </Link>

      <main className="panel mt-6 p-6">
        <h1 className="text-2xl font-bold">
          {tab === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your journeys, contacts and check-ins stay private to your account.
        </p>

        <div
          role="tablist"
          aria-label="Authentication mode"
          className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1"
        >
          {(["signin", "signup"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => {
                setTab(t);
                setFieldError(null);
              }}
              className={`min-h-11 rounded-md px-3 text-sm font-semibold transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldError}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={tab === "signup" ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="auth-password-hint"
              aria-invalid={!!fieldError}
            />
            <p id="auth-password-hint" className="text-xs text-muted-foreground">
              At least 8 characters.
            </p>
          </div>

          {fieldError ? (
            <p role="alert" className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {fieldError}
            </p>
          ) : null}

          <Button type="submit" className="w-full font-semibold" disabled={busy}>
            {busy ? "Working…" : tab === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-5">
          <p className="text-sm font-semibold">Judging or just looking?</p>
          <Button
            variant="outline"
            className="mt-2 w-full"
            onClick={() => {
              startDemo();
              void navigate({ to: "/app" });
            }}
          >
            Open demo mode (device-only, no signup)
          </Button>
        </div>
      </main>
    </div>
  );
}
