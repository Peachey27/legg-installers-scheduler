"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import { createPortal } from "react-dom";
import type { Job } from "@/lib/types";
import JobCard from "../jobs/JobCard";
import { Draggable } from "@hello-pangea/dnd";
import { useSchedulerStore } from "@/store/useSchedulerStore";

interface Props {
  jobs: Job[];
}

export default function BacklogColumn({ jobs }: Props) {
  const { showAddJobForm, openAddJobForm, closeAddJobForm, createJob, error } =
    useSchedulerStore();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <div className="h-full rounded-2xl bg-[#f6f0e7]/90 border border-amber-200/70 shadow-inner flex flex-col p-3">
      <div className="mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900">
          Backlog
        </h2>
        <p className="text-xs text-amber-900/70">
          Unschedule jobs – drag onto a day.
        </p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {jobs.map((j, index) => (
          <Draggable key={j.id} draggableId={j.id} index={index}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                <JobCard job={j} />
              </div>
            )}
          </Draggable>
        ))}
      </div>
      {showAddJobForm ? (
        <AddJobModal
          onCancel={closeAddJobForm}
          onSave={async (payload) => {
            setFormError(null);
            setSaving(true);
            try {
              await createJob(payload);
            } catch (e: any) {
              setFormError(e?.message ?? "Could not create job");
            } finally {
              setSaving(false);
            }
          }}
          loading={saving}
          error={formError ?? error}
        />
      ) : (
        <button
          className="mt-2 text-xs text-amber-800 underline"
          onClick={openAddJobForm}
        >
          + Add job
        </button>
      )}
    </div>
  );
}

type AddJobFormValues = {
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientAddressLat: number | null;
  clientAddressLng: number | null;
  billingAddress: string;
  jobAddress: string;
  description: string;
  estimatedDurationHours: number | null;
  areaTag: string;
};

