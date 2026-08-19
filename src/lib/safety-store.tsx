import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type {
  CheckIn,
  Journey,
  ProfileType,
  SafetyReport,
  SosEvent,
  TrustedContact,
} from "./safety-types";

export type Mode = "cloud" | "demo";

type DemoData = {
  displayName: string;
  profileType: ProfileType;
  contacts: TrustedContact[];
  journeys: Journey[];
  checkIns: CheckIn[];
  reports: SafetyReport[];
  sos: SosEvent[];
};

const DEMO_KEY = "safetynet.demo.v1";
const DEMO_FLAG = "safetynet.demoMode";

const emptyDemo: DemoData = {
  displayName: "Demo user",
  profileType: "student",
  contacts: [],
  journeys: [],
  checkIns: [],
  reports: [],
  sos: [],
};

function readDemo(): DemoData {
  if (typeof window === "undefined") return emptyDemo;
  try {
    const raw = window.localStorage.getItem(DEMO_KEY);
    if (!raw) return emptyDemo;
    return { ...emptyDemo, ...(JSON.parse(raw) as Partial<DemoData>) };
  } catch {
    return emptyDemo;
  }
}

function writeDemo(data: DemoData) {
  try {
    window.localStorage.setItem(DEMO_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable — session stays in memory only */
  }
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;

export type StoreState = {
  ready: boolean;
  mode: Mode | null;
  email: string | null;
  displayName: string;
  profileType: ProfileType;
  contacts: TrustedContact[];
  journeys: Journey[];
  checkIns: CheckIn[];
  reports: SafetyReport[];
  sos: SosEvent[];
  error: string | null;
};

export type StoreActions = {
  startDemo: () => void;
  exitDemo: () => Promise<void>;
  refresh: () => Promise<void>;
  saveProfile: (input: { displayName: string; profileType: ProfileType }) => Promise<void>;
  addContact: (input: Omit<TrustedContact, "id">) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  startJourney: (
    input: Omit<Journey, "id" | "status" | "started_at" | "ended_at">,
  ) => Promise<Journey>;
  finishJourney: (id: string, status: "completed" | "cancelled") => Promise<void>;
  confirmCheckIn: (id: string, scheduleNext: boolean) => Promise<void>;
  markMissed: (id: string) => Promise<void>;
  scheduleCheckIn: (journeyId: string, minutes: number) => Promise<void>;
  addReport: (
    input: Omit<SafetyReport, "id" | "created_at" | "is_sample" | "local_only" | "mine">,
  ) => Promise<void>;
  removeReport: (id: string) => Promise<void>;
  logSos: (input: { kind: string; note: string; journeyId: string | null }) => Promise<void>;
};

const StoreContext = createContext<(StoreState & StoreActions) | null>(null);

export function SafetyStoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demo, setDemo] = useState<DemoData>(emptyDemo);
  const [cloud, setCloud] = useState<Omit<DemoData, "displayName" | "profileType"> | null>(null);
  const [profile, setProfile] = useState<{ displayName: string; profileType: ProfileType }>({
    displayName: "",
    profileType: "other",
  });
  const [sharedReports, setSharedReports] = useState<SafetyReport[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDemo(readDemo());
    setDemoMode(window.localStorage.getItem(DEMO_FLAG) === "1");
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthReady(true);
    });
    supabase.auth
      .getSession()
      .then(({ data: got }) => setSession(got.session))
      .finally(() => setAuthReady(true));
    return () => data.subscription.unsubscribe();
  }, []);

  const mode: Mode | null = session ? "cloud" : demoMode ? "demo" : null;

  const loadShared = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("safety_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (err) {
      setError("Community map reports could not be loaded. Check your connection.");
      return;
    }
    setSharedReports(
      (data ?? []).map((r) => ({
        id: r.id,
        category: r.category,
        note: r.note,
        latitude: r.latitude,
        longitude: r.longitude,
        severity: r.severity,
        is_sample: r.is_sample,
        created_at: r.created_at,
        mine: !!session && r.user_id === session.user.id,
      })),
    );
  }, [session]);

  const loadCloud = useCallback(async () => {
    if (!session) return;
    const uidNow = session.user.id;
    const [p, c, j, ci, s] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uidNow).maybeSingle(),
      supabase.from("trusted_contacts").select("*").order("notify_order"),
      supabase.from("journeys").select("*").order("started_at", { ascending: false }),
      supabase.from("check_ins").select("*").order("due_at"),
      supabase.from("sos_events").select("*").order("created_at", { ascending: false }),
    ]);
    const firstError = p.error || c.error || j.error || ci.error || s.error;
    if (firstError) {
      setError("Your safety data could not be loaded. Try again.");
      return;
    }
    setError(null);
    setProfile({
      displayName: p.data?.display_name || session.user.email?.split("@")[0] || "",
      profileType: (p.data?.profile_type as ProfileType) ?? "other",
    });
    setCloud({
      contacts: (c.data ?? []) as unknown as TrustedContact[],
      journeys: (j.data ?? []).map((row) => ({
        ...row,
        risk_factors: Array.isArray(row.risk_factors) ? (row.risk_factors as never) : [],
      })) as unknown as Journey[],
      checkIns: (ci.data ?? []) as unknown as CheckIn[],
      reports: [],
      sos: (s.data ?? []) as unknown as SosEvent[],
    });
  }, [session]);

  useEffect(() => {
    if (!authReady) return;
    void loadShared();
    if (session) void loadCloud();
  }, [authReady, session, loadShared, loadCloud]);

  const updateDemo = useCallback((patch: (d: DemoData) => DemoData) => {
    setDemo((current) => {
      const next = patch(current);
      writeDemo(next);
      return next;
    });
  }, []);

  const actions = useMemo<StoreActions>(() => {
    const isCloud = () => !!session;

    return {
      startDemo: () => {
        window.localStorage.setItem(DEMO_FLAG, "1");
        setDemoMode(true);
      },
      exitDemo: async () => {
        window.localStorage.removeItem(DEMO_FLAG);
        setDemoMode(false);
        if (session) await supabase.auth.signOut();
      },
      refresh: async () => {
        await loadShared();
        if (session) await loadCloud();
      },
      saveProfile: async ({ displayName, profileType }) => {
        if (isCloud()) {
          const { error: err } = await supabase
            .from("profiles")
            .upsert({ id: session!.user.id, display_name: displayName, profile_type: profileType });
          if (err) throw new Error("Could not save your profile.");
          setProfile({ displayName, profileType });
        } else {
          updateDemo((d) => ({ ...d, displayName, profileType }));
        }
      },
      addContact: async (input) => {
        if (isCloud()) {
          const { error: err } = await supabase
            .from("trusted_contacts")
            .insert({ ...input, user_id: session!.user.id });
          if (err) throw new Error("Could not save that contact.");
          await loadCloud();
        } else {
          updateDemo((d) => ({ ...d, contacts: [...d.contacts, { ...input, id: uid() }] }));
        }
      },
      removeContact: async (id) => {
        if (isCloud()) {
          const { error: err } = await supabase.from("trusted_contacts").delete().eq("id", id);
          if (err) throw new Error("Could not remove that contact.");
          await loadCloud();
        } else {
          updateDemo((d) => ({ ...d, contacts: d.contacts.filter((c) => c.id !== id) }));
        }
      },
      startJourney: async (input) => {
        const now = new Date();
        const due = new Date(now.getTime() + input.checkin_interval_minutes * 60_000);
        if (isCloud()) {
          const { data, error: err } = await supabase
            .from("journeys")
            .insert({
              user_id: session!.user.id,
              origin: input.origin,
              destination: input.destination,
              travel_mode: input.travel_mode,
              planned_minutes: input.planned_minutes,
              checkin_interval_minutes: input.checkin_interval_minutes,
              risk_score: input.risk_score,
              risk_summary: input.risk_summary,
              risk_factors: input.risk_factors as never,
              risk_source: input.risk_source,
            })
            .select()
            .single();
          if (err || !data) throw new Error("Could not start the journey.");
          const { error: ciErr } = await supabase.from("check_ins").insert({
            user_id: session!.user.id,
            journey_id: data.id,
            due_at: due.toISOString(),
          });
          if (ciErr) throw new Error("Journey saved but the check-in timer failed to start.");
          await loadCloud();
          return { ...(data as unknown as Journey), risk_factors: input.risk_factors };
        }
        const journey: Journey = {
          ...input,
          id: uid(),
          status: "active",
          started_at: now.toISOString(),
          ended_at: null,
        };
        const checkIn: CheckIn = {
          id: uid(),
          journey_id: journey.id,
          due_at: due.toISOString(),
          responded_at: null,
          status: "pending",
        };
        updateDemo((d) => ({
          ...d,
          journeys: [journey, ...d.journeys],
          checkIns: [...d.checkIns, checkIn],
        }));
        return journey;
      },
      finishJourney: async (id, status) => {
        const endedAt = new Date().toISOString();
        if (isCloud()) {
          const { error: err } = await supabase
            .from("journeys")
            .update({ status, ended_at: endedAt })
            .eq("id", id);
          if (err) throw new Error("Could not close the journey.");
          await supabase
            .from("check_ins")
            .delete()
            .eq("journey_id", id)
            .eq("status", "pending");
          await loadCloud();
        } else {
          updateDemo((d) => ({
            ...d,
            journeys: d.journeys.map((j) => (j.id === id ? { ...j, status, ended_at: endedAt } : j)),
            checkIns: d.checkIns.filter((c) => !(c.journey_id === id && c.status === "pending")),
          }));
        }
      },
      confirmCheckIn: async (id, scheduleNext) => {
        const respondedAt = new Date().toISOString();
        if (isCloud()) {
          const { data, error: err } = await supabase
            .from("check_ins")
            .update({ status: "confirmed", responded_at: respondedAt })
            .eq("id", id)
            .select()
            .single();
          if (err || !data) throw new Error("Could not record the check-in.");
          if (scheduleNext) {
            const { data: j } = await supabase
              .from("journeys")
              .select("checkin_interval_minutes,status")
              .eq("id", data.journey_id)
              .single();
            if (j && j.status === "active") {
              await supabase.from("check_ins").insert({
                user_id: session!.user.id,
                journey_id: data.journey_id,
                due_at: new Date(Date.now() + j.checkin_interval_minutes * 60_000).toISOString(),
              });
            }
          }
          await loadCloud();
        } else {
          updateDemo((d) => {
            const target = d.checkIns.find((c) => c.id === id);
            const journey = d.journeys.find((j) => j.id === target?.journey_id);
            const next: CheckIn[] = d.checkIns.map((c) =>
              c.id === id ? { ...c, status: "confirmed", responded_at: respondedAt } : c,
            );
            if (scheduleNext && journey && journey.status === "active") {
              next.push({
                id: uid(),
                journey_id: journey.id,
                due_at: new Date(
                  Date.now() + journey.checkin_interval_minutes * 60_000,
                ).toISOString(),
                responded_at: null,
                status: "pending",
              });
            }
            return { ...d, checkIns: next };
          });
        }
      },
      markMissed: async (id) => {
        if (isCloud()) {
          const { error: err } = await supabase
            .from("check_ins")
            .update({ status: "missed" })
            .eq("id", id)
            .eq("status", "pending");
          if (err) throw new Error("Could not update the check-in.");
          await loadCloud();
        } else {
          updateDemo((d) => ({
            ...d,
            checkIns: d.checkIns.map((c) =>
              c.id === id && c.status === "pending" ? { ...c, status: "missed" } : c,
            ),
          }));
        }
      },
      scheduleCheckIn: async (journeyId, minutes) => {
        const dueAt = new Date(Date.now() + minutes * 60_000).toISOString();
        if (isCloud()) {
          const { error: err } = await supabase
            .from("check_ins")
            .insert({ user_id: session!.user.id, journey_id: journeyId, due_at: dueAt });
          if (err) throw new Error("Could not schedule the next check-in.");
          await loadCloud();
        } else {
          updateDemo((d) => ({
            ...d,
            checkIns: [
              ...d.checkIns,
              {
                id: uid(),
                journey_id: journeyId,
                due_at: dueAt,
                responded_at: null,
                status: "pending",
              },
            ],
          }));
        }
      },
      addReport: async (input) => {
        if (isCloud()) {
          const { error: err } = await supabase
            .from("safety_reports")
            .insert({ ...input, user_id: session!.user.id });
          if (err) throw new Error("Could not save that report.");
          await loadShared();
        } else {
          updateDemo((d) => ({
            ...d,
            reports: [
              {
                ...input,
                id: uid(),
                is_sample: false,
                local_only: true,
                mine: true,
                created_at: new Date().toISOString(),
              },
              ...d.reports,
            ],
          }));
        }
      },
      removeReport: async (id) => {
        if (isCloud()) {
          const { error: err } = await supabase.from("safety_reports").delete().eq("id", id);
          if (err) throw new Error("Could not remove that report.");
          await loadShared();
        }
        updateDemo((d) => ({ ...d, reports: d.reports.filter((r) => r.id !== id) }));
      },
      logSos: async ({ kind, note, journeyId }) => {
        if (isCloud()) {
          const { error: err } = await supabase.from("sos_events").insert({
            user_id: session!.user.id,
            journey_id: journeyId,
            kind,
            note,
          });
          if (err) throw new Error("Could not record this drill in your log.");
          await loadCloud();
        } else {
          updateDemo((d) => ({
            ...d,
            sos: [
              { id: uid(), journey_id: journeyId, kind, note, created_at: new Date().toISOString() },
              ...d.sos,
            ],
          }));
        }
      },
    };
  }, [session, loadCloud, loadShared, updateDemo]);

  const value = useMemo<StoreState & StoreActions>(() => {
    const isCloud = !!session;
    const base = isCloud
      ? {
          displayName: profile.displayName,
          profileType: profile.profileType,
          contacts: cloud?.contacts ?? [],
          journeys: cloud?.journeys ?? [],
          checkIns: cloud?.checkIns ?? [],
          sos: cloud?.sos ?? [],
        }
      : {
          displayName: demo.displayName,
          profileType: demo.profileType,
          contacts: demo.contacts,
          journeys: demo.journeys,
          checkIns: demo.checkIns,
          sos: demo.sos,
        };

    return {
      ready: authReady && (!session || cloud !== null),
      mode,
      email: session?.user.email ?? null,
      error,
      reports: [...demo.reports, ...sharedReports],
      ...base,
      ...actions,
    };
  }, [session, authReady, cloud, demo, profile, sharedReports, mode, error, actions]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useSafetyStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useSafetyStore must be used inside SafetyStoreProvider");
  return ctx;
}

export function useActiveJourney() {
  const { journeys, checkIns } = useSafetyStore();
  const journey = journeys.find((j) => j.status === "active") ?? null;
  const journeyCheckIns = journey ? checkIns.filter((c) => c.journey_id === journey.id) : [];
  const pending =
    journeyCheckIns
      .filter((c) => c.status === "pending")
      .sort((a, b) => a.due_at.localeCompare(b.due_at))[0] ?? null;
  const missed = journeyCheckIns.filter((c) => c.status === "missed");
  return { journey, pending, missed, journeyCheckIns };
}
