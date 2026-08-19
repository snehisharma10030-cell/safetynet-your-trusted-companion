import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Info, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { ActiveJourneyCard } from "@/components/ActiveJourneyCard";
import { ScoreDial } from "@/components/ScoreDial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { assessJourneyRisk } from "@/lib/ai.functions";
import { heuristicRisk } from "@/lib/risk-heuristic";
import { useActiveJourney, useSafetyStore } from "@/lib/safety-store";
import { TRAVEL_MODES, type RiskFactor } from "@/lib/safety-types";

export const Route = createFileRoute("/app/journey")({
  head: () => ({
    meta: [
      { title: "Plan & score a journey — SafetyNet" },
      {
        name: "description",
        content:
          "Describe your trip and get a transparent 0-100 SafetyNet risk estimate with every factor explained, then start timed check-ins.",
      },
      { property: "og:title", content: "Plan & score a journey — SafetyNet" },
      {
        property: "og:description",
        content: "A transparent, explainable journey risk estimate — never presented as verified data.",
      },
    ],
  }),
  component: JourneyPage,
});

const formSchema = z.object({
  origin: z.string().trim().min(2, "Where are you starting from?").max(120),
  destination: z.string().trim().min(2, "Where are you heading?").max(120),
  plannedMinutes: z.coerce.number().int().min(1).max(600),
  interval: z.coerce.number().int().min(1).max(120),
});

type Assessment = {
  score: number;
  summary: string;
  factors: RiskFactor[];
  advice: string[];
  source: "ai" | "heuristic";
  note?: string;
};