function AddJobModal({
  onCancel,
  onSave,
  loading,
  error
}: {
  onCancel: () => void;
  onSave: (values: AddJobFormValues) => Promise<void>;
  loading: boolean;
  error: string | null;
}) {
  const areaOptions = [
    "Bairnsdale",
    "Lakes",
    "Sale",
    "Melbourne",
    "Saphire Coast",
    "Other"
  ];
  const [values, setValues] = useState<AddJobFormValues>({
    clientName: "",
    clientPhone: "",
    clientAddress: "",
    clientAddressLat: null,
    clientAddressLng: null,
    billingAddress: "",
    jobAddress: "",
    description: "New Window/Doors",
    estimatedDurationHours: null,
    areaTag: "Other"
  });
  const [billingSameAsJob, setBillingSameAsJob] = useState(true);
  const [customDescription, setCustomDescription] = useState("");
  const [useCustomArea, setUseCustomArea] = useState(false);
  const [customAreaTag, setCustomAreaTag] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    Array<{ id: string; label: string; raw?: string; lat?: number; lng?: number }>
  >([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const lastAddressRequestRef = useRef(0);

  const presetDescriptions = [
    "New Window/Doors",
    "New Shower Screen",
    "Reglaze",
    "LEGG job site works",
    "Add a new description"
  ];

  // avoid SSR mismatch for portal
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => setAddressQuery(values.clientAddress), []);

  useEffect(() => {
    const q = addressQuery.trim();
    if (q.length < 3) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      return;
    }

    const reqId = Date.now();
    lastAddressRequestRef.current = reqId;
    setAddressLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/address-search?q=${encodeURIComponent(q)}`);
        const text = await res.text();
        if (lastAddressRequestRef.current !== reqId) return;
        if (!res.ok) {
          console.error("Address search failed", res.status, text);
          setAddressSuggestions([]);
          setAddressLoading(false);
          return;
        }

        const data = JSON.parse(text) as Array<{
          id: string;
          label: string;
          lat?: number;
          lng?: number;
        }>;
        setAddressSuggestions(Array.isArray(data) ? data.slice(0, 6) : []);
      } catch (err) {
        console.error("Address search error", err);
        if (lastAddressRequestRef.current === reqId) {
          setAddressSuggestions([]);
        }
      } finally {
        if (lastAddressRequestRef.current === reqId) {
          setAddressLoading(false);
        }
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [addressQuery]);

  function handleChange(
    field: keyof AddJobFormValues,
    v: string | number | null
  ) {
    setValues((prev) => ({ ...prev, [field]: v }));
  }

  function selectClientAddress(nextAddress: string, lat?: number, lng?: number) {
    const prevClientAddress = values.clientAddress;
    setValues((prev) => ({
      ...prev,
      clientAddress: nextAddress,
      clientAddressLat: lat != null ? lat : null,
      clientAddressLng: lng != null ? lng : null,
      jobAddress:
        !prev.jobAddress.trim() || prev.jobAddress.trim() === prevClientAddress.trim()
          ? nextAddress
          : prev.jobAddress
    }));
    setAddressQuery(nextAddress);
    setShowAddressSuggestions(false);
    if (billingSameAsJob) {
      setValues((prev) => ({
        ...prev,
        billingAddress: (prev.jobAddress || nextAddress).trim()
      }));
    }
  }

  function getDescriptionValue() {
    if (values.description === "Add a new description") {
      return customDescription.trim() || "Custom job";
    }
    return values.description;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const required = ["clientName", "clientAddress", "jobAddress"] as const;
    for (const key of required) {
      // @ts-ignore dynamic check
      if (!values[key]?.toString().trim()) {
        alert("Please fill in all required fields.");
        return;
      }
    }

    const description = getDescriptionValue();

    await onSave({
      ...values,
      jobAddress: values.jobAddress.trim() || values.clientAddress.trim(),
      clientAddress: values.clientAddress.trim(),
      clientName: values.clientName.trim(),
      clientPhone: values.clientPhone.trim() || "N/A",
      billingAddress: billingSameAsJob
        ? (values.jobAddress.trim() || values.clientAddress.trim())
        : values.billingAddress.trim(),
      description,
      areaTag: useCustomArea
        ? customAreaTag.trim() || "Other"
        : values.areaTag
    });
  }

  const form = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-2xl rounded-2xl border border-amber-300 bg-white/95 p-6 shadow-2xl space-y-3 text-sm"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-amber-900">New job</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-amber-700 hover:text-amber-900 text-sm"
            disabled={loading}
          >
            Cancel
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-amber-900/80">Client name*</label>
            <input
              className="w-full rounded border border-amber-200 px-3 py-2 text-amber-900 bg-white/80"
              value={values.clientName}
              onChange={(e) => handleChange("clientName", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-amber-900/80">Client phone</label>
            <input
              className="w-full rounded border border-amber-200 px-3 py-2 text-amber-900 bg-white/80"
              value={values.clientPhone}
              onChange={(e) => handleChange("clientPhone", e.target.value)}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-amber-900/80">Client address*</label>
            <div className="relative">
              <input
                className="w-full rounded border border-amber-200 px-3 py-2 text-amber-900 bg-white/80"
                value={addressQuery}
                onChange={(e) => {
                  const next = e.target.value;
                  setAddressQuery(next);
                  handleChange("clientAddress", next);
                  handleChange("clientAddressLat", null);
                  handleChange("clientAddressLng", null);
                  if (!values.jobAddress) {
                    handleChange("jobAddress", next);
                    if (billingSameAsJob) {
                      handleChange("billingAddress", next);
                    }
                  }
                  setShowAddressSuggestions(true);
                }}
                onFocus={() => setShowAddressSuggestions(true)}
                onBlur={() =>
                  window.setTimeout(() => setShowAddressSuggestions(false), 120)
                }
                placeholder="Start typing an address..."
                autoComplete="off"
                required
              />
              {showAddressSuggestions &&
                (addressLoading || addressSuggestions.length > 0) && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-amber-200 bg-white shadow-lg overflow-hidden">
                    {addressLoading && (
                      <div className="px-3 py-2 text-xs text-amber-900/70">
                        Searching...
                      </div>
                    )}
                    {addressSuggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 border-t border-amber-100 first:border-t-0"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectClientAddress(s.label, s.lat, s.lng)}
                      >
                        {s.label}
                      </button>
                    ))}
                    {!addressLoading &&
                      addressSuggestions.length === 0 &&
                      addressQuery.trim().length >= 3 && (
                        <div className="px-3 py-2 text-xs text-amber-900/70">
                          No matches found.
                        </div>
                      )}
                  </div>
                )}
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-amber-900/80">Job address* (used for location)</label>
            <input
              className="w-full rounded border border-amber-200 px-3 py-2 text-amber-900 bg-white/80"
              value={values.jobAddress}
              onChange={(e) => {
                const next = e.target.value;
                handleChange("jobAddress", next);
                if (billingSameAsJob) {
                  handleChange("billingAddress", next);
                }
                if (next.trim() && next.trim() !== values.clientAddress.trim()) {
                  handleChange("clientAddressLat", null);
                  handleChange("clientAddressLng", null);
                }
              }}
              required
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-amber-900/80">Billing address</label>
            <div className="flex items-center gap-2 text-xs text-amber-900/70 mb-1">
              <input
                type="checkbox"
                checked={billingSameAsJob}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setBillingSameAsJob(checked);
                  if (checked) {
                    setValues((prev) => ({
                      ...prev,
                      billingAddress: (prev.jobAddress.trim() || prev.clientAddress.trim())
                    }));
                  }
                }}
              />
              <span>Same as job address</span>
            </div>
            <input
              className="w-full rounded border border-amber-200 px-3 py-2 text-amber-900 bg-white/80"
              value={values.billingAddress}
              onChange={(e) => handleChange("billingAddress", e.target.value)}
              disabled={billingSameAsJob}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-amber-900/80">Job description</label>
            <select
              className="w-full rounded border border-amber-200 px-3 py-2 text-amber-900 bg-white/80"
              value={values.description}
              onChange={(e) => handleChange("description", e.target.value)}
            >
              {presetDescriptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {values.description === "Add a new description" && (
              <input
                className="mt-2 w-full rounded border border-amber-200 px-3 py-2 text-amber-900 bg-white/80"
                placeholder="Enter new description"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-1 md:col-span-1">
            <label className="block text-amber-900/80">
              Estimated hours (optional)
            </label>
            <input
              type="number"
              min="0"
              step="0.25"
              className="w-full rounded border border-amber-200 px-3 py-2 text-amber-900 bg-white/80"
              value={values.estimatedDurationHours ?? ""}
              onChange={(e) =>
                handleChange(
                  "estimatedDurationHours",
                  e.target.value ? Number(e.target.value) : null
                )
              }
            />
          </div>

          <div className="space-y-1 md:col-span-1">
            <label className="block text-amber-900/80">Area</label>
            <select
              className="w-full rounded border border-amber-200 px-3 py-2 text-amber-900 bg-white/80"
              value={useCustomArea ? "__add_new_area" : values.areaTag}
              onChange={(e) => {
                if (e.target.value === "__add_new_area") {
                  setUseCustomArea(true);
                  setCustomAreaTag("");
                } else {
                  setUseCustomArea(false);
                  setValues((prev) => ({ ...prev, areaTag: e.target.value }));
                }
              }}
            >
              {areaOptions.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
              <option value="__add_new_area">Add new area</option>
            </select>
            {useCustomArea && (
              <input
                className="mt-2 w-full rounded border border-amber-200 px-3 py-2 text-amber-900 bg-white/80"
                placeholder="Enter new area"
                value={customAreaTag}
                onChange={(e) => setCustomAreaTag(e.target.value)}
              />
            )}
          </div>
        </div>

        {error && <p className="text-red-700 text-sm">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded border border-amber-200 text-amber-800 bg-white/80 hover:bg-amber-50"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Saving…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );

  if (!mounted) return null;
  return createPortal(form, document.body);
}
