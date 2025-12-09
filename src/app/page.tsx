"use client";

import { useEffect } from "react";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import WeekBoard from "@/components/board/WeekBoard";
import MobileDayView from "@/components/board/MobileDayView";

export default function HomePage() {
  const { fetchJobs, loading, error, openAddJobForm } = useSchedulerStore();

  // only fetch once on mount
  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-4 py-3 bg-amber-700 text-amber-50 shadow-md flex justify-between items-center">
        <h1 className="text-lg font-semibold tracking-wide">
          LEGG Installers Scheduler
        </h1>
        <div className="space-x-2 text-sm">
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
      <section className="block md:hidden flex-1">
        <MobileDayView />
      </section>
    </main>
  );
}
