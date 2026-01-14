"use client";

import type { Job } from "@/lib/types";
import { addDays, format, parseISO } from "date-fns";
import SortableJobCard from "./SortableJobCard";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatClientName } from "@/lib/formatClientName";
import { useDroppable } from "@dnd-kit/core";

interface Props {
  label: string;
  date: Date;
  isoDate: string;
  jobs: Job[];
}

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

function normalizeArea(area?: string | null) {
  return (area ?? "").trim().toLowerCase();
}

function getConsecutiveBlockDates(
  isoDate: string,
  areaLabel: string | undefined,
  labels: Record<string, string | undefined>
) {
  if (!areaLabel) return [isoDate];
  const target = normalizeArea(areaLabel);
  const dates = Object.entries(labels)
    .filter(([, label]) => normalizeArea(label) === target)
    .map(([date]) => date)
    .sort();
  const idx = dates.indexOf(isoDate);
  if (idx === -1) return [isoDate];

  const isNextDay = (a: string, b: string) =>
    Math.abs(
      (parseISO(b).getTime() - parseISO(a).getTime()) / (1000 * 60 * 60 * 24)
    ) === 1;

  let start = idx;
  while (start > 0 && isNextDay(dates[start - 1], dates[start])) start -= 1;
  let end = idx;
  while (end < dates.length - 1 && isNextDay(dates[end], dates[end + 1])) end += 1;

  return dates.slice(start, end + 1);
}

function getDynamicStyle(area: string | undefined, order: string[]) {
  if (!area) return null;
  const idx = order.findIndex((a) => normalizeArea(a) === normalizeArea(area));
  const pos = idx >= 0 ? idx % ringPalette.length : 0;
  return { ring: ringPalette[pos], badge: badgePalette[pos] };
}

function getTodayIsoTz() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  const date = new Date(`${fmt}T00:00:00Z`);
  const dow = date.getUTCDay();
  // Align with weekday-only columns: bump Sunday to Monday, Saturday to Friday.
  const adjusted =
    dow === 0 ? addDays(date, 1) : dow === 6 ? addDays(date, -1) : date;
  return adjusted.toISOString().slice(0, 10);
}

