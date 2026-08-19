import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BellRing, CheckCircle2, Clock, MapPin, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";

import { DemoSos } from "@/components/DemoSos";
import { ScoreDial } from "@/components/ScoreDial";
import { Button } from "@/components/ui/button";
import { useActiveJourney, useSafetyStore } from "@/lib/safety-store";

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ActiveJourneyCard() {
  const { contacts, finishJourney, confirmCheckIn, markMissed, scheduleCheckIn } = useSafetyStore();
  const { journey, pending, missed } = useActiveJourney();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const missedFired = useRef<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const due = new Date(pending.due_at).getTime();
    if (now >= due && missedFired.current !== pending.id) {
      missedFired.current = pending.id;
      void markMissed(pending.id).catch(() => {
        missedFired.current = null;
      });
    }
  }, [now, pending, markMissed]);

  if (!journey) return null;

  const escalated = missed.length > 0;
  const dueIn = pending ? new Date(pending.due_at).getTime() - now : 0;
  const elapsedMin = Math.floor((now - new Date(journey.started_at).getTime()) / 60_000);

  const act = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="panel space-y-5 p-5"
      aria-labelledby="active-journey-heading"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-safe">
            <span className="size-2 animate-pulse rounded-full bg-safe" aria-hidden="true" />
            Journey in progress
          </p>
          <h2 id="active-journey-heading" className="mt-1 text-xl font-bold">
            {journey.origin} → {journey.destination}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <RouteIcon className="size-4" aria-hidden="true" /> {journey.travel_mode.replace("_", " ")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-4" aria-hidden="true" /> {elapsedMin} of{" "}
              {journey.planned_minutes} min
            </span>
          </p>
        </div>
        {journey.risk_score !== null ? (
          <ScoreDial score={journey.risk_score} size={96} />
        ) : null}
      </div>

      {escalated ? (
        <div className="rounded-xl border border-risk/50 bg-risk/10 p-4">
          <h3 className="flex items-center gap-2 font-bold text-risk">
            <BellRing className="size-5" aria-hidden="true" />
            Missed check-in — escalation triggered
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You missed {missed.length} check-in{missed.length > 1 ? "s" : ""}. In a live deployment
            this is where SafetyNet would notify{" "}
            {contacts.length === 0 ? (
              <span className="text-caution">nobody — you have no trusted contacts saved</span>
            ) : (
              contacts
                .slice()
                .sort((a, b) => a.notify_order - b.notify_order)
                .map((c) => c.name)
                .join(", ")
            )}
            . No message has been sent — this build never contacts anyone.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={() =>
                act(
                  () => scheduleCheckIn(journey.id, journey.checkin_interval_minutes),
                  "Escalation cleared. Next check-in scheduled.",
                )
              }
            >
              I’m safe — resume check-ins
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => act(() => finishJourney(journey.id, "completed"), "Journey ended.")}
            >
              End journey
            </Button>
          </div>
        </div>
      ) : pending ? (
        <div className="rounded-xl border border-border bg-secondary p-4">
          <p className="text-sm text-muted-foreground">Next check-in due in</p>
          <p
            className={`font-display text-4xl font-bold tabular-nums ${dueIn < 60_000 ? "text-caution" : ""}`}
          >
            {formatCountdown(dueIn)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Miss it and SafetyNet escalates automatically. Nothing is sent to anyone in this build.
          </p>
          <Button
            className="mt-3 w-full gap-2"
            disabled={busy}
            onClick={() => act(() => confirmCheckIn(pending.id, true), "Check-in confirmed.")}
          >
            <CheckCircle2 className="size-5" aria-hidden="true" />
            I’m safe — check in now
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-secondary p-4 text-sm">
          <p>No check-in scheduled right now.</p>
          <Button
            className="mt-3"
            disabled={busy}
            onClick={() =>
              act(
                () => scheduleCheckIn(journey.id, journey.checkin_interval_minutes),
                "Check-in scheduled.",
              )
            }
          >
            Schedule next check-in ({journey.checkin_interval_minutes} min)
          </Button>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <DemoSos compact />
        <Button
          variant="outline"
          className="w-full"
          disabled={busy}
          onClick={() => act(() => finishJourney(journey.id, "completed"), "Arrived safely — journey closed.")}
        >
          I’ve arrived — end journey
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Risk score source:{" "}
        {journey.risk_source === "ai"
          ? "AI estimate from your own trip inputs (not verified data)"
          : journey.risk_source === "heuristic"
            ? "on-device rule estimate (not verified data)"
            : "not assessed"}
        . <Link to="/app/journey" className="underline">See the full breakdown</Link>.
      </p>
    </section>
  );
}
