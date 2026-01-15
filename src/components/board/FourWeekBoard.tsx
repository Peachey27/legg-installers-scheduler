"use client";

import { useCallback, useMemo, useState } from "react";
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
  horizontalListSortingStrategy,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { addDays, format, startOfWeek } from "date-fns";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import CompactDayColumn from "./CompactDayColumn";
import JobCard from "../jobs/JobCard";
import SortableJobCard from "./SortableJobCard";

type Props = {
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  onZoomToWeek?: (offset: number) => void;
};

type Week = {
  start: Date;
  days: { label: string; date: Date; iso: string }[];
  displayRange: string;
};

const AXIS_THRESHOLD = 12;
const DAY_PREFIX = "day:";

export default function FourWeekBoard({
  weekOffset,
  onWeekOffsetChange,
  onZoomToWeek
}: Props) {
  const { jobs, moveJob, dayAreaLabels } = useSchedulerStore();
  const [orderByList, setOrderByList] = useState<Record<string, string[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragAxis, setDragAxis] = useState<"vertical" | "horizontal" | null>(null);
  const [previewListId, setPreviewListId] = useState<string | null>(null);

  const baseStart = useMemo(
    () => startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 }),
    [weekOffset]
  );

  const weeks: Week[] = useMemo(() => {
    const buildWeek = (start: Date) => {
      const days: Week["days"] = [];
      // Monday through Friday (Sunday/Saturday excluded)
      for (let i = 0; i < 5; i++) {
        const dayDate = addDays(start, i);
        const iso = format(dayDate, "yyyy-MM-dd");
        days.push({ label: format(dayDate, "EEE"), date: dayDate, iso });
      }
      const range = `${format(days[0].date, "d MMM")} - ${format(
        days[days.length - 1].date,
        "d MMM"
      )}`;
      return { start, days, displayRange: range };
    };

    return Array.from({ length: 4 }, (_, i) => {
      const start = addDays(baseStart, i * 7);
      return buildWeek(start);
    });
  }, [baseStart]);

  const listIds = useMemo(() => {
    const ids = ["backlog"];
    for (const w of weeks) {
      for (const d of w.days) ids.push(`${DAY_PREFIX}${d.iso}`);
    }
    return ids;
  }, [weeks]);

  const listJobsBase = useCallback(
    (listId: string) => {
      if (listId === "backlog") {
        return jobs.filter((j) => {
          const isDeleted = !!j.deletedAt;
          const isDone = j.status === "completed" || j.status === "cancelled";
          if (isDeleted || isDone) return false;

          return j.status === "backlog";
        });
      }
      if (!listId.startsWith(DAY_PREFIX)) return [];
      const dayKey = listId.slice(DAY_PREFIX.length);
      return jobs.filter((j) => {
        const isDeleted = !!j.deletedAt;
        const isDone = j.status === "completed" || j.status === "cancelled";
        if (isDeleted || isDone) return false;

        return j.status === "scheduled" && j.assignedDate === dayKey;
      });
    },
    [jobs]
  );

  const listJobs = useCallback(
    (listId: string) => {
      const base = listJobsBase(listId);
      if (!activeId || !previewListId) return base;

      if (listId !== previewListId) {
        return base.filter((j) => j.id !== activeId);
      }

      const activeJob = jobs.find((j) => j.id === activeId);
      if (!activeJob) return base;
      if (base.some((j) => j.id === activeId)) return base;
      return [...base, activeJob];
    },
    [activeId, jobs, listJobsBase, previewListId]
  );

  const baseJobToList = useMemo(() => {
    const map = new Map<string, string>();
    for (const listId of listIds) {
      for (const job of listJobs(listId)) {
        map.set(job.id, listId);
      }
    }
    return map;
  }, [listIds, listJobsBase]);

  const effectiveJobToList = useMemo(() => {
    const map = new Map(baseJobToList);
    if (activeId && previewListId) {
      map.set(activeId, previewListId);
    }
    return map;
  }, [activeId, baseJobToList, previewListId]);

  const backlogJobs = listJobs("backlog");
  const orderedBacklogJobs = orderJobs("backlog", orderByList, backlogJobs);

  const jobsByDate: Record<string, typeof jobs> = {};
  for (const w of weeks) {
    for (const d of w.days) {
      const listId = `${DAY_PREFIX}${d.iso}`;
      jobsByDate[d.iso] = orderJobs(listId, orderByList, listJobs(listId));
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 140, tolerance: 6 }
    })
  );

  const getListIdForDroppable = useCallback(
    (id: UniqueIdentifier | null) => {
      if (!id) return null;
      const asString = String(id);
      if (listIds.includes(asString)) return asString;
      return effectiveJobToList.get(asString) ?? null;
    },
    [effectiveJobToList, listIds]
  );

  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (!activeId) return closestCenter(args);
      const activeListId = getListIdForDroppable(activeId);
      if (!activeListId) return closestCenter(args);

      const collisions = pointerWithin(args);
      const intersections = collisions.length ? collisions : rectIntersection(args);
      const columnHit = getFirstCollision(
        intersections.filter((entry) => listIds.includes(String(entry.id))),
        "id"
      );
      if (columnHit && String(columnHit) !== activeListId) {
        return [{ id: columnHit as UniqueIdentifier }];
      }

      if (dragAxis !== "horizontal") {
        const filtered = args.droppableContainers.filter((container) => {
          const listId = getListIdForDroppable(container.id);
          return listId === activeListId;
        });
        return closestCenter({ ...args, droppableContainers: filtered });
      }

      const first = getFirstCollision(intersections, "id");
      if (first) return [{ id: first }];
      return closestCenter(args);
    },
    [activeId, dragAxis, getListIdForDroppable]
  );

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setDragAxis(null);
    setPreviewListId(null);
  }, []);

  const handleDragOver = useCallback(
    ({ active, over, delta }: DragOverEvent) => {
      if (!over) return;
      const absX = Math.abs(delta.x);
      const absY = Math.abs(delta.y);
      let nextAxis = dragAxis;
      if (absX > absY + AXIS_THRESHOLD) nextAxis = "horizontal";
      else if (absY > absX + AXIS_THRESHOLD) nextAxis = "vertical";
      if (nextAxis !== dragAxis) setDragAxis(nextAxis);

      const activeId = String(active.id);
      const overId = over?.id ?? null;
      const activeListId = baseJobToList.get(activeId) ?? null;
      const overListId = getListIdForDroppable(overId);
      if (!activeListId || !overListId) return;

      if (overListId !== activeListId) {
        if (nextAxis !== "horizontal") setDragAxis("horizontal");
        if (overListId !== previewListId) setPreviewListId(overListId);
      }

      if (nextAxis === "horizontal" && overListId !== previewListId) {
        setPreviewListId(overListId);
      }

      if (activeListId === overListId) {
        setOrderByList((prev) => {
          const ids = orderJobs(activeListId, prev, listJobs(activeListId)).map(
            (j) => j.id
          );
          const oldIndex = ids.indexOf(activeId);
          const overIndex = getOverIndex(ids, overId, activeListId);
          if (oldIndex === -1 || overIndex === -1 || oldIndex === overIndex) {
            return prev;
          }
          return { ...prev, [activeListId]: arrayMove(ids, oldIndex, overIndex) };
        });
        return;
      }

      if (nextAxis !== "horizontal") return;

      setOrderByList((prev) => {
        const sourceIds = orderJobs(activeListId, prev, listJobs(activeListId)).map(
          (j) => j.id
        );
        const destIds = orderJobs(overListId, prev, listJobs(overListId)).map(
          (j) => j.id
        );
        const nextSource = sourceIds.filter((id) => id !== activeId);
        const nextDest = destIds.includes(activeId) ? destIds : [...destIds];
        const overIndex = getOverIndex(nextDest, overId, overListId);
        if (!nextDest.includes(activeId)) {
          nextDest.splice(overIndex, 0, activeId);
        }
        return {
          ...prev,
          [activeListId]: nextSource,
          [overListId]: nextDest
        };
      });
    },
    [baseJobToList, dragAxis, getListIdForDroppable, listJobs, previewListId]
  );

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const activeId = String(active.id);
      const overId = over?.id ?? null;
      const sourceListId = baseJobToList.get(activeId) ?? null;
      let destListId = getListIdForDroppable(overId);
      if (previewListId && previewListId !== sourceListId) {
        destListId = previewListId;
      }

      setActiveId(null);
      setPreviewListId(null);
      setDragAxis(null);

      if (!sourceListId || !destListId) return;

      if (sourceListId === destListId && overId && String(overId) === activeId) {
        return;
      }

      const assignedDate =
        destListId === "backlog" ? null : destListId.slice(DAY_PREFIX.length);

      // Handle ordering for any list.
      setOrderByList((prev) => {
        const getIds = (listId: string) =>
          orderJobs(listId, prev, listJobsBase(listId)).map((j) => j.id);

        const sourceIds = getIds(sourceListId).filter((id) => id !== activeId);

        if (sourceListId === destListId) {
          const insertAt = Math.min(getOverIndex(sourceIds, overId, sourceListId), sourceIds.length);
          const nextIds = [...sourceIds];
          nextIds.splice(insertAt, 0, activeId);
          return { ...prev, [sourceListId]: nextIds };
        }

        const destIds = getIds(destListId).filter((id) => id !== activeId);
        const insertAt = Math.min(getOverIndex(destIds, overId, destListId), destIds.length);
        destIds.splice(insertAt, 0, activeId);

        return {
          ...prev,
          [sourceListId]: sourceIds,
          [destListId]: destIds
        };
      });

      // If just reordering inside backlog, no backend call needed.
      if (sourceListId === "backlog" && destListId === "backlog") {
        return;
      }

      if (assignedDate) {
        const job = jobs.find((j) => j.id === activeId);
        const dayArea = dayAreaLabels[assignedDate];
        const jobArea = job?.areaTag;
        if (
          job &&
          dayArea &&
          jobArea &&
          normalize(dayArea) &&
          normalize(jobArea) !== normalize(dayArea)
        ) {
          const ok = window.confirm(
            `This job is tagged "${jobArea}", but the day is set to "${dayArea}". Drop here anyway?`
          );
          if (!ok) return;
        }
      }

      void moveJob(activeId, assignedDate);
    },
    [baseJobToList, dayAreaLabels, getListIdForDroppable, jobs, listJobsBase, moveJob, previewListId]
  );

  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : null;
  const activeOverListId = previewListId ?? (activeId ? baseJobToList.get(activeId) ?? null : null);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setPreviewListId(null);
        setDragAxis(null);
      }}
      autoScroll
    >
      <div className="flex flex-col gap-2 h-[calc(100vh-56px)] overflow-y-auto">
        <div className="px-4 pt-2 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-700">
            <span className="font-semibold">Week range {weeks[0].displayRange}</span>
            <span className="text-[11px] font-semibold text-slate-700">Backlog</span>
          </div>
          <SortableContext
            id="backlog"
            items={orderedBacklogJobs.map((j) => j.id)}
            strategy={horizontalListSortingStrategy}
          >
            <DroppableColumn id="backlog" highlight={activeOverListId === "backlog"}>
              <div className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-3 shadow-[var(--app-shadow-soft)]">
                {orderedBacklogJobs.map((j) => (
                  <div key={j.id} className="min-w-[200px] max-w-[220px] flex-shrink-0">
                    <SortableJobCard job={j} listId="backlog" />
                  </div>
                ))}
              </div>
            </DroppableColumn>
          </SortableContext>
        </div>

        <div className="flex flex-col gap-2 px-4 pb-2">
          {weeks.map((week, index) => (
            <div key={week.start.toISOString()} className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-slate-800">
                <span className="font-semibold">
                  Week {index + 1} ({week.displayRange})
                </span>
                {onZoomToWeek ? (
                  <button
                    className="btn-secondary px-2 py-1 text-xs"
                    onClick={() => onZoomToWeek(weekOffset + index)}
                  >
                    Zoom to this week
                  </button>
                ) : null}
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
                {week.days.map((d) => (
                  <SortableContext
                    key={d.iso}
                    id={`${DAY_PREFIX}${d.iso}`}
                    items={(jobsByDate[d.iso] ?? []).map((j) => j.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableColumn
                      id={`${DAY_PREFIX}${d.iso}`}
                      highlight={activeOverListId === `${DAY_PREFIX}${d.iso}`}
                      className="min-w-[160px] min-h-[170px]"
                    >
                      <CompactDayColumn
                        date={d.date}
                        isoDate={d.iso}
                        label={d.label}
                        listId={`${DAY_PREFIX}${d.iso}`}
                        jobs={jobsByDate[d.iso] ?? []}
                        areaLabel={dayAreaLabels[d.iso]}
                      />
                    </DroppableColumn>
                  </SortableContext>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeJob ? (
          <div className="rotate-[-1.5deg] scale-[1.03] shadow-2xl">
            <JobCard job={activeJob} openOnClick={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function normalize(val?: string | null) {
  return val?.trim().toLowerCase() ?? "";
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

function getOverIndex(ids: string[], overId: UniqueIdentifier | null, listId: string) {
  if (!overId) return ids.length;
  const overStr = String(overId);
  if (overStr === listId) return ids.length;
  const idx = ids.indexOf(overStr);
  return idx === -1 ? ids.length : idx;
}

function DroppableColumn({
  id,
  highlight,
  className,
  children
}: {
  id: string;
  highlight?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id,
    data: { type: "container", containerId: id }
  });
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ""} ${
        highlight ? "ring-2 ring-blue-300 rounded-2xl" : ""
      }`}
    >
      {children}
    </div>
  );
}
