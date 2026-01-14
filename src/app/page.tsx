"use client";

import { useEffect, useMemo, useState } from "react";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import WeekBoard from "@/components/board/WeekBoard";
import MobileDayView from "@/components/board/MobileDayView";
import FourWeekBoard from "@/components/board/FourWeekBoard";
import { useRouter } from "next/navigation";
import { formatClientName } from "@/lib/formatClientName";

export default function HomePage() {
  const router = useRouter();
  const { fetchJobs, fetchDayAreaLabels, loading, error, openAddJobForm, jobs } =
    useSchedulerStore();
  const [search, setSearch] = useState("");
  const [desktopView, setDesktopView] = useState<"week" | "four-week">("week");
  const [weekOffset, setWeekOffset] = useState(0);
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
    const isMobile =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(max-width: 767px)")?.matches ?? false);
    if (isMobile) {
      router.push(`/jobs/${jobId}`);
      return;
    }

    const el =
      document.querySelector<HTMLElement>(`[data-job-id="${jobId}"]`) ??
      document.getElementById(`job-${jobId}`);
    if (el) {
      // If the element exists but is inside a hidden desktop-only section, open the job instead.
      if (el.offsetParent === null) {
        router.push(`/jobs/${jobId}`);
        return;
      }
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
      el.classList.add("ring-4", "ring-blue-400");
      window.setTimeout(() => el.classList.remove("ring-4", "ring-blue-400"), 1800);
    } else {
      // Mobile view doesn't show backlog; open the job directly so a due date can be assigned.
      router.push(`/jobs/${jobId}`);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-4 py-3 bg-[var(--app-surface)] text-slate-900 shadow-[var(--app-shadow-soft)] border-b border-[var(--app-border)] flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base md:text-lg font-semibold tracking-tight">
            LEGG Installers Scheduler
          </h1>
          <div className="hidden md:flex flex-wrap items-center gap-2">
            {legendAreas.map((area) => {
              const style = getAreaStyle(area);
              return (
                <span
                  key={area}
                  className={`inline-flex items-center px-2 py-1 text-[11px] rounded-full border ${style?.badge ?? "badge-muted"}`}
                >
                  {area}
                </span>
              );
            })}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="relative w-full max-w-sm">
            <input
              type="search"
              placeholder="Search jobs (includes archived)..."
              className="app-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="absolute mt-2 w-full app-surface z-20">
                {searchResults.map((j) => (
                  <button
                    key={j.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-b last:border-b-0 border-slate-100"
                    onClick={() => {
                      setSearch("");
                      scrollToJob(j.id);
                    }}
                  >
                    <div className="font-semibold">{formatClientName(j.clientName)}</div>
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
            className="btn-primary min-w-[120px] whitespace-nowrap"
            onClick={openAddJobForm}
          >
            + Add job
          </button>
          <form action="/api/logout" method="POST">
            <button
              type="submit"
              className="btn-secondary"
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
      <section className="hidden md:flex flex-1 flex-col overflow-x-auto">
        <div className="flex items-center gap-2 px-4 pt-3 text-sm text-slate-700 flex-wrap md:flex-nowrap">
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1 rounded-xl border text-sm ${
                desktopView === "week"
                  ? "bg-[var(--app-accent)] text-white border-[var(--app-accent)]"
                  : "border-[var(--app-border-strong)] bg-white hover:bg-slate-50"
              }`}
              onClick={() => setDesktopView("week")}
            >
              Week view
            </button>
            <button
              className={`px-3 py-1 rounded-xl border text-sm ${
                desktopView === "four-week"
                  ? "bg-[var(--app-accent)] text-white border-[var(--app-accent)]"
                  : "border-[var(--app-border-strong)] bg-white hover:bg-slate-50"
              }`}
              onClick={() => setDesktopView("four-week")}
            >
              View 4 weeks
            </button>
          </div>
          <div className="flex items-center gap-2 md:ml-3">
            <button
              className="btn-secondary px-3 py-1 text-xs"
              onClick={() => setWeekOffset((v) => v - 1)}
            >
              Prev week
            </button>
            <button
              className="btn-secondary px-3 py-1 text-xs"
              onClick={() => setWeekOffset(0)}
            >
              Today
            </button>
            <button
              className="btn-secondary px-3 py-1 text-xs"
              onClick={() => setWeekOffset((v) => v + 1)}
            >
              Next week
            </button>
          </div>
        </div>

        {desktopView === "four-week" ? (
          <FourWeekBoard
            weekOffset={weekOffset}
            onWeekOffsetChange={setWeekOffset}
            onZoomToWeek={(offset) => {
              setWeekOffset(offset);
              setDesktopView("week");
            }}
          />
        ) : (
          <WeekBoard weekOffset={weekOffset} onWeekOffsetChange={setWeekOffset} />
        )}
      </section>

      {/* Mobile view-only list */}
      <section className="block md:hidden flex-1">
        <MobileDayView />
      </section>
    </main>
  );
}
