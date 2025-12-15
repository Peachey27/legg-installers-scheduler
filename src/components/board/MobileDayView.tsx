"use client";

import { useMemo, useState } from "react";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import { addDays, addWeeks, format } from "date-fns";
import JobCard from "../jobs/JobCard";

export default function MobileDayView() {
  const { jobs, dayAreaLabels, setDayAreaLabel } = useSchedulerStore();
  const [weekOffset, setWeekOffset] = useState(0); // blocks of 5 weekdays
  const today = new Date();
  const startDate = addWeeks(today, weekOffset);

  const days = useMemo(() => {
    const result: { iso: string; date: Date; label: string }[] = [];
    let cursor = startDate;
    while (result.length < 5) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) {
        const iso = format(cursor, "yyyy-MM-dd");
        result.push({ iso, date: new Date(cursor), label: format(cursor, "EEE d/MM") });
      }
      cursor = addDays(cursor, 1);
    }
    return result;
  }, [startDate]);

  const jobsByDay = useMemo(
    () =>
      days.map((d) => ({
        ...d,
        area: dayAreaLabels[d.iso],
        jobs: jobs
          .filter(
            (j) =>
              j.assignedDate === d.iso &&
              j.status !== "cancelled" &&
              j.status !== "completed" &&
              !j.deletedAt
          )
          .sort((a, b) => (a.clientName || "").localeCompare(b.clientName || ""))
      })),
    [days, jobs]
  );

  const areaOptions = useMemo(() => {
    const set = new Set<string>(["Bairnsdale", "Lakes", "Sale", "Melbourne", "Saphire Coast"]);
    Object.values(dayAreaLabels).forEach((a) => {
      if (a) set.add(a);
    });
    return Array.from(set);
  }, [dayAreaLabels]);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-amber-900/80">
        <button
          className="px-2 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100"
          onClick={() => setWeekOffset((v) => v - 1)}
        >
          ← Prev week
        </button>
        <button
          className="px-2 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100"
          onClick={() => setWeekOffset(0)}
        >
          Today
        </button>
        <button
          className="px-2 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100"
          onClick={() => setWeekOffset((v) => v + 4)}
        >
          +4 weeks →
        </button>
        <span className="ml-auto text-[11px]">
          Week of {format(days[0].date, "d MMM")}
        </span>
      </div>

      <div
        className="flex flex-1 overflow-x-auto overflow-y-hidden px-3 pb-4 gap-3"
        style={{ WebkitOverflowScrolling: "touch" }}
        data-scroll-container="board"
      >
        {jobsByDay.map((d) => {
          const todayIso = new Date().toISOString().slice(0, 10);
          const isToday = d.iso === todayIso;
          const areaStyle = getAreaStyle(d.area, areaOptions);
          return (
            <div
              key={d.iso}
              className={`relative min-w-[240px] flex-shrink-0 border border-amber-200/70 rounded-xl shadow-inner p-3 flex flex-col gap-2 ${
                isToday ? "bg-rose-50" : "bg-[#f6f0e7]/90"
              } ${areaStyle?.ring ?? ""}`}
            >
              {isToday && (
                <span
                  className="absolute inset-y-0 left-0 w-1 bg-rose-500 rounded-l-xl"
                  aria-hidden="true"
                />
              )}
              <div className="text-xs font-semibold text-amber-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {isToday && (
                    <span className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-white bg-rose-500 rounded-full shadow">
                      Today
                    </span>
                  )}
                  {d.label}
                </span>
                <button
                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                    areaStyle?.badge ??
                    "border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100"
                  }`}
                  onClick={() => {
                    const newLabel = prompt("Area label for this day:", d.area ?? "");
                    if (newLabel !== null) {
                      const trimmed = newLabel.trim();
                      setDayAreaLabel(d.iso, trimmed || undefined);
                    }
                  }}
                >
                  {d.area ? d.area : "Set area"}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {d.jobs.length === 0 ? (
                  <p className="text-[11px] text-amber-900/70">No jobs for this day.</p>
                ) : (
                  d.jobs.map((j) => <JobCard job={j} key={j.id} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function normalizeArea(area?: string | null) {
  return (area ?? "").trim().toLowerCase();
}

function getAreaStyle(label: string | undefined, order: string[]) {
  if (!label) return null;
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
  const idx = order.findIndex((a) => normalizeArea(a) === normalizeArea(label));
  const pos = idx >= 0 ? idx % ringPalette.length : 0;
  return { ring: ringPalette[pos], badge: badgePalette[pos] };
}
