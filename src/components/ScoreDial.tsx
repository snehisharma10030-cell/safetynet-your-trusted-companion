import { riskBand } from "@/lib/safety-types";
import { cn } from "@/lib/utils";

export function ScoreDial({
  score,
  size = 140,
  label,
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const band = riskBand(score);
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const stroke =
    band.token === "safe"
      ? "var(--color-safe)"
      : band.token === "caution"
        ? "var(--color-caution)"
        : "var(--color-risk)";

  return (
    <div
      className="inline-flex flex-col items-center"
      role="img"
      aria-label={`Safety risk score ${score} out of 100. ${band.label}. This is an estimate, not verified data.`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth={10}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold tabular-nums">{score}</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            of 100
          </span>
        </div>
      </div>
      <span
        className={cn(
          "mt-2 rounded-full px-3 py-1 text-xs font-semibold",
          band.token === "safe" && "bg-safe/15 text-safe",
          band.token === "caution" && "bg-caution/15 text-caution",
          band.token === "risk" && "bg-risk/20 text-risk",
        )}
      >
        {label ?? band.label}
      </span>
    </div>
  );
}
