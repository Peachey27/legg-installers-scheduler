"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AreaTag,
  Job,
  JobStatus,
  MaterialProductUpdate
} from "@/lib/types";
import { useRouter } from "next/navigation";

type FormState = {
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientAddressLat: string;
  clientAddressLng: string;
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
  photo1Url: string;
  photo2Url: string;
  photo3Url: string;
  materialProductUpdates: MaterialProductUpdate[];
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
const materialUpdateOptions: string[] = [
  "Glass due date",
  "Product made ready for install",
  "Rework due date",
  "Angles",
  "Add item"
];

export function JobDetailEditor({ job }: { job: Job }) {
  const router = useRouter();

  function toTelHref(phone: string) {
    const raw = (phone ?? "").trim();
    if (!raw || raw.toLowerCase() === "n/a") return null;
    const normalized = raw.replace(/[^\d+]/g, "");
    return `tel:${normalized || raw}`;
  }

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
    clientAddressLat: job.clientAddressLat != null ? String(job.clientAddressLat) : "",
    clientAddressLng: job.clientAddressLng != null ? String(job.clientAddressLng) : "",
    billingAddress: job.billingAddress ?? "",
    jobAddress: job.jobAddress ?? job.clientAddress ?? "",
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
    factoryJobId: job.factoryJobId ?? "",
    photo1Url: job.photo1Url ?? "",
    photo2Url: job.photo2Url ?? "",
    photo3Url: job.photo3Url ?? "",
    materialProductUpdates: job.materialProductUpdates ?? []
  }));
  const [billingSameAsJob, setBillingSameAsJob] = useState(() => {
    const billing = (job.billingAddress ?? "").trim();
    const jobAddr = (job.jobAddress ?? "").trim();
    if (!billing && jobAddr) return true;
    return billing.toLowerCase() === jobAddr.toLowerCase();
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const [selectedMaterialOption, setSelectedMaterialOption] = useState(
    materialUpdateOptions[0]
  );
  const [customMaterialLabel, setCustomMaterialLabel] = useState("");
  const [materialDate, setMaterialDate] = useState("");
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const telHref = toTelHref(form.clientPhone);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    Array<{ id: string; label: string; raw?: string; lat?: number; lng?: number }>
  >([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const lastAddressRequestRef = useRef(0);

  async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith("image/")) return file;
    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    const createBlob = async (
      img: HTMLImageElement,
      maxWidth: number,
      quality: number
    ) => {
      const canvas = document.createElement("canvas");
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No canvas context");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Blob failed"))),
          "image/jpeg",
          quality
        );
      });
    };

    let img: HTMLImageElement | null = null;
    const objectUrl = URL.createObjectURL(file);
    try {
      img = await loadImage(objectUrl);
      let blob = await createBlob(img, 1600, 0.75);
      if (blob.size > 2 * 1024 * 1024) {
        blob = await createBlob(img, 1280, 0.6);
      }
      const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
    } catch (err) {
      console.error("Image compression failed, using original file", err);
      return file;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

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
      clientAddressLat: job.clientAddressLat != null ? String(job.clientAddressLat) : "",
      clientAddressLng: job.clientAddressLng != null ? String(job.clientAddressLng) : "",
      billingAddress: job.billingAddress ?? "",
      jobAddress: job.jobAddress ?? job.clientAddress ?? "",
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
      factoryJobId: job.factoryJobId ?? "",
      photo1Url: job.photo1Url ?? "",
      photo2Url: job.photo2Url ?? "",
      photo3Url: job.photo3Url ?? "",
      materialProductUpdates: job.materialProductUpdates ?? []
    });
    setError(null);
    setSavedMessage("");
    setSelectedMaterialOption(materialUpdateOptions[0]);
    setCustomMaterialLabel("");
    setMaterialDate("");
    setShowNotesModal(false);
    setAddressQuery(job.jobAddress ?? job.clientAddress ?? "");
    setAddressSuggestions([]);
    setAddressLoading(false);
    setShowAddressSuggestions(false);
  }

  function generateMaterialUpdateId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `mpu_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function addMaterialUpdate(label: string, date: string) {
    setForm((prev) => ({
      ...prev,
      materialProductUpdates: [
        ...prev.materialProductUpdates,
        { id: generateMaterialUpdateId(), label, date }
      ]
    }));
    setSavedMessage("");
  }

  function removeMaterialUpdate(id: string) {
    setForm((prev) => ({
      ...prev,
      materialProductUpdates: prev.materialProductUpdates.filter((u) => u.id !== id)
    }));
    setSavedMessage("");
  }

  useEffect(() => {
    setAddressQuery(form.jobAddress);
  }, []);

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

  function selectJobAddress(nextAddress: string, lat?: number, lng?: number) {
    // Keep both columns in sync; the UI only exposes a single "Job address".
    updateField("jobAddress", nextAddress);
    updateField("clientAddress", nextAddress);
    updateField("clientAddressLat", lat != null ? String(lat) : "");
    updateField("clientAddressLng", lng != null ? String(lng) : "");
    setAddressQuery(nextAddress);
    setShowAddressSuggestions(false);
  }

  useEffect(() => {
    if (!billingSameAsJob) return;
    setForm((prev) => ({
      ...prev,
      billingAddress: prev.jobAddress
    }));
  }, [billingSameAsJob, form.jobAddress]);

  function buildPayload() {
    const required = ["clientName", "jobAddress"] as const;
    for (const key of required) {
      if (!form[key].toString().trim()) {
        throw new Error("Client name and job address are required.");
      }
    }

    return {
      clientName: form.clientName.trim(),
      clientPhone: form.clientPhone.trim() || "N/A",
      // Back-compat: clientAddress is treated as the job location address.
      clientAddress: form.jobAddress.trim(),
      clientAddressLat: form.clientAddressLat.trim() ? Number(form.clientAddressLat) : null,
      clientAddressLng: form.clientAddressLng.trim() ? Number(form.clientAddressLng) : null,
      billingAddress: billingSameAsJob
        ? form.jobAddress.trim()
        : form.billingAddress.trim() || form.jobAddress.trim(),
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
      factoryJobId: form.factoryJobId.trim() || null,
      photo1Url: form.photo1Url.trim() || null,
      photo2Url: form.photo2Url.trim() || null,
      photo3Url: form.photo3Url.trim() || null,
      materialProductUpdates: form.materialProductUpdates
        .map((item) => ({
          ...item,
          label: item.label.trim(),
          date: item.date
        }))
        .filter((item) => item.label && item.date)
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedMessage("");

    let payload;
    try {
      payload = buildPayload();
    } catch (err: any) {
      setSaving(false);
      setError(err?.message ?? "Please fill required fields.");
      return;
    }

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

  function handleAddMaterialNote() {
    const label =
      selectedMaterialOption === "Add item"
        ? customMaterialLabel.trim()
        : selectedMaterialOption;
    if (!label) {
      setError("Please choose or enter an update label.");
      return;
    }
    if (!materialDate) {
      setError("Please pick a date for the update.");
      return;
    }
    setError(null);
    addMaterialUpdate(label, materialDate);
    if (selectedMaterialOption === "Add item") {
      setCustomMaterialLabel("");
    }
    setMaterialDate("");
  }

  async function handleCopyJob() {
    setCopying(true);
    setError(null);
    try {
      const payload = buildPayload();
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          // Make sure the copy is clearly separated from cancellations
          status: payload.status || "backlog"
        })
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(text || "Failed to copy job");
      }
      const data = JSON.parse(text) as { id?: string };
      const newId = data?.id ? String(data.id) : null;
      setSavedMessage("Copied");
      if (newId) {
        router.push(`/jobs/${newId}`);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to copy job");
    } finally {
      setCopying(false);
    }
  }

  async function handleDeleteJob() {
    if (!window.confirm("Delete this card? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to delete job");
      }
      router.push("/");
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete job");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/jobs/${job.id}/print`}
            className="px-3 py-2 rounded border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 text-sm"
          >
            Print card
          </Link>
          <Link
            href="/"
            className="px-3 py-2 rounded border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 text-sm"
          >
            Back to board
          </Link>
          <button
            type="button"
            className="px-3 py-2 rounded border border-emerald-300 text-emerald-900 bg-emerald-50 hover:bg-emerald-100 text-sm"
            onClick={() => setShowNotesModal(true)}
            disabled={saving || copying || deleting}
          >
            Material/Product notes
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="text-sm font-semibold text-amber-900">Client</div>
          <label className="block space-y-1 text-sm text-amber-900/80">
            <span>Client name*</span>
            <input
              className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
              value={form.clientName}
              onChange={(e) => updateField("clientName", e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm text-amber-900/80">
            <span>Phone</span>
            <input
              className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
              value={form.clientPhone}
              onChange={(e) => updateField("clientPhone", e.target.value)}
            />
            {telHref && (
              <a
                href={telHref}
                className="block text-[11px] text-amber-800 underline"
              >
                Tap to call {form.clientPhone}
              </a>
            )}
          </label>
          <label className="block space-y-1 text-sm text-amber-900/80">
            <span>Job address* (used for location)</span>
            <div className="relative">
              <input
                className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
                value={addressQuery}
                onChange={(e) => {
                  const next = e.target.value;
                  setAddressQuery(next);
                  updateField("jobAddress", next);
                  updateField("clientAddress", next);
                  updateField("clientAddressLat", "");
                  updateField("clientAddressLng", "");
                  setShowAddressSuggestions(true);
                }}
                onFocus={() => setShowAddressSuggestions(true)}
                onBlur={() => window.setTimeout(() => setShowAddressSuggestions(false), 120)}
                placeholder="Start typing an address..."
                autoComplete="off"
              />
              {showAddressSuggestions && (addressLoading || addressSuggestions.length > 0) && (
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
                      onClick={() => selectJobAddress(s.label, s.lat, s.lng)}
                    >
                      {s.label}
                    </button>
                  ))}
                  {!addressLoading && addressSuggestions.length === 0 && addressQuery.trim().length >= 3 && (
                    <div className="px-3 py-2 text-xs text-amber-900/70">
                      No matches found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </label>
          <label className="block space-y-1 text-sm text-amber-900/80">
            <span>Billing address</span>
            <div className="flex items-center gap-2 text-xs text-amber-900/70">
              <input
                type="checkbox"
                checked={billingSameAsJob}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setBillingSameAsJob(checked);
                  if (checked) {
                    updateField("billingAddress", form.jobAddress);
                  }
                }}
              />
              <span>Same as job address</span>
            </div>
            <input
              className="w-full rounded border border-amber-200 px-3 py-2 bg-white"
              value={form.billingAddress}
              onChange={(e) => updateField("billingAddress", e.target.value)}
              disabled={billingSameAsJob}
            />
          </label>
        </section>

        <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="text-sm font-semibold text-amber-900">Job info</div>
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
          <div className="text-sm font-semibold text-amber-900">Back of card</div>
          {![form.photo1Url, form.photo2Url, form.photo3Url].some(Boolean) && (
            <p className="text-xs text-amber-900/70">
              Upload a photo of the back of the card or any relevant sketches/photos.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[form.photo1Url, form.photo2Url, form.photo3Url].map((url, idx) =>
              url ? (
                <div key={idx} className="space-y-1">
                  <img
                    src={url}
                    alt={`Attachment ${idx + 1}`}
                    className="w-full h-32 object-cover rounded border border-amber-200 bg-white cursor-pointer"
                    onClick={() => window.open(url, "_blank")}
                  />
                  <button
                    type="button"
                    className="text-[11px] text-red-700 underline"
                    onClick={() => updateField((`photo${idx + 1}Url` as any), "")}
                    disabled={saving}
                  >
                    Remove
                  </button>
                </div>
              ) : null
            )}
          </div>

          {/* Upload control */}
          <label className="inline-flex items-center gap-2 text-xs text-amber-900/80 cursor-pointer">
            <span className="px-3 py-1 rounded border border-amber-200 bg-white hover:bg-amber-50">
              Upload image
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setSaving(true);
                setError(null);
                try {
                  const compressed = await compressImage(file);
                  const formData = new FormData();
                  formData.append("file", compressed);
                  const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData
                  });
                  const text = await res.text();
                  if (!res.ok) {
                    throw new Error(text || "Upload failed");
                  }
                  const data = JSON.parse(text) as { url?: string; error?: string };
                  if (data.url) {
                    const slots: Array<keyof FormState> = ["photo1Url", "photo2Url", "photo3Url"];
                    const target = slots.find((key) => !form[key]);
                    if (target) {
                      updateField(target, data.url as any);
                    } else {
                      setError("All attachment slots are full.");
                    }
                  } else if (data.error) {
                    throw new Error(data.error);
                  }
                } catch (err: any) {
                  setError(err?.message ?? "Upload failed");
                } finally {
                  setSaving(false);
                  e.target.value = "";
                }
              }}
              disabled={saving}
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

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 rounded bg-amber-700 text-white hover:bg-amber-600 disabled:opacity-60"
            disabled={saving || copying || deleting}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded border border-amber-300 text-amber-900 hover:bg-amber-50"
            onClick={resetForm}
            disabled={saving || copying || deleting}
          >
            Reset
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 px-4 py-2 rounded border border-slate-300 text-slate-800 bg-white hover:bg-slate-50"
            onClick={handleCopyJob}
            disabled={saving || copying || deleting}
          >
            {copying ? "Copying..." : "Copy card"}
          </button>
          <button
            type="button"
            className="flex-1 px-4 py-2 rounded border border-red-300 text-red-800 bg-red-50 hover:bg-red-100"
            onClick={handleDeleteJob}
            disabled={saving || copying || deleting}
          >
            {deleting ? "Deleting..." : "Delete card"}
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {savedMessage && <span className="text-green-700">{savedMessage}</span>}
          {error && <span className="text-red-700">{error}</span>}
        </div>
      </div>

      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowNotesModal(false)}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-emerald-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-600">
                  Job #{job.id}
                </p>
                <h3 className="text-lg font-semibold text-emerald-900">
                  Material & product notes
                </h3>
                <p className="text-xs text-emerald-800/80">
                  Choose an item or add your own, then set the date.
                </p>
              </div>
              <button
                type="button"
                className="text-sm text-emerald-800 hover:text-emerald-950"
                onClick={() => setShowNotesModal(false)}
              >
                Close
              </button>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-end">
              <label className="flex-1 space-y-1 text-xs text-emerald-900/80">
                <span>Choose an update</span>
                <select
                  className="w-full rounded border border-emerald-200 px-3 py-2 bg-white"
                  value={selectedMaterialOption}
                  onChange={(e) => setSelectedMaterialOption(e.target.value)}
                >
                  {materialUpdateOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              {selectedMaterialOption === "Add item" && (
                <label className="flex-1 space-y-1 text-xs text-emerald-900/80">
                  <span>Custom label</span>
                  <input
                    className="w-full rounded border border-emerald-200 px-3 py-2 bg-white"
                    placeholder="e.g. Hardware arrival"
                    value={customMaterialLabel}
                    onChange={(e) => setCustomMaterialLabel(e.target.value)}
                  />
                </label>
              )}

              <label className="w-full md:w-44 space-y-1 text-xs text-emerald-900/80">
                <span>Target date</span>
                <input
                  type="date"
                  className="w-full rounded border border-emerald-200 px-3 py-2 bg-white"
                  value={materialDate}
                  onChange={(e) => setMaterialDate(e.target.value)}
                />
              </label>

              <button
                type="button"
                className="shrink-0 px-3 py-2 rounded bg-emerald-700 text-white hover:bg-emerald-600 text-xs"
                onClick={handleAddMaterialNote}
                disabled={saving}
              >
                Add
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {form.materialProductUpdates.length === 0 ? (
                <p className="text-xs text-emerald-900/70">
                  No notes yet. Add one to show a green "See Note" on the small card.
                </p>
              ) : (
                form.materialProductUpdates.map((update) => (
                  <div
                    key={update.id}
                    className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium">{update.label}</p>
                      <p className="text-[11px] text-emerald-700">Date: {update.date}</p>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-red-700 hover:text-red-900"
                      onClick={() => removeMaterialUpdate(update.id)}
                      disabled={saving || copying || deleting}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded border border-emerald-300 text-emerald-900 bg-white hover:bg-emerald-50"
                onClick={() => setShowNotesModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

export default JobDetailEditor;
