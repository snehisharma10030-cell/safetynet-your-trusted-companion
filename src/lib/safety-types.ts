export type ProfileType = "student" | "woman" | "traveller" | "family" | "other";
export type JourneyStatus = "active" | "completed" | "cancelled";
export type CheckInStatus = "pending" | "confirmed" | "missed";

export type RiskFactor = {
  label: string;
  detail: string;
  impact: "raises" | "lowers" | "neutral";
};

export type Journey = {
  id: string;
  origin: string;
  destination: string;
  travel_mode: string;
  planned_minutes: number;
  checkin_interval_minutes: number;
  risk_score: number | null;
  risk_summary: string | null;
  risk_factors: RiskFactor[];
  /** "ai" = AI estimate, "heuristic" = on-device rule estimate, "unassessed" */
  risk_source: string;
  status: JourneyStatus;
  started_at: string;
  ended_at: string | null;
};

export type CheckIn = {
  id: string;
  journey_id: string;
  due_at: string;
  responded_at: string | null;
  status: CheckInStatus;
};

export type TrustedContact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  notify_order: number;
};

export type SafetyReport = {
  id: string;
  category: string;
  note: string;
  latitude: number;
  longitude: number;
  severity: number;
  is_sample: boolean;
  created_at: string;
  local_only?: boolean;
  mine?: boolean;
};

export type SosEvent = {
  id: string;
  journey_id: string | null;
  kind: string;
  note: string;
  created_at: string;
};

export const REPORT_CATEGORIES = [
  { value: "lighting", label: "Poor lighting" },
  { value: "crossing", label: "Unsafe crossing" },
  { value: "isolated", label: "Isolated stretch" },
  { value: "harassment", label: "Harassment reported here" },
  { value: "obstruction", label: "Blocked / broken footpath" },
  { value: "crowd", label: "Well-used & well-lit (positive)" },
] as const;

export const TRAVEL_MODES = [
  { value: "walking", label: "Walking" },
  { value: "cycling", label: "Cycling" },
  { value: "public_transport", label: "Public transport" },
  { value: "rideshare", label: "Taxi / rideshare" },
  { value: "driving", label: "Driving" },
] as const;

export function riskBand(score: number): { label: string; token: "safe" | "caution" | "risk" } {
  if (score <= 33) return { label: "Lower risk", token: "safe" };
  if (score <= 66) return { label: "Take care", token: "caution" };
  return { label: "Higher risk", token: "risk" };
}
