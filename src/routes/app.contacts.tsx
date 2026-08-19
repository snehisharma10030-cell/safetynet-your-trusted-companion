import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSafetyStore } from "@/lib/safety-store";
import type { ProfileType } from "@/lib/safety-types";

export const Route = createFileRoute("/app/contacts")({
  head: () => ({
    meta: [
      { title: "Trusted contacts — SafetyNet" },
      {
        name: "description",
        content:
          "Choose who SafetyNet would escalate to if you miss a check-in, and set the order they would be contacted. Private to your account.",
      },
      { property: "og:title", content: "Trusted contacts — SafetyNet" },
      {
        property: "og:description",
        content: "Set your escalation chain for missed check-ins. Stored privately per account.",
      },
    ],
  }),
  component: ContactsPage,
});

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  relationship: z.string().trim().max(60),
  phone: z.string().trim().max(30),
  email: z.union([z.string().trim().email("Enter a valid email"), z.literal("")]),
});

const PROFILE_TYPES: { value: ProfileType; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "woman", label: "Woman travelling alone" },
  { value: "traveller", label: "Traveller" },
  { value: "family", label: "Family" },
  { value: "other", label: "Other" },
];

function ContactsPage() {
  const {
    contacts,
    addContact,
    removeContact,
    displayName,
    profileType,
    saveProfile,
    mode,
  } = useSafetyStore();
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName);
  const [typeDraft, setTypeDraft] = useState<ProfileType>(profileType);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse({ name, relationship, phone, email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    if (!parsed.data.phone && !parsed.data.email) {
      setError("Add at least a phone number or an email so this contact is reachable.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await addContact({ ...parsed.data, notify_order: contacts.length + 1 });
      setName("");
      setRelationship("");
      setPhone("");
      setEmail("");
      toast.success("Trusted contact saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that contact.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <section>
        <h1 className="font-display text-2xl font-bold">Trusted contacts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These are the people SafetyNet would escalate to, in order, if you miss a check-in. This
          build never messages them — it shows you the chain.
        </p>
      </section>

      <section className="panel space-y-4 p-5">
        <h2 className="text-base font-bold">Your profile</h2>
        <div className="space-y-1.5">
          <Label htmlFor="display-name">Name shown in the app</Label>
          <Input
            id="display-name"
            value={nameDraft}
            maxLength={80}
            onChange={(e) => setNameDraft(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-type">Who are you using SafetyNet as?</Label>
          <select
            id="profile-type"
            value={typeDraft}
            onChange={(e) => setTypeDraft(e.target.value as ProfileType)}
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {PROFILE_TYPES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Used only to tailor SafeAI’s advice. {mode === "demo" ? "Stored on this device." : "Stored privately in your account."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await saveProfile({ displayName: nameDraft.trim(), profileType: typeDraft });
              toast.success("Profile saved.");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not save your profile.");
            }
          }}
        >
          Save profile
        </Button>
      </section>

      <section className="panel p-5">
        <h2 className="text-base font-bold">Escalation chain ({contacts.length})</h2>
        {contacts.length === 0 ? (
          <p className="mt-2 rounded-lg bg-caution/15 p-3 text-sm text-caution">
            No contacts yet. A missed check-in currently has nobody to escalate to.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {contacts
              .slice()
              .sort((a, b) => a.notify_order - b.notify_order)
              .map((c, i) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-secondary p-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {i + 1}. {c.name}
                      {c.relationship ? (
                        <span className="text-muted-foreground"> · {c.relationship}</span>
                      ) : null}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[c.phone, c.email].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${c.name}`}
                    className="min-h-11 min-w-11 shrink-0"
                    onClick={async () => {
                      try {
                        await removeContact(c.id);
                        toast.success(`${c.name} removed.`);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not remove them.");
                      }
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
          </ol>
        )}
      </section>

      <section className="panel p-5">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <UserPlus className="size-5 text-primary" aria-hidden="true" />
          Add a contact
        </h2>
        <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                value={name}
                maxLength={80}
                required
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-rel">Relationship</Label>
              <Input
                id="c-rel"
                value={relationship}
                maxLength={60}
                placeholder="Sister, flatmate, parent"
                onChange={(e) => setRelationship(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                type="tel"
                value={phone}
                maxLength={30}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                value={email}
                maxLength={255}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full font-semibold" disabled={busy}>
            {busy ? "Saving…" : "Save contact"}
          </Button>
        </form>
      </section>
    </div>
  );
}
