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

  const [activeIso, setActiveIso] = useState(days[0].iso);

  // Auto-select the first day that has jobs, so users immediately see bookings.
  useEffect(() => {
    const firstWithJobs = days.find((d) =>
      jobs.some((j) => j.assignedDate === d.iso && j.status !== "cancelled")
    );
    if (firstWithJobs && firstWithJobs.iso !== activeIso) {
      setActiveIso(firstWithJobs.iso);
    }
  }, [days, jobs, activeIso]);

  const filtered = jobs.filter(
    (j) => j.assignedDate === activeIso && j.status !== "cancelled"
  );

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <div className="flex overflow-x-auto border-b border-amber-200 bg-amber-50">
        {days.map((d) => (
          <button
            key={d.iso}
            onClick={() => setActiveIso(d.iso)}
            className={`px-3 py-2 text-xs flex-shrink-0 ${
              d.iso === activeIso
                ? "border-b-2 border-amber-600 text-amber-900 font-semibold"
                : "text-amber-800/70"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 && (
          <p className="text-xs text-amber-900/70">No jobs for this day.</p>
        )}
        {filtered.map((j) => (
          <JobCard job={j} key={j.id} />
        ))}
      </div>
    </div>
  );
}
