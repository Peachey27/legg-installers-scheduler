"use client";

import type { Job } from "@/lib/types";
import { format } from "date-fns";
import { Draggable } from "@hello-pangea/dnd";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

interface Props {
  label: string;
  date: Date;
  isoDate: string;
  jobs: Job[];
  areaLabel?: string;
  placeholder?: ReactNode;
}

const baseAreas = ["Bairnsdale", "Lakes", "Sale", "Melbourne", "Saphire Coast"];
const ringPalette = [
  "border-[8px] border-blue-400 shadow",
  "border-[8px] border-green-400 shadow",
  "border-[8px] border-red-400 shadow",
  "border-[8px] border-purple-400 shadow",
  "border-[8px] border-yellow-300 shadow",
  "border-[8px] border-orange-400 shadow",
  "border-[8px] border-emerald-400 shadow",
  "border-[8px] border-amber-400 shadow"
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

export default function CompactDayColumn({
  label,
  date,
  isoDate,
  jobs,
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
      className={`relative h-full rounded-xl border border-amber-200/70 shadow-inner flex flex-col p-1.5 bg-[#f6f0e7]/90 text-[11px] ${
        isToday ? "ring-2 ring-rose-400" : ""
      } ${areaStyle?.ring ?? ""}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-amber-900">{label}</div>
          <div className="text-[10px] text-amber-700">{format(date, "d MMM")}</div>
        </div>
        <div className="text-[10px] text-amber-800">Jobs {jobs.length}</div>
      </div>

      <div className="mt-1 space-y-1 overflow-y-auto max-h-[120px] pr-0.5">
        {jobs.length === 0 ? (
          <p className="text-[10px] text-amber-800/70">No jobs</p>
        ) : (
          jobs.map((job, index) => (
            <Draggable draggableId={job.id} index={index} key={job.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className="rounded-md border border-amber-200 bg-white px-2 py-1 text-[10px] leading-tight shadow-sm flex items-center gap-2 cursor-pointer hover:bg-amber-50"
                  onDoubleClick={() => {
                    const returnTo =
                      typeof window !== "undefined"
                        ? window.location.pathname + window.location.search + window.location.hash
                        : "";
                    const href = returnTo
                      ? `/jobs/${job.id}?return=${encodeURIComponent(returnTo)}`
                      : `/jobs/${job.id}`;
                    router.push(href);
                  }}
                  title="Double-click to open job"
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${miniAreaColor(job.areaTag)}`} />
                  <span className="font-semibold text-amber-900 truncate flex-1">
                    {surnameOnly(job.clientName)}
                  </span>
                </div>
              )}
            </Draggable>
          ))
        )}
        {placeholder}
      </div>
    </div>
  );
}
