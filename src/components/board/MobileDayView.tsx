"use client";

import { useState } from "react";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import { startOfWeek, addDays, format } from "date-fns";
import JobCard from "../jobs/JobCard";

export default function MobileDayView() {
  const { jobs } = useSchedulerStore();
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(weekStart, i);
    const iso = format(d, "yyyy-MM-dd");
    return { iso, date: d, label: format(d, "EEE d/MM") };
  });

  // Group jobs by day for stacked mobile view
  const jobsByDay = days.map((d) => ({
    ...d,
    jobs: jobs
      .filter(
        (j) =>
          j.assignedDate === d.iso &&
          j.status !== "cancelled"
      )
      .sort((a, b) => (a.clientName || "").localeCompare(b.clientName || ""))
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-y-auto p-3 space-y-4">
      {jobsByDay.map((d) => (
        <div key={d.iso} className="space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-900/80">
            <span className="font-semibold text-amber-900">{d.label}</span>
            <span>{d.jobs.length} job{d.jobs.length === 1 ? "" : "s"}</span>
          </div>
          {d.jobs.length === 0 ? (
            <p className="text-xs text-amber-900/60">No jobs for this day.</p>
          ) : (
            <div className="space-y-2">
              {d.jobs.map((j) => (
                <JobCard job={j} key={j.id} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
