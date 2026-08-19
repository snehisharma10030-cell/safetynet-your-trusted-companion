import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crosshair, Info, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { DEFAULT_CENTER, SafetyMap, categoryLabel, type MapCenter } from "@/components/SafetyMap";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSafetyStore } from "@/lib/safety-store";
import { REPORT_CATEGORIES } from "@/lib/safety-types";

export const Route = createFileRoute("/app/map")({
  head: () => ({
    meta: [
      { title: "Community safety map — SafetyNet" },
      {
        name: "description",
        content:
          "Pin poor lighting, unsafe crossings and isolated stretches on the SafetyNet community map. Community-reported and clearly labelled as unverified.",
      },
      { property: "og:title", content: "Community safety map — SafetyNet" },
      {
        property: "og:description",
        content: "Community-reported lighting, crossing and isolation concerns — unverified by design.",
      },
    ],
  }),
  component: MapPage,
});

const noteSchema = z.string().trim().max(280, "Keep notes under 280 characters");

function MapPage() {
  const { reports, addReport, removeReport, mode } = useSafetyStore();
  const [center, setCenter] = useState<MapCenter>(DEFAULT_CENTER);
  const [selected, setSelected] = useState<MapCenter | null>(null);
  const [category, setCategory] = useState<string>(REPORT_CATEGORIES[0].value);
  const [severity, setSeverity] = useState(2);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? reports : reports.filter((r) => r.category === filter)),
    [reports, filter],
  );

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("This device does not expose location to the browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSelected(null);
        toast.success("Map centred on your location. It is not stored unless you file a report.");
      },
      () => toast.error("Location permission denied. The map stays on its default area."),
      { timeout: 8000 },
    );
  };

  const submit = async () => {
    if (!selected) {
      setFormError("Tap the map to choose where this report belongs.");
      return;
    }
    const parsed = noteSchema.safeParse(note);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check the note");
      return;
    }
    setFormError(null);
    setBusy(true);
    try {
      await addReport({
        category,
        note: parsed.data,
        latitude: selected.lat,
        longitude: selected.lng,
        severity,
      });
      setNote("");
      setSelected(null);
      toast.success(
        mode === "demo"
          ? "Report saved on this device only (demo mode)."
          : "Report added to the community map.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-display text-2xl font-bold">Community safety map</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reports come from people using this app. Nothing here is verified by an authority.
        </p>
      </section>

      <section className="panel space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={useMyLocation}>
            <Crosshair className="size-4" aria-hidden="true" />
            Centre on me
          </Button>
          <div className="ml-auto">
            <Label htmlFor="filter" className="sr-only">
              Filter reports
            </Label>
            <select
              id="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All categories</option>
              {REPORT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <SafetyMap
          center={center}
          reports={visible}
          selected={selected}
          onPick={setSelected}
          activeReportId={activeId}
          onSelectReport={(r) => setActiveId(r.id)}
        />
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="text-lg font-bold">Add a report</h2>
        <p className="text-sm text-muted-foreground">
          {selected
            ? `Pin placed at ${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}.`
            : "Tap a spot on the map above to place your pin."}
        </p>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">What is it?</legend>
          <div className="flex flex-wrap gap-2">
            {REPORT_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-pressed={category === c.value}
                onClick={() => setCategory(c.value)}
                className={`min-h-11 rounded-full border px-4 text-sm transition-colors ${
                  category === c.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">How serious?</legend>
          <div className="flex gap-2">
            {[
              { v: 1, l: "Minor" },
              { v: 2, l: "Moderate" },
              { v: 3, l: "Serious" },
            ].map((s) => (
              <button
                key={s.v}
                type="button"
                aria-pressed={severity === s.v}
                onClick={() => setSeverity(s.v)}
                className={`min-h-11 flex-1 rounded-lg border text-sm font-medium transition-colors ${
                  severity === s.v
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {s.l}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea
            id="note"
            value={note}
            maxLength={280}
            placeholder="Street lamps out between the gate and the bus stop"
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Don’t include names, vehicle plates or anything identifying another person.
          </p>
        </div>

        {formError ? (
          <p role="alert" className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <Button className="w-full font-semibold" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Add report"}
        </Button>
        {mode === "demo" ? (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden="true" />
            In demo mode your reports stay on this device and are not shared with the community map.
            Sign in to contribute.
          </p>
        ) : null}
      </section>

      <section className="panel p-5">
        <h2 className="text-base font-bold">Reports in view ({visible.length})</h2>
        {visible.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No reports in this category yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {visible.slice(0, 25).map((r) => (
              <li
                key={r.id}
                className={`rounded-lg border p-3 text-sm ${
                  activeId === r.id ? "border-primary" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {categoryLabel(r.category)}
                      {r.is_sample ? (
                        <span className="ml-2 rounded bg-caution/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-caution">
                          Sample
                        </span>
                      ) : null}
                      {r.local_only ? (
                        <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                          Device only
                        </span>
                      ) : null}
                    </p>
                    {r.note ? <p className="text-muted-foreground">{r.note}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()} · {r.latitude.toFixed(4)},{" "}
                      {r.longitude.toFixed(4)}
                    </p>
                  </div>
                  {r.mine ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete my report"
                      className="min-h-11 min-w-11 shrink-0"
                      onClick={async () => {
                        try {
                          await removeReport(r.id);
                          toast.success("Report removed.");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Could not remove it.");
                        }
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
