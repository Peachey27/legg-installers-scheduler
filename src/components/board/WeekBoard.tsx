"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { useSchedulerStore } from "@/store/useSchedulerStore";
import DayColumn from "./DayColumn";
import BacklogColumn from "./BacklogColumn";
import { addDays, format, startOfWeek } from "date-fns";

type Props = {
  weekOffset?: number;
  onWeekOffsetChange?: (offset: number) => void;
};

export default function WeekBoard({ weekOffset, onWeekOffsetChange }: Props) {
  const { jobs, moveJob, dayAreaLabels } = useSchedulerStore();
  const [orderByList, setOrderByList] = useState<Record<string, string[]>>({});
  const [internalWeekOffset, setInternalWeekOffset] = useState(0); // 0 = start at today, each step = 5 weekdays
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [scrollMax, setScrollMax] = useState(0);

  const activeWeekOffset = weekOffset ?? internalWeekOffset;

  function setOffset(next: number) {
    if (onWeekOffsetChange) {
      onWeekOffsetChange(next);
    } else {
      setInternalWeekOffset(next);
    }
  }

  const today = new Date();
  const startDate = startOfWeek(addDays(today, activeWeekOffset * 7), { weekStartsOn: 1 });

  const days = useMemo(() => {
    const result: { label: string; date: Date; iso: string }[] = [];
    let cursor = startDate;
    // Build 24 working days (Mon-Sat) starting from the Monday startDate, skipping Sundays
    while (result.length < 24) {
      const day = cursor.getDay();
      if (day !== 0) {
        const iso = format(cursor, "yyyy-MM-dd");
        result.push({ label: format(cursor, "EEE"), date: new Date(cursor), iso });
      }
      cursor = addDays(cursor, 1);
    }
    return result;
  }, [startDate]);

  const backlogJobs = jobs.filter(
    (j) =>
      (!j.assignedDate || j.status === "backlog") &&
      j.status !== "completed" &&
      j.status !== "cancelled"
  );
  const orderedBacklogJobs = orderJobs("backlog", orderByList, backlogJobs);

  const jobsByDate: Record<string, typeof jobs> = {};
  for (const d of days) {
    jobsByDate[d.iso] = jobs.filter(
      (j) =>
        j.assignedDate === d.iso &&
        j.status !== "cancelled" &&
        j.status !== "completed" &&
        !j.deletedAt
    );
  }

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const target = destination.droppableId;
    const assignedDate = target === "backlog" ? null : target;

    // track manual order for backlog list
    if (source.droppableId === "backlog" || destination.droppableId === "backlog") {
      setOrderByList((prev) => {
        const currentIds = orderedBacklogJobs.map((j) => j.id);
        let next = mergeOrder(prev.backlog, currentIds);

        if (source.droppableId === "backlog") {
          next = next.filter((id) => id !== draggableId);
        }

        if (destination.droppableId === "backlog") {
          if (!next.includes(draggableId)) next.push(draggableId);
          const insertAt = Math.min(
            Math.max(destination.index, 0),
            next.length
          );
          next = next.filter((id) => id !== draggableId);
          next.splice(insertAt, 0, draggableId);
        }

        return { ...prev, backlog: next };
      });
    }

    // Warn if dropping onto a day with a different area label.
    if (assignedDate) {
      const job = jobs.find((j) => j.id === draggableId);
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

    void moveJob(draggableId, assignedDate);
  }

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

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col h-[calc(100vh-56px)]">
        <div
          className="flex-1 flex overflow-x-auto overflow-y-hidden px-4 pb-6 pt-1 gap-3 scrollbar-thin board-scroll"
          data-scroll-container="board"
          ref={scrollRef}
        >
          <Droppable droppableId="backlog">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="w-64 flex-shrink-0"
              >
                <BacklogColumn jobs={orderedBacklogJobs} placeholder={provided.placeholder} />
              </div>
            )}
          </Droppable>

          {days.map((d) => (
            <Droppable droppableId={d.iso} key={d.iso}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-1 min-w-[260px] px-1"
                >
                  <DayColumn
                    date={d.date}
                    isoDate={d.iso}
                    label={d.label}
                    jobs={jobsByDate[d.iso] ?? []}
                  />
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
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
            className="w-full h-6 accent-amber-600"
          />
        </div>
      </div>
    </DragDropContext>
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
