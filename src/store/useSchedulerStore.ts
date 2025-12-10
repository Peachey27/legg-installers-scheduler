import { create } from "zustand";
import type { Job } from "@/lib/types";

type NewJobInput = {
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  jobAddress: string;
  description: string;
  assignedDate?: string | null;
  estimatedDurationHours?: number | null;
};

interface SchedulerState {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  dayAreaLabels: Record<string, string | undefined>;
  showAddJobForm: boolean;

  fetchJobs: () => Promise<void>;
  moveJob: (id: string, assignedDate: string | null) => Promise<void>;
  createJob: (input: NewJobInput) => Promise<void>;
  setDayAreaLabel: (date: string, label: string | undefined) => void;
  setJobs: (jobs: Job[]) => void;
  openAddJobForm: () => void;
  closeAddJobForm: () => void;
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

      const normalised = data.map((j) => ({
        ...j,
        id: String(j.id)
      })) as Job[];

      set({ jobs: normalised, loading: false });
    } catch (e: any) {
      set({ error: e?.message ?? "Failed to load", loading: false });
    }
  },

  async moveJob(id, assignedDate) {
    const { jobs } = get();
    const job = jobs.find((j) => j.id === id);
    if (!job) return;

    const newStatus = assignedDate ? "scheduled" : "backlog";

    set({
      jobs: jobs.map((j) =>
        j.id === id ? { ...j, assignedDate, status: newStatus } : j
      )
    });

    await fetch(`/api/jobs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedDate,
        status: newStatus
      })
    });
  },

  async createJob(input) {
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      ...input,
      dateTaken: today,
      billingAddress: input.clientAddress,
      areaTag: "Other",
      totalPrice: null,
      invoiceNumber: null,
      estimateNumber: null,
      cashSaleNumber: null,
      measurements: null,
      glassOrProductDetails: null,
      quotedRange: null,
      internalNotes: null,
      crew: null,
      factoryJobId: null,
      photo1Url: null,
      photo2Url: null,
      photo3Url: null,
      assignedDate: input.assignedDate ?? null,
      estimatedDurationHours: input.estimatedDurationHours ?? null,
      status: input.assignedDate ? "scheduled" : "backlog"
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

      const data = JSON.parse(text) as { id: string | number };
      const id = data?.id != null ? String(data.id) : crypto.randomUUID();

      set((state) => ({
        jobs: [
          {
            id,
            ...payload,
            deletedAt: null
          },
          ...state.jobs
        ],
        showAddJobForm: false
      }));
    } catch (e: any) {
      set({ error: e?.message ?? "Failed to create job" });
      throw e;
    }
  },

  setDayAreaLabel(date, label) {
    set((state) => ({
      dayAreaLabels: { ...state.dayAreaLabels, [date]: label }
    }));
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
