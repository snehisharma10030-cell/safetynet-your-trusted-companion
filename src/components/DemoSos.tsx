import { useState } from "react";
import { AlertTriangle, PhoneCall, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActiveJourney, useSafetyStore } from "@/lib/safety-store";

export function DemoSos({ compact = false }: { compact?: boolean }) {
  const { contacts, logSos } = useSafetyStore();
  const { journey } = useActiveJourney();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const runDrill = async () => {
    setBusy(true);
    try {
      await logSos({
        kind: "demo_sos",
        note: `Demo SOS drill. Would alert ${contacts.length} trusted contact(s).`,
        journeyId: journey?.id ?? null,
      });
      setConfirmed(true);
      toast.success("Demo SOS drill logged. No real alert was sent.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not log the drill.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size={compact ? "default" : "lg"}
        className="w-full gap-2 font-semibold"
        onClick={() => {
          setConfirmed(false);
          setOpen(true);
        }}
      >
        <ShieldAlert aria-hidden="true" className="size-5" />
        Demo SOS (drill only)
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-caution" aria-hidden="true" />
              {confirmed ? "Drill complete — nothing was sent" : "This is a drill, not a real alert"}
            </DialogTitle>
            <DialogDescription>
              SafetyNet does not contact emergency services or your contacts. This runs the
              escalation sequence so you can see exactly what would happen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-border bg-secondary p-3">
              <p className="font-semibold">Escalation sequence</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Your journey is flagged as needing help.</li>
                <li>
                  {contacts.length === 0 ? (
                    <span className="text-caution">
                      No trusted contacts saved — nobody would be reached. Add one first.
                    </span>
                  ) : (
                    <>
                      Trusted contacts in order:{" "}
                      {contacts
                        .slice()
                        .sort((a, b) => a.notify_order - b.notify_order)
                        .map((c) => c.name)
                        .join(" → ")}
                    </>
                  )}
                </li>
                <li>You are prompted to call local emergency services yourself.</li>
              </ol>
            </div>

            {confirmed ? (
              <div className="rounded-lg border border-risk/40 bg-risk/10 p-3">
                <p className="font-semibold">In a real emergency</p>
                <p className="mt-1 text-muted-foreground">
                  Use your phone’s dialler and your local emergency number. The button below only
                  opens your dialler — SafetyNet cannot place a call for you.
                </p>
                <Button asChild variant="outline" className="mt-3 w-full gap-2">
                  <a href="tel:112">
                    <PhoneCall className="size-4" aria-hidden="true" />
                    Open dialler (112 — check your local number)
                  </a>
                </Button>
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            {!confirmed ? (
              <Button variant="destructive" onClick={runDrill} disabled={busy}>
                {busy ? "Running drill…" : "Run the drill"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
