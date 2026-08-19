import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Send, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { askSafeAi } from "@/lib/ai.functions";
import { useActiveJourney, useSafetyStore } from "@/lib/safety-store";

export const Route = createFileRoute("/app/assistant")({
  head: () => ({
    meta: [
      { title: "SafeAI assistant — SafetyNet" },
      {
        name: "description",
        content:
          "Ask SafeAI for practical personal-safety guidance. It runs server-side, refuses to invent statistics, and never claims to see live incidents.",
      },
      { property: "og:title", content: "SafeAI assistant — SafetyNet" },
      {
        property: "og:description",
        content: "Practical safety guidance with clear limits: no fabricated data, no live incident claims.",
      },
    ],
  }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "I'm walking home alone at 11pm. What should I do differently?",
  "How do I make a taxi ride safer as a solo traveller?",
  "What should my family agree on before a night out in a new city?",
  "How often should I set check-ins on a 40-minute walk?",
];

/** Minimal, safe markdown-ish rendering: bullets and paragraphs only, no HTML injection. */
function Reply({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  return (
    <div className="space-y-2 text-sm">
      {lines.map((line, i) => {
        const bullet = /^\s*([-*•]|\d+\.)\s+/.exec(line);
        const clean = line.replace(/^\s*([-*•]|\d+\.)\s+/, "").replace(/\*\*/g, "");
        return bullet ? (
          <p key={i} className="flex gap-2">
            <span aria-hidden="true" className="text-primary">
              •
            </span>
            <span>{clean}</span>
          </p>
        ) : (
          <p key={i}>{clean}</p>
        );
      })}
    </div>
  );
}

function AssistantPage() {
  const { profileType, contacts } = useSafetyStore();
  const { journey } = useActiveJourney();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    if (content.length > 2000) {
      setError("Please keep questions under 2000 characters.");
      return;
    }
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const result = await askSafeAi({
        data: {
          messages: next.slice(-12),
          context: {
            profileType,
            hasActiveJourney: !!journey,
            contactCount: contacts.length,
          },
        },
      });
      if (result.ok) {
        setMessages([...next, { role: "assistant", content: result.reply }]);
      } else {
        setError(result.message);
      }
    } catch {
      setError("SafeAI could not be reached. Check your connection and try again.");
    } finally {
      setBusy(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  };

  return (
    <div className="space-y-5">
      <section>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <Bot className="size-6 text-primary" aria-hidden="true" />
          SafeAI
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Practical safety guidance. SafeAI cannot see live conditions, crime data or your location,
          and it will say so rather than guess.
        </p>
      </section>

      <p className="flex items-start gap-2 rounded-xl border border-risk/40 bg-risk/10 p-3 text-sm">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-risk" aria-hidden="true" />
        <span>
          If you are in danger right now, contact your local emergency services directly. SafeAI is
          not an emergency service and cannot call anyone for you.
        </span>
      </p>

      <section className="panel space-y-4 p-4" aria-live="polite" aria-busy={busy}>
        {messages.length === 0 ? (
          <div>
            <p className="text-sm font-semibold">Try one of these</p>
            <ul className="mt-2 space-y-2">
              {STARTERS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => void send(s)}
                    className="min-h-11 w-full rounded-lg border border-border bg-secondary p-3 text-left text-sm transition-colors hover:bg-accent"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((m, i) => (
              <li
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-xl bg-primary/15 p-3 text-sm"
                    : "max-w-[95%] rounded-xl border border-border bg-secondary p-3"
                }
              >
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {m.role === "user" ? "You" : "SafeAI · AI-generated guidance"}
                </p>
                {m.role === "user" ? <p className="text-sm">{m.content}</p> : <Reply text={m.content} />}
              </li>
            ))}
          </ul>
        )}

        {busy ? <p className="text-sm text-muted-foreground">SafeAI is thinking…</p> : null}
        {error ? (
          <p role="alert" className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div ref={endRef} />
      </section>

      <form
        className="panel space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <Label htmlFor="safeai-input" className="text-sm font-semibold">
          Ask SafeAI
        </Label>
        <Textarea
          id="safeai-input"
          value={input}
          maxLength={2000}
          rows={3}
          placeholder="What should I check before a late bus ride?"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <Button type="submit" className="w-full gap-2 font-semibold" disabled={busy || !input.trim()}>
          <Send className="size-4" aria-hidden="true" />
          {busy ? "Sending…" : "Send"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Your questions are sent to the AI service from SafetyNet’s server. Don’t include full
          addresses or other people’s details.
        </p>
      </form>
    </div>
  );
}
