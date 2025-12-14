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
      >
        {jobsByDay.map((d) => (
          <div
            key={d.iso}
            className={`min-w-[240px] flex-shrink-0 bg-[#f6f0e7]/90 border border-amber-200/70 rounded-xl shadow-inner p-3 flex flex-col gap-2 ${getAreaStyle(d.area)?.ring ?? ""}`}
          >
          <div className="text-xs font-semibold text-amber-900 flex items-center justify-between">
            <span>{d.label}</span>
              <button
                className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                  getAreaStyle(d.area)?.badge ??
                  "border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100"
                }`}
                onClick={() => {
                  const newLabel = prompt(
                    "Area label for this day (e.g. Bairnsdale):",
                    d.area ?? ""
                  );
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
        ))}
      </div>
    </div>
  );
}

function getAreaStyle(label?: string) {
  if (!label) return null;
  const normalized = label.toLowerCase().replace(/[^a-z]/g, "");

  const styleMap: Record<string, { ring: string; badge: string }> = {
    bairnsdale: {
      ring: "border-[12px] border-blue-400 shadow-lg",
      badge: "border-blue-200 text-blue-800 bg-blue-50/80 hover:bg-blue-100"
    },
    bdale: {
      ring: "border-[12px] border-blue-400 shadow-lg",
      badge: "border-blue-200 text-blue-800 bg-blue-50/80 hover:bg-blue-100"
    },
    lakesentrance: {
      ring: "border-[12px] border-green-400 shadow-lg",
      badge:
        "border-green-200 text-green-800 bg-green-50/80 hover:bg-green-100"
    },
    lakes: {
      ring: "border-[12px] border-green-400 shadow-lg",
      badge:
        "border-green-200 text-green-800 bg-green-50/80 hover:bg-green-100"
    },
    orbost: {
      ring: "border-[12px] border-orange-400 shadow-lg",
      badge:
        "border-orange-200 text-orange-800 bg-orange-50/80 hover:bg-orange-100"
    },
    saphirecoast: {
      ring: "border-[12px] border-yellow-300 shadow-lg",
      badge:
        "border-yellow-200 text-yellow-900 bg-yellow-50/80 hover:bg-yellow-100"
    },
    sapphirecoast: {
      ring: "border-[12px] border-yellow-300 shadow-lg",
      badge:
        "border-yellow-200 text-yellow-900 bg-yellow-50/80 hover:bg-yellow-100"
    },
    melbourne: {
      ring: "border-[12px] border-red-400 shadow-lg",
      badge: "border-red-200 text-red-800 bg-red-50/80 hover:bg-red-100"
    },
    melb: {
      ring: "border-[12px] border-red-400 shadow-lg",
      badge: "border-red-200 text-red-800 bg-red-50/80 hover:bg-red-100"
    },
    sale: {
      ring: "border-[12px] border-purple-400 shadow-lg",
      badge:
        "border-purple-200 text-purple-800 bg-purple-50/80 hover:bg-purple-100"
    }
  };

  return styleMap[normalized] ?? null;
}
