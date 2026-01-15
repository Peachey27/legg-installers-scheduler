import { create } from "zustand";
import type { Job } from "@/lib/types";
import { normalizeClientName } from "@/lib/normalizeClientName";

type NewJobInput = {
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  billingAddress?: string;
  jobAddress: string;
  description: string;
  clientAddressLat?: number | null;
  clientAddressLng?: number | null;
  assignedDate?: string | null;
  estimatedDurationHours?: number | null;
  areaTag?: string;
};

interface SchedulerState {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  dayAreaLabels: Record<string, string | undefined>;
  showAddJobForm: boolean;

  fetchJobs: () => Promise<void>;
  fetchDayAreaLabels: () => Promise<void>;
  moveJob: (id: string, assignedDate: string | null) => Promise<void>;
  createJob: (input: NewJobInput) => Promise<void>;
  setDayAreaLabel: (date: string, label: string | undefined) => Promise<void>;
  setJobs: (jobs: Job[]) => void;
  openAddJobForm: () => void;
  closeAddJobForm: () => void;
}

function isIsoDate(val: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(val);
}

/**
 * Accept ONLY:
 * - null
 * - "yyyy-mm-dd"
 *
 * Convert common bad inputs to null or a real date:
 * - "backlog" -> null
 * - "day:yyyy-mm-dd" -> "yyyy-mm-dd"
 * - "Sortable-0" -> null
 * - whitespace -> trimmed, then validated
 */
function sanitizeAssignedDate(input: unknown): string | null {
  if (input == null) return null;

  const raw = String(input).trim();
  if (!raw) return null;

  if (raw === "backlog") return null;

  if (raw.startsWith("day:")) {
    const maybe = raw.slice("day:".length).trim();
    return isIsoDate(maybe) ? maybe : null;
  }

  // If it looks like an internal sortable id or any non-date string, drop it.
  if (!isIsoDate(raw)) return null;

  return raw;
}

function normalizeIncomingJob(j: any): Job {
  return {
    ...j,
    id: String(j.id),
    materialProductUpdates: Array.isArray(j.materialProductUpdates)
      ? j.materialProductUpdates
      : [],
    // Defensive: ensure assignedDate is either yyyy-mm-dd or null
    assignedDate: sanitizeAssignedDate(j.assignedDate)
  } as Job;
}

export const useSchedulerStore = create<SchedulerState>((set, get) => ({
  jobs: [],
  loading: false,
  error: null,
  dayAreaLabels: {},
  showAddJobForm: false,

  async fetchJobs() {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/jobs");
      const text = await res.text();

      if (!res.ok) {
        console.error("Failed to load jobs", res.status, text);
        throw new Error(`Failed to load jobs: ${res.status}`);
      }

      const data = JSON.parse(text) as Job[];

      const normalised = (data ?? [])
        .filter((j: any) => !j?.deletedAt)
        .map((j: any) => normalizeIncomingJob(j)) as Job[];

      set({ jobs: normalised, loading: false });
    } catch (e: any) {
      set({ error: e?.message ?? "Failed to load", loading: false });
    }
  },

  async fetchDayAreaLabels() {
    try {
      const res = await fetch("/api/day-settings", { cache: "no-store" });
      const text = await res.text();
      if (!res.ok) {
        console.error("Failed to load day settings", res.status, text);
        return;
      }
      const data = JSON.parse(text) as Record<string, string | undefined>;
      set({ dayAreaLabels: data });
    } catch (error) {
      console.error("Failed to load day settings", error);
    }
  },

  async moveJob(id, assignedDate) {
    const { jobs } = get();
    const existing = jobs.find((j) => j.id === id);
    if (!existing) return;

    // Hard sanitize: only null or yyyy-mm-dd can ever be stored client-side.
    const safeAssignedDate = sanitizeAssignedDate(assignedDate);
    const newStatus = safeAssignedDate ? "scheduled" : "backlog";

    // Optimistic update
    const previousJobs = jobs;
    set({
      error: null,
      jobs: jobs.map((j) =>
        j.id === id ? { ...j, assignedDate: safeAssignedDate, status: newStatus } : j
      )
    });

    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedDate: safeAssignedDate, // always null or yyyy-mm-dd
          status: newStatus
        })
      });

      const text = await res.text();
      if (!res.ok) {
        console.error("Move job failed", res.status, text);
        throw new Error(`Move job failed: ${res.status}`);
      }

      // If API returns the updated job, merge it. If not, refetch.
      let parsed: any = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }

      if (parsed && typeof parsed === "object" && parsed.id != null) {
        const updated = normalizeIncomingJob(parsed);
        set((state) => ({
          jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...updated } : j))
        }));
      } else {
        // API might return empty or { ok: true }, so ensure we stay in sync.
        await get().fetchJobs();
      }
    } catch (e: any) {
      // Rollback UI so jobs don't vanish silently
      set({ jobs: previousJobs, error: e?.message ?? "Failed to move job" });
      throw e;
    }
  },

  async createJob(input) {
    const today = new Date().toISOString().slice(0, 10);
    const clientName = normalizeClientName(input.clientName);

    const safeAssignedDate = sanitizeAssignedDate(input.assignedDate ?? null);

    const payload = {
      ...input,
      clientName,
      dateTaken: today,
      billingAddress: input.billingAddress ?? input.jobAddress ?? input.clientAddress,
      areaTag: input.areaTag ?? "Other",
      totalPrice: null,
      invoiceNumber: null,
      estimateNumber: null,
      cashSaleNumber: null,
      measurements: null,
      glassOrProductDetails: null,
      quotedRange: null,
      internalNotes: null,
      materialProductUpdates: [],
      crew: null,
      factoryJobId: null,
      photo1Url: null,
      photo2Url: null,
      photo3Url: null,
      clientAddressLat: input.clientAddressLat ?? null,
      clientAddressLng: input.clientAddressLng ?? null,
      assignedDate: safeAssignedDate,
      estimatedDurationHours: input.estimatedDurationHours ?? null,
      status: safeAssignedDate ? "scheduled" : "backlog"
    };

    set({ error: null });

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const text = await res.text();

      if (!res.ok) {
        console.error("Create job failed", res.status, text);
        throw new Error(`Failed to create job: ${res.status}`);
      }

      const data = text ? (JSON.parse(text) as { id: string | number }) : null;
      const id = data?.id != null ? String(data.id) : crypto.randomUUID();

      set((state) => ({
        jobs: [
          {
            id,
            ...payload,
            deletedAt: null
          } as any,
          ...state.jobs
        ],
        showAddJobForm: false
      }));
    } catch (e: any) {
      set({ error: e?.message ?? "Failed to create job" });
      throw e;
    }
  },

  async setDayAreaLabel(date, label) {
    set((state) => ({
      dayAreaLabels: { ...state.dayAreaLabels, [date]: label }
    }));
    try {
      await fetch("/api/day-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, label })
      });
    } catch (error) {
      console.error("Failed to save day setting", error);
    }
  },

  setJobs(jobs) {
    set({ jobs });
  },

  openAddJobForm() {
    set({ showAddJobForm: true });
  },

  closeAddJobForm() {
    set({ showAddJobForm: false });
  }
}));
