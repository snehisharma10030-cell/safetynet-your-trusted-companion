import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, ClipboardList, Map, Users } from "lucide-react";

import { ActiveJourneyCard } from "@/components/ActiveJourneyCard";
import { DemoSos } from "@/components/DemoSos";
import { Button } from "@/components/ui/button";
import { useActiveJourney, useSafetyStore } from "@/lib/safety-store";
import { riskBand } from "@/lib/safety-types";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Your safety dashboard — SafetyNet" },
      {
        name: "description",
        content:
          "Start a tracked journey, watch the check-in countdown, run a labelled SOS drill and review past journeys in SafetyNet.",
      },
      { property: "og:title", content: "Your safety dashboard — SafetyNet" },
      {
        property: "og:description",
        content: "Tracked journeys, timed check-ins and escalation, all in one place.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { displayName, contacts, journeys, checkIns, sos, mode } = useSafetyStore();
  const { journey } = useActiveJourney();
  const past = journeys.filter((j) => j.status !== "active").slice(0, 4);
  const confirmed = checkIns.filter((c) => c.status === "confirmed").length;
  const missed = checkIns.filter((c) => c.status === "missed").length;

  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-display text-2xl font-bold">
          {displayName ? `Hi ${displayName.split(" ")[0]},` : "Welcome,"} what’s the plan?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {journey
            ? "A journey is being tracked. Keep your check-ins going."
            : "Score a journey before you leave, then let SafetyNet watch the clock."}
        </p>
      </section>

      {journey ? (
        <ActiveJourneyCard />
      ) : (
        <section className="panel space-y-4 p-5">
          <h2 className="text-lg font-bold">Start a tracked journey</h2>
          <p className="text-sm text-muted-foreground">
            Describe the trip, get a transparent 0-100 risk estimate, then start timed check-ins with
            automatic escalation if you miss one.
          </p>
          <Button asChild size="lg" className="w-full gap-2 font-semibold">
            <Link to="/app/journey">
              Plan &amp; score a journey
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </Button>
          {contacts.length === 0 ? (
            <p className="rounded-lg bg-caution/15 p-3 text-sm text-caution">
              You have no trusted contacts yet, so a missed check-in would have nobody to escalate
              to.{" "}
              <Link to="/app/contacts" className="underline">
                Add a contact
              </Link>
              .
            </p>
          ) : null}
        </section>
      )}

      {!journey ? (
        <section className="panel space-y-3 p-5">
          <h2 className="text-base font-bold">Practise the emergency flow</h2>
          <p className="text-sm text-muted-foreground">
            Runs the full escalation sequence and logs a drill. It never contacts anyone.
          </p>
          <DemoSos />
        </section>
      ) : null}

      <section className="grid grid-cols-3 gap-3" aria-label="Your safety activity">
        {[
          { label: "Check-ins made", value: confirmed },
          { label: "Missed check-ins", value: missed },
          { label: "SOS drills", value: sos.length },
        ].map((stat) => (
          <div key={stat.label} className="panel p-4 text-center">
            <p className="font-display text-2xl font-bold tabular-nums">{stat.value}</p>
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </section>
      <p className="text-xs text-muted-foreground">
        These counts are your own activity in this app{mode === "demo" ? " on this device" : ""} —
        not community or city statistics.
      </p>

      <section className="grid gap-3 sm:grid-cols-3">
        <Button asChild variant="outline" className="h-auto justify-start gap-3 py-4">
          <Link to="/app/map">
            <Map className="size-5 text-primary" aria-hidden="true" />
            Safety map
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start gap-3 py-4">
          <Link to="/app/assistant">
            <Bot className="size-5 text-primary" aria-hidden="true" />
            Ask SafeAI
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start gap-3 py-4">
          <Link to="/app/contacts">
            <Users className="size-5 text-primary" aria-hidden="true" />
            Trusted contacts
          </Link>
        </Button>
      </section>

      <section className="panel p-5">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <ClipboardList className="size-5 text-primary" aria-hidden="true" />
          Recent journeys
        </h2>
        {past.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No completed journeys yet. Your first tracked trip will appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {past.map((j) => (
              <li
                key={j.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary p-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {j.origin} → {j.destination}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(j.started_at).toLocaleString()} · {j.status}
                  </span>
                </span>
                {j.risk_score !== null ? (
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                      riskBand(j.risk_score).token === "safe"
                        ? "bg-safe/15 text-safe"
                        : riskBand(j.risk_score).token === "caution"
                          ? "bg-caution/15 text-caution"
                          : "bg-risk/20 text-risk"
                    }`}
                  >
                    {j.risk_score}/100
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
