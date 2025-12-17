"use client";

import { useEffect, useMemo, useState } from "react";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import WeekBoard from "@/components/board/WeekBoard";
import MobileDayView from "@/components/board/MobileDayView";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const { fetchJobs, fetchDayAreaLabels, loading, error, openAddJobForm, jobs } =
    useSchedulerStore();
  const [search, setSearch] = useState("");
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

  const legendAreas = useMemo(() => {
    const set = new Set<string>(baseAreas);
    // include any day area labels to lock in colors
    // We rely on useSchedulerStore's dayAreaLabels, so pull from there via jobs (already in state)
    // We don't have direct dayAreaLabels here; reuse jobs' areaTag? To match column logic, include any areaTag present.
    jobs.forEach((j) => {
      if (j.areaTag) set.add(j.areaTag);
    });
    return Array.from(set);
  }, [jobs]);

  function normalizeArea(area?: string | null) {
    return (area ?? "").trim().toLowerCase();
  }

  function getAreaStyle(area: string | undefined) {
    if (!area) return null;
    const idx = legendAreas.findIndex((a) => normalizeArea(a) === normalizeArea(area));
    const pos = idx >= 0 ? idx % ringPalette.length : 0;
    return { ring: ringPalette[pos], badge: badgePalette[pos] };
  }

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
    } else {
      // Mobile view doesn't show backlog; open the job directly so a due date can be assigned.
      router.push(`/jobs/${jobId}`);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-4 py-3 bg-amber-500 text-amber-50 shadow-md flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-wide">
            LEGG Installers Scheduler
          </h1>
          <div className="hidden md:flex flex-wrap items-center gap-2">
            {legendAreas.map((area) => {
              const style = getAreaStyle(area);
              return (
                <span
                  key={area}
                  className={`inline-flex items-center px-2 py-1 text-[11px] rounded-full border ${style?.badge ?? "border-amber-200 bg-amber-50 text-amber-800"}`}
                >
                  {area}
                </span>
              );
            })}
          </div>
        </div>
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
            className="px-5 py-2 min-w-[120px] whitespace-nowrap rounded-lg bg-amber-500 hover:bg-amber-400 border border-red-600"
            onClick={openAddJobForm}
          >
            + Add job
          </button>
          <form action="/api/logout" method="POST">
            <button
              type="submit"
              className="px-3 py-1 rounded-lg border border-red-600 text-red-700 hover:bg-red-50"
            >
              Logout
            </button>
          </form>
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
