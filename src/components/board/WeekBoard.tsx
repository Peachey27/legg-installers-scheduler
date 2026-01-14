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
import DayColumn from "./DayColumn";
import BacklogColumn from "./BacklogColumn";
import JobCard from "../jobs/JobCard";

type Props = {
  weekOffset?: number;
  onWeekOffsetChange?: (offset: number) => void;
};

const AXIS_THRESHOLD = 12;

export default function WeekBoard({ weekOffset, onWeekOffsetChange }: Props) {
  const { jobs, moveJob, dayAreaLabels } = useSchedulerStore();
  const [orderByList, setOrderByList] = useState<Record<string, string[]>>({});
  const [internalWeekOffset, setInternalWeekOffset] = useState(0); // 0 = start at today, each step = 5 weekdays
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [scrollMax, setScrollMax] = useState(0);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragAxis, setDragAxis] = useState<"vertical" | "horizontal" | null>(null);
  const [previewListId, setPreviewListId] = useState<string | null>(null);

  const activeWeekOffset = weekOffset ?? internalWeekOffset;

  const today = new Date();
  const startDate = startOfWeek(addDays(today, activeWeekOffset * 7), { weekStartsOn: 1 });

  const days = useMemo(() => {
    const result: { label: string; date: Date; iso: string }[] = [];
    let cursor = startDate;
    const weekdayTarget = 5; // one week of Mon-Fri
    let weekdayCount = 0;

    // Build working days (Mon-Fri only), skipping weekends.
    while (weekdayCount < weekdayTarget) {
      const day = cursor.getDay();
      const iso = format(cursor, "yyyy-MM-dd");
      const isWeekend = day === 0 || day === 6;

      if (!isWeekend) {
        result.push({ label: format(cursor, "EEE"), date: new Date(cursor), iso });
        weekdayCount += 1;
      }

      cursor = addDays(cursor, 1);
    }
    return result;
  }, [startDate]);

  const listIds = useMemo(
    () => ["backlog", ...days.map((d) => d.iso)],
    [days]
  );

  const listJobsBase = useCallback(
    (listId: string) =>
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
          ),
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

  const orderedBacklogJobs = orderJobs("backlog", orderByList, listJobs("backlog"));

  const jobsByDate: Record<string, typeof jobs> = {};
  for (const d of days) {
    const raw = listJobs(d.iso);
    jobsByDate[d.iso] = orderJobs(d.iso, orderByList, raw);
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

      const first = getFirstCollision(intersections, "id");
      if (first) return [{ id: first }];
      return closestCenter(args);
    },
    [activeId, dragAxis, getListIdForDroppable]
  );

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      setActiveId(String(active.id));
      setDragAxis(null);
      setPreviewListId(null);
    },
    []
  );

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

      const assignedDate = destListId === "backlog" ? null : destListId;

      // track manual order for any list (day or backlog)
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

      if (sourceListId === destListId && destListId === "backlog") {
        return;
      }

      // Warn if dropping onto a day with a different area label.
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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handle = () => {
      setScrollPos(el.scrollLeft);
      setScrollMax(Math.max(el.scrollWidth - el.clientWidth, 0));
    };
    handle();
    el.addEventListener("scroll", handle);
    window.addEventListener("resize", handle);
    return () => {
      el.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
    };
  }, [days]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("boardOrder-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string[]>;
      if (parsed && typeof parsed === "object") {
        setOrderByList(parsed);
      }
    } catch {
      // ignore bad cached order
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("boardOrder-v1", JSON.stringify(orderByList));
    } catch {
      // ignore storage failures
    }
  }, [orderByList]);

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
      <div className="flex flex-col h-[calc(100vh-56px)]">
        <div
          className="flex-1 flex overflow-x-auto overflow-y-hidden px-4 pb-6 pt-1 gap-3 scrollbar-thin board-scroll"
          data-scroll-container="board"
          ref={scrollRef}
        >
          <SortableContext
            items={orderedBacklogJobs.map((j) => j.id)}
            strategy={verticalListSortingStrategy}
          >
            <DroppableColumn
              id="backlog"
              highlight={activeOverListId === "backlog"}
              className="w-64 flex-shrink-0"
            >
              <BacklogColumn jobs={orderedBacklogJobs} />
            </DroppableColumn>
          </SortableContext>

          {days.map((d) => (
            <SortableContext
              key={d.iso}
              items={(jobsByDate[d.iso] ?? []).map((j) => j.id)}
              strategy={verticalListSortingStrategy}
            >
              <DroppableColumn
                id={d.iso}
                highlight={activeOverListId === d.iso}
                className="flex-1 min-w-[260px] px-1"
              >
                <DayColumn
                  date={d.date}
                  isoDate={d.iso}
                  label={d.label}
                  jobs={jobsByDate[d.iso] ?? []}
                />
              </DroppableColumn>
            </SortableContext>
          ))}
        </div>
        <div className="px-4 pb-2">
          <input
            type="range"
            min={0}
            max={scrollMax || 1}
            value={scrollPos}
            onChange={(e) => {
              const el = scrollRef.current;
              if (!el) return;
              const val = Number(e.target.value);
              el.scrollTo({ left: val });
              setScrollPos(val);
            }}
            className="w-full h-6 accent-blue-600"
          />
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
  const { setNodeRef } = useDroppable({ id, data: { type: "column", listId: id } });
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
