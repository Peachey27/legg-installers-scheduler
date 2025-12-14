"use client";

import { useMemo } from "react";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import { startOfWeek, addDays, format } from "date-fns";
import JobCard from "../jobs/JobCard";

export default function MobileDayView() {
  const { jobs } = useSchedulerStore();
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const days = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(weekStart, i);
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
    <div className="flex h-[calc(100vh-56px)] overflow-x-auto overflow-y-hidden px-3 pb-3 gap-3">
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
  );
}
