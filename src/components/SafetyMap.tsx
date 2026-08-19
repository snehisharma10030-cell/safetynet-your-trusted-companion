import { useMemo, useRef } from "react";

import { REPORT_CATEGORIES, type SafetyReport } from "@/lib/safety-types";
import { cn } from "@/lib/utils";

export type MapCenter = { lat: number; lng: number };
export const DEFAULT_CENTER: MapCenter = { lat: 28.6139, lng: 77.209 };
const SPAN = 0.03; // degrees covered edge-to-edge

const severityToken = (severity: number, category: string) => {
  if (category === "crowd") return "safe";
  if (severity >= 3) return "risk";
  if (severity === 2) return "caution";
  return "safe";
};

export function categoryLabel(value: string) {
  return REPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/**
 * Schematic area map. It is deliberately NOT a real street map: SafetyNet has no
 * verified map data, so the grid is labelled as a relative-position view only.
 */
export function SafetyMap({
  center,
  reports,
  selected,
  onPick,
  activeReportId,
  onSelectReport,
}: {
  center: MapCenter;
  reports: SafetyReport[];
  selected: MapCenter | null;
  onPick?: (point: MapCenter) => void;
  activeReportId?: string | null;
  onSelectReport?: (report: SafetyReport) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const bounds = useMemo(
    () => ({
      minLat: center.lat - SPAN / 2,
      minLng: center.lng - SPAN / 2,
    }),
    [center],
  );

  const toPercent = (p: MapCenter) => ({
    left: ((p.lng - bounds.minLng) / SPAN) * 100,
    top: 100 - ((p.lat - bounds.minLat) / SPAN) * 100,
  });

  const visible = reports.filter((r) => {
    const { left, top } = toPercent({ lat: r.latitude, lng: r.longitude });
    return left >= 0 && left <= 100 && top >= 0 && top <= 100;
  });

  const pickAt = (clientX: number, clientY: number) => {
    if (!onPick || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const xPct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const yPct = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    onPick({
      lng: bounds.minLng + xPct * SPAN,
      lat: bounds.minLat + (1 - yPct) * SPAN,
    });
  };

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        role={onPick ? "button" : "img"}
        tabIndex={onPick ? 0 : -1}
        aria-label={
          onPick
            ? "Schematic area map. Activate to place a report pin at the centre, or click a spot."
            : "Schematic area map of community safety reports."
        }
        onClick={(e) => pickAt(e.clientX, e.clientY)}
        onKeyDown={(e) => {
          if (!onPick) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const rect = ref.current?.getBoundingClientRect();
            if (rect) pickAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
          }
        }}
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-secondary",
          onPick && "cursor-crosshair",
        )}
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(1 0 0 / 6%) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 6%) 1px, transparent 1px)",
          backgroundSize: "12.5% 12.5%",
        }}
      >
        <span className="pointer-events-none absolute left-2 top-2 rounded bg-background/70 px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Schematic view · relative positions only
        </span>

        {visible.map((r) => {
          const pos = toPercent({ lat: r.latitude, lng: r.longitude });
          const token = severityToken(r.severity, r.category);
          return (
            <button
              key={r.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectReport?.(r);
              }}
              aria-label={`${categoryLabel(r.category)}${r.is_sample ? " (sample report)" : ""}. ${r.note || "No note"}`}
              className={cn(
                "absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold transition-transform hover:scale-125",
                token === "safe" && "bg-safe text-safe-foreground",
                token === "caution" && "bg-caution text-caution-foreground",
                token === "risk" && "bg-risk text-risk-foreground",
                activeReportId === r.id && "ring-2 ring-ring ring-offset-2 ring-offset-background",
              )}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
            >
              {r.is_sample ? "S" : "•"}
            </button>
          );
        })}

        {selected ? (
          <span
            aria-hidden="true"
            className="absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/25"
            style={{
              left: `${toPercent(selected).left}%`,
              top: `${toPercent(selected).top}%`,
            }}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-risk" aria-hidden="true" /> High concern
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-caution" aria-hidden="true" /> Medium concern
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-safe" aria-hidden="true" /> Low concern /
          positive
        </span>
        <span>“S” = sample report shipped for demos</span>
      </div>
    </div>
  );
}
