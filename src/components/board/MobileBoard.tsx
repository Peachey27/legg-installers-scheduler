"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { addDays, format, startOfWeek } from "date-fns";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import type { Job } from "@/lib/types";
import SortableJobCard from "./SortableJobCard";
import JobCard from "../jobs/JobCard";
import BacklogColumn from "./BacklogColumn";

const DAY_PREFIX = "day:";
const EDGE_SWIPE_PX = 24;
const DRAWER_WIDTH = 300;

const baseAreas = ["Bairnsdale", "Lakes", "Sale", "Melbourne", "Saphire Coast"];
const tintPalette = [
  "bg-sky-200/30",
  "bg-emerald-200/30",
  "bg-rose-200/30",
  "bg-violet-200/30",
  "bg-amber-200/30",
  "bg-orange-200/30",
  "bg-teal-200/30",
  "bg-cyan-200/30"
];

type Day = { label: string; date: Date; iso: string };

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

function normalizeArea(area?: string | null) {
  return (area ?? "").trim().toLowerCase();
}

function getAreaTint(area: string | undefined, order: string[]) {
  if (!area) return "";
  const idx = order.findIndex((a) => normalizeArea(a) === normalizeArea(area));
  const pos = idx >= 0 ? idx % tintPalette.length : 0;
  return tintPalette[pos];
}

