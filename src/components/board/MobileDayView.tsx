"use client";

import { useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { useRouter } from "next/navigation";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import { formatClientName } from "@/lib/formatClientName";
import type { Job } from "@/lib/types";

type Day = { label: string; date: Date; iso: string };

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

function buildWeekdays(weekOffset: number): Day[] {
  const start = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
  return Array.from({ length: 5 }, (_, i) => {
    const dayDate = addDays(start, i);
    return {
      label: format(dayDate, "EEE"),
      date: dayDate,
      iso: format(dayDate, "yyyy-MM-dd")
    };
  });
}

export default function MobileDayView() {
  const router = useRouter();
  const { jobs, dayAreaLabels } = useSchedulerStore();
  const [weekOffset, setWeekOffset] = useState(0);

  const days = useMemo(() => buildWeekdays(weekOffset), [weekOffset]);

  const jobsByDay = useMemo(() => {
    const map: Record<string, Job[]> = {};
    for (const day of days) {
      map[day.iso] = [];
    }
    for (const job of jobs) {
      if (!job.assignedDate) continue;
      if (job.deletedAt) continue;
      if (job.status === "cancelled" || job.status === "completed") continue;
      if (job.status !== "scheduled") continue;
      if (map[job.assignedDate]) {
        map[job.assignedDate].push(job);
      }
    }
    return map;
  }, [days, jobs]);

  const weekRange = useMemo(() => {
    if (days.length === 0) return "";
    const first = days[0].date;
    const last = days[days.length - 1].date;
    return `${format(first, "d MMM")} - ${format(last, "d MMM")}`;
  }, [days]);

  function openJob(jobId: string) {
    const returnTo =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search + window.location.hash
        : "";
    const href = returnTo
      ? `/jobs/${jobId}?return=${encodeURIComponent(returnTo)}`
      : `/jobs/${jobId}`;
    router.push(href);
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="app-surface px-3 py-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] text-slate-600">Week view</div>
          <div className="text-sm font-semibold text-slate-900">{weekRange}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary px-2 py-1 text-xs"
            onClick={() => setWeekOffset((v) => v - 1)}
          >
            Prev
          </button>
          <button
            type="button"
            className="btn-secondary px-2 py-1 text-xs"
            onClick={() => setWeekOffset(0)}
          >
            Today
          </button>
          <button
            type="button"
            className="btn-secondary px-2 py-1 text-xs"
            onClick={() => setWeekOffset((v) => v + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {days.map((day) => {
        const dayJobs = jobsByDay[day.iso] ?? [];
        const areaLabel = dayAreaLabels[day.iso];
        return (
          <section key={day.iso} className="app-surface px-3 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">{format(day.date, "EEEE")}</div>
                <div className="text-xs text-slate-600">{format(day.date, "d MMM")}</div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                {areaLabel ? <span className="badge-muted">{areaLabel}</span> : null}
                <span>Jobs {dayJobs.length}</span>
              </div>
            </div>
            <div className="space-y-2">
              {dayJobs.length === 0 ? (
                <p className="text-xs text-slate-500">No jobs scheduled</p>
              ) : (
                dayJobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    className="w-full text-left app-card px-3 py-2 flex items-start gap-3"
                    onClick={() => openJob(job.id)}
                  >
                    <span
                      className={`mt-1 inline-block w-2 h-2 rounded-full ${miniAreaColor(
                        job.areaTag
                      )}`}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-slate-900 truncate">
                        {formatClientName(job.clientName)}
                      </span>
                      <span className="block text-[11px] text-slate-600 truncate">
                        {job.jobAddress}
                      </span>
                      <span className="block text-[10px] text-slate-500 truncate">
                        {job.description}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