function JourneyPage() {
  const navigate = useNavigate();
  const { contacts, reports, startJourney } = useSafetyStore();
  const { journey } = useActiveJourney();

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [travelMode, setTravelMode] = useState<string>("walking");
  const [plannedMinutes, setPlannedMinutes] = useState("25");
  const [interval, setInterval] = useState("5");
  const [alone, setAlone] = useState(true);
  const [familiar, setFamiliar] = useState(true);
  const [wellLit, setWellLit] = useState(true);
  const [batteryLow, setBatteryLow] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [starting, setStarting] = useState(false);

  if (journey) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold">Journey in progress</h1>
        <ActiveJourneyCard />
        <div className="panel p-5">
          <h2 className="text-base font-bold">Risk breakdown</h2>
          <p className="mt-1 text-sm text-muted-foreground">{journey.risk_summary ?? "Not assessed."}</p>
          <ul className="mt-3 space-y-2">
            {journey.risk_factors.map((f, i) => (
              <li key={`${f.label}-${i}`} className="rounded-lg border border-border bg-secondary p-3">
                <p
                  className={`text-sm font-semibold ${
                    f.impact === "raises"
                      ? "text-risk"
                      : f.impact === "lowers"
                        ? "text-safe"
                        : "text-foreground"
                  }`}
                >
                  {f.label}
                </p>
                <p className="text-xs text-muted-foreground">{f.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const buildInput = () => {
    const parsed = formSchema.safeParse({ origin, destination, plannedMinutes, interval });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check the form");
      return null;
    }
    setFormError(null);
    return parsed.data;
  };

  const assess = async () => {
    const data = buildInput();
    if (!data) return;
    setAssessing(true);
    const departureHour = new Date().getHours();
    const baseline = heuristicRisk({
      travelMode,
      plannedMinutes: data.plannedMinutes,
      departureHour,
      alone,
      familiarRoute: familiar,
      wellLit,
      batteryLow,
      hasContacts: contacts.length > 0,
    });

    try {
      const result = await assessJourneyRisk({
        data: {
          origin: data.origin,
          destination: data.destination,
          travelMode,
          plannedMinutes: data.plannedMinutes,
          departureHour,
          alone,
          familiarRoute: familiar,
          wellLit,
          batteryLow,
          hasContacts: contacts.length > 0,
          baselineScore: baseline.score,
          nearbyReports: reports
            .slice(0, 30)
            .map((r) => ({ category: r.category, severity: r.severity })),
        },
      });

      if (result.ok) {
        setAssessment({
          score: result.score,
          summary: result.summary,
          factors: result.factors,
          advice: result.advice,
          source: "ai",
        });
        toast.success("AI estimate ready.");
      } else {
        setAssessment({
          ...baseline,
          advice: [],
          source: "heuristic",
          note: result.message,
        });
        toast.error(`${result.message} Using the on-device estimate.`);
      }
    } catch {
      setAssessment({
        ...baseline,
        advice: [],
        source: "heuristic",
        note: "The AI service could not be reached.",
      });
      toast.error("AI unavailable — showing the on-device estimate.");
    } finally {
      setAssessing(false);
    }
  };

  const start = async () => {
    const data = buildInput();
    if (!data) return;
    setStarting(true);
    try {
      await startJourney({
        origin: data.origin,
        destination: data.destination,
        travel_mode: travelMode,
        planned_minutes: data.plannedMinutes,
        checkin_interval_minutes: data.interval,
        risk_score: assessment?.score ?? null,
        risk_summary: assessment?.summary ?? null,
        risk_factors: assessment?.factors ?? [],
        risk_source: assessment?.source ?? "unassessed",
      });
      toast.success("Journey started. Check-in timer running.");
      void navigate({ to: "/app" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the journey.");
    } finally {
      setStarting(false);
    }
  };

  const toggles = [
    { id: "alone", label: "I’m travelling alone", value: alone, set: setAlone },
    { id: "familiar", label: "I know this route well", value: familiar, set: setFamiliar },
    { id: "lit", label: "The route is well lit", value: wellLit, set: setWellLit },
    { id: "battery", label: "My phone battery is low", value: batteryLow, set: setBatteryLow },
  ];

  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-display text-2xl font-bold">Plan &amp; score a journey</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step 1 of 2 — describe the trip. Everything you enter stays with your account.
        </p>
      </section>

      <section className="panel space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="origin">Starting from</Label>
            <Input
              id="origin"
              value={origin}
              maxLength={120}
              placeholder="Campus library"
              onChange={(e) => setOrigin(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="destination">Going to</Label>
            <Input
              id="destination"
              value={destination}
              maxLength={120}
              placeholder="Home / hostel"
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">How are you travelling?</legend>
          <div className="flex flex-wrap gap-2">
            {TRAVEL_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={travelMode === m.value}
                onClick={() => setTravelMode(m.value)}
                className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${
                  travelMode === m.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="minutes">Expected duration (minutes)</Label>
            <Input
              id="minutes"
              type="number"
              min={1}
              max={600}
              inputMode="numeric"
              value={plannedMinutes}
              onChange={(e) => setPlannedMinutes(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="interval">Check in every (minutes)</Label>
            <Input
              id="interval"
              type="number"
              min={1}
              max={120}
              inputMode="numeric"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
            />
          </div>
        </div>

        <ul className="space-y-2">
          {toggles.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg bg-secondary p-3">
              <Label htmlFor={t.id} className="text-sm font-normal">
                {t.label}
              </Label>
              <Switch id={t.id} checked={t.value} onCheckedChange={t.set} />
            </li>
          ))}
        </ul>

        {formError ? (
          <p role="alert" className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <Button className="w-full gap-2 font-semibold" onClick={assess} disabled={assessing}>
          <Sparkles className="size-5" aria-hidden="true" />
          {assessing ? "Assessing…" : "Assess this journey"}
        </Button>
      </section>

      {assessment ? (
        <section className="panel space-y-4 p-5" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Step 2 — your risk estimate</h2>
              <p className="mt-1 text-sm text-muted-foreground">{assessment.summary}</p>
            </div>
            <ScoreDial score={assessment.score} />
          </div>

          <p className="flex items-start gap-2 rounded-lg border border-border bg-secondary p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <strong className="text-foreground">Estimate, not verified data.</strong>{" "}
              {assessment.source === "ai"
                ? "Produced by AI from the answers you gave above. SafetyNet has no access to crime statistics, police data or live incidents."
                : "Produced by SafetyNet’s on-device rules from your answers."}
              {assessment.note ? ` (${assessment.note})` : ""}
            </span>
          </p>

          <ul className="space-y-2">
            {assessment.factors.map((f, i) => (
              <li key={`${f.label}-${i}`} className="rounded-lg border border-border p-3">
                <p
                  className={`text-sm font-semibold ${
                    f.impact === "raises"
                      ? "text-risk"
                      : f.impact === "lowers"
                        ? "text-safe"
                        : "text-foreground"
                  }`}
                >
                  {f.label}
                </p>
                <p className="text-xs text-muted-foreground">{f.detail}</p>
              </li>
            ))}
          </ul>

          {assessment.advice.length > 0 ? (
            <div>
              <h3 className="text-sm font-bold">Before you go</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {assessment.advice.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <Button
            size="lg"
            className="w-full font-semibold"
            onClick={start}
            disabled={starting}
          >
            {starting ? "Starting…" : `Start journey & check in every ${interval} min`}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
