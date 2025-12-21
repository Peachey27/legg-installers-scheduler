"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import type { Job } from "@/lib/types";
import { addDays, addWeeks, format } from "date-fns";
import JobCard from "../jobs/JobCard";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult
} from "@hello-pangea/dnd";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { formatClientName } from "@/lib/formatClientName";

export default function MobileDayView() {
  const { jobs, dayAreaLabels, setDayAreaLabel, moveJob } = useSchedulerStore();
  const [weekOffset, setWeekOffset] = useState(0); // blocks of 5 weekdays
  const [orderByList, setOrderByList] = useState<Record<string, string[]>>({});
  const [dragging, setDragging] = useState(false);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const today = new Date();
  const startDate = addWeeks(today, weekOffset);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("mobileJobOrder-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as any;
      if (!parsed || typeof parsed !== "object") return;
      setOrderByList(parsed);
    } catch {
      // ignore bad localStorage
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("mobileJobOrder-v1", JSON.stringify(orderByList));
    } catch {
      // ignore quota / private mode failures
    }
  }, [orderByList]);

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
        jobs: orderJobs(
          d.iso,
          orderByList,
          jobs.filter(
            (j) =>
              j.assignedDate === d.iso &&
              j.status !== "cancelled" &&
              j.status !== "completed" &&
              !j.deletedAt
          )
        )
      })),
    [days, dayAreaLabels, jobs, orderByList]
  );

  const backlogJobs = useMemo(
    () =>
      orderJobs(
        "backlog",
        orderByList,
        jobs.filter(
          (j) =>
            (!j.assignedDate || j.status === "backlog") &&
            j.status !== "completed" &&
            j.status !== "cancelled" &&
            !j.deletedAt
        )
      ),
    [jobs, orderByList]
  );

  const areaOptions = useMemo(() => {
    const set = new Set<string>(["Bairnsdale", "Lakes", "Sale", "Melbourne", "Saphire Coast"]);
    Object.values(dayAreaLabels).forEach((a) => {
      if (a) set.add(a);
    });
    return Array.from(set);
  }, [dayAreaLabels]);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      setDragging(false);
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      // Update local ordering for mobile view (does not affect desktop sorting logic).
      setOrderByList((prev) => {
        const sourceId = source.droppableId;
        const destId = destination.droppableId;

        const getCurrentIds = (listId: string) => {
          const filtered =
            listId === "backlog"
              ? jobs.filter(
                  (j) =>
                    (!j.assignedDate || j.status === "backlog") &&
                    j.status !== "completed" &&
                    j.status !== "cancelled" &&
                    !j.deletedAt
                )
              : jobs.filter(
                  (j) =>
                    j.assignedDate === listId &&
                    j.status !== "cancelled" &&
                    j.status !== "completed" &&
                    !j.deletedAt
                );
          return orderJobs(listId, prev, filtered).map((j) => j.id);
        };

        const sourceIds = mergeOrder(prev[sourceId], getCurrentIds(sourceId));
        const destIds =
          sourceId === destId ? sourceIds.slice() : mergeOrder(prev[destId], getCurrentIds(destId));

        const removeAt = sourceIds.indexOf(draggableId);
        if (removeAt >= 0) sourceIds.splice(removeAt, 1);
        const insertIndex = Math.min(Math.max(destination.index, 0), destIds.length);
        if (sourceId === destId) {
          sourceIds.splice(insertIndex, 0, draggableId);
          return { ...prev, [sourceId]: sourceIds };
        }

        const destRemove = destIds.indexOf(draggableId);
        if (destRemove >= 0) destIds.splice(destRemove, 1);
        destIds.splice(insertIndex, 0, draggableId);
        return { ...prev, [sourceId]: sourceIds, [destId]: destIds };
      });

      const target = destination.droppableId;
      const assignedDate = target === "backlog" ? null : target;

      if (assignedDate) {
        const job = jobs.find((j) => j.id === draggableId);
        const dayArea = dayAreaLabels[assignedDate];
        const jobArea = job?.areaTag;
        if (job && dayArea && jobArea && normalize(dayArea) && normalize(jobArea) !== normalize(dayArea)) {
          const ok = window.confirm(
            `This job is tagged "${jobArea}", but the day is set to "${dayArea}". Drop here anyway?`
          );
          if (!ok) return;
        }
      }

      // Reordering within the same list should not call the backend.
      if (destination.droppableId !== source.droppableId) {
        void moveJob(draggableId, assignedDate);
      }
    },
    [dayAreaLabels, jobs, moveJob]
  );

  return (
    <DragDropContext
      onDragStart={() => setDragging(true)}
      onDragEnd={onDragEnd}
    >
      <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">
        <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-amber-900/80">
          <button
            className="px-2 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100"
            onClick={() => setWeekOffset((v) => v - 1)}
          >
            Prev week
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
            Next week
          </button>
          <span className="ml-auto text-[11px]">Week of {format(days[0].date, "d MMM")}</span>
        </div>

        <div
          className="flex flex-1 items-stretch overflow-x-auto overflow-y-hidden px-2 pb-2 gap-2"
          style={{ WebkitOverflowScrolling: "touch" }}
          data-scroll-container="board"
          ref={boardScrollRef}
        >
          <Droppable droppableId="backlog">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="min-w-[200px] h-full flex-shrink-0"
              >
                <MobileBacklogCard jobs={backlogJobs} placeholder={provided.placeholder} />
              </div>
            )}
          </Droppable>

          {jobsByDay.map((d) => (
            <Droppable droppableId={d.iso} key={d.iso}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="min-w-[200px] h-full flex-shrink-0"
                >
                  <MobileDayCard
                    day={d}
                    areaOptions={areaOptions}
                    onSetArea={(iso, next) => setDayAreaLabel(iso, next)}
                    placeholder={provided.placeholder}
                  />
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}

function mergeOrder(existing: string[] | undefined, currentIds: string[]) {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const id of existing ?? []) {
    if (!seen.has(id) && currentIds.includes(id)) {
      merged.push(id);
      seen.add(id);
    }
  }
  for (const id of currentIds) {
    if (!seen.has(id)) {
      merged.push(id);
      seen.add(id);
    }
  }
  return merged;
}

function orderJobs(listId: string, orderByList: Record<string, string[]>, list: Job[]) {
  const currentIds = list.map((j) => j.id);
  const merged = mergeOrder(orderByList[listId], currentIds);
  const index = new Map<string, number>();
  merged.forEach((id, i) => index.set(id, i));
  const stablePos = new Map<string, number>();
  list.forEach((j, i) => stablePos.set(j.id, i));

  return [...list].sort((a, b) => {
    const ai = index.get(a.id);
    const bi = index.get(b.id);
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return (stablePos.get(a.id) ?? 0) - (stablePos.get(b.id) ?? 0);
  });
}

function MobileDayCard({
  day,
  areaOptions,
  onSetArea,
  placeholder
}: {
  day: { iso: string; date: Date; label: string; area?: string; jobs: Job[] };
  areaOptions: string[];
  onSetArea: (iso: string, label: string | undefined) => void;
  placeholder: React.ReactNode;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const isToday = day.iso === todayIso;
  const areaStyle = getAreaStyle(day.area, areaOptions);

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
            `${j.id}:${j.clientAddressLat ?? ""},${j.clientAddressLng ?? ""}:${(j.jobAddress ?? "")
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

    const stops = day.jobs.map((j) => ({
      id: j.id,
      address: j.jobAddress || j.clientAddress,
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
          approximatedStopIds: Array.isArray(data.approximatedStopIds) ? data.approximatedStopIds : [],
          unresolvedStopIds: Array.isArray(data.unresolvedStopIds) ? data.unresolvedStopIds : []
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
  }, [day.iso, day.area, routeSignature]);

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
      <div className="rounded-md border border-amber-200 bg-white/70 px-2 py-1.5">
        <div className="flex items-center justify-between text-[10px] text-amber-900/80">
          <span className="font-semibold">{labelText}</span>
          <span>{fmtDistance(leg.distanceMeters)} -> {fmtDuration(leg.durationSeconds)}</span>
        </div>
      </div>
    );
  }
  return (
    <div
      className={`relative h-full w-full border border-amber-200/70 rounded-lg shadow-inner p-2 flex flex-col gap-1.5 ${
        isToday ? "bg-rose-50" : "bg-[#f6f0e7]/90"
      } ${areaStyle?.ring ?? ""}`}
    >
      {isToday && (
        <span className="absolute inset-y-0 left-0 w-1 bg-rose-500 rounded-l-xl" aria-hidden="true" />
      )}
      <div className="mb-1">
        <div className="text-center">
          <div className="text-sm font-semibold text-amber-900 leading-tight">{day.label}</div>
          <div className="text-xs font-semibold text-amber-900/90 leading-tight">{format(day.date, "d/MM")}</div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          {isToday ? (
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-white bg-rose-500 rounded-full shadow">
              Today
            </span>
          ) : (
            <span />
          )}
          <button
            className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
              areaStyle?.badge ?? "border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100"
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

      <div className="rounded-lg border border-amber-200 bg-white/70 px-2 py-1.5">
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
                Could not locate {travel.unresolvedStopIds.length} jobs (check Job address spelling)
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
                {fmtDistance(travel.totalDistanceMeters)} -> {fmtDuration(travel.totalDurationSeconds)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-amber-900/70">Travel not available.</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5">
            {day.jobs.length > 0 && travel && !travelLoading && !travelError && travel.unresolvedStopIds.length === 0
              ? renderLeg(`Leg 1: Base -> ${formatClientName(day.jobs[0].clientName)}`, 0)
              : null}

        {day.jobs.length === 0 ? (
          <p className="text-[11px] text-amber-900/70">No jobs for this day.</p>
        ) : (
          day.jobs.map((job, index) => (
            <div key={job.id} className="space-y-2">
              <MobileJobDraggable job={job} index={index} />
                  {travel && !travelLoading && !travelError && travel.unresolvedStopIds.length === 0 ? (
                    index < day.jobs.length - 1
                      ? renderLeg(
                          `Leg ${index + 2}: ${formatClientName(job.clientName)} -> ${formatClientName(
                            day.jobs[index + 1].clientName
                          )}`,
                          index + 1
                        )
                      : renderLeg(`Leg ${index + 2}: ${formatClientName(job.clientName)} -> Base`, index + 1)
                  ) : null}
                </div>
              ))
            )}
        {placeholder}
      </div>
    </div>
  );
}

function MobileBacklogCard({ jobs, placeholder }: { jobs: Job[]; placeholder: React.ReactNode }) {
  return (
    <div className="relative h-full w-full border border-amber-200/70 rounded-lg shadow-inner p-2 flex flex-col gap-1.5 bg-[#f6f0e7]/90">
      <div className="mb-0.5">
        <div className="text-center">
          <div className="text-sm font-semibold text-amber-900 leading-tight">Backlog</div>
          <div className="text-[10px] text-amber-900/70 leading-tight">Hold 2s to drag</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5">
        {jobs.length === 0 ? (
          <p className="text-[11px] text-amber-900/70">No backlog jobs.</p>
        ) : (
          jobs.map((job, index) => <MobileJobDraggable key={job.id} job={job} index={index} />)
        )}
        {placeholder}
      </div>
    </div>
  );
}

function MobileJobDraggable({ job, index }: { job: Job; index: number }) {({ job, index }: { job: Job; index: number }) {
  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <MobileJobDraggableInner
          job={job}
          provided={provided}
          isDragging={snapshot.isDragging}
        />
      )}
    </Draggable>
  );
}

function MobileJobDraggableInner({
  job,
  provided,
  isDragging
}: {
  job: Job;
  provided: any;
  isDragging: boolean;
}) {
  const child = (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      style={{
        ...(provided.draggableProps?.style ?? {}),
        zIndex: isDragging ? 9999 : (provided.draggableProps?.style?.zIndex ?? undefined)
      }}
    >
      <MobileJobCard job={job} dragHandleProps={provided.dragHandleProps} isDragging={isDragging} />
    </div>
  );

  if (!isDragging) return child;
  if (typeof document === "undefined") return child;
  return createPortal(child, document.body);
}

function MobileJobCard({
  job,
  dragHandleProps,
  isDragging
}: {
  job: Job;
  dragHandleProps: any;
  isDragging: boolean;
}) {
  const router = useRouter();

  const timerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const lastTapAtRef = useRef<number>(0);
  const draggingArmedRef = useRef(false);
  const [armed, setArmed] = useState(false);

  const {
    onTouchStart: libTouchStart,
    onTouchMove: libTouchMove,
    onTouchEnd: libTouchEnd,
    onTouchCancel: libTouchCancel,
    onMouseDown: libMouseDown,
    onKeyDown: libKeyDown,
    ...handleAttrs
  } = dragHandleProps ?? {};

  const clearHoldTimeout = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetArmed = useCallback(() => {
    clearHoldTimeout();
    draggingArmedRef.current = false;
    setArmed(false);
  }, [clearHoldTimeout]);

  const openJob = useCallback(() => {
    router.push(`/jobs/${job.id}`);
  }, [job.id, router]);

  useEffect(() => resetArmed, [resetArmed]);

  return (
    <div
      {...handleAttrs}
      onMouseDown={libMouseDown}
      onKeyDown={libKeyDown}
      onDoubleClick={(e) => {
        e.preventDefault();
        openJob();
      }}
      onTouchStart={(e) => {
        (e as any).persist?.();
        touchStartRef.current = {
          x: e.touches[0]?.clientX ?? 0,
          y: e.touches[0]?.clientY ?? 0,
          moved: false
        };
        draggingArmedRef.current = false;
        setArmed(false);

        clearHoldTimeout();
        timerRef.current = window.setTimeout(() => {
          draggingArmedRef.current = true;
          setArmed(true);
          libTouchStart?.(e);
        }, 2000);
      }}
      onTouchMove={(e) => {
        if (draggingArmedRef.current) {
          libTouchMove?.(e);
          return;
        }
        const current = touchStartRef.current;
        if (!current) return;
        const x = e.touches[0]?.clientX ?? 0;
        const y = e.touches[0]?.clientY ?? 0;
        const dx = Math.abs(x - current.x);
        const dy = Math.abs(y - current.y);
        if (dx > 10 || dy > 10) {
          current.moved = true;
          resetArmed();
        }
      }}
      onTouchCancel={(e) => {
        if (draggingArmedRef.current) {
          libTouchCancel?.(e);
        }
        resetArmed();
      }}
      onTouchEnd={(e) => {
        const touch = touchStartRef.current;
        const wasTap = touch && !touch.moved;
        const wasArmed = draggingArmedRef.current;
        clearHoldTimeout();

        if (wasArmed) {
          libTouchEnd?.(e);
          resetArmed();
          return;
        }

        resetArmed();
        if (!wasTap || isDragging) return;
        const now = Date.now();
        const last = lastTapAtRef.current;
        lastTapAtRef.current = now;
        if (now - last <= 320) {
          openJob();
        }
      }}
      className={`${isDragging ? "opacity-70" : ""} ${armed ? "ring-2 ring-amber-400 rounded-xl" : ""}`}
    >
      <JobCard job={job} openOnClick={false} />
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

function normalize(val?: string | null) {
  return val?.trim().toLowerCase() ?? "";
}










