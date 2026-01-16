"use client";

import type { Job } from "@/lib/types";
import { format } from "date-fns";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSchedulerStore } from "@/store/useSchedulerStore";

interface Props {
  label: string;
  date: Date;
  isoDate: string;
  jobs: Job[];
  listId: string;
  areaLabel?: string;
  placeholder?: ReactNode;
}

const baseAreas = ["Bairnsdale", "Lakes", "Sale", "Melbourne", "Saphire Coast"];
const ringPalette = [
  "border-[8px] border-blue-400 shadow-sm",
  "border-[8px] border-emerald-400 shadow-sm",
  "border-[8px] border-violet-400 shadow-sm",
  "border-[8px] border-red-400 shadow-sm",
  "border-[8px] border-amber-300 shadow-sm",
  "border-[8px] border-orange-400 shadow-sm",
  "border-[8px] border-teal-400 shadow-sm",
  "border-[8px] border-cyan-400 shadow-sm"
];

function normalizeArea(area?: string | null) {
  return (area ?? "").trim().toLowerCase();
}

function getAreaStyle(area: string | undefined, order: string[]) {
  if (!area) return null;
  const idx = order.findIndex((a) => normalizeArea(a) === normalizeArea(area));
  const pos = idx >= 0 ? idx % ringPalette.length : 0;
  return { ring: ringPalette[pos] };
}

function miniAreaColor(area: Job["areaTag"]) {
  const normalized = area?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  const map: Record<string, string> = {
    bairnsdale: "bg-blue-500",
    bdale: "bg-blue-500",
    lakes: "bg-green-500",
    lakesentrance: "bg-green-500",
    sale: "bg-purple-500",
    melbourne: "bg-red-500",
    melb: "bg-red-500",
    orbost: "bg-orange-500",
    saphirecoast: "bg-yellow-400",
    sapphirecoast: "bg-yellow-400"
  };
  return map[normalized] ?? "bg-slate-400";
}

function surnameOnly(name: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "No name";
  if (parts.length === 1) return parts[0];
  return parts[parts.length - 1];
}

function SortableCompactJobRow({
  job,
  listId,
  onOpen
}: {
  job: Job;
  listId: string;
  onOpen: () => void;
}) {
  const { moveJob } = useSchedulerStore();
  const isBacklog = job.status === "backlog" && !job.assignedDate;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: job.id,
    data: { type: "job", job, listId }
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 999 : undefined,
        boxShadow: isDragging ? "0 8px 18px rgba(15, 23, 42, 0.18)" : undefined
      }}
      className={`rounded-md border border-[var(--app-border)] bg-white px-2 py-1 text-[10px] leading-tight shadow-sm flex items-center gap-2 cursor-pointer hover:bg-slate-50 ${
        isDragging ? "ring-2 ring-blue-300" : ""
      }`}
      onDoubleClick={onOpen}
      title="Double-click to open job"
    >
      <span className={`inline-block w-2 h-2 rounded-full ${miniAreaColor(job.areaTag)}`} />
      <span className="font-semibold text-slate-900 truncate flex-1">
        {surnameOnly(job.clientName)}
      </span>
      {!isBacklog ? (
        <button
          type="button"
          className="text-[9px] px-1 py-0.5 rounded border border-[var(--app-border-strong)] bg-white hover:bg-slate-50"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            void moveJob(job.id, null);
          }}
        >
          Backlog
        </button>
      ) : null}
    </div>
  );
}

export default function CompactDayColumn({
  label,
  date,
  isoDate,
  jobs,
  listId,
  areaLabel,
  placeholder
}: Props) {
  const router = useRouter();
  const todayIso = new Date().toISOString().slice(0, 10);
  const isToday = isoDate === todayIso;
  const areaOptions = Array.from(new Set([...baseAreas, areaLabel].filter(Boolean))) as string[];
  const areaStyle = getAreaStyle(areaLabel, areaOptions);

  return (
    <div
      className={`relative h-full rounded-xl border border-[var(--app-border)] shadow-[var(--app-shadow-soft)] flex flex-col p-1.5 bg-[var(--app-surface-muted)] text-[11px] ${
        isToday ? "ring-2 ring-blue-300" : ""
      } ${areaStyle?.ring ?? ""}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-900">{label}</div>
          <div className="text-[10px] text-slate-600">{format(date, "d MMM")}</div>
        </div>
        <div className="text-[10px] text-slate-600">Jobs {jobs.length}</div>
      </div>

      <div className="mt-1 space-y-1 overflow-y-auto max-h-[120px] pr-0.5">
        {jobs.length === 0 ? (
          <p className="text-[10px] text-slate-500">No jobs</p>
        ) : (
          jobs.map((job) => (
            <SortableCompactJobRow
              key={job.id}
              job={job}
              listId={listId}
              onOpen={() => {
                const returnTo =
                  typeof window !== "undefined"
                    ? window.location.pathname + window.location.search + window.location.hash
                    : "";
                const href = returnTo
                  ? `/jobs/${job.id}?return=${encodeURIComponent(returnTo)}`
                  : `/jobs/${job.id}`;
                router.push(href);
              }}
            />
          ))
        )}
        {placeholder}
      </div>
    </div>
  );
}
