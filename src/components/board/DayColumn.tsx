"use client";

import type { Job } from "@/lib/types";
import { format } from "date-fns";
import JobCard from "../jobs/JobCard";
import { Draggable } from "@hello-pangea/dnd";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import { useEffect, useMemo, useState } from "react";

interface Props {
  label: string;
  date: Date;
  isoDate: string;
  jobs: Job[];
}

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

function normalizeArea(area?: string | null) {
  return (area ?? "").trim().toLowerCase();
}

function getDynamicStyle(area: string | undefined, order: string[]) {
  if (!area) return null;
  const idx = order.findIndex((a) => normalizeArea(a) === normalizeArea(area));
  const pos = idx >= 0 ? idx % ringPalette.length : 0;
  return { ring: ringPalette[pos], badge: badgePalette[pos] };
}

export default function DayColumn({ label, date, isoDate, jobs }: Props) {
  const { dayAreaLabels, setDayAreaLabel } = useSchedulerStore();
  const area = dayAreaLabels[isoDate];
  const todayIso = new Date().toISOString().slice(0, 10);
  const isToday = isoDate === todayIso;
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

  const areaOptions = useMemo(() => {
    const set = new Set<string>(baseAreas);
    Object.values(dayAreaLabels).forEach((a) => {
      if (a) set.add(a);
    });
    if (area) set.add(area);
    return Array.from(set);
  }, [area, dayAreaLabels]);

  const areaStyle = getDynamicStyle(area, areaOptions);

  const totalHours = jobs.reduce(
    (sum, j) => sum + (j.estimatedDurationHours ?? 0),
    0
  );

  const missingCoordsCount = jobs.filter(
    (j) => j.clientAddressLat == null || j.clientAddressLng == null
  ).length;

  const routeSignature = useMemo(
    () =>
      jobs
        .map(
          (j) =>
            `${j.id}:${j.clientAddressLat ?? ""},${j.clientAddressLng ?? ""}:${(
              j.clientAddress ?? ""
            )
              .trim()
              .toLowerCase()}`
        )
        .join("|"),
    [jobs]
  );

  useEffect(() => {
    if (jobs.length === 0) {
      setTravel(null);
      setTravelError(null);
      setTravelLoading(false);
      return;
    }

    if (!area) {
      setTravel(null);
      setTravelError(null);
      setTravelLoading(false);
      return;
    }

    const stops = jobs.map((j) => ({
      id: j.id,
      // Prefer client address coords, but fall back to job address text for geocoding if needed.
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
          body: JSON.stringify({ date: isoDate, area, stops })
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
  }, [isoDate, area, routeSignature, missingCoordsCount]);

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
      className={`relative h-full rounded-2xl border border-amber-200/70 shadow-inner flex flex-col p-3 transition-shadow ${
        isToday ? "bg-rose-50" : "bg-[#f6f0e7]/90"
      } ${areaStyle?.ring ?? ""}`}
    >
      {isToday && (
        <span
          className="absolute inset-y-0 left-0 w-1 bg-rose-500 rounded-l-2xl"
          aria-hidden="true"
        />
      )}
      <div className="mb-2">
        <div className="text-center">
          <div className="text-lg font-extrabold text-amber-900 leading-tight">
            {label}
          </div>
          <div className="text-base font-semibold text-amber-900/90 leading-tight">
            {format(date, "d/MM")}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isToday && (
              <span className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-white bg-rose-500 rounded-full shadow">
                Today
              </span>
            )}
            <div className="text-xs text-amber-900/70">
              Total hours: {totalHours.toFixed(1)}h
            </div>
          </div>

          <select
            className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
              areaStyle?.badge ??
              "border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100"
            }`}
            value={areaOptions.find((a) => normalizeArea(a) === normalizeArea(area)) ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "__custom") {
                const custom = prompt("New area name:")?.trim();
                if (custom) {
                  setDayAreaLabel(isoDate, custom);
                }
              } else {
                setDayAreaLabel(isoDate, val || undefined);
              }
            }}
          >
            <option value="">Set area</option>
            {areaOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
            <option value="__custom">Add new area</option>
          </select>
        </div>
      </div>

      <div className="mb-2 rounded-xl border border-amber-200 bg-white/70 px-3 py-2">
        <div className="text-xs font-semibold text-amber-900">Travel</div>
        {jobs.length === 0 ? (
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
        {jobs.length > 0 && travel && !travelLoading && !travelError && travel.unresolvedStopIds.length === 0
          ? renderLeg(`Leg 1: Base → ${jobs[0].clientName}`, 0)
          : null}
        {jobs.map((job, index) => (
          <div key={job.id} className="space-y-2">
            <Draggable draggableId={job.id} index={index} key={job.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                >
                  <JobCard job={job} />
                </div>
              )}
            </Draggable>
            {travel && !travelLoading && !travelError && travel.unresolvedStopIds.length === 0 ? (
              index < jobs.length - 1
                ? renderLeg(
                    `Leg ${index + 2}: ${job.clientName} → ${jobs[index + 1].clientName}`,
                    index + 1
                  )
                : renderLeg(`Leg ${index + 2}: ${job.clientName} → Base`, index + 1)
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
