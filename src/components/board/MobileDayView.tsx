"use client";

import { useEffect, useMemo, useState } from "react";
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
        result.push({ iso, date: new Date(cursor), label: format(cursor, "EEE") });
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

  const areaOptions = useMemo(() => {
    const set = new Set<string>(["Bairnsdale", "Lakes", "Sale", "Melbourne", "Saphire Coast"]);
    Object.values(dayAreaLabels).forEach((a) => {
      if (a) set.add(a);
    });
    return Array.from(set);
  }, [dayAreaLabels]);

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
          onClick={() => setWeekOffset((v) => v + 1)}
        >
          Next week →
        </button>
        <span className="ml-auto text-[11px]">
          Week of {format(days[0].date, "d MMM")}
        </span>
      </div>

      <div
        className="flex flex-1 overflow-x-auto overflow-y-hidden px-3 pb-4 gap-3"
        style={{ WebkitOverflowScrolling: "touch" }}
        data-scroll-container="board"
      >
        {jobsByDay.map((d) => (
          <MobileDayCard
            key={d.iso}
            day={d}
            areaOptions={areaOptions}
            onSetArea={(iso, next) => setDayAreaLabel(iso, next)}
          />
        ))}
      </div>
    </div>
  );
}

function MobileDayCard({
  day,
  areaOptions,
  onSetArea
}: {
  day: { iso: string; date: Date; label: string; area?: string; jobs: any[] };
  areaOptions: string[];
  onSetArea: (iso: string, label: string | undefined) => void;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const isToday = day.iso === todayIso;
  const areaStyle = getAreaStyle(day.area, areaOptions);
  const missingCoordsCount = day.jobs.filter(
    (j) => j.clientAddressLat == null || j.clientAddressLng == null
  ).length;
  const [travel, setTravel] = useState<
    | {
        legs: Array<{ distanceMeters: number; durationSeconds: number }>;
        totalDistanceMeters: number;
        totalDurationSeconds: number;
        approximatedStopIds: string[];
        unresolvedStopIds: string[];
      }
    | null
  >(null);
  const [travelError, setTravelError] = useState<string | null>(null);
  const [travelLoading, setTravelLoading] = useState(false);
  const routeSignature = useMemo(
    () =>
      day.jobs
        .map(
          (j) =>
            `${j.id}:${j.clientAddressLat ?? ""},${j.clientAddressLng ?? ""}:${(
              j.clientAddress ?? ""
            )
              .trim()
              .toLowerCase()}`
        )
        .join("|"),
    [day.jobs]
  );

  useEffect(() => {
    if (day.jobs.length === 0) {
      setTravel(null);
      setTravelError(null);
      setTravelLoading(false);
      return;
    }
    if (missingCoordsCount > 0) {
      setTravel(null);
      setTravelError(null);
      setTravelLoading(false);
      return;
    }
    if (!day.area) {
      setTravel(null);
      setTravelError(null);
      setTravelLoading(false);
      return;
    }

    const stops = day.jobs.map((j) => ({
      id: j.id,
      address: j.clientAddress || j.jobAddress,
      lat: j.clientAddressLat,
      lng: j.clientAddressLng
    }));

    let cancelled = false;
    setTravelLoading(true);
    setTravelError(null);
    void (async () => {
      try {
        const res = await fetch("/api/route-metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: day.iso, area: day.area, stops })
        });
        const text = await res.text();
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(text || "Failed to load travel metrics");
        }
        const data = JSON.parse(text) as any;
        setTravel({
          legs: Array.isArray(data.legs) ? data.legs : [],
          totalDistanceMeters: Number(data.totalDistanceMeters ?? 0),
          totalDurationSeconds: Number(data.totalDurationSeconds ?? 0),
          approximatedStopIds: Array.isArray(data.approximatedStopIds)
            ? data.approximatedStopIds
            : [],
          unresolvedStopIds: Array.isArray(data.unresolvedStopIds)
            ? data.unresolvedStopIds
            : []
        });
      } catch (e: any) {
        if (!cancelled) setTravelError(e?.message ?? "Failed to load travel metrics");
        setTravel(null);
      } finally {
        if (!cancelled) setTravelLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [day.iso, day.area, routeSignature, missingCoordsCount]);

  function fmtDistance(meters: number) {
    const km = meters / 1000;
    if (km < 10) return `${km.toFixed(1)} km`;
    return `${Math.round(km)} km`;
  }

  function fmtDuration(seconds: number) {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }

  function renderLeg(labelText: string, legIndex: number) {
    if (!travel || !travel.legs?.[legIndex]) return null;
    const leg = travel.legs[legIndex];
    return (
      <div className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2">
        <div className="flex items-center justify-between text-[11px] text-amber-900/80">
          <span className="font-semibold">{labelText}</span>
          <span>
            {fmtDistance(leg.distanceMeters)} · {fmtDuration(leg.durationSeconds)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative min-w-[240px] flex-shrink-0 border border-amber-200/70 rounded-xl shadow-inner p-3 flex flex-col gap-2 ${
        isToday ? "bg-rose-50" : "bg-[#f6f0e7]/90"
      } ${areaStyle?.ring ?? ""}`}
    >
      {isToday && (
        <span
          className="absolute inset-y-0 left-0 w-1 bg-rose-500 rounded-l-xl"
          aria-hidden="true"
        />
      )}
      <div className="mb-1">
        <div className="text-center">
          <div className="text-base font-extrabold text-amber-900 leading-tight">
            {day.label}
          </div>
          <div className="text-sm font-semibold text-amber-900/90 leading-tight">
            {format(day.date, "d/MM")}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          {isToday ? (
            <span className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-white bg-rose-500 rounded-full shadow">
              Today
            </span>
          ) : (
            <span />
          )}
          <button
            className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
              areaStyle?.badge ??
              "border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100"
            }`}
            onClick={() => {
              const newLabel = prompt("Area label for this day:", day.area ?? "");
              if (newLabel !== null) {
                const trimmed = newLabel.trim();
                onSetArea(day.iso, trimmed || undefined);
              }
            }}
          >
            {day.area ? day.area : "Set area"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-white/70 px-3 py-2">
        <div className="text-xs font-semibold text-amber-900">Travel</div>
        {day.jobs.length === 0 ? (
          <div className="text-[11px] text-amber-900/70">No jobs.</div>
        ) : travelLoading ? (
          <div className="text-[11px] text-amber-900/70">Calculating…</div>
        ) : travelError ? (
          <div className="text-[11px] text-red-700">Travel error</div>
        ) : travel ? (
          <div className="space-y-1">
            {travel.unresolvedStopIds.length > 0 && (
              <div className="text-[11px] text-amber-900/70">
                Could not locate {travel.unresolvedStopIds.length} jobs (check Client address spelling)
              </div>
            )}
            {travel.approximatedStopIds.length > 0 && (
              <div className="text-[11px] text-amber-900/70">
                Using closest address for {travel.approximatedStopIds.length} jobs
              </div>
            )}
            <div className="flex justify-between text-[11px] font-semibold text-amber-900">
              <span>Total</span>
              <span>
                {fmtDistance(travel.totalDistanceMeters)} ·{" "}
                {fmtDuration(travel.totalDurationSeconds)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-amber-900/70">Set area to calculate.</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {day.jobs.length > 0 &&
        travel &&
        !travelLoading &&
        !travelError &&
        travel.unresolvedStopIds.length === 0
          ? renderLeg(`Leg 1: Base → ${day.jobs[0].clientName}`, 0)
          : null}
        {day.jobs.length === 0 ? (
          <p className="text-[11px] text-amber-900/70">No jobs for this day.</p>
        ) : (
          day.jobs.map((j, idx) => (
            <div key={j.id} className="space-y-2">
              <JobCard job={j} />
              {travel && !travelLoading && !travelError && travel.unresolvedStopIds.length === 0 ? (
                idx < day.jobs.length - 1
                  ? renderLeg(
                      `Leg ${idx + 2}: ${j.clientName} → ${day.jobs[idx + 1].clientName}`,
                      idx + 1
                    )
                  : renderLeg(`Leg ${idx + 2}: ${j.clientName} → Base`, idx + 1)
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function normalizeArea(area?: string | null) {
  return (area ?? "").trim().toLowerCase();
}

function getAreaStyle(label: string | undefined, order: string[]) {
  if (!label) return null;
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
  const idx = order.findIndex((a) => normalizeArea(a) === normalizeArea(label));
  const pos = idx >= 0 ? idx % ringPalette.length : 0;
  return { ring: ringPalette[pos], badge: badgePalette[pos] };
}
