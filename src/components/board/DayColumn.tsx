"use client";

import type { Job } from "@/lib/types";
import { addDays, format } from "date-fns";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import { useMemo } from "react";
import DayTravelAndJobs from "./DayTravelAndJobs";

interface Props {
  label: string;
  date: Date;
  isoDate: string;
  jobs: Job[];
  listId: string;
}

const baseAreas = ["Bairnsdale", "Lakes", "Sale", "Melbourne", "Saphire Coast"];
const ringPalette = [
  "border-[10px] border-sky-400 shadow-sm",
  "border-[10px] border-emerald-400 shadow-sm",
  "border-[10px] border-rose-400 shadow-sm",
  "border-[10px] border-violet-400 shadow-sm",
  "border-[10px] border-amber-300 shadow-sm",
  "border-[10px] border-orange-400 shadow-sm",
  "border-[10px] border-teal-400 shadow-sm",
  "border-[10px] border-cyan-400 shadow-sm"
];
const badgePalette = [
  "border-sky-200 text-sky-800 bg-sky-50 hover:bg-sky-100",
  "border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100",
  "border-rose-200 text-rose-800 bg-rose-50 hover:bg-rose-100",
  "border-violet-200 text-violet-800 bg-violet-50 hover:bg-violet-100",
  "border-amber-200 text-amber-900 bg-amber-50 hover:bg-amber-100",
  "border-orange-200 text-orange-800 bg-orange-50 hover:bg-orange-100",
  "border-teal-200 text-teal-800 bg-teal-50 hover:bg-teal-100",
  "border-cyan-200 text-cyan-800 bg-cyan-50 hover:bg-cyan-100"
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

function getTodayIsoTz() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  const date = new Date(`${fmt}T00:00:00Z`);
  const dow = date.getUTCDay();
  // Align with weekday-only columns: bump Sunday to Monday, Saturday to Friday.
  const adjusted =
    dow === 0 ? addDays(date, 1) : dow === 6 ? addDays(date, -1) : date;
  return adjusted.toISOString().slice(0, 10);
}

export default function DayColumn({ label, date, isoDate, jobs, listId }: Props) {
  const { dayAreaLabels, setDayAreaLabel } = useSchedulerStore();
  const area = dayAreaLabels[isoDate];
  const todayIso = getTodayIsoTz();
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
      className={`relative h-full rounded-2xl border border-[var(--app-border)] shadow-[var(--app-shadow-soft)] flex flex-col p-3 transition-shadow ${
        isToday ? "bg-blue-50/70" : "bg-[var(--app-surface-muted)]"
      } ${areaStyle?.ring ?? ""}`}
    >
      {isToday && (
        <span
          className="absolute inset-y-0 left-0 w-1 bg-blue-500 rounded-l-2xl"
          aria-hidden="true"
        />
      )}
      <div className="mb-2">
        <div className="text-center">
          <div className="text-lg font-extrabold text-slate-900 leading-tight">
            {label}
          </div>
          <div className="text-base font-semibold text-slate-700 leading-tight">
            {format(date, "d/MM")}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isToday && (
              <span className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-white bg-blue-500 rounded-full shadow">
                Today
              </span>
            )}
            <div className="text-xs text-slate-600">
              Total hours: {totalHours.toFixed(1)}h
            </div>
          </div>

          <select
            className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
              areaStyle?.badge ??
              "border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
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

      <DayTravelAndJobs jobs={jobs} listId={listId} isoDate={isoDate} />
    </div>
  );
}


