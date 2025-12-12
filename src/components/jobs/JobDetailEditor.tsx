"use client";

import { useMemo, useState } from "react";
import type { AreaTag, Job, JobStatus } from "@/lib/types";
import { useRouter } from "next/navigation";

type FormState = {
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  billingAddress: string;
  jobAddress: string;
  description: string;
  measurements: string;
  glassOrProductDetails: string;
  quotedRange: string;
  internalNotes: string;
  totalPrice: string;
  invoiceNumber: string;
  estimateNumber: string;
  cashSaleNumber: string;
  assignedDate: string;
  estimatedDurationHours: string;
  crew: string;
  areaTag: AreaTag;
  status: JobStatus;
  factoryJobId: string;
};

const baseAreaOptions: string[] = [
  "Bairnsdale",
  "Lakes",
  "Sale",
  "Melbourne",
  "Saphire Coast",
  "Other"
];
const statusOptions: string[] = [
  "backlog",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled"
];

export function JobDetailEditor({ job }: { job: Job }) {
  const router = useRouter();
  const initialArea = job.areaTag ?? "Other";
  const isCustomInitialArea = useMemo(
    () => !baseAreaOptions.includes(initialArea),
    [initialArea]
  );
  const [useCustomArea, setUseCustomArea] = useState(isCustomInitialArea);
  const [customAreaTag, setCustomAreaTag] = useState(
    isCustomInitialArea ? initialArea : ""
  );
  const [form, setForm] = useState<FormState>(() => ({
    clientName: job.clientName ?? "",
    clientPhone: job.clientPhone ?? "",
    clientAddress: job.clientAddress ?? "",
    billingAddress: job.billingAddress ?? "",
    jobAddress: job.jobAddress ?? "",
    description: job.description ?? "",
    measurements: job.measurements ?? "",
    glassOrProductDetails: job.glassOrProductDetails ?? "",
    quotedRange: job.quotedRange ?? "",
    internalNotes: job.internalNotes ?? "",
    totalPrice: job.totalPrice != null ? String(job.totalPrice) : "",
    invoiceNumber: job.invoiceNumber ?? "",
    estimateNumber: job.estimateNumber ?? "",
    cashSaleNumber: job.cashSaleNumber ?? "",
    assignedDate: job.assignedDate ?? "",
    estimatedDurationHours:
      job.estimatedDurationHours != null ? String(job.estimatedDurationHours) : "",
    crew: job.crew ?? "",
    areaTag: isCustomInitialArea ? "Other" : initialArea,
    status: job.status ?? "backlog",
    factoryJobId: job.factoryJobId ?? ""
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    const resetArea = job.areaTag ?? "Other";
    const resetIsCustom = !baseAreaOptions.includes(resetArea);
    setUseCustomArea(resetIsCustom);
    setCustomAreaTag(resetIsCustom ? resetArea : "");

    setForm({
      clientName: job.clientName ?? "",
      clientPhone: job.clientPhone ?? "",
      clientAddress: job.clientAddress ?? "",
      billingAddress: job.billingAddress ?? "",
      jobAddress: job.jobAddress ?? "",
      description: job.description ?? "",
      measurements: job.measurements ?? "",
      glassOrProductDetails: job.glassOrProductDetails ?? "",
      quotedRange: job.quotedRange ?? "",
      internalNotes: job.internalNotes ?? "",
      totalPrice: job.totalPrice != null ? String(job.totalPrice) : "",
      invoiceNumber: job.invoiceNumber ?? "",
      estimateNumber: job.estimateNumber ?? "",
      cashSaleNumber: job.cashSaleNumber ?? "",
      assignedDate: job.assignedDate ?? "",
      estimatedDurationHours:
        job.estimatedDurationHours != null ? String(job.estimatedDurationHours) : "",
      crew: job.crew ?? "",
      areaTag: resetIsCustom ? "Other" : resetArea,
      status: job.status ?? "backlog",
      factoryJobId: job.factoryJobId ?? ""
    });
    setError(null);
    setSavedMessage("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedMessage("");

    const required = ["clientName", "clientAddress", "jobAddress"] as const;
    for (const key of required) {
      if (!form[key].toString().trim()) {
        setSaving(false);
        setError("Client name, client address, and job address are required.");
        return;
      }
    }

    const payload = {
      clientName: form.clientName.trim(),
      clientPhone: form.clientPhone.trim() || "N/A",
      clientAddress: form.clientAddress.trim(),
      billingAddress: form.billingAddress.trim() || form.clientAddress.trim(),
      jobAddress: form.jobAddress.trim(),
      description: form.description.trim() || "Job",
      measurements: form.measurements.trim() || null,
      glassOrProductDetails: form.glassOrProductDetails.trim() || null,
      quotedRange: form.quotedRange.trim() || null,
      internalNotes: form.internalNotes.trim() || null,
      totalPrice: form.totalPrice.trim() ? Number(form.totalPrice) : null,
      invoiceNumber: form.invoiceNumber.trim() || null,
      estimateNumber: form.estimateNumber.trim() || null,
      cashSaleNumber: form.cashSaleNumber.trim() || null,
      assignedDate: form.assignedDate || null,
      estimatedDurationHours: form.estimatedDurationHours.trim()
        ? Number(form.estimatedDurationHours)
        : null,
      crew: form.crew.trim() || null,
      areaTag: useCustomArea
        ? customAreaTag.trim() || "Other"
        : form.areaTag,
      status: form.status,
      factoryJobId: form.factoryJobId.trim() || null
    };

    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save job");
      }

      setSavedMessage("Saved");
      setSaving(false);
      router.refresh();
    } catch (err: any) {
      setSaving(false);
      setError(err?.message ?? "Failed to save job");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="text-sm font-semibold text-amber-900">Client</div>
          <label className="space-y-1 text-sm text-amber-900/80">
            <span>Client name*</span>
            <input
              className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
              value={form.clientName}
              onChange={(e) => updateField("clientName", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm text-amber-900/80">
            <span>Phone</span>
            <input
              className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
              value={form.clientPhone}
              onChange={(e) => updateField("clientPhone", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm text-amber-900/80">
            <span>Client address*</span>
            <input
              className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
              value={form.clientAddress}
              onChange={(e) => updateField("clientAddress", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm text-amber-900/80">
            <span>Billing address</span>
            <input
              className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
              value={form.billingAddress}
              onChange={(e) => updateField("billingAddress", e.target.value)}
            />
          </label>
        </section>

        <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="text-sm font-semibold text-amber-900">Job info</div>
          <label className="space-y-1 text-sm text-amber-900/80">
            <span>Job address*</span>
            <input
              className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
              value={form.jobAddress}
              onChange={(e) => updateField("jobAddress", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm text-amber-900/80">
            <span>Description</span>
            <textarea
              className="w-full rounded border border-amber-200 px-3 py-2 bg-white min-h-[68px]"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="space-y-1 text-sm text-amber-900/80">
              <span>Estimate #</span>
              <input
                className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
                value={form.estimateNumber}
                onChange={(e) => updateField("estimateNumber", e.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm text-amber-900/80">
              <span>Invoice #</span>
              <input
                className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
                value={form.invoiceNumber}
                onChange={(e) => updateField("invoiceNumber", e.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm text-amber-900/80">
              <span>Cash sale #</span>
              <input
                className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
                value={form.cashSaleNumber}
                onChange={(e) => updateField("cashSaleNumber", e.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm text-amber-900/80">
              <span>Total price</span>
              <input
                type="number"
                className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
                value={form.totalPrice}
                onChange={(e) => updateField("totalPrice", e.target.value)}
              />
            </label>
          </div>
        </section>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="text-sm font-semibold text-amber-900">Notes</div>
          <label className="space-y-1 text-sm text-amber-900/80">
            <span>Measurements</span>
            <textarea
              className="w-full rounded border border-amber-200 px-3 py-2 bg-white min-h-[72px]"
              value={form.measurements}
              onChange={(e) => updateField("measurements", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm text-amber-900/80">
            <span>Glass / product details</span>
            <textarea
              className="w-full rounded border border-amber-200 px-3 py-2 bg-white min-h-[72px]"
              value={form.glassOrProductDetails}
              onChange={(e) => updateField("glassOrProductDetails", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm text-amber-900/80">
            <span>Quoted range</span>
            <textarea
              className="w-full rounded border border-amber-200 px-3 py-2 bg-white min-h-[60px]"
              value={form.quotedRange}
              onChange={(e) => updateField("quotedRange", e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm text-amber-900/80">
            <span>Internal notes</span>
            <textarea
              className="w-full rounded border border-amber-200 px-3 py-2 bg-white min-h-[80px]"
              value={form.internalNotes}
              onChange={(e) => updateField("internalNotes", e.target.value)}
            />
          </label>
        </section>

        <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="text-sm font-semibold text-amber-900">Scheduling</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="space-y-1 text-sm text-amber-900/80">
              <span>Assigned date</span>
              <input
                type="date"
                className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
                value={form.assignedDate}
                onChange={(e) => updateField("assignedDate", e.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm text-amber-900/80">
              <span>Estimated hours</span>
              <input
                type="number"
                step="0.25"
                min="0"
                className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
                value={form.estimatedDurationHours}
                onChange={(e) =>
                  updateField("estimatedDurationHours", e.target.value)
                }
              />
            </label>
            <label className="space-y-1 text-sm text-amber-900/80">
              <span>Crew</span>
              <input
                className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
                value={form.crew}
                onChange={(e) => updateField("crew", e.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm text-amber-900/80">
              <span>Area</span>
              <select
                className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
                value={useCustomArea ? "__add_new_area" : form.areaTag}
                onChange={(e) => {
                  if (e.target.value === "__add_new_area") {
                    setUseCustomArea(true);
                    setCustomAreaTag("");
                  } else {
                    setUseCustomArea(false);
                    updateField("areaTag", e.target.value as AreaTag);
                  }
                }}
              >
                {baseAreaOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value="__add_new_area">Add new area</option>
              </select>
              {useCustomArea && (
                <input
                  className="mt-2 w-full rounded border border-amber-200 px-3 py-2 bg-white"
                  placeholder="Enter new area"
                  value={customAreaTag}
                  onChange={(e) => setCustomAreaTag(e.target.value)}
                />
              )}
            </label>
            <label className="space-y-1 text-sm text-amber-900/80">
              <span>Status</span>
              <select
                className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-amber-900/80">
              <span>Factory job ID</span>
              <input
                className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
                value={form.factoryJobId}
                onChange={(e) => updateField("factoryJobId", e.target.value)}
              />
            </label>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="px-4 py-2 rounded bg-amber-700 text-white hover:bg-amber-600 disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded border border-amber-300 text-amber-900 hover:bg-amber-50"
          onClick={resetForm}
          disabled={saving}
        >
          Reset
        </button>
        {savedMessage && <span className="text-green-700 text-sm">{savedMessage}</span>}
        {error && <span className="text-red-700 text-sm">{error}</span>}
      </div>
    </form>
  );
}

export default JobDetailEditor;
