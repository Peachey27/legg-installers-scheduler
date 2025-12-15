"use client";

import type { Job } from "@/lib/types";
import { format } from "date-fns";
import JobCard from "../jobs/JobCard";
import { Draggable } from "@hello-pangea/dnd";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import { useMemo } from "react";

interface Props {
  label: string;
  date: Date;
  isoDate: string;
  jobs: Job[];
}

const baseAreas = ["Bairnsdale", "Lakes", "Sale", "Melbourne", "Saphire Coast"];
const ringPalette = [
  "border-[12px] border-blue-400 shadow-lg",
  "border-[12px] border-green-400 shadow-lg",
  "border-[12px] border-red-400 shadow-lg",
  "border-[12px] border-purple-400 shadow-lg",
  "border-[12px] border-yellow-300 shadow-lg",
  "border-[12px] border-orange-400 shadow-lg",
  "border-[12px] border-emerald-400 shadow-lg",
  "border-[12px] border-amber-400 shadow-lg"
];
const badgePalette = [
  "border-blue-200 text-blue-800 bg-blue-50/80 hover:bg-blue-100",
  "border-green-200 text-green-800 bg-green-50/80 hover:bg-green-100",
  "border-red-200 text-red-800 bg-red-50/80 hover:bg-red-100",
  "border-purple-200 text-purple-800 bg-purple-50/80 hover:bg-purple-100",
  "border-yellow-200 text-yellow-900 bg-yellow-50/80 hover:bg-yellow-100",
  "border-orange-200 text-orange-800 bg-orange-50/80 hover:bg-orange-100",
  "border-emerald-200 text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100",
  "border-amber-200 text-amber-800 bg-amber-50/80 hover:bg-amber-100"
];

function normalizeArea(area?: string | null) {
  return (area ?? "").trim().toLowerCase();
}

function getDynamicStyle(area: string | undefined, order: string[]) {
  if (!area) return null;
  const idx = order.findIndex((a) => normalizeArea(a) === normalizeArea(area));
  const pos = idx >= 0 ? idx % ringPalette.length : 0;
  return { ring: ringPalette[pos], badge: badgePalette[pos] };
}

export default function DayColumn({ label, date, isoDate, jobs }: Props) {
  const { dayAreaLabels, setDayAreaLabel } = useSchedulerStore();
  const area = dayAreaLabels[isoDate];
  const todayIso = new Date().toISOString().slice(0, 10);
  const isToday = isoDate === todayIso;

  const areaOptions = useMemo(() => {
    const set = new Set<string>(baseAreas);
    Object.values(dayAreaLabels).forEach((a) => {
      if (a) set.add(a);
    });
    if (area) set.add(area);
    return Array.from(set);
  }, [area, dayAreaLabels]);

  const areaStyle = getDynamicStyle(area, areaOptions);

  const totalHours = jobs.reduce(
    (sum, j) => sum + (j.estimatedDurationHours ?? 0),
    0
  );

  return (
    <div
      className={`relative h-full rounded-2xl border border-amber-200/70 shadow-inner flex flex-col p-3 transition-shadow ${
        isToday ? "bg-rose-50" : "bg-[#f6f0e7]/90"
      } ${areaStyle?.ring ?? ""}`}
    >
      {isToday && (
        <span
          className="absolute inset-y-0 left-0 w-1 bg-rose-500 rounded-l-2xl"
          aria-hidden="true"
        />
      )}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-semibold text-amber-900">
            {label} {format(date, "d/MM")}
          </div>
          {isToday && (
            <span className="inline-flex items-center px-2 py-1 mt-1 text-[11px] font-semibold text-white bg-rose-500 rounded-full shadow">
              Today
            </span>
          )}
          <div className="text-xs text-amber-900/70">
            Total hours: {totalHours.toFixed(1)}h
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
              areaStyle?.badge ??
              "border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100"
            }`}
            value={areaOptions.find((a) => normalizeArea(a) === normalizeArea(area)) ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "__custom") {
                const custom = prompt("New area name:")?.trim();
                if (custom) {
                  setDayAreaLabel(isoDate, custom);
                }
              } else {
                setDayAreaLabel(isoDate, val || undefined);
              }
            }}
          >
            <option value="">Set area</option>
            {areaOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
            <option value="__custom">Add new area</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {jobs.map((job, index) => (
          <Draggable draggableId={job.id} index={index} key={job.id}>
            {(provided) => (
              <div
                key={job.id}
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                <JobCard job={job} />
              </div>
            )}
          </Draggable>
        ))}
      </div>
    </div>
  );
}
