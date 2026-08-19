import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

const RiskInput = z.object({
  origin: z.string().trim().min(1).max(120),
  destination: z.string().trim().min(1).max(120),
  travelMode: z.string().trim().min(1).max(40),
  plannedMinutes: z.number().int().min(1).max(600),
  departureHour: z.number().int().min(0).max(23),
  alone: z.boolean(),
  familiarRoute: z.boolean(),
  wellLit: z.boolean(),
  batteryLow: z.boolean(),
  hasContacts: z.boolean(),
  baselineScore: z.number().int().min(0).max(100),
  nearbyReports: z
    .array(z.object({ category: z.string().max(40), severity: z.number().int().min(1).max(3) }))
    .max(30),
});

const ChatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(24),
  context: z
    .object({
      profileType: z.string().max(40),
      hasActiveJourney: z.boolean(),
      contactCount: z.number().int().min(0).max(100),
    })
    .optional(),
});

type GatewayResult = { ok: true; content: string } | { ok: false; status: number; message: string };

async function callGateway(body: unknown): Promise<GatewayResult> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) {
    return { ok: false, status: 401, message: "AI is not configured on the server." };
  }
  let response: Response;
  try {
    response = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 503, message: "Could not reach the AI service." };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = "The AI service returned an error.";
    if (response.status === 429) message = "AI is rate limited right now. Try again in a moment.";
    else if (response.status === 402)
      message = "This app's AI credits are exhausted. The owner needs to top them up.";
    else if (response.status === 403) message = "AI access is blocked for this workspace.";
    else if (text) {
      try {
        const parsed = JSON.parse(text) as { error?: { message?: string } };
        if (parsed.error?.message) message = parsed.error.message;
      } catch {
        /* keep default message */
      }
    }
    return { ok: false, status: response.status, message };
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return { ok: false, status: 502, message: "The AI returned an empty response." };
  return { ok: true, content };
}

const RISK_SYSTEM = `You are the risk-explanation engine inside SafetyNet, a personal safety app.
You receive ONLY the self-reported trip details below. You have NO access to crime statistics,
police data, live incidents, weather, or maps.

Hard rules:
- Never invent statistics, crime rates, incident counts, news events, or place-specific facts.
- Never name a real neighbourhood as dangerous or safe. Reason only from the described conditions.
- Never imply your output is verified data. It is an estimate from the user's own inputs.
- Adjust the provided baselineScore by at most 15 points, and explain any adjustment.

Return STRICT JSON only, no markdown:
{"score": <integer 0-100, higher = more risk>,
 "summary": "<max 220 chars, plain, calm, no alarmism>",
 "factors": [{"label":"<max 60 chars>","detail":"<max 140 chars>","impact":"raises|lowers|neutral"}],
 "advice": ["<max 3 short actionable steps>"]}
Use 3-5 factors.`;

const CHAT_SYSTEM = `You are SafeAI, the safety assistant inside the SafetyNet app. Your users are
students, women travelling alone, travellers and families.

Hard rules:
- Never fabricate statistics, crime data, live incidents, emergency phone numbers for a specific
  country you are unsure about, or claims about specific real places.
- If asked about real-time or location-specific danger levels, say plainly that you cannot verify
  live conditions, then give practical general guidance.
- If a message suggests an emergency in progress, your FIRST line must tell the user to contact
  local emergency services immediately, then give short practical steps.
- Never claim SafetyNet has contacted anyone. SafetyNet's SOS is a labelled demo drill: it logs the
  drill and shows which trusted contacts would be alerted.
- Be concise: max ~180 words, prefer short markdown bullet lists. Practical over preachy.`;

export const assessJourneyRisk = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => RiskInput.parse(data))
  .handler(async ({ data }) => {
    const result = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: RISK_SYSTEM },
        { role: "user", content: JSON.stringify(data) },
      ],
      response_format: { type: "json_object" },
    });

    if (!result.ok) {
      return { ok: false as const, status: result.status, message: result.message };
    }

    const cleaned = result.content
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const Parsed = z.object({
      score: z.number(),
      summary: z.string().max(400),
      factors: z
        .array(
          z.object({
            label: z.string().max(80),
            detail: z.string().max(200),
            impact: z.enum(["raises", "lowers", "neutral"]).catch("neutral"),
          }),
        )
        .max(6),
      advice: z.array(z.string().max(200)).max(4).catch([]),
    });
    const parsed = Parsed.safeParse(JSON.parse(cleaned || "{}"));
    if (!parsed.success) {
      return {
        ok: false as const,
        status: 502,
        message: "The AI response could not be read. Showing the on-device estimate instead.",
      };
    }
    const score = Math.max(1, Math.min(99, Math.round(parsed.data.score)));
    return { ok: true as const, ...parsed.data, score };
  });

export const askSafeAi = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ChatInput.parse(data))
  .handler(async ({ data }) => {
    const contextLine = data.context
      ? `App context (from the user's own app state): profile type ${data.context.profileType}, active journey: ${data.context.hasActiveJourney ? "yes" : "no"}, trusted contacts saved: ${data.context.contactCount}.`
      : "No app context available.";

    const result = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: `${CHAT_SYSTEM}\n\n${contextLine}` },
        ...data.messages,
      ],
    });

    if (!result.ok) return { ok: false as const, status: result.status, message: result.message };
    return { ok: true as const, reply: result.content };
  });
