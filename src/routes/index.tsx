import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Map, ShieldCheck, Timer, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSafetyStore } from "@/lib/safety-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SafetyNet — journey safety scores, check-ins & trusted contacts" },
      {
        name: "description",
        content:
          "SafetyNet plans safer journeys for students, women, travellers and families: a transparent 0-100 risk estimate, timed check-ins with escalation, a community safety map and the SafeAI assistant.",
      },
      {
        property: "og:title",
        content: "SafetyNet — journey safety scores, check-ins & trusted contacts",
      },
      {
        property: "og:description",
        content:
          "Transparent 0-100 journey risk estimates, timed check-ins with missed-check-in escalation, a community safety map and practical AI safety advice.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: ShieldCheck,
    title: "Transparent risk score",
    body: "A 0-100 estimate for the journey you describe, with every point explained. Estimate only — never presented as verified data.",
  },
  {
    icon: Timer,
    title: "Check-ins that escalate",
    body: "Start a journey, get timed check-ins. Miss one and SafetyNet escalates and shows exactly who would be alerted.",
  },
  {
    icon: Users,
    title: "Trusted contacts",
    body: "Store the people who should know, in the order they’d be reached. Kept private to your account.",
  },
  {
    icon: Map,
    title: "Community safety map",
    body: "Pin poor lighting, unsafe crossings and isolated stretches. Community-reported, clearly labelled as unverified.",
  },
  {
    icon: Bot,
    title: "SafeAI assistant",
    body: "Practical safety advice, server-side and privacy-aware. It refuses to invent statistics or live incident data.",
  },
];

function Landing() {
  const { startDemo, mode } = useSafetyStore();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-10">
      <header className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <span className="font-display text-lg font-bold">SafetyNet</span>
        <span className="ml-auto rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          SAFETY Net hackathon build
        </span>
      </header>

      <main className="flex-1">
        <section className="mt-10">
          <h1 className="text-balance-tight font-display text-4xl font-bold leading-tight sm:text-5xl">
            Get home with someone watching the clock.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            SafetyNet scores the journey you’re about to take, keeps timed check-ins running, and
            escalates the moment you miss one — built for students, women travelling alone,
            travellers and families.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="flex-1 font-semibold">
              <Link to="/auth">Create account or sign in</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={() => startDemo()}
            >
              <Link to="/app">{mode ? "Open the app" : "Try demo mode — no signup"}</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Demo mode keeps everything on this device only. Nothing in this build contacts emergency
            services, and SOS is a clearly labelled drill.
          </p>
        </section>

        <section aria-label="What SafetyNet does" className="mt-12 grid gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <article key={f.title} className="panel p-5">
              <f.icon className="size-6 text-primary" aria-hidden="true" />
              <h2 className="mt-3 text-base font-bold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </section>

        <section className="panel mt-6 p-5">
          <h2 className="text-base font-bold">What this build will never do</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Send a real emergency alert, SMS, call or email to anyone.</li>
            <li>Quote crime statistics, live incidents or “verified” danger ratings.</li>
            <li>Share your journeys, contacts or reports with other users.</li>
          </ul>
        </section>
      </main>

      <footer className="mt-10 text-xs text-muted-foreground">
        SafetyNet is a hackathon prototype. In a real emergency, always contact your local emergency
        services directly.
      </footer>
    </div>
  );
}
