"use client";

import { useEffect, useMemo, useState } from "react";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import WeekBoard from "@/components/board/WeekBoard";
import MobileDayView from "@/components/board/MobileDayView";

export default function HomePage() {
  const { fetchJobs, fetchDayAreaLabels, loading, error, openAddJobForm, jobs } =
    useSchedulerStore();
  const [search, setSearch] = useState("");

  // only fetch once on mount
  useEffect(() => {
    fetchJobs();
    fetchDayAreaLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return jobs
      .filter((j) => !j.deletedAt)
      .filter((j) => {
        return (
          j.clientName.toLowerCase().includes(q) ||
          j.jobAddress.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          (j.areaTag ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [jobs, search]);

  function scrollToJob(jobId: string) {
    const el =
      document.querySelector<HTMLElement>(`[data-job-id="${jobId}"]`) ??
      document.getElementById(`job-${jobId}`);
    if (el) {
      // Scroll nearest horizontal container if present
      const scrollContainer = el.closest<HTMLElement>("[data-scroll-container]");
      if (scrollContainer) {
        const rect = el.getBoundingClientRect();
        const parentRect = scrollContainer.getBoundingClientRect();
        const offsetLeft = rect.left - parentRect.left + scrollContainer.scrollLeft;
        const targetLeft = offsetLeft - parentRect.width / 2 + rect.width / 2;
        scrollContainer.scrollTo({ left: targetLeft, behavior: "smooth" });
      }
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      el.classList.add("ring-4", "ring-amber-400");
      window.setTimeout(() => el.classList.remove("ring-4", "ring-amber-400"), 1800);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-4 py-3 bg-amber-700 text-amber-50 shadow-md flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-lg font-semibold tracking-wide">
          LEGG Installers Scheduler
        </h1>
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="relative w-full max-w-sm">
            <input
              type="search"
              placeholder="Search jobs (includes archived)..."
              className="w-full rounded-lg px-3 py-2 text-slate-900 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="absolute mt-1 w-full bg-white text-slate-900 rounded-lg shadow-lg border border-slate-200 z-20">
                {searchResults.map((j) => (
                  <button
                    key={j.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-b last:border-b-0 border-slate-100"
                    onClick={() => {
                      setSearch("");
                      scrollToJob(j.id);
                    }}
                  >
                    <div className="font-semibold">{j.clientName}</div>
                    <div className="text-xs text-slate-600 truncate">
                      {j.jobAddress}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {j.status} • {j.areaTag}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400"
            onClick={openAddJobForm}
          >
            + Add job
          </button>
        </div>
      </header>

      {loading && <p className="p-4 text-sm">Loading jobs…</p>}
      {error && !loading && (
        <p className="p-4 text-sm text-red-700">{error}</p>
      )}

      {/* Desktop corkboard */}
      <section className="hidden md:block flex-1 overflow-x-auto">
        <WeekBoard />
      </section>

      {/* Mobile view-only list */}
      <section className="block md:hidden flex-1 mobile-scale">
        <MobileDayView />
      </section>
    </main>
  );
}