export default function MobileBoard() {
  const { jobs, moveJob, dayAreaLabels } = useSchedulerStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [orderByList, setOrderByList] = useState<Record<string, string[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerOffset, setDrawerOffset] = useState(-DRAWER_WIDTH);
  const drawerDrag = useRef<{
    startX: number;
    startOffset: number;
    pointerId: number;
  } | null>(null);
  const lastOver = useRef<{ id: UniqueIdentifier; data?: { current?: unknown } } | null>(null);

  const days = useMemo(() => buildWeekdays(weekOffset), [weekOffset]);
  const areaOptions = useMemo(() => {
    const set = new Set<string>(baseAreas);
    Object.values(dayAreaLabels).forEach((a) => {
      if (a) set.add(a);
    });
    return Array.from(set);
  }, [dayAreaLabels]);

  const listJobsBase = useCallback(
    (listId: string) => {
      if (listId === "backlog") {
        return jobs.filter(
          (j) =>
            (!j.assignedDate || j.status === "backlog") &&
            j.status !== "completed" &&
            j.status !== "cancelled" &&
            !j.deletedAt
        );
      }
      if (!listId.startsWith(DAY_PREFIX)) return [];
      const dayKey = listId.slice(DAY_PREFIX.length);
      return jobs.filter(
        (j) =>
          j.assignedDate === dayKey &&
          j.status !== "cancelled" &&
          j.status !== "completed" &&
          !j.deletedAt
      );
    },
    [jobs]
  );

  const listJobs = useCallback(
    (listId: string) => listJobsBase(listId),
    [listJobsBase]
  );

  const orderedBacklogJobs = orderJobs("backlog", orderByList, listJobs("backlog"));
  const jobsByDate: Record<string, typeof jobs> = {};
  for (const d of days) {
    const listId = `${DAY_PREFIX}${d.iso}`;
    const raw = listJobs(listId);
    jobsByDate[d.iso] = orderJobs(listId, orderByList, raw);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 160, tolerance: 6 }
    })
  );

  const getContainerIdFromOver = useCallback(
    (overId: UniqueIdentifier | null, overData?: { current?: unknown }) => {
      if (!overId) return null;
      const current = overData?.current as
        | {
            containerId?: string;
            sortable?: { containerId?: string; index?: number };
          }
        | undefined;
      if (current?.sortable?.containerId) return current.sortable.containerId;
      if (current?.containerId) return current.containerId;
      const asString = String(overId);
      if (asString === "backlog") return "backlog";
      if (asString.startsWith(DAY_PREFIX)) return asString;
      return null;
    },
    []
  );

  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (!activeId) return closestCenter(args);
      const pointerCollisions = pointerWithin(args);
      const intersections = pointerCollisions.length ? pointerCollisions : rectIntersection(args);
      const containerHit = intersections.find((item) => {
        const current = item.data?.current as { type?: string } | undefined;
        return current?.type === "container";
      });
      if (containerHit) {
        return [{ id: containerHit.id as UniqueIdentifier }];
      }
      const first = getFirstCollision(intersections, "id");
      if (first != null && String(first) !== String(activeId)) {
        return [{ id: first as UniqueIdentifier }];
      }
      return lastOver.current ? [{ id: lastOver.current.id }] : closestCenter(args);
    },
    [activeId]
  );

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
  }, []);

  const handleDragOver = useCallback(
    ({ active, over }: DragOverEvent) => {
      if (!over) return;
      if (String(over.id) !== String(active.id)) {
        lastOver.current = { id: over.id, data: over.data };
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const activeId = String(active.id);
      const sourceListId = (active?.data?.current as { containerId?: string } | undefined)
        ?.containerId ?? null;
      const isSelfOver = over && String(over.id) === activeId;
      const overRecord =
        !over || isSelfOver
          ? lastOver.current
            ? { id: lastOver.current.id, data: lastOver.current.data }
            : null
          : { id: over.id, data: over.data };
      const overId = overRecord?.id ?? null;
      const overData = overRecord?.data as { current?: unknown } | undefined;
      const destListId = getContainerIdFromOver(overId, overData);

      setActiveId(null);
      lastOver.current = null;

      if (!sourceListId || !destListId) return;

      const sourceIdsFull = orderJobs(sourceListId, orderByList, listJobsBase(sourceListId)).map(
        (j) => j.id
      );
      const destIdsFull = orderJobs(destListId, orderByList, listJobsBase(destListId)).map(
        (j) => j.id
      );
      const overSortable = (overData?.current as { sortable?: { containerId?: string; index?: number } } | undefined)
        ?.sortable;
      const fromIndex = sourceIdsFull.indexOf(activeId);
      const toIndex =
        overSortable?.containerId === destListId && typeof overSortable.index === "number"
          ? overSortable.index
          : destIdsFull.length;

      setOrderByList((prev) => {
        if (sourceListId === destListId) {
          const nextIds = arrayMove(sourceIdsFull, fromIndex, toIndex);
          return { ...prev, [sourceListId]: nextIds };
        }

        const sourceIds = sourceIdsFull.filter((id) => id !== activeId);
        const destIds = destIdsFull.filter((id) => id !== activeId);
        const nextDest = [...destIds];
        nextDest.splice(Math.min(toIndex, nextDest.length), 0, activeId);
        return {
          ...prev,
          [sourceListId]: sourceIds,
          [destListId]: nextDest
        };
      });

      const assignedDate = destListId === "backlog" ? null : destListId.slice(DAY_PREFIX.length);
      void moveJob(activeId, assignedDate);
    },
    [getContainerIdFromOver, listJobsBase, moveJob, orderByList]
  );

  useEffect(() => {
    if (!drawerDrag.current) {
      setDrawerOffset(drawerOpen ? 0 : -DRAWER_WIDTH);
    }
  }, [drawerOpen]);

  function startDrawerDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "touch") return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("[data-dnd-card='true']")) return;
    if (!drawerOpen && e.clientX > EDGE_SWIPE_PX) return;
    drawerDrag.current = {
      startX: e.clientX,
      startOffset: drawerOpen ? 0 : -DRAWER_WIDTH,
      pointerId: e.pointerId
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function moveDrawerDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!drawerDrag.current) return;
    const { startX, startOffset } = drawerDrag.current;
    const dx = e.clientX - startX;
    const next = Math.min(0, Math.max(-DRAWER_WIDTH, startOffset + dx));
    setDrawerOffset(next);
  }

  function endDrawerDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!drawerDrag.current) return;
    e.currentTarget.releasePointerCapture(drawerDrag.current.pointerId);
    const shouldOpen = drawerOffset > -DRAWER_WIDTH * 0.5;
    drawerDrag.current = null;
    setDrawerOpen(shouldOpen);
  }

  const weekRange = useMemo(() => {
    if (days.length === 0) return "";
    const first = days[0].date;
    const last = days[days.length - 1].date;
    return `${format(first, "d MMM")} - ${format(last, "d MMM")}`;
  }, [days]);

  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : null;

  return (
    <div
      className="relative min-h-screen"
      onPointerDown={startDrawerDrag}
      onPointerMove={moveDrawerDrag}
      onPointerUp={endDrawerDrag}
      onPointerCancel={endDrawerDrag}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          lastOver.current = null;
        }}
        autoScroll
      >
        <div className="px-4 py-3 space-y-3">
          <div className="app-surface px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary px-2 py-1 text-xs"
                onClick={() => setDrawerOpen(true)}
              >
                Menu
              </button>
              <div>
                <div className="text-[11px] text-slate-600">Week view</div>
                <div className="text-sm font-semibold text-slate-900">{weekRange}</div>
              </div>
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
            const listId = `${DAY_PREFIX}${day.iso}`;
            const dayJobs = jobsByDate[day.iso] ?? [];
            const areaLabel = dayAreaLabels[day.iso];
            const tint = getAreaTint(areaLabel, areaOptions);
            return (
              <SortableContext
                key={day.iso}
                items={dayJobs.map((j) => j.id)}
                strategy={verticalListSortingStrategy}
              >
                <MobileDayColumn
                  listId={listId}
                  label={format(day.date, "EEEE")}
                  dateLabel={format(day.date, "d MMM")}
                  areaLabel={areaLabel}
                  tintClass={tint}
                  jobs={dayJobs}
                />
              </SortableContext>
            );
          })}
        </div>

        <div
          className="fixed inset-y-0 left-0 z-40 w-[300px] max-w-[80vw] transition-transform duration-300"
          style={{ transform: `translateX(${drawerOffset}px)` }}
        >
          <div className="h-full bg-white shadow-2xl border-r border-[var(--app-border)] flex flex-col">
            <div className="px-3 py-2 border-b border-[var(--app-border)] flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary px-2 py-1 text-xs"
                onClick={() => setDrawerOpen((v) => !v)}
              >
                Menu
              </button>
              <span className="text-sm font-semibold text-slate-900">Backlog</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <SortableContext
                items={orderedBacklogJobs.map((j) => j.id)}
                strategy={verticalListSortingStrategy}
              >
                <BacklogColumn
                  jobs={orderedBacklogJobs}
                  droppableId="backlog"
                  hideHeader
                />
              </SortableContext>
            </div>
          </div>
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-30 bg-black/20 pointer-events-none" />
        )}

        <DragOverlay>
          {activeJob ? (
            <div className="rotate-[-1.5deg] scale-[1.03] shadow-2xl">
              <JobCard job={activeJob} openOnClick={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function MobileDayColumn({
  listId,
  label,
  dateLabel,
  areaLabel,
  tintClass,
  jobs
}: {
  listId: string;
  label: string;
  dateLabel: string;
  areaLabel?: string;
  tintClass: string;
  jobs: Job[];
}) {
  const { setNodeRef } = useDroppable({
    id: listId,
    data: { type: "container", containerId: listId }
  });

  return (
    <section
      ref={setNodeRef}
      className={`rounded-2xl border border-[var(--app-border)] shadow-[var(--app-shadow-soft)] p-3 ${
        tintClass || "bg-[var(--app-surface)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <div className="text-sm font-semibold text-slate-900">{label}</div>
          <div className="text-xs text-slate-600">{dateLabel}</div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          {areaLabel ? <span className="badge-muted">{areaLabel}</span> : null}
          <span>Jobs {jobs.length}</span>
        </div>
      </div>
      <div className="space-y-2">
        {jobs.length === 0 ? (
          <p className="text-xs text-slate-500">No jobs scheduled</p>
        ) : (
          jobs.map((job) => (
            <SortableJobCard key={job.id} job={job} listId={listId} />
          ))
        )}
      </div>
    </section>
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

function orderJobs<T extends { id: string }>(
  listId: string,
  orderByList: Record<string, string[]>,
  list: T[]
): T[] {
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
