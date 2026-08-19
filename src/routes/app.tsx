import { useEffect } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bot, LayoutDashboard, LogOut, Map, ShieldCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSafetyStore } from "@/lib/safety-store";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const nav = [
  { to: "/app", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/app/map", label: "Map", icon: Map, exact: false },
  { to: "/app/assistant", label: "SafeAI", icon: Bot, exact: false },
  { to: "/app/contacts", label: "Contacts", icon: Users, exact: false },
] as const;

function AppLayout() {
  const navigate = useNavigate();
  const { ready, mode, email, exitDemo, error } = useSafetyStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && mode === null) void navigate({ to: "/auth" });
  }, [ready, mode, navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <p className="text-sm text-muted-foreground">Loading your safety dashboard…</p>
      </div>
    );
  }

  if (mode === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5 text-center">
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-5">
      <header className="flex items-center gap-2">
        <Link to="/app" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" aria-hidden="true" />
          </span>
          <span className="font-display font-bold">SafetyNet</span>
        </Link>
        <span
          className={`ml-auto rounded-full px-2.5 py-1 text-xs font-semibold ${
            mode === "demo" ? "bg-caution/20 text-caution" : "bg-safe/15 text-safe"
          }`}
        >
          {mode === "demo" ? "Demo mode · device only" : "Signed in"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={mode === "demo" ? "Leave demo mode" : "Sign out"}
          className="min-h-11 min-w-11"
          onClick={async () => {
            await exitDemo();
            void navigate({ to: "/" });
          }}
        >
          <LogOut className="size-5" aria-hidden="true" />
        </Button>
      </header>

      {email ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">Signed in as {email}</p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <main className="mt-5 flex-1">
        <Outlet />
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur"
      >
        <ul className="mx-auto flex w-full max-w-2xl">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="size-5" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
