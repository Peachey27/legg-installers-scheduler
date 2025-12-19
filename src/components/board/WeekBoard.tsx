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
  const [internalWeekOffset, setInternalWeekOffset] = useState(0); // 0 = start at today, each step = 5 weekdays
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [scrollMax, setScrollMax] = useState(0);

  const activeWeekOffset = weekOffset ?? internalWeekOffset;
  const setOffset = onWeekOffsetChange ?? setInternalWeekOffset;

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

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col h-[calc(100vh-56px)]">
        <div className="flex items-center gap-2 px-4 pt-3 text-sm text-amber-900">
          <button
            className="px-3 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100"
            onClick={() => (onWeekOffsetChange ? onWeekOffsetChange(activeWeekOffset - 1) : setOffset((v) => v - 1))}
          >
            ← Prev week
          </button>
          <button
            className="px-3 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100"
            onClick={() => setOffset(0)}
          >
            Today
          </button>
          <button
            className="px-3 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100"
            onClick={() => (onWeekOffsetChange ? onWeekOffsetChange(activeWeekOffset + 1) : setOffset((v) => v + 1))}
          >
            Next week →
          </button>
          <span className="ml-auto text-xs">
            Starting {format(days[0].date, "d MMM")}
          </span>
        </div>

        <div
          className="flex-1 flex overflow-x-auto overflow-y-hidden px-4 pb-6 pt-3 gap-3 scrollbar-thin board-scroll"
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
                <BacklogColumn jobs={backlogJobs} placeholder={provided.placeholder} />
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
