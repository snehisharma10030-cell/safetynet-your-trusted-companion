import type { RiskFactor } from "./safety-types";

export type HeuristicInput = {
  travelMode: string;
  plannedMinutes: number;
  departureHour: number;
  alone: boolean;
  familiarRoute: boolean;
  wellLit: boolean;
  batteryLow: boolean;
  hasContacts: boolean;
};

/**
 * Transparent, on-device rule-based estimate. Every point is explainable and
 * nothing here claims to be real-world crime or incident data.
 */
export function heuristicRisk(input: HeuristicInput): {
  score: number;
  factors: RiskFactor[];
  summary: string;
} {
  const factors: RiskFactor[] = [];
  let score = 20;

  const night = input.departureHour >= 21 || input.departureHour < 5;
  const evening = !night && input.departureHour >= 18;
  if (night) {
    score += 20;
    factors.push({
      label: "Late-night departure (+20)",
      detail: "Fewer people around and lower visibility between 9pm and 5am.",
      impact: "raises",
    });
  } else if (evening) {
    score += 10;
    factors.push({
      label: "After dark (+10)",
      detail: "Evening trips usually mean lower visibility than daytime.",
      impact: "raises",
    });
  } else {
    factors.push({
      label: "Daytime departure",
      detail: "Daylight hours generally mean more visibility and more people around.",
      impact: "lowers",
    });
  }

  if (input.alone) {
    score += 12;
    factors.push({
      label: "Travelling alone (+12)",
      detail: "No companion to raise an alarm, so check-ins matter more.",
      impact: "raises",
    });
  } else {
    score -= 5;
    factors.push({
      label: "Travelling with someone (-5)",
      detail: "A companion can call for help immediately.",
      impact: "lowers",
    });
  }

  if (!input.familiarRoute) {
    score += 10;
    factors.push({
      label: "Unfamiliar route (+10)",
      detail: "Harder to spot a wrong turn or find a safe place to stop.",
      impact: "raises",
    });
  }

  if (!input.wellLit) {
    score += 12;
    factors.push({
      label: "Route reported as poorly lit (+12)",
      detail: "Based on what you selected for this route, not on verified city data.",
      impact: "raises",
    });
  }

  if (input.plannedMinutes > 45) {
    score += 8;
    factors.push({
      label: "Long trip over 45 min (+8)",
      detail: "Longer exposure and more time between check-ins.",
      impact: "raises",
    });
  }

  if (input.batteryLow) {
    score += 10;
    factors.push({
      label: "Low phone battery (+10)",
      detail: "A dead phone means no check-ins and no way to call for help.",
      impact: "raises",
    });
  }

  if (input.travelMode === "walking" && (night || evening)) {
    score += 6;
    factors.push({
      label: "Walking after dark (+6)",
      detail: "Walking gives less protection than an enclosed vehicle.",
      impact: "raises",
    });
  }
  if (input.travelMode === "rideshare") {
    score += 4;
    factors.push({
      label: "Taxi / rideshare (+4)",
      detail: "Share the vehicle details with a trusted contact before you set off.",
      impact: "raises",
    });
  }
  if (input.travelMode === "public_transport") {
    score -= 3;
    factors.push({
      label: "Public transport (-3)",
      detail: "Usually busier and staffed, though waiting areas can be isolated.",
      impact: "lowers",
    });
  }

  if (input.hasContacts) {
    score -= 8;
    factors.push({
      label: "Trusted contacts set up (-8)",
      detail: "Someone can be alerted if you miss a check-in.",
      impact: "lowers",
    });
  } else {
    score += 8;
    factors.push({
      label: "No trusted contacts yet (+8)",
      detail: "A missed check-in has nobody to escalate to. Add at least one contact.",
      impact: "raises",
    });
  }

  score = Math.max(1, Math.min(99, Math.round(score)));
  const summary =
    score <= 33
      ? "Conditions you described look relatively low risk. Keep check-ins on anyway."
      : score <= 66
        ? "A few things add up here. Shorter check-in intervals and a lit route would help."
        : "Several risk factors stack up on this trip. Consider changing time, route, or company.";

  return { score, factors, summary };
}
