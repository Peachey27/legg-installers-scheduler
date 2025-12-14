"use client";

import { useMemo, useState } from "react";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import { startOfWeek, addDays, addWeeks, format } from "date-fns";
import JobCard from "../jobs/JobCard";

export default function MobileDayView() {
  const { jobs } = useSchedulerStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });

  const days = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => {
        const d = addDays(weekStart, i); // Mon–Fri only
        const iso = format(d, "yyyy-MM-dd");
        return { iso, date: d, label: format(d, "EEE d/MM") };
      }),
    [weekStart]
  );

  const jobsByDay = useMemo(
    () =>
      days.map((d) => ({
        ...d,
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
          onClick={() => setWeekOffset((v) => v + 4)}
        >
          +4 weeks →
        </button>
        <span className="ml-auto text-[11px]">
          Week of {format(weekStart, "d MMM")}
        </span>
      </div>

      <div
        className="flex flex-1 overflow-x-auto overflow-y-hidden px-3 pb-4 gap-3"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {jobsByDay.map((d) => (
          <div
            key={d.iso}
            className="min-w-[240px] flex-shrink-0 bg-[#f6f0e7]/90 border border-amber-200/70 rounded-xl shadow-inner p-3 flex flex-col gap-2"
          >
            <div className="text-xs font-semibold text-amber-900 flex items-center justify-between">
              <span>{d.label}</span>
              <span className="text-amber-800/70">
                {d.jobs.length} job{d.jobs.length === 1 ? "" : "s"}
              </span>
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