export default function DayColumn({ label, date, isoDate, jobs }: Props) {
  const { dayAreaLabels, setDayAreaLabel, jobs: allJobs } = useSchedulerStore();
  const area = dayAreaLabels[isoDate];
  const todayIso = getTodayIsoTz();
  const isToday = isoDate === todayIso;
  const [travel, setTravel] = useState<
    | {
        legs: Array<{
          fromId: string;
          toId: string;
          distanceMeters: number;
          durationSeconds: number;
        }>;
        totalDistanceMeters: number;
        totalDurationSeconds: number;
        approximatedStopIds: string[];
        unresolvedStopIds: string[];
      }
    | null
  >(null);
  const [travelError, setTravelError] = useState<string | null>(null);
  const [travelLoading, setTravelLoading] = useState(false);
  const [travelDirty, setTravelDirty] = useState(true);
  const [blockTravel, setBlockTravel] = useState<typeof travel>(null);
  const [blockTravelError, setBlockTravelError] = useState<string | null>(null);
  const [blockTravelLoading, setBlockTravelLoading] = useState(false);
  const [sendingNextId, setSendingNextId] = useState<string | null>(null);
  const [sendingError, setSendingError] = useState<string | null>(null);

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

  const dayStops = useMemo(
    () =>
      jobs.map((j) => ({
        id: j.id,
        // Use job address as the location; fall back to client address text for geocoding.
        address: j.jobAddress || j.clientAddress,
        lat: j.clientAddressLat,
        lng: j.clientAddressLng
      })),
    [jobs]
  );

  const routeSignature = useMemo(
    () =>
      dayStops
        .map(
          (s) =>
            `${s.id}:${s.lat ?? ""},${s.lng ?? ""}:${(s.address ?? "").trim().toLowerCase()}`
        )
        .join("|"),
    [dayStops]
  );

  const blockDates = useMemo(
    () => getConsecutiveBlockDates(isoDate, area, dayAreaLabels),
    [isoDate, area, dayAreaLabels]
  );
  const hasMultiDayBlock = blockDates.length >= 2;

  const blockStops = useMemo(() => {
    if (!hasMultiDayBlock) return [];
    const stops: Array<{ id: string; address: string; lat: number | null; lng: number | null }> = [];
    for (const d of blockDates) {
      allJobs
        .filter(
          (j) =>
            j.assignedDate === d &&
            j.status !== "cancelled" &&
            j.status !== "completed" &&
            !j.deletedAt
        )
        .forEach((j) => {
          stops.push({
            id: j.id,
            address: j.jobAddress || j.clientAddress,
            lat: j.clientAddressLat,
            lng: j.clientAddressLng
          });
        });
    }
    return stops;
  }, [allJobs, blockDates, hasMultiDayBlock]);

  const [blockDirty, setBlockDirty] = useState(hasMultiDayBlock);

  const blockSignature = useMemo(
    () =>
      blockStops
        .map(
          (s) =>
            `${s.id}:${s.lat ?? ""},${s.lng ?? ""}:${(s.address ?? "").trim().toLowerCase()}`
        )
        .join("|"),
    [blockStops]
  );

  const requestTravel = useCallback(
    (opts?: { force?: boolean }) => {
      if (!opts?.force && travelLoading) return;
      if (jobs.length === 0) {
        setTravel(null);
        setTravelError(null);
        setTravelLoading(false);
        return;
      }

      let cancelled = false;
      setTravelLoading(true);
      setTravelError(null);
      void (async () => {
        try {
          const res = await fetch("/api/route-metrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: isoDate, area, stops: dayStops })
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
          setTravelDirty(false);
        } catch (e: any) {
          if (!cancelled) setTravelError(e?.message ?? "Failed to load travel metrics");
          setTravel(null);
        } finally {
          if (!cancelled) {
            setTravelLoading(false);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    },
    [area, dayStops, isoDate, jobs.length, travelLoading]
  );

  useEffect(() => {
    setTravelDirty(true);
    setTravel(null);
    setTravelError(null);
    setTravelLoading(false);
  }, [isoDate, area, routeSignature, missingCoordsCount]);

  const requestBlockTravel = useCallback(
    (opts?: { force?: boolean }) => {
      if (!hasMultiDayBlock || blockStops.length === 0) {
        return;
      }
      if (!opts?.force && (blockTravelLoading || !blockDirty)) {
        return;
      }

      let cancelled = false;
      setBlockTravelLoading(true);
      setBlockTravelError(null);
      void (async () => {
        try {
          const res = await fetch("/api/route-metrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: `${blockDates[0]}_${blockDates[blockDates.length - 1]}`,
              area,
              stops: blockStops
            })
          });
          const text = await res.text();
          if (cancelled) return;
          if (!res.ok) {
            throw new Error(text || "Failed to load travel metrics");
          }
          const data = JSON.parse(text) as any;
          setBlockTravel({
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
          setBlockDirty(false);
        } catch (e: any) {
          if (!cancelled) setBlockTravelError(e?.message ?? "Failed to load travel metrics");
          setBlockTravel(null);
        } finally {
          if (!cancelled) setBlockTravelLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    },
    [area, blockDates, blockDirty, blockStops, blockTravelLoading, hasMultiDayBlock]
  );

  useEffect(() => {
    if (!hasMultiDayBlock) {
      setBlockDirty(false);
      setBlockTravel(null);
      setBlockTravelError(null);
      setBlockTravelLoading(false);
      return;
    }
    setBlockDirty(true);
    setBlockTravel(null);
    setBlockTravelError(null);
    setBlockTravelLoading(false);
  }, [area, blockSignature, hasMultiDayBlock]);

  const baseLegDistanceMeters = blockTravel?.legs?.[0]?.distanceMeters ?? 0;
  const useBlockTrip =
    hasMultiDayBlock &&
    blockTravel &&
    baseLegDistanceMeters >= 200_000;

  const travelData = useBlockTrip ? blockTravel : travel;
  const travelDataLoading = useBlockTrip ? blockTravelLoading : travelLoading;
  const travelDataError = useBlockTrip ? blockTravelError : travelError;
  const travelUnresolved = travelData?.unresolvedStopIds ?? [];
  const travelApprox = travelData?.approximatedStopIds ?? [];
  const blockLabel = useMemo(
    () =>
      blockDates
        .map((d) => format(parseISO(d), "EEE d/MM"))
        .join(", "),
    [blockDates]
  );

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

  function renderLeg(legIndex: number) {
    if (!travelData || !travelData.legs?.[legIndex]) return null;
    const leg = travelData.legs[legIndex];
    return (
      <div className="app-card px-3 py-2">
        <div className="flex items-center justify-center text-[11px] font-semibold text-slate-700">
          {fmtDistance(leg.distanceMeters)} - {fmtDuration(leg.durationSeconds)}
        </div>
      </div>
    );
  }

  async function sendNextJobText(job: Job, nextJob: Job, legIndex: number | null) {
    if (!nextJob.clientPhone) {
      alert("Next job is missing a phone number.");
      return;
    }
    const ok = window.confirm(`Text next job?\n\nNext: ${formatClientName(nextJob.clientName)}\nNumber: ${nextJob.clientPhone}`);
    if (!ok) return;
    const leg = legIndex != null && travelData?.legs?.[legIndex] ? travelData.legs[legIndex] : null;
    setSendingError(null);
    setSendingNextId(job.id);
    try {
      const res = await fetch("/api/notify-next-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentJobId: job.id,
          nextJobId: nextJob.id,
          to: nextJob.clientPhone,
          distanceMeters: leg?.distanceMeters ?? null,
          durationSeconds: leg?.durationSeconds ?? null
        })
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(text || "Failed to send text");
      }
    } catch (e: any) {
      setSendingError(e?.message ?? "Failed to send text");
    } finally {
      setSendingNextId(null);
    }
  }

  return (
    <div
      className={`relative h-full rounded-2xl border border-[var(--app-border)] shadow-[var(--app-shadow-soft)] flex flex-col p-3 transition-shadow ${
        isToday ? "bg-blue-50/70" : "bg-[var(--app-surface-muted)]"
      } ${areaStyle?.ring ?? ""}`}
    >
      {isToday && (
        <span
          className="absolute inset-y-0 left-0 w-1 bg-blue-500 rounded-l-2xl"
          aria-hidden="true"
        />
      )}
      <div className="mb-2">
        <div className="text-center">
          <div className="text-lg font-extrabold text-slate-900 leading-tight">
            {label}
          </div>
          <div className="text-base font-semibold text-slate-700 leading-tight">
            {format(date, "d/MM")}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isToday && (
              <span className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-white bg-blue-500 rounded-full shadow">
                Today
              </span>
            )}
            <div className="text-xs text-slate-600">
              Total hours: {totalHours.toFixed(1)}h
            </div>
          </div>

          <select
            className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
              areaStyle?.badge ??
              "border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
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

      <div className="mb-2 app-card px-3 py-2">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-900">
          <div className="flex items-center gap-2">
            <span>Travel</span>
            {jobs.length > 0 &&
            travelData &&
            !travelDataLoading &&
            !travelDataError ? (
              <span>
                {fmtDistance(travelData.totalDistanceMeters)} - {fmtDuration(travelData.totalDurationSeconds)}
              </span>
            ) : null}
          </div>
        </div>
        {jobs.length === 0 ? (
          <div className="text-[11px] text-slate-600">No jobs.</div>
        ) : travelDataLoading ? (
          <div className="text-[11px] text-slate-600">Calculating...</div>
        ) : travelDataError ? (
          <div className="text-[11px] text-red-700">Travel error</div>
        ) : travelDirty ? (
          <div className="text-[11px] text-slate-600">
            Travel not calculated.
            <div>
              <button
                className="mt-1 text-[10px] px-2 py-1 rounded-lg border border-[var(--app-border-strong)] bg-white hover:bg-slate-50"
                onClick={() => requestTravel({ force: true })}
                disabled={travelDataLoading}
              >
                Refresh travel
              </button>
            </div>
          </div>
        ) : travelData ? (
          <div className="mt-1 space-y-1">
            {travelUnresolved.length > 0 && (
              <div className="text-[11px] text-slate-600">
                Could not locate {travelUnresolved.length} jobs (check Job address spelling)
              </div>
            )}
            {travelApprox.length > 0 && (
              <div className="text-[11px] text-slate-600">
                Using closest address for {travelApprox.length} jobs
              </div>
            )}
            {useBlockTrip && (
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>Block total ({blockLabel})</span>
                <button
                  className="text-[10px] px-2 py-1 rounded-lg border border-[var(--app-border-strong)] bg-white hover:bg-slate-50"
                  onClick={() => requestBlockTravel({ force: true })}
                  disabled={blockTravelLoading}
                >
                  Refresh
                </button>
              </div>
            )}
            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-900">
              <span>Total</span>
              <div className="flex items-center gap-2">
                <span>
                  {fmtDistance(travelData.totalDistanceMeters)} - {fmtDuration(travelData.totalDurationSeconds)}
                </span>
                <button
                  className="text-[10px] px-2 py-1 rounded-lg border border-[var(--app-border-strong)] bg-white hover:bg-slate-50"
                  onClick={() => requestTravel({ force: true })}
                  disabled={travelDataLoading}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-600">
            Travel not available.
            <div>
              <button
                className="mt-1 text-[10px] px-2 py-1 rounded-lg border border-[var(--app-border-strong)] bg-white hover:bg-slate-50"
                onClick={() => requestTravel({ force: true })}
                disabled={travelDataLoading}
              >
                Refresh travel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2">
          <DropSlot listId={isoDate} index={0} />
          {(() => {
            if (
              jobs.length === 0 ||
              !travelData ||
              travelDataLoading ||
              travelDataError ||
              travelUnresolved.length > 0
            ) {
              return null;
            }

            const stops = useBlockTrip ? blockStops : dayStops;
            const stopIndex = new Map<string, number>();
            stops.forEach((s, idx) => stopIndex.set(s.id, idx));

            const firstJob = jobs[0];
            const firstIdx = firstJob ? stopIndex.get(firstJob.id) : null;
            return firstIdx != null ? renderLeg(firstIdx) : null;
          })()}
          {jobs.map((job, index) => (
            <div key={job.id} className="space-y-2">
              <SortableJobCard job={job} listId={isoDate} />
              {(() => {
                const nextJob = jobs[index + 1];
                if (!nextJob) return null;

                const stops = useBlockTrip ? blockStops : dayStops;
                const stopIndex = new Map<string, number>();
                stops.forEach((s, idx) => stopIndex.set(s.id, idx));
                const idxInTrip = stopIndex.get(job.id);
                const legIdx = idxInTrip != null ? idxInTrip + 1 : null;
                const leg =
                  legIdx != null &&
                  !travelDataLoading &&
                  !travelDataError &&
                  travelData?.legs?.[legIdx]
                    ? travelData.legs[legIdx]
                    : null;
                const disabled = sendingNextId === job.id || !nextJob.clientPhone?.trim();

                return (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      className="text-[11px] px-2 py-1 rounded-lg border border-[var(--app-border-strong)] bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={() => sendNextJobText(job, nextJob, legIdx)}
                      disabled={disabled}
                      title={nextJob.clientPhone?.trim() ? undefined : "Next job has no phone number"}
                    >
                      {disabled ? "Sending..." : "Text next job"}
                    </button>
                    <div className="text-[11px] font-semibold text-slate-900 min-w-[110px] text-right">
                      {leg
                        ? `${fmtDistance(leg.distanceMeters)} - ${fmtDuration(leg.durationSeconds)}`
                        : travelDataLoading || travelDataError || travelUnresolved.length > 0
                        ? "Travel unavailable"
                        : ""}
                    </div>
                  </div>
                );
              })()}
              <DropSlot listId={isoDate} index={index + 1} />
            </div>
          ))}
          {sendingError && (
            <div className="text-[11px] text-red-700">{sendingError}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function DropSlot({ listId, index }: { listId: string; index: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${listId}:${index}`
  });
  return (
    <div
      ref={setNodeRef}
      className={`h-3 my-1 rounded ${isOver ? "bg-blue-200/70" : "bg-transparent"}`}
      aria-hidden="true"
    />
  );
}


